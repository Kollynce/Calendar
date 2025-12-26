import { defineStore } from 'pinia'
import { ref, computed, shallowRef, watch } from 'vue'
import { Canvas, Object as FabricObject } from 'fabric'
import type {
  Project,
  CanvasState,
  CanvasObject,
  CanvasElementMetadata,
  Holiday,
} from '@/types'
import { mergeTemplateOptions } from '@/config/editor-defaults'
import { holidayService } from '@/services/calendar/holiday.service'
import { projectsService } from '@/services/projects/projects.service'
import { useAuthStore } from '@/stores/auth.store'
import { useCalendarStore } from '@/stores/calendar.store'
import {
  buildCalendarGridGraphics,
  buildChecklistGraphics,
  buildDateCellGraphics,
  buildPlannerNoteGraphics,
  buildScheduleGraphics,
  buildWeekStripGraphics,
} from '@/stores/editor/graphics-builders'
import { createHistoryModule } from '@/stores/editor/history'
import { createProjectModule } from '@/stores/editor/project'
import { createCanvasModule } from '@/stores/editor/canvas'
import { createObjectIdentityHelper, createObjectsModule } from '@/stores/editor/objects'

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

  // History for undo/redo
  const history = ref<CanvasState[]>([])
  const historyIndex = ref(-1)
  const maxHistoryLength = 50

  // UI State
  const showGrid = ref(true)
  const showRulers = ref(true)
  const showSafeZone = ref(false)
  const snapToGrid = ref(true)
  const gridSize = ref(10)

  const loading = ref(false)
  const saving = ref(false)
  const isDirty = ref(false)
  const authStore = useAuthStore()
  const calendarStore = useCalendarStore()

  const objectIdentityHelper = createObjectIdentityHelper({ generateObjectId })
  const { ensureObjectIdentity, getLayerNameForMetadata } = objectIdentityHelper
  const { getArrowParts, refreshArrowGroupGeometry } = objectIdentityHelper

  const historyModule = createHistoryModule({
    canvas,
    history,
    historyIndex,
    maxHistoryLength,
    isDirty,
    ensureObjectIdentity,
  })

  const { saveToHistory, loadCanvasState, undo, redo, snapshotCanvasState } = historyModule

  const projectModule = createProjectModule({
    project,
    canvas,
    history,
    historyIndex,
    selectedObjectIds,
    clipboard,
    loading,
    saving,
    isDirty,
    authStore,
    calendarStore,
    projectsService,
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
    canvas.value.remove(active)
    canvas.value.add(rebuilt)
    canvas.value.setActiveObject(rebuilt)
    canvas.value.renderAll()
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
    }
  }

  function refreshCalendarGridsForYear(year: number): void {
    if (!canvas.value) return
    const y = Number(year)
    if (!Number.isFinite(y)) return

    const objects = canvas.value.getObjects() ?? []
    console.log('[Calendar] Refresh calendar grids', {
      year: y,
      holidayCount: calendarStore.allHolidays?.length ?? 0,
      gridCount: objects.filter(
        (obj) => ((obj as any)?.data?.elementMetadata as CanvasElementMetadata | undefined)?.kind === 'calendar-grid',
      ).length,
    })
    objects.forEach((obj) => {
      const metadata = (obj as any)?.data?.elementMetadata as CanvasElementMetadata | undefined
      if (metadata?.kind === 'calendar-grid' && metadata.year === y) {
        // Ensure language is in sync with global config
        if (calendarStore.config?.language) {
          metadata.language = calendarStore.config.language
        }

        const rebuilt = rebuildElementWithMetadata(obj, metadata)
        if (!rebuilt) return
        canvas.value?.remove(obj)
        canvas.value?.add(rebuilt)
      }
    })
    canvas.value?.renderAll()
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
            const startYear = Number(new Date(metadata.startDate).getFullYear())
            return Number.isFinite(startYear) && startYear === y
          }
          if (metadata.kind === 'date-cell') {
            const cellYear = Number(new Date(metadata.date).getFullYear())
            return Number.isFinite(cellYear) && cellYear === y
          }
          return false
        }

        canvas.value.getObjects().forEach((obj) => {
          const metadata = (obj as any).data?.elementMetadata as CanvasElementMetadata | undefined
          if (!shouldRefreshElement(metadata)) return

          const rebuilt = rebuildElementWithMetadata(obj, metadata!)
          if (rebuilt) {
            canvas.value?.remove(obj)
            canvas.value?.add(rebuilt)
          }
        })
        canvas.value?.renderAll()
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
        rebuilt = buildDateCellGraphics(metadata)
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
    canvas.value.remove(target)
    canvas.value.add(rebuilt)
    canvas.value.setActiveObject(rebuilt)
    canvas.value.renderAll()
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

  let queuedHistorySaveTimeout: ReturnType<typeof setTimeout> | null = null

  function queueHistorySave(): void {
    if (queuedHistorySaveTimeout) {
      clearTimeout(queuedHistorySaveTimeout)
    }
    queuedHistorySaveTimeout = setTimeout(() => {
      queuedHistorySaveTimeout = null
      saveToHistory()
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

  const canUndo = computed(() => historyIndex.value > 0)
  const canRedo = computed(() => historyIndex.value < history.value.length - 1)

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

  return {
    // State
    project,
    canvas,
    selectedObjectIds,
    clipboard,
    zoom,
    panOffset,
    history,
    historyIndex,
    showGrid,
    showRulers,
    showSafeZone,
    snapToGrid,
    gridSize,
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
    updateTemplateOptions,
    getHolidaysForCalendarYear,
    // Metadata-aware helpers
    getActiveElementMetadata,
    updateSelectedElementMetadata,
  }
})
