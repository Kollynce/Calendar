import { defineStore } from 'pinia'
import { ref, computed, shallowRef, watch } from 'vue'
import { Canvas, Object as FabricObject } from 'fabric'
import type {
  Project,
  CanvasState,
  CanvasObject,
  CanvasElementMetadata,
  Holiday,
  WatermarkConfig,
  BrandFontSetting,
} from '@/types'
import { mergeTemplateOptions } from '@/config/editor-defaults'
import { holidayService } from '@/services/calendar/holiday.service'
import { projectsService } from '@/services/projects/projects.service'
import * as storageUsageService from '@/services/storage/storage-usage.service'
import { useAuthStore } from '@/stores/auth.store'
import { useCalendarStore } from '@/stores/calendar.store'
import {
  buildCalendarGridGraphics,
  buildChecklistGraphics,
  buildCollageGraphics,
  buildDateCellGraphics,
  buildPlannerNoteGraphics,
  buildScheduleGraphics,
  buildTableGraphics,
  buildWeekStripGraphics,
} from '@/stores/editor/graphics-builders'
import { createHistoryModule } from '@/stores/editor/history'
import { createProjectModule } from '@/stores/editor/project'
import { createCanvasModule } from '@/stores/editor/canvas'
import { createObjectIdentityHelper, createObjectsModule } from '@/stores/editor/objects'
import { storage } from '@/config/firebase'
import { getBlob, getDownloadURL, ref as storageRef } from 'firebase/storage'
import type { FirebaseError } from 'firebase/app'

function generateObjectId(prefix: string): string {
  try {
    const uuid = globalThis.crypto?.randomUUID?.()
    if (uuid) return `${prefix}-${uuid}`
  } catch {
    // ignore
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export const useEditorStore = defineStore('editor', () => {
  const DEFAULT_CANVAS_WIDTH = 744
  const DEFAULT_CANVAS_HEIGHT = 1052

  function normalizeCanvasSize(input: { width?: number; height?: number } | null | undefined) {
    const w = Number(input?.width)
    const h = Number(input?.height)
    return {
      width: Number.isFinite(w) && w > 0 ? w : DEFAULT_CANVAS_WIDTH,
      height: Number.isFinite(h) && h > 0 ? h : DEFAULT_CANVAS_HEIGHT,
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════
  const project = ref<Project | null>(null)
  const canvas = shallowRef<Canvas | null>(null)
  const selectedObjectIds = ref<string[]>([])
  const clipboard = ref<CanvasObject | null>(null)
  const zoom = ref(1)
  const panOffset = ref({ x: 0, y: 0 })

  const selectionVersion = ref(0)
  function notifySelectionUpdate() {
    selectionVersion.value++
  }

  // History for undo/redo
  const history = ref<CanvasState[]>([])
  const redoHistory = ref<CanvasState[]>([])
  const maxHistoryLength = 50

  // UI State
  const showGrid = ref(true)
  const showRulers = ref(true)
  const showSafeZone = ref(false)
  const snapToGrid = ref(true)
  const gridSize = ref(10)
  const touchPreferences = ref({
    fingerPanPriority: false,
  })

  const loading = ref(false)
  const saving = ref(false)
  const isDirty = ref(false)
  const authStore = useAuthStore()
  const calendarStore = useCalendarStore()

  const brandKitFonts = computed<BrandFontSetting[]>(() => {
    const kit = authStore.defaultBrandKit
    if (!kit) return []
    const fonts: BrandFontSetting[] = []
    const pushFont = (font?: BrandFontSetting | null) => {
      if (font?.family) {
        fonts.push(font)
      }
    }
    pushFont(kit.fonts?.heading)
    pushFont(kit.fonts?.body)
    if (Array.isArray(kit.fontLibrary)) {
      kit.fontLibrary.forEach(pushFont)
    }
    return fonts
  })

  const brandFontMap = computed(() => {
    const map = new Map<string, BrandFontSetting>()
    brandKitFonts.value.forEach((font) => {
      map.set(font.family.toLowerCase(), font)
    })
    return map
  })

  const brandFontBlobUrlCache = new Map<string, string>()
  const inflightBrandFontPromises = new Map<string, Promise<string | null>>()
  const failedBrandFontLookups = new Set<string>()
  const registeredBrandFontFaces = new Set<string>()

  function supportsFontFace(): boolean {
    return typeof window !== 'undefined' && typeof window.FontFace !== 'undefined'
  }

  function getBrandFontCacheKey(font?: BrandFontSetting | null): string | undefined {
    if (!font) return undefined
    return font.storagePath || font.fileUrl || undefined
  }

  async function getBrandFontFileSource(font: BrandFontSetting): Promise<string | null> {
    const cacheKey = getBrandFontCacheKey(font)
    if (!cacheKey) return font.fileUrl ?? null

    if (font.storagePath && failedBrandFontLookups.has(font.storagePath)) {
      return font.fileUrl ?? null
    }

    if (brandFontBlobUrlCache.has(cacheKey)) {
      return brandFontBlobUrlCache.get(cacheKey) ?? null
    }
    if (inflightBrandFontPromises.has(cacheKey)) {
      return inflightBrandFontPromises.get(cacheKey) ?? null
    }

    const promise = (async () => {
      if (!font.storagePath) {
        return font.fileUrl ?? null
      }
      const ref = storageRef(storage, font.storagePath)
      try {
        const blob = await getBlob(ref)
        if (!blob) {
          return font.fileUrl ?? null
        }
        const blobUrl = URL.createObjectURL(blob)
        const previous = brandFontBlobUrlCache.get(cacheKey)
        if (previous) URL.revokeObjectURL(previous)
        brandFontBlobUrlCache.set(cacheKey, blobUrl)
        return blobUrl
      } catch (error) {
        return await resolveBrandFontSourceFromDownloadUrl(font, error as FirebaseError, ref)
      } finally {
        inflightBrandFontPromises.delete(cacheKey)
      }
    })()

    inflightBrandFontPromises.set(cacheKey, promise)
    return promise
  }

  async function resolveBrandFontSourceFromDownloadUrl(
    font: BrandFontSetting,
    error: FirebaseError | undefined,
    ref: ReturnType<typeof storageRef>,
  ): Promise<string | null> {
    if (error?.code === 'storage/object-not-found' && font.storagePath) {
      failedBrandFontLookups.add(font.storagePath)
    }
    console.warn('[EditorStore] Failed to fetch brand font blob', error)
    if (!font.storagePath) {
      return font.fileUrl ?? null
    }
    try {
      const renewedUrl = await getDownloadURL(ref)
      font.fileUrl = renewedUrl
      return renewedUrl
    } catch (downloadError) {
      const firebaseDownloadError = downloadError as FirebaseError | undefined
      if (firebaseDownloadError?.code === 'storage/object-not-found' && font.storagePath) {
        failedBrandFontLookups.add(font.storagePath)
      }
      console.warn('[EditorStore] Failed to refresh brand font download URL', downloadError)
      return font.fileUrl ?? null
    }
  }

  function findBrandFont(family: string | undefined): BrandFontSetting | null {
    if (!family) return null
    return brandFontMap.value.get(family.toLowerCase()) ?? null
  }

  async function ensureBrandFontRegistered(fontFamily: string | undefined): Promise<void> {
    if (!fontFamily || !supportsFontFace()) return
    const font = findBrandFont(fontFamily)
    if (!font || font.source !== 'upload') return
    const cacheKey = getBrandFontCacheKey(font)
    if (!cacheKey) return
    const key = `${font.family}::${cacheKey}`
    if (registeredBrandFontFaces.has(key)) return
    const source = await getBrandFontFileSource(font)
    if (!source) return
    try {
      const face = new FontFace(font.family, `url(${source})`)
      await face.load()
      document.fonts?.add(face)
      registeredBrandFontFaces.add(key)
      canvas.value?.requestRenderAll()
    } catch (error) {
      console.warn('[EditorStore] Failed to register brand font', font.family, error)
    }
  }

  function cleanupBrandFontResources(validKeys?: Set<string>): void {
    brandFontBlobUrlCache.forEach((url, key) => {
      if (!validKeys || !validKeys.has(key)) {
        if (url) URL.revokeObjectURL(url)
        brandFontBlobUrlCache.delete(key)
      }
    })
    inflightBrandFontPromises.clear()
    if (!validKeys) {
      failedBrandFontLookups.clear()
      registeredBrandFontFaces.clear()
    }
  }

  watch(
    brandKitFonts,
    (fonts) => {
      const validKeys = new Set<string>()
      fonts.forEach((font) => {
        const key = getBrandFontCacheKey(font)
        if (key) {
          validKeys.add(key)
        }
        if (font?.source === 'upload') {
          void ensureBrandFontRegistered(font.family)
        }
      })
      cleanupBrandFontResources(validKeys)
    },
    { deep: true, immediate: true },
  )

  let lastCalendarWatermarkJSON: string | null = JSON.stringify(calendarStore.config.watermark ?? null)
  let refreshGridsInProgress = false

  function cloneWatermarkConfig(config: WatermarkConfig | undefined): WatermarkConfig | undefined {
    if (!config) return undefined
    return JSON.parse(JSON.stringify(config)) as WatermarkConfig
  }

  watch(
    () => calendarStore.config.watermark,
    (next) => {
      const serialized = JSON.stringify(next ?? null)
      if (serialized === lastCalendarWatermarkJSON) return
      lastCalendarWatermarkJSON = serialized

      if (!project.value) return
      project.value.config.watermark = cloneWatermarkConfig(next)
      if (typeof next?.visible === 'boolean') {
        project.value.config.showWatermark = next.visible
      }
    },
    { deep: true },
  )

  watch(
    () => calendarStore.config.year,
    (nextYear) => {
      if (!project.value) return
      const year = Number(nextYear)
      if (!Number.isFinite(year)) return
      project.value.config.year = year
    },
  )

  const objectIdentityHelper = createObjectIdentityHelper({ generateObjectId })
  const { ensureObjectIdentity, getLayerNameForMetadata } = objectIdentityHelper
  const { getArrowParts, refreshArrowGroupGeometry } = objectIdentityHelper

  const historyModule = createHistoryModule({
    canvas,
    history,
    redoHistory,
    maxHistoryLength,
    isDirty,
    ensureObjectIdentity,
  })

  const { saveToHistory, loadCanvasState, undo, redo, snapshotCanvasState, registerAfterLoadCallback } = historyModule

  const projectModule = createProjectModule({
    project,
    canvas,
    history,
    redoHistory,
    selectedObjectIds,
    clipboard,
    loading,
    saving,
    isDirty,
    authStore,
    calendarStore,
    projectsService,
    storageUsageService,
    mergeTemplateOptions,
    normalizeCanvasSize,
    generateObjectId,
  })

  const {
    createNewProject,
    loadProject,
    loadProjectById,
    setProjectName,
    setProjectTemplateId,
    saveProject,
    getCanvasState,
    updateTemplateOptions,
  } = projectModule

  const canvasModule = createCanvasModule({
    project,
    canvas,
    selectedObjectIds,
    zoom,
    panOffset,
    isDirty,
    normalizeCanvasSize,
    loadCanvasState,
    saveToHistory,
    registerAfterLoadCallback,
    ensureObjectIdentity,
    rebuildElementWithMetadata,
  })

  const {
    initializeCanvas,
    destroyCanvas,
    bakeScaledCalendarElementSize,
    MIN_ZOOM,
    MAX_ZOOM,
    setZoom,
    zoomToPoint,
    zoomIn,
    zoomOut,
    resetZoom,
    setPan,
    panBy,
    fitToScreen,
    centerCanvas,
    getViewportTransform,
    setCanvasSize,
    setBackgroundColor,
    setBackgroundPattern,
    getBackgroundPattern,
  } = canvasModule

  const objectsModule = createObjectsModule({
    canvas,
    project,
    selectedObjectIds,
    clipboard,
    isDirty,
    generateObjectId,
    ensureObjectIdentity,
    getLayerNameForMetadata,
    getHolidaysForCalendarYear,
    attachElementMetadata,
    snapshotCanvasState,
    queueHistorySave,
    saveToHistory,
    requestFontLoad,
    bakeScaledCalendarElementSize,
    getArrowParts,
    refreshArrowGroupGeometry,
    notifySelectionUpdate,
  })

  const {
    addObject,
    addImage,
    deleteSelected,
    duplicateSelected,
    copySelected,
    cutSelected,
    paste,
    selectAll,
    nudgeSelection,
    groupSelected,
    ungroupSelected,
    clearSelection,
    toggleLockSelected,
    toggleVisibilitySelected,
    updateObjectProperty,
    selectObjectById,
    toggleObjectVisibility,
    toggleObjectLock,
    deleteObjectById,
    bringForward,
    sendBackward,
    bringToFront,
    sendToBack,
    alignObjects,
    alignSelection,
    distributeSelection,
  } = objectsModule

  const loadedFontKeys = new Set<string>()
  const requestedFontKeys = new Set<string>()
  const holidayCacheByKey = new Map<string, Holiday[]>()
  const holidayLoadInFlight = new Set<string>()

  let fontsStylesheetReady: Promise<void> | null = null

  function ensureFontsStylesheetInjected(): Promise<void> {
    if (typeof document === 'undefined') return Promise.resolve()
    const id = 'calendar-google-fonts-bundle'
    const existing = document.getElementById(id) as HTMLLinkElement | null
    if (existing) {
      if (fontsStylesheetReady) return fontsStylesheetReady
      const isLoaded = !!existing.sheet
      fontsStylesheetReady = isLoaded
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
          existing.addEventListener('load', () => resolve(), { once: true })
          existing.addEventListener('error', () => resolve(), { once: true })
        })
      return fontsStylesheetReady
    }

    const link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    link.href =
      'https://fonts.googleapis.com/css2?'
      + 'family=Inter:wght@300;400;500;600;700&'
      + 'family=Outfit:wght@400;500;600;700;800&'
      + 'family=Roboto:wght@300;400;500;700&'
      + 'family=Open+Sans:wght@300;400;500;600;700&'
      + 'family=Lato:wght@100;300;400;700;900&'
      + 'family=Montserrat:wght@300;400;500;600;700;800&'
      + 'family=Playfair+Display:wght@400;500;600;700;800&'
      + 'family=Merriweather:wght@300;400;700;900&'
      + 'family=Oswald:wght@300;400;500;600;700&'
      + 'family=Poppins:wght@300;400;500;600;700;800&'
      + 'display=swap'

    fontsStylesheetReady = new Promise<void>((resolve) => {
      link.addEventListener('load', () => resolve(), { once: true })
      link.addEventListener('error', () => resolve(), { once: true })
    })

    document.head.appendChild(link)
    return fontsStylesheetReady
  }

  function rebuildActiveElementFromMetadata(metadata?: CanvasElementMetadata): void {
    if (!canvas.value) return
    const active = canvas.value.getActiveObject()
    if (!active) return
    const meta = metadata ?? ((active as any).data?.elementMetadata as CanvasElementMetadata | undefined)
    if (!meta) return
    const rebuilt = rebuildElementWithMetadata(active, meta)
    if (!rebuilt) return
    withCanvasBatch(() => {
      canvas.value?.remove(active)
      canvas.value?.add(rebuilt)
      canvas.value?.setActiveObject(rebuilt)
    })
  }

  function requestFontLoad(fontFamily: string, fontWeight?: string | number, fontSize?: number): void {
    if (!fontFamily) return
    if (typeof document === 'undefined') return
    const safeSize = Math.max(8, Number(fontSize ?? 16) || 16)
    const safeWeight = String(fontWeight ?? 400)
    const key = `${fontFamily}::${safeWeight}::${safeSize}`

    if (loadedFontKeys.has(key) || requestedFontKeys.has(key)) return
    requestedFontKeys.add(key)

    const fonts = (document as any).fonts as FontFaceSet | undefined
    if (!fonts?.load) {
      loadedFontKeys.add(key)
      requestedFontKeys.delete(key)
      return
    }

    const ready = ensureFontsStylesheetInjected()
    Promise.resolve(ready)
      .then(() => {
        const promises: Promise<unknown>[] = []

        // Load the family without a weight requirement. This resolves as soon as ANY face is available,
        // and avoids hanging on unsupported weights (e.g. Lato 600).
        promises.push(fonts.load(`${safeSize}px "${fontFamily}"`))

        // Also try requested weight (best effort)
        promises.push(fonts.load(`${safeWeight} ${safeSize}px "${fontFamily}"`))

        // Common fallbacks for missing weights
        promises.push(fonts.load(`400 ${safeSize}px "${fontFamily}"`))
        promises.push(fonts.load(`700 ${safeSize}px "${fontFamily}"`))

        return Promise.allSettled(promises)
      })
      .then(() => {
        loadedFontKeys.add(key)
        requestedFontKeys.delete(key)

        const active = canvas.value?.getActiveObject() ?? null
        const meta = (active as any)?.data?.elementMetadata as CanvasElementMetadata | undefined
        if (meta) {
          const usesFamily = JSON.stringify(meta).includes(fontFamily)
          if (usesFamily) rebuildActiveElementFromMetadata(meta)
        }

        // Also force a canvas render to refresh text metrics.
        canvas.value?.requestRenderAll()
      })
      .catch(() => {
        requestedFontKeys.delete(key)
      })
  }

  function requestFontsForMetadata(metadata: CanvasElementMetadata): void {
    if (metadata.kind === 'calendar-grid') {
      requestFontLoad(metadata.headerFontFamily ?? 'Outfit', metadata.headerFontWeight, metadata.headerFontSize)
      requestFontLoad(metadata.weekdayFontFamily ?? 'Inter', metadata.weekdayFontWeight, metadata.weekdayFontSize)
      requestFontLoad(metadata.dayNumberFontFamily ?? 'Inter', metadata.dayNumberFontWeight, metadata.dayNumberFontSize)
      return
    }
    if (metadata.kind === 'week-strip') {
      requestFontLoad(metadata.labelFontFamily ?? 'Inter', metadata.labelFontWeight, metadata.labelFontSize)
      requestFontLoad(metadata.weekdayFontFamily ?? 'Inter', metadata.weekdayFontWeight, metadata.weekdayFontSize)
      requestFontLoad(metadata.dayNumberFontFamily ?? 'Inter', metadata.dayNumberFontWeight, metadata.dayNumberFontSize)
      return
    }
    if (metadata.kind === 'date-cell') {
      requestFontLoad(metadata.weekdayFontFamily ?? 'Inter', metadata.weekdayFontWeight, metadata.weekdayFontSize)
      requestFontLoad(metadata.dayNumberFontFamily ?? 'Inter', metadata.dayNumberFontWeight, metadata.dayNumberFontSize)
      requestFontLoad(metadata.placeholderFontFamily ?? 'Inter', metadata.placeholderFontWeight, metadata.placeholderFontSize)
      return
    }
    if (metadata.kind === 'table') {
      requestFontLoad(metadata.cellFontFamily ?? 'Inter', metadata.cellFontWeight, metadata.cellFontSize)
      metadata.cellContents?.forEach((cell) => {
        requestFontLoad(cell.fontFamily ?? metadata.cellFontFamily ?? 'Inter', cell.fontWeight ?? metadata.cellFontWeight, cell.fontSize ?? metadata.cellFontSize)
      })
    }
  }

  function refreshCalendarGridsForYear(year: number): void {
    if (!canvas.value) return
    if (refreshGridsInProgress) {
      console.log('[Calendar] Refresh already in progress, skipping')
      return
    }
    
    const y = Number(year)
    if (!Number.isFinite(y)) return

    refreshGridsInProgress = true
    
    try {
      const objects = canvas.value.getObjects() ?? []
      const gridsToRebuild = objects.filter((obj) => {
        const metadata = (obj as any)?.data?.elementMetadata as CanvasElementMetadata | undefined
        return metadata?.kind === 'calendar-grid' && metadata.year === y
      })
      
      console.log('[Calendar] Refresh calendar grids', {
        year: y,
        holidayCount: calendarStore.allHolidays?.length ?? 0,
        gridCount: gridsToRebuild.length,
        totalObjects: objects.length,
        gridIds: gridsToRebuild.map(obj => (obj as any).id),
      })
      
      if (gridsToRebuild.length === 0) return

      withCanvasBatch(() => {
        gridsToRebuild.forEach((obj) => {
          const metadata = (obj as any)?.data?.elementMetadata as CanvasElementMetadata | undefined
          if (!metadata || metadata.kind !== 'calendar-grid') return
          
          // Ensure language is in sync with global config
          if (calendarStore.config?.language && 'language' in metadata) {
            (metadata as any).language = calendarStore.config.language
          }

          const rebuilt = rebuildElementWithMetadata(obj, metadata)
          if (!rebuilt) return
          
          console.log('[Calendar] Rebuilding grid', { oldId: (obj as any).id, newId: (rebuilt as any).id })
          
          // Remove old object and add rebuilt one
          canvas.value?.remove(obj)
          canvas.value?.add(rebuilt)
        })
      })
    } finally {
      refreshGridsInProgress = false
    }
  }

  function requestHolidaysForYear(year: number, country: string, language: string): void {
    const y = Number(year)
    if (!Number.isFinite(y)) return
    
    const cacheKey = `${country}-${language}-${y}`
    if (holidayCacheByKey.has(cacheKey)) return
    if (holidayLoadInFlight.has(cacheKey)) return

    holidayLoadInFlight.add(cacheKey)

    holidayService
      .getHolidays(country as any, y, language as any)
      .then(({ holidays }) => {
        const showHolidays = calendarStore.config?.showHolidays ?? true
        const showCustom = calendarStore.config?.showCustomHolidays ?? true
        const base = showHolidays ? holidays : ([] as Holiday[])
        const merged =
          showCustom
            ? holidayService.mergeWithCustomHolidays(
              base,
              (calendarStore.customHolidays as any) ?? [],
              y,
            )
            : base

        holidayCacheByKey.set(cacheKey, merged)

        if (!canvas.value) return

        const shouldRefreshElement = (metadata?: CanvasElementMetadata): boolean => {
          if (!metadata) return false
          const objCountry = (metadata as any).country ?? calendarStore.config?.country ?? 'KE'
          const objLanguage = (metadata as any).language ?? calendarStore.config?.language ?? 'en'
          if (objCountry !== country || objLanguage !== language) return false

          if (metadata.kind === 'calendar-grid') {
            return metadata.year === y
          }
          if (metadata.kind === 'week-strip') {
            const startDate = new Date(metadata.startDate)
            const endDate = new Date(startDate)
            endDate.setDate(endDate.getDate() + 6)
            const startYear = startDate.getFullYear()
            const endYear = endDate.getFullYear()
            // Refresh if the requested year matches either the start or end year of the week
            return Number.isFinite(startYear) && (startYear === y || endYear === y)
          }
          if (metadata.kind === 'date-cell') {
            const cellYear = Number(new Date(metadata.date).getFullYear())
            return Number.isFinite(cellYear) && cellYear === y
          }
          return false
        }

        // Snapshot the objects array to avoid iterating over a live array
        // that changes when we add rebuilt objects
        const objectsSnapshot = [...canvas.value.getObjects()]
        objectsSnapshot.forEach((obj) => {
          const metadata = (obj as any).data?.elementMetadata as CanvasElementMetadata | undefined
          if (!shouldRefreshElement(metadata)) return

          const rebuilt = rebuildElementWithMetadata(obj, metadata!)
          if (rebuilt) {
            canvas.value?.remove(obj)
            canvas.value?.add(rebuilt)
          }
        })
        requestRender()
      })
      .finally(() => {
        holidayLoadInFlight.delete(cacheKey)
      })
  }

  watch(
    () => [calendarStore.allHolidays, calendarStore.config.year] as const,
    ([holidays, year]) => {
      console.log('[Calendar] Holidays or year changed, refreshing grids', {
        year,
        holidayCount: holidays?.length ?? 0,
      })
      refreshCalendarGridsForYear(year)
    },
    { deep: false, immediate: true },
  )

  function getHolidaysForCalendarYear(year: number, country?: string, language?: string): Holiday[] {
    const y = Number(year)
    if (!Number.isFinite(y)) return []

    const effectiveCountry = country ?? calendarStore.config?.country ?? 'KE'
    const effectiveLanguage = language ?? calendarStore.config?.language ?? 'en'
    const cacheKey = `${effectiveCountry}-${effectiveLanguage}-${y}`

    // Check cache first
    const cached = holidayCacheByKey.get(cacheKey)
    if (cached) return cached

    // If not cached, request it
    requestHolidaysForYear(y, effectiveCountry, effectiveLanguage)
    
    // Return empty array while loading
    return []
  }

  function attachElementMetadata(
    obj: FabricObject,
    metadata?: CanvasElementMetadata,
  ): void {
    if (!metadata) return
    const existingData = (obj as any).data ?? {}
    obj.set('data', {
      ...existingData,
      elementMetadata: metadata,
    })
  }

  function rebuildElementWithMetadata(
    target: FabricObject,
    metadata: CanvasElementMetadata,
  ): FabricObject | null {
    requestFontsForMetadata(metadata)
    let rebuilt: FabricObject | null = null
    switch (metadata.kind) {
      case 'calendar-grid':
        rebuilt = buildCalendarGridGraphics(metadata, getHolidaysForCalendarYear)
        break
      case 'week-strip':
        rebuilt = buildWeekStripGraphics(metadata, getHolidaysForCalendarYear)
        break
      case 'date-cell':
        rebuilt = buildDateCellGraphics(metadata, getHolidaysForCalendarYear)
        break
      case 'planner-note':
        rebuilt = buildPlannerNoteGraphics(metadata)
        break
      case 'schedule':
        rebuilt = buildScheduleGraphics(metadata)
        break
      case 'checklist':
        rebuilt = buildChecklistGraphics(metadata)
        break
      case 'collage':
        rebuilt = buildCollageGraphics(metadata)
        break
      case 'table':
        rebuilt = buildTableGraphics(metadata)
        break
      default:
        rebuilt = null
    }

    if (!rebuilt) return null

    rebuilt.set({
      left: target.left,
      top: target.top,
      scaleX: target.scaleX,
      scaleY: target.scaleY,
      angle: target.angle,
      flipX: (target as any).flipX,
      flipY: (target as any).flipY,
      name: getLayerNameForMetadata(metadata),
    })

      ; (rebuilt as any).id = (target as any).id
    attachElementMetadata(rebuilt, metadata)
    return rebuilt
  }

  function getActiveCanvasObject(): FabricObject | null {
    if (!canvas.value) return null
    const active = canvas.value.getActiveObject()
    return active ?? null
  }

  function getActiveElementMetadata(): CanvasElementMetadata | null {
    const active = getActiveCanvasObject()
    if (!active) return null
    const metadata = (active as any).data?.elementMetadata as CanvasElementMetadata | undefined
    if (!metadata) return null
    return JSON.parse(JSON.stringify(metadata)) as CanvasElementMetadata
  }

  let queuedMetadataUpdate: {
    targetId: string | number | null
    metadata: CanvasElementMetadata
  } | null = null

  function flushQueuedMetadataUpdate(): void {
    if (!canvas.value) return
    if (!queuedMetadataUpdate) return
    const update = queuedMetadataUpdate
    queuedMetadataUpdate = null

    const active = canvas.value.getActiveObject()
    const target =
      (active && ((active as any).id ?? null) === update.targetId)
        ? active
        : canvas.value.getObjects().find((obj) => ((obj as any).id ?? null) === update.targetId) ?? null
    if (!target) return

    const rebuilt = rebuildElementWithMetadata(target, update.metadata)
    if (!rebuilt) return
    withCanvasBatch(() => {
      canvas.value?.remove(target)
      canvas.value?.add(rebuilt)
      canvas.value?.setActiveObject(rebuilt)
    })
    queueHistorySave()
  }

  function updateSelectedElementMetadata(
    updater: (metadata: CanvasElementMetadata) => CanvasElementMetadata | null,
  ): void {
    if (!canvas.value) return
    const active = canvas.value.getActiveObject()
    if (!active) return
    const existingMetadata = (active as any).data?.elementMetadata as CanvasElementMetadata | undefined
    if (!existingMetadata) return

    const targetId = ((active as any).id ?? null) as string | number | null
    const baseMetadata =
      queuedMetadataUpdate && queuedMetadataUpdate.targetId === targetId
        ? queuedMetadataUpdate.metadata
        : existingMetadata

    const draft = JSON.parse(JSON.stringify(baseMetadata)) as CanvasElementMetadata
    const nextMetadata = updater(draft)
    if (!nextMetadata) return

    queuedMetadataUpdate = {
      targetId,
      metadata: nextMetadata,
    }

    flushQueuedMetadataUpdate()
  }

  function updateActiveElementMetadata(updates: Partial<CanvasElementMetadata>): void {
    updateSelectedElementMetadata((draft) => {
      return { ...draft, ...updates } as CanvasElementMetadata
    })
  }

  function rebuildActiveCollage() {
    const active = getActiveCanvasObject()
    if (!active) return
    const metadata = getActiveElementMetadata()
    if (!metadata || metadata.kind !== 'collage') return
    
    // Trigger a refresh by updating with same metadata
    // but using the existing flush mechanism to replace the object
    queuedMetadataUpdate = {
      targetId: (active as any).id,
      metadata: metadata,
    }
    flushQueuedMetadataUpdate()
  }

  let isRenderQueued = false

  function requestRender(): void {
    const target = canvas.value
    if (!target) return
    if (isRenderQueued) return
    isRenderQueued = true
    requestAnimationFrame(() => {
      isRenderQueued = false
      const live = canvas.value
      if (!live) return
      live.requestRenderAll?.()
    })
  }

  function withCanvasBatch<T>(fn: () => T): T {
    const target = canvas.value as (Canvas & { renderOnAddRemove?: boolean }) | null
    if (!target) return fn()
    const prev = target.renderOnAddRemove
    target.renderOnAddRemove = false
    try {
      return fn()
    } finally {
      target.renderOnAddRemove = prev
      requestRender()
    }
  }

  let queuedHistorySaveTimeout: ReturnType<typeof setTimeout> | null = null

  function queueHistorySave(): void {
    if (queuedHistorySaveTimeout) {
      clearTimeout(queuedHistorySaveTimeout)
    }
    queuedHistorySaveTimeout = setTimeout(() => {
      queuedHistorySaveTimeout = null
      snapshotCanvasState()
    }, 250)
  }

  // ═══════════════════════════════════════════════════════════════
  // GETTERS
  // ═══════════════════════════════════════════════════════════════
  const selectedObjects = computed(() => {
    // Depend on selectedObjectIds to ensure reactivity when selection changes
    selectedObjectIds.value
    if (!canvas.value) return []
    return canvas.value.getActiveObjects()
  })

  const hasSelection = computed(() => selectedObjectIds.value.length > 0)

  const canUndo = computed(() => history.value.length > 1)
  const canRedo = computed(() => redoHistory.value.length > 0)

  const canvasSize = computed(() => {
    if (!project.value) return { width: 0, height: 0 }
    return {
      width: project.value.canvas.width,
      height: project.value.canvas.height,
    }
  })

  // ═══════════════════════════════════════════════════════════════
  // CANVAS INITIALIZATION
  // ═══════════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════

  function toggleFingerPanPriority(nextValue?: boolean) {
    const targetValue =
      typeof nextValue === 'boolean' ? nextValue : !touchPreferences.value.fingerPanPriority
    touchPreferences.value = {
      ...touchPreferences.value,
      fingerPanPriority: targetValue,
    }
  }

  return {
    // State
    project,
    canvas,
    selectedObjectIds,
    clipboard,
    zoom,
    panOffset,
    history,
    redoHistory,
    showGrid,
    showRulers,
    showSafeZone,
    snapToGrid,
    gridSize,
    touchPreferences,
    loading,
    saving,
    isDirty,
    // Getters
    selectedObjects,
    hasSelection,
    canUndo,
    canRedo,
    canvasSize,
    // Canvas
    initializeCanvas,
    destroyCanvas,
    // Objects
    addObject,
    addImage,
    deleteSelected,
    duplicateSelected,
    copySelected,
    cutSelected,
    paste,
    selectAll,
    nudgeSelection,
    groupSelected,
    ungroupSelected,
    clearSelection,
    toggleLockSelected,
    toggleVisibilitySelected,
    updateObjectProperty,
    // Object access/helpers
    selectObjectById,
    toggleObjectVisibility,
    toggleObjectLock,
    deleteObjectById,
    // Layers
    bringForward,
    sendBackward,
    bringToFront,
    sendToBack,
    // Alignment
    alignObjects,
    alignSelection,
    distributeSelection,
    // Zoom & Pan
    setZoom,
    zoomToPoint,
    zoomIn,
    zoomOut,
    resetZoom,
    fitToScreen,
    centerCanvas,
    setPan,
    panBy,
    getViewportTransform,
    MIN_ZOOM,
    MAX_ZOOM,
    // History
    undo,
    redo,
    snapshotCanvasState,
    // Project
    createNewProject,
    loadProject,
    loadProjectById,
    setProjectName,
    setProjectTemplateId,
    saveProject,
    getCanvasState,
    // Settings
    setCanvasSize,
    setBackgroundColor,
    setBackgroundPattern,
    getBackgroundPattern,
    updateTemplateOptions,
    getHolidaysForCalendarYear,
    toggleFingerPanPriority,
    // Metadata-aware helpers
    getActiveElementMetadata,
    updateActiveElementMetadata,
    updateSelectedElementMetadata,
    refreshCalendarGridsForYear,
    requestRender,
    withCanvasBatch,
    rebuildActiveCollage,
    selectionVersion,
    notifySelectionUpdate,
  }
})
