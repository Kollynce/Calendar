import { defineStore } from 'pinia'
import { ref, computed, shallowRef } from 'vue'
import { Canvas, Object as FabricObject, Textbox, Rect, Circle, Line, Group, Polygon, FabricImage, ActiveSelection } from 'fabric'
import type { 
  Project, 
  CanvasState, 
  CanvasObject, 
  ObjectType,
  CalendarConfig,
  TemplateOptions,
  CanvasElementMetadata,
  CalendarGridMetadata,
  WeekStripMetadata,
  PlannerNoteMetadata,
  DateCellMetadata,
  PlannerPatternVariant,
  ScheduleMetadata,
  ChecklistMetadata,
  Holiday,
} from '@/types'
import { mergeTemplateOptions } from '@/config/editor-defaults'
import { calendarGeneratorService } from '@/services/calendar/generator.service'
import { holidayService } from '@/services/calendar/holiday.service'
import { projectsService } from '@/services/projects/projects.service'
import { useAuthStore } from '@/stores/auth.store'
import { useCalendarStore } from '@/stores/calendar.store'

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

  const today = new Date()
  const authStore = useAuthStore()
  const calendarStore = useCalendarStore()

  const loadedFontKeys = new Set<string>()
  const requestedFontKeys = new Set<string>()
  const holidayCacheByYear = new Map<number, Holiday[]>()
  const holidayLoadInFlight = new Set<number>()

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

  function requestHolidaysForYear(year: number): void {
    const y = Number(year)
    if (!Number.isFinite(y)) return
    if (holidayCacheByYear.has(y)) return
    if (holidayLoadInFlight.has(y)) return

    holidayLoadInFlight.add(y)

    const country = calendarStore.config?.country ?? 'KE'
    holidayService
      .getHolidays(country, y)
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

        holidayCacheByYear.set(y, merged)

        const active = canvas.value?.getActiveObject() ?? null
        const meta = (active as any)?.data?.elementMetadata as CanvasElementMetadata | undefined
        if (meta?.kind === 'calendar-grid' && meta.year === y) {
          rebuildActiveElementFromMetadata(meta)
        }
      })
      .finally(() => {
        holidayLoadInFlight.delete(y)
      })
  }

  function getHolidaysForCalendarYear(year: number): Holiday[] {
    const y = Number(year)
    if (!Number.isFinite(y)) return []

    const cfgYear = calendarStore.config?.year
    if (cfgYear === y) {
      return (calendarStore.allHolidays ?? []) as Holiday[]
    }

    const cached = holidayCacheByYear.get(y)
    if (cached) return cached
    requestHolidaysForYear(y)
    return []
  }

  function getISODateString(date: Date = new Date()): string {
    return date.toISOString()
  }

  function getDefaultCalendarMetadata(
    overrides: Partial<CalendarGridMetadata> = {},
  ): CalendarGridMetadata {
    const defaultSize = { width: 460, height: 360 }
    const size = overrides.size ? { ...defaultSize, ...overrides.size } : defaultSize
    return {
      kind: 'calendar-grid',
      mode: overrides.mode ?? 'month',
      year: overrides.year ?? today.getFullYear(),
      month: overrides.month ?? today.getMonth() + 1,
      startDay: overrides.startDay ?? 0,
      showHeader: overrides.showHeader ?? true,
      showWeekdays: overrides.showWeekdays ?? true,
      title: overrides.title,
      backgroundColor: overrides.backgroundColor ?? '#ffffff',
      borderColor: overrides.borderColor ?? '#e5e7eb',
      borderWidth: overrides.borderWidth ?? 1,
      cornerRadius: overrides.cornerRadius ?? 26,
      headerHeight: overrides.headerHeight ?? 60,
      weekdayHeight: overrides.weekdayHeight ?? 36,
      cellGap: overrides.cellGap ?? 0,
      dayNumberInsetX: overrides.dayNumberInsetX ?? 12,
      dayNumberInsetY: overrides.dayNumberInsetY ?? 8,
      headerBackgroundColor: overrides.headerBackgroundColor ?? '#111827',
      headerBackgroundOpacity: overrides.headerBackgroundOpacity ?? 0.95,
      headerTextColor: overrides.headerTextColor ?? '#ffffff',
      headerFontFamily: overrides.headerFontFamily ?? 'Outfit',
      headerFontSize: overrides.headerFontSize ?? 24,
      headerFontWeight: overrides.headerFontWeight ?? 600,
      weekdayTextColor: overrides.weekdayTextColor ?? '#6b7280',
      weekdayFontFamily: overrides.weekdayFontFamily ?? 'Inter',
      weekdayFontSize: overrides.weekdayFontSize ?? 12,
      weekdayFontWeight: overrides.weekdayFontWeight ?? 600,
      gridLineColor: overrides.gridLineColor ?? '#e5e7eb',
      gridLineWidth: overrides.gridLineWidth ?? 1,
      dayNumberColor: overrides.dayNumberColor ?? '#1f2937',
      dayNumberMutedColor: overrides.dayNumberMutedColor ?? '#9ca3af',
      dayNumberFontFamily: overrides.dayNumberFontFamily ?? 'Inter',
      dayNumberFontSize: overrides.dayNumberFontSize ?? 16,
      dayNumberFontWeight: overrides.dayNumberFontWeight ?? 600,
      weekendBackgroundColor: overrides.weekendBackgroundColor,
      todayBackgroundColor: overrides.todayBackgroundColor,
      showHolidayMarkers: overrides.showHolidayMarkers ?? true,
      holidayMarkerColor: overrides.holidayMarkerColor ?? '#ef4444',
      holidayMarkerHeight: overrides.holidayMarkerHeight ?? 4,
      size,
    }
  }

  function getDefaultWeekStripMetadata(
    overrides: Partial<WeekStripMetadata> = {},
  ): WeekStripMetadata {
    const defaultSize = { width: 520, height: 110 }
    const size = overrides.size ? { ...defaultSize, ...overrides.size } : defaultSize
    return {
      kind: 'week-strip',
      startDate: overrides.startDate ?? getISODateString(),
      startDay: overrides.startDay ?? 0,
      label: overrides.label ?? 'Week Plan',
      backgroundColor: overrides.backgroundColor ?? '#ffffff',
      borderColor: overrides.borderColor ?? '#e5e7eb',
      borderWidth: overrides.borderWidth ?? 1,
      cornerRadius: overrides.cornerRadius ?? 24,
      cellBorderColor: overrides.cellBorderColor ?? '#f1f5f9',
      cellBorderWidth: overrides.cellBorderWidth ?? 1,
      labelColor: overrides.labelColor ?? '#0f172a',
      labelFontFamily: overrides.labelFontFamily ?? 'Inter',
      labelFontSize: overrides.labelFontSize ?? 16,
      labelFontWeight: overrides.labelFontWeight ?? 600,
      weekdayColor: overrides.weekdayColor ?? '#64748b',
      weekdayFontFamily: overrides.weekdayFontFamily ?? 'Inter',
      weekdayFontSize: overrides.weekdayFontSize ?? 12,
      weekdayFontWeight: overrides.weekdayFontWeight ?? 600,
      dayNumberColor: overrides.dayNumberColor ?? '#0f172a',
      dayNumberFontFamily: overrides.dayNumberFontFamily ?? 'Inter',
      dayNumberFontSize: overrides.dayNumberFontSize ?? 22,
      dayNumberFontWeight: overrides.dayNumberFontWeight ?? 700,
      size,
    }
  }

  function getDefaultPlannerNoteMetadata(
    pattern: PlannerPatternVariant = 'ruled',
    overrides: Partial<PlannerNoteMetadata> = {},
  ): PlannerNoteMetadata {
    const defaultSize = { width: 280, height: 320 }
    const size = overrides.size ? { ...defaultSize, ...overrides.size } : defaultSize
    return {
      kind: 'planner-note',
      pattern: overrides.pattern ?? pattern,
      title: overrides.title ?? 'Notes',
      accentColor: overrides.accentColor ?? '#2563eb',
      headerStyle:
        overrides.headerStyle ??
        ((overrides.pattern ?? pattern) === 'hero' ? 'filled' : 'minimal'),
      backgroundColor: overrides.backgroundColor ?? '#ffffff',
      borderColor: overrides.borderColor ?? '#e2e8f0',
      borderWidth: overrides.borderWidth ?? 1,
      cornerRadius: overrides.cornerRadius ?? 22,
      titleColor: overrides.titleColor,
      headerBackgroundColor: overrides.headerBackgroundColor,
      headerBackgroundOpacity: overrides.headerBackgroundOpacity,
      guideColor: overrides.guideColor,
      dotColor: overrides.dotColor,
      size,
    }
  }

  function getDefaultDateCellMetadata(
    overrides: Partial<DateCellMetadata> = {},
  ): DateCellMetadata {
    const defaultSize = { width: 200, height: 220 }
    const size = overrides.size ? { ...defaultSize, ...overrides.size } : defaultSize
    return {
      kind: 'date-cell',
      date: overrides.date ?? getISODateString(),
      highlightAccent: overrides.highlightAccent ?? '#fef3c7',
      notePlaceholder: overrides.notePlaceholder ?? 'Add event',
      backgroundColor: overrides.backgroundColor ?? '#ffffff',
      borderColor: overrides.borderColor ?? '#e2e8f0',
      borderWidth: overrides.borderWidth ?? 1,
      cornerRadius: overrides.cornerRadius ?? 24,
      accentHeightRatio: overrides.accentHeightRatio ?? 0.4,
      weekdayColor: overrides.weekdayColor ?? '#78350f',
      weekdayFontFamily: overrides.weekdayFontFamily ?? 'Inter',
      weekdayFontSize: overrides.weekdayFontSize ?? 13,
      weekdayFontWeight: overrides.weekdayFontWeight ?? 600,
      dayNumberColor: overrides.dayNumberColor ?? '#92400e',
      dayNumberFontFamily: overrides.dayNumberFontFamily ?? 'Inter',
      dayNumberFontSize: overrides.dayNumberFontSize ?? 52,
      dayNumberFontWeight: overrides.dayNumberFontWeight ?? 700,
      placeholderColor: overrides.placeholderColor ?? '#475569',
      placeholderFontFamily: overrides.placeholderFontFamily ?? 'Inter',
      placeholderFontSize: overrides.placeholderFontSize ?? 13,
      placeholderFontWeight: overrides.placeholderFontWeight ?? 400,
      size,
    }
  }

  function getDefaultScheduleMetadata(
    overrides: Partial<ScheduleMetadata> = {},
  ): ScheduleMetadata {
    const defaultSize = { width: 320, height: 640 }
    const size = overrides.size ? { ...defaultSize, ...overrides.size } : defaultSize
    return {
      kind: 'schedule',
      title: overrides.title ?? 'Schedule',
      accentColor: overrides.accentColor ?? '#a855f7',
      startHour: overrides.startHour ?? 6,
      endHour: overrides.endHour ?? 20,
      intervalMinutes: overrides.intervalMinutes ?? 60,
      headerStyle: overrides.headerStyle ?? 'minimal',
      backgroundColor: overrides.backgroundColor ?? '#ffffff',
      borderColor: overrides.borderColor ?? '#e2e8f0',
      borderWidth: overrides.borderWidth ?? 1,
      cornerRadius: overrides.cornerRadius ?? 22,
      titleColor: overrides.titleColor,
      headerBackgroundColor: overrides.headerBackgroundColor,
      headerBackgroundOpacity: overrides.headerBackgroundOpacity,
      lineColor: overrides.lineColor,
      timeLabelColor: overrides.timeLabelColor,
      size,
    }
  }

  function getDefaultChecklistMetadata(
    overrides: Partial<ChecklistMetadata> = {},
  ): ChecklistMetadata {
    const defaultSize = { width: 320, height: 420 }
    const size = overrides.size ? { ...defaultSize, ...overrides.size } : defaultSize
    return {
      kind: 'checklist',
      title: overrides.title ?? 'To Do',
      accentColor: overrides.accentColor ?? '#ec4899',
      rows: overrides.rows ?? 8,
      showCheckboxes: overrides.showCheckboxes ?? true,
      headerStyle: overrides.headerStyle ?? 'tint',
      backgroundColor: overrides.backgroundColor ?? '#ffffff',
      borderColor: overrides.borderColor ?? '#e2e8f0',
      borderWidth: overrides.borderWidth ?? 1,
      cornerRadius: overrides.cornerRadius ?? 22,
      titleColor: overrides.titleColor,
      headerBackgroundColor: overrides.headerBackgroundColor,
      headerBackgroundOpacity: overrides.headerBackgroundOpacity,
      lineColor: overrides.lineColor,
      checkboxColor: overrides.checkboxColor,
      size,
    }
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
        rebuilt = buildCalendarGridGraphics(metadata)
        break
      case 'week-strip':
        rebuilt = buildWeekStripGraphics(metadata)
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

    ;(rebuilt as any).id = (target as any).id
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

  function buildCalendarGridGraphics(metadata: CalendarGridMetadata): Group {
    const { width, height } = metadata.size
    const objects: FabricObject[] = []

    const cornerRadius = Math.max(0, metadata.cornerRadius ?? 26)
    const borderWidth = Math.max(0, metadata.borderWidth ?? 1)
    const borderColor = metadata.borderColor ?? '#e5e7eb'
    const backgroundColor = metadata.backgroundColor ?? '#ffffff'
    const headerHeight = metadata.showHeader ? Math.max(0, metadata.headerHeight ?? 60) : 0
    const weekdayHeight = metadata.showWeekdays ? Math.max(0, metadata.weekdayHeight ?? 36) : 0
    const gridLineColor = metadata.gridLineColor ?? '#e5e7eb'
    const gridLineWidth = Math.max(0, metadata.gridLineWidth ?? 1)

    const headerBackgroundColor = metadata.headerBackgroundColor ?? '#111827'
    const headerBackgroundOpacity = metadata.headerBackgroundOpacity ?? 0.95
    const headerTextColor = metadata.headerTextColor ?? '#ffffff'
    const headerFontFamily = metadata.headerFontFamily ?? 'Outfit'
    const headerFontSize = metadata.headerFontSize ?? 24
    const headerFontWeight = metadata.headerFontWeight ?? 600

    const weekdayTextColor = metadata.weekdayTextColor ?? '#6b7280'
    const weekdayFontFamily = metadata.weekdayFontFamily ?? 'Inter'
    const weekdayFontSize = metadata.weekdayFontSize ?? 12
    const weekdayFontWeight = metadata.weekdayFontWeight ?? 600

    const dayNumberColor = metadata.dayNumberColor ?? '#1f2937'
    const dayNumberMutedColor = metadata.dayNumberMutedColor ?? '#9ca3af'
    const dayNumberFontFamily = metadata.dayNumberFontFamily ?? 'Inter'
    const dayNumberFontSize = metadata.dayNumberFontSize ?? 16
    const dayNumberFontWeight = metadata.dayNumberFontWeight ?? 600

    const cellGap = Math.max(0, Number(metadata.cellGap ?? 0) || 0)
    const dayNumberInsetX = Math.max(0, Number(metadata.dayNumberInsetX ?? 12) || 0)
    const dayNumberInsetY = Math.max(0, Number(metadata.dayNumberInsetY ?? 8) || 0)

    const gridHeight = height - headerHeight - weekdayHeight
    const cellHeight = (gridHeight - cellGap * 5) / 6
    const cellWidth = (width - cellGap * 6) / 7

    objects.push(
      new Rect({
        width,
        height,
        rx: cornerRadius,
        ry: cornerRadius,
        fill: backgroundColor,
        stroke: borderColor,
        strokeWidth: borderWidth,
      }),
    )

    if (metadata.showHeader) {
      const monthName = calendarGeneratorService.getMonthName(metadata.month)
      const headerText = metadata.title ?? `${monthName} ${metadata.year}`
      const headerTextTop = Math.max(0, (headerHeight - headerFontSize) / 2)
      objects.push(
        new Rect({
          top: 0,
          left: 0,
          width,
          height: headerHeight,
          rx: cornerRadius,
          ry: cornerRadius,
          fill: headerBackgroundColor,
          opacity: headerBackgroundOpacity,
        }),
      )
      objects.push(
        new Textbox(headerText, {
          left: 32,
          top: headerTextTop,
          width: width - 64,
          fontSize: headerFontSize,
          fontFamily: headerFontFamily,
          fontWeight: headerFontWeight,
          fill: headerTextColor,
          selectable: false,
        }),
      )
    }

    if (metadata.showWeekdays) {
      const labels = calendarGeneratorService.getWeekdayNames(metadata.startDay, 'en', 'short')
      const weekdayTextTop = headerHeight + Math.max(0, (weekdayHeight - weekdayFontSize) / 2)
      labels.forEach((label, index) => {
        objects.push(
          new Textbox(label.toUpperCase(), {
            left: index * (cellWidth + cellGap) + 12,
            top: weekdayTextTop,
            width: cellWidth - 24,
            fontSize: weekdayFontSize,
            fontFamily: weekdayFontFamily,
            fontWeight: weekdayFontWeight,
            fill: weekdayTextColor,
            textAlign: 'center',
            selectable: false,
          }),
        )
      })
    }

    const holidays = getHolidaysForCalendarYear(metadata.year)
    const monthData =
      metadata.mode === 'month'
        ? calendarGeneratorService.generateMonth(metadata.year, metadata.month, holidays, metadata.startDay)
        : null
    const weeks = monthData?.weeks ?? Array.from({ length: 6 }, () => Array(7).fill(null))

    weeks.forEach((week, weekIndex) => {
      week.forEach((maybeDay, dayIndex) => {
        const top =
          headerHeight + weekdayHeight + weekIndex * (cellHeight + cellGap)
        const left = dayIndex * (cellWidth + cellGap)

        if (
          maybeDay &&
          metadata.weekendBackgroundColor &&
          maybeDay.isWeekend &&
          maybeDay.isCurrentMonth
        ) {
          objects.push(
            new Rect({
              top,
              left,
              width: cellWidth,
              height: cellHeight,
              fill: metadata.weekendBackgroundColor,
              selectable: false,
              evented: false,
            }),
          )
        }

        if (maybeDay && metadata.todayBackgroundColor && maybeDay.isToday) {
          objects.push(
            new Rect({
              top,
              left,
              width: cellWidth,
              height: cellHeight,
              fill: metadata.todayBackgroundColor,
              selectable: false,
              evented: false,
            }),
          )
        }

        objects.push(
          new Rect({
            top,
            left,
            width: cellWidth,
            height: cellHeight,
            fill: 'transparent',
            stroke: gridLineColor,
            strokeWidth: gridLineWidth,
            selectable: false,
          }),
        )

        if (maybeDay) {
          const dayNumberBoxWidth = Math.max(18, Math.min(40, dayNumberFontSize * 2))
          objects.push(
            new Textbox(String(maybeDay.dayOfMonth), {
              left: left + cellWidth - dayNumberInsetX - dayNumberBoxWidth,
              top: top + dayNumberInsetY,
              width: dayNumberBoxWidth,
              fontSize: dayNumberFontSize,
              fontFamily: dayNumberFontFamily,
              fontWeight: dayNumberFontWeight,
              fill: maybeDay.isCurrentMonth ? dayNumberColor : dayNumberMutedColor,
              textAlign: 'right',
              selectable: false,
            }),
          )

          if (metadata.showHolidayMarkers !== false && maybeDay.holidays?.length) {
            const markerHeight = Math.max(1, metadata.holidayMarkerHeight ?? 4)
            objects.push(
              new Rect({
                left: left + 12,
                top: top + cellHeight - 12 - markerHeight,
                width: cellWidth - 24,
                height: markerHeight,
                rx: 2,
                ry: 2,
                fill: metadata.holidayMarkerColor ?? '#ef4444',
                selectable: false,
              }),
            )
          }
        }
      })
    })

    return new Group(objects, {
      subTargetCheck: false,
      hasControls: true,
      hoverCursor: 'move',
    })
  }

  function buildWeekStripGraphics(metadata: WeekStripMetadata): Group {
    const { width, height } = metadata.size
    const objects: FabricObject[] = []

    const cornerRadius = Math.max(0, metadata.cornerRadius ?? 24)
    const borderWidth = Math.max(0, metadata.borderWidth ?? 1)
    const backgroundColor = metadata.backgroundColor ?? '#ffffff'
    const borderColor = metadata.borderColor ?? '#e5e7eb'
    const cellBorderColor = metadata.cellBorderColor ?? '#f1f5f9'
    const cellBorderWidth = Math.max(0, metadata.cellBorderWidth ?? 1)

    const labelColor = metadata.labelColor ?? '#0f172a'
    const labelFontFamily = metadata.labelFontFamily ?? 'Inter'
    const labelFontSize = metadata.labelFontSize ?? 16
    const labelFontWeight = metadata.labelFontWeight ?? 600

    const weekdayColor = metadata.weekdayColor ?? '#64748b'
    const weekdayFontFamily = metadata.weekdayFontFamily ?? 'Inter'
    const weekdayFontSize = metadata.weekdayFontSize ?? 12
    const weekdayFontWeight = metadata.weekdayFontWeight ?? 600

    const dayNumberColor = metadata.dayNumberColor ?? '#0f172a'
    const dayNumberFontFamily = metadata.dayNumberFontFamily ?? 'Inter'
    const dayNumberFontSize = metadata.dayNumberFontSize ?? 22
    const dayNumberFontWeight = metadata.dayNumberFontWeight ?? 700

    objects.push(
      new Rect({
        width,
        height,
        rx: cornerRadius,
        ry: cornerRadius,
        fill: backgroundColor,
        stroke: borderColor,
        strokeWidth: borderWidth,
      }),
    )

    const label = metadata.label ?? 'Weekly Focus'

    const paddingX = 24
    const paddingBottom = Math.max(12, Math.round(height * 0.12))
    const headerHeight = Math.min(
      Math.max(40, Math.round(labelFontSize + 24)),
      Math.max(44, Math.round(height * 0.45)),
    )
    const labelTop = Math.max(12, Math.min(20, Math.round((headerHeight - labelFontSize) / 2)))
    objects.push(
      new Textbox(label, {
        left: paddingX,
        top: labelTop,
        width: width - paddingX * 2,
        fontSize: labelFontSize,
        fontFamily: labelFontFamily,
        fontWeight: labelFontWeight,
        fill: labelColor,
        selectable: false,
      }),
    )

    const days = calendarGeneratorService.generateWeek(new Date(metadata.startDate), [], metadata.startDay)
    const cellWidth = width / days.length

    const weekdayRowHeightRaw = Math.max(18, Math.round(height * 0.16))
    const weekdayRowHeight = Math.max(0, Math.min(34, Math.min(weekdayRowHeightRaw, height - headerHeight - paddingBottom)))
    const bodyTop = headerHeight + weekdayRowHeight
    const cellHeight = Math.max(0, height - bodyTop - paddingBottom)

    const cellInsetX = 12
    const dayNumberInsetX = 12
    const dayNumberInsetY = 8

    if (weekdayRowHeight > 0) {
      const weekdayFontSizeEff = Math.min(weekdayFontSize, Math.max(8, Math.floor(weekdayRowHeight * 0.55)))
      const weekdayTextTop = headerHeight + Math.max(0, (weekdayRowHeight - weekdayFontSizeEff) / 2)
      days.forEach((day, index) => {
        objects.push(
          new Textbox(day.date.toLocaleDateString('en', { weekday: 'short' }).toUpperCase(), {
            left: index * cellWidth + cellInsetX,
            top: weekdayTextTop,
            width: cellWidth - cellInsetX * 2,
            fontSize: weekdayFontSizeEff,
            fontFamily: weekdayFontFamily,
            fontWeight: weekdayFontWeight,
            fill: weekdayColor,
            textAlign: 'center',
            selectable: false,
          }),
        )
      })
    }

    const dayNumberFontSizeEff = Math.min(dayNumberFontSize, Math.max(10, Math.floor(cellHeight * 0.42)))
    const dayNumberBoxWidth = Math.max(18, Math.min(40, dayNumberFontSizeEff * 2))

    days.forEach((day, index) => {
      const left = index * cellWidth
      objects.push(
        new Rect({
          left,
          top: bodyTop,
          width: cellWidth,
          height: cellHeight,
          fill: 'transparent',
          stroke: cellBorderColor,
          strokeWidth: cellBorderWidth,
          selectable: false,
        }),
      )
      objects.push(
        new Textbox(String(day.dayOfMonth), {
          left: left + cellWidth - dayNumberInsetX - dayNumberBoxWidth,
          top: bodyTop + dayNumberInsetY,
          width: dayNumberBoxWidth,
          fontSize: dayNumberFontSizeEff,
          fontFamily: dayNumberFontFamily,
          fontWeight: dayNumberFontWeight,
          fill: dayNumberColor,
          textAlign: 'right',
          selectable: false,
        }),
      )
    })

    return new Group(objects, {
      subTargetCheck: false,
      hoverCursor: 'move',
    })
  }

  function buildDateCellGraphics(metadata: DateCellMetadata): Group {
    const { width, height } = metadata.size
    const objects: FabricObject[] = []
    const date = new Date(metadata.date)

    const cornerRadius = Math.max(0, metadata.cornerRadius ?? 24)
    const borderWidth = Math.max(0, metadata.borderWidth ?? 1)
    const backgroundColor = metadata.backgroundColor ?? '#ffffff'
    const borderColor = metadata.borderColor ?? '#e2e8f0'
    const accentRatioRaw = metadata.accentHeightRatio ?? 0.4
    const accentRatio = Math.max(0.05, Math.min(0.85, Number(accentRatioRaw) || 0.4))
    const accentHeight = height * accentRatio
    const paddingX = 16
    const paddingY = 16

    const weekdayColor = metadata.weekdayColor ?? '#78350f'
    const weekdayFontFamily = metadata.weekdayFontFamily ?? 'Inter'
    const weekdayFontSize = metadata.weekdayFontSize ?? 13
    const weekdayFontWeight = metadata.weekdayFontWeight ?? 600

    const dayNumberColor = metadata.dayNumberColor ?? '#92400e'
    const dayNumberFontFamily = metadata.dayNumberFontFamily ?? 'Inter'
    const dayNumberFontSize = metadata.dayNumberFontSize ?? 52
    const dayNumberFontWeight = metadata.dayNumberFontWeight ?? 700

    const placeholderColor = metadata.placeholderColor ?? '#475569'
    const placeholderFontFamily = metadata.placeholderFontFamily ?? 'Inter'
    const placeholderFontSize = metadata.placeholderFontSize ?? 13
    const placeholderFontWeight = metadata.placeholderFontWeight ?? 400

    objects.push(
      new Rect({
        width,
        height,
        rx: cornerRadius,
        ry: cornerRadius,
        fill: backgroundColor,
        stroke: borderColor,
        strokeWidth: borderWidth,
      }),
    )

    objects.push(
      new Rect({
        width,
        height: accentHeight,
        rx: cornerRadius,
        ry: cornerRadius,
        fill: metadata.highlightAccent,
      }),
    )

    const weekdayFontSizeEff = Math.min(weekdayFontSize, Math.max(10, Math.floor(accentHeight * 0.22)))
    const weekdayTop = Math.max(12, Math.min(paddingY, Math.floor(accentHeight * 0.18)))
    const dayNumberTopBase = weekdayTop + weekdayFontSizeEff + 6
    const dayNumberFontSizeEff = Math.max(
      18,
      Math.min(dayNumberFontSize, Math.floor(accentHeight - dayNumberTopBase - 10)),
    )

    objects.push(
      new Textbox(date.toLocaleDateString('en', { weekday: 'long' }), {
        left: paddingX,
        top: weekdayTop,
        width: width - paddingX * 2,
        fontSize: weekdayFontSizeEff,
        fontFamily: weekdayFontFamily,
        fontWeight: weekdayFontWeight,
        fill: weekdayColor,
        selectable: false,
      }),
    )

    objects.push(
      new Textbox(String(date.getDate()), {
        left: paddingX,
        top: dayNumberTopBase,
        width: width - paddingX * 2,
        fontSize: dayNumberFontSizeEff,
        fontFamily: dayNumberFontFamily,
        fontWeight: dayNumberFontWeight,
        fill: dayNumberColor,
        selectable: false,
      }),
    )

    const placeholderTop = accentHeight + 14
    const placeholderFontSizeEff = Math.min(placeholderFontSize, Math.max(10, Math.floor((height - placeholderTop - paddingY) * 0.22)))
    objects.push(
      new Textbox(metadata.notePlaceholder ?? 'Add event', {
        left: paddingX,
        top: placeholderTop,
        width: width - paddingX * 2,
        fontSize: placeholderFontSizeEff,
        fontFamily: placeholderFontFamily,
        fontWeight: placeholderFontWeight,
        fill: placeholderColor,
        selectable: false,
      }),
    )

    return new Group(objects, {
      subTargetCheck: false,
      hoverCursor: 'move',
    })
  }

  function buildPlannerNoteGraphics(metadata: PlannerNoteMetadata): Group {
    const { width, height } = metadata.size
    const objects: FabricObject[] = []

    const cornerRadius = Math.max(0, metadata.cornerRadius ?? 22)
    const borderWidth = Math.max(0, metadata.borderWidth ?? 1)
    const borderColor = metadata.borderColor ?? '#e2e8f0'
    const backgroundColor = metadata.backgroundColor ?? '#ffffff'
    const headerStyle = metadata.headerStyle ?? (metadata.pattern === 'hero' ? 'filled' : 'minimal')

    const paddingX = 24
    const paddingTop = 18
    const headerHeight = headerStyle === 'none' ? 0 : 48
    const bodyTop = paddingTop + (headerStyle === 'none' ? 18 : headerHeight)
    const headerRectRadius = Math.min(cornerRadius, 12)

    objects.push(
      new Rect({
        width,
        height,
        rx: cornerRadius,
        ry: cornerRadius,
        fill: backgroundColor,
        stroke: borderColor,
        strokeWidth: borderWidth,
      }),
    )

    if (headerStyle === 'filled' || headerStyle === 'tint') {
      const fill = metadata.headerBackgroundColor ?? metadata.accentColor
      const opacity =
        headerStyle === 'filled'
          ? metadata.headerBackgroundOpacity ?? 1
          : metadata.headerBackgroundOpacity ?? 0.12

      objects.push(
        new Rect({
          width,
          height: headerHeight,
          rx: headerRectRadius,
          ry: headerRectRadius,
          fill,
          opacity,
        }),
      )
    }

    const titleColor =
      metadata.titleColor ??
      (headerStyle === 'filled' ? '#ffffff' : '#0f172a')

    objects.push(
      new Textbox(metadata.title, {
        left: paddingX,
        top: paddingTop + (headerStyle === 'none' ? 2 : 12),
        width: width - paddingX * 2,
        fontSize: 15,
        fontFamily: 'Inter',
        fontWeight: 700,
        fill: titleColor,
        selectable: false,
      }),
    )

    if (headerStyle === 'minimal') {
      objects.push(
        new Line([paddingX, paddingTop + 34, width - paddingX, paddingTop + 34], {
          stroke: metadata.accentColor,
          strokeWidth: 2,
          selectable: false,
          opacity: 0.9,
        }),
      )
    }

    if (metadata.pattern === 'ruled') {
      const guideColor = metadata.guideColor ?? '#e2e8f0'
      for (let y = bodyTop + 16; y < height - 24; y += 26) {
        objects.push(
          new Line([24, y, width - 24, y], {
            stroke: guideColor,
            strokeWidth: 1,
            selectable: false,
          }),
        )
      }
    }

    if (metadata.pattern === 'grid') {
      const guideColor = metadata.guideColor ?? '#eff6ff'
      for (let x = 24; x < width - 24; x += 24) {
        objects.push(
          new Line([x, bodyTop + 6, x, height - 24], {
            stroke: guideColor,
            strokeWidth: 1,
            selectable: false,
          }),
        )
      }
      for (let y = bodyTop + 6; y < height - 24; y += 24) {
        objects.push(
          new Line([24, y, width - 24, y], {
            stroke: guideColor,
            strokeWidth: 1,
            selectable: false,
          }),
        )
      }
    }

    if (metadata.pattern === 'dot') {
      const dotColor = metadata.dotColor ?? '#cbd5f5'
      for (let x = 28; x < width - 28; x += 20) {
        for (let y = bodyTop + 16; y < height - 28; y += 20) {
          objects.push(
            new Rect({
              left: x,
              top: y,
              width: 2,
              height: 2,
              rx: 1,
              ry: 1,
              fill: dotColor,
              selectable: false,
            }),
          )
        }
      }
    }

    return new Group(objects, {
      subTargetCheck: false,
      hoverCursor: 'move',
    })
  }

  function buildScheduleGraphics(metadata: ScheduleMetadata): Group {
    const { width, height } = metadata.size
    const objects: FabricObject[] = []

    const paddingX = 24
    const paddingTop = 18
    const cornerRadius = Math.max(0, metadata.cornerRadius ?? 22)
    const borderWidth = Math.max(0, metadata.borderWidth ?? 1)
    const borderColor = metadata.borderColor ?? '#e2e8f0'
    const backgroundColor = metadata.backgroundColor ?? '#ffffff'
    const headerStyle = metadata.headerStyle ?? 'minimal'
    const headerHeight = headerStyle === 'none' ? 0 : 48
    const bodyTop = paddingTop + (headerStyle === 'none' ? 18 : headerHeight)
    const headerRectRadius = Math.min(cornerRadius, 12)

    objects.push(
      new Rect({
        width,
        height,
        rx: cornerRadius,
        ry: cornerRadius,
        fill: backgroundColor,
        stroke: borderColor,
        strokeWidth: borderWidth,
      }),
    )

    if (headerStyle === 'filled' || headerStyle === 'tint') {
      const fill = metadata.headerBackgroundColor ?? metadata.accentColor
      const opacity =
        headerStyle === 'filled'
          ? metadata.headerBackgroundOpacity ?? 1
          : metadata.headerBackgroundOpacity ?? 0.12
      objects.push(
        new Rect({
          width,
          height: headerHeight,
          rx: headerRectRadius,
          ry: headerRectRadius,
          fill,
          opacity,
        }),
      )
    }

    const titleColor =
      metadata.titleColor ?? (headerStyle === 'filled' ? '#ffffff' : '#0f172a')

    objects.push(
      new Textbox(metadata.title, {
        left: paddingX,
        top: paddingTop + (headerStyle === 'none' ? 2 : 12),
        width: width - paddingX * 2,
        fontSize: 15,
        fontFamily: 'Inter',
        fontWeight: 700,
        fill: titleColor,
        selectable: false,
      }),
    )

    if (headerStyle === 'minimal') {
      objects.push(
        new Line([paddingX, paddingTop + 34, width - paddingX, paddingTop + 34], {
          stroke: metadata.accentColor,
          strokeWidth: 2,
          selectable: false,
          opacity: 0.9,
        }),
      )
    }

    const totalMinutes = Math.max(0, (metadata.endHour - metadata.startHour) * 60)
    const step = metadata.intervalMinutes
    const slots = Math.max(1, Math.floor(totalMinutes / step) + 1)
    const availableHeight = Math.max(1, height - bodyTop - 22)
    const rowHeight = availableHeight / slots

    const timeLabelWidth = 56
    const lineLeft = paddingX + timeLabelWidth
    const lineRight = width - paddingX

    const lineColor = metadata.lineColor ?? '#e2e8f0'
    const timeLabelColor = metadata.timeLabelColor ?? '#64748b'

    for (let i = 0; i < slots; i++) {
      const minutes = metadata.startHour * 60 + i * step
      const hour = Math.floor(minutes / 60)
      const minute = minutes % 60
      const label = `${hour % 12 === 0 ? 12 : hour % 12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`
      const y = bodyTop + i * rowHeight

      objects.push(
        new Textbox(label, {
          left: paddingX,
          top: y - 8,
          width: timeLabelWidth - 8,
          fontSize: 10,
          fontFamily: 'Inter',
          fontWeight: 600,
          fill: timeLabelColor,
          selectable: false,
        }),
      )

      objects.push(
        new Line([lineLeft, y, lineRight, y], {
          stroke: lineColor,
          strokeWidth: 1,
          selectable: false,
        }),
      )
    }

    return new Group(objects, {
      subTargetCheck: false,
      hoverCursor: 'move',
    })
  }

  function buildChecklistGraphics(metadata: ChecklistMetadata): Group {
    const { width, height } = metadata.size
    const objects: FabricObject[] = []

    const paddingX = 24
    const paddingTop = 18
    const cornerRadius = Math.max(0, metadata.cornerRadius ?? 22)
    const borderWidth = Math.max(0, metadata.borderWidth ?? 1)
    const borderColor = metadata.borderColor ?? '#e2e8f0'
    const backgroundColor = metadata.backgroundColor ?? '#ffffff'
    const headerStyle = metadata.headerStyle ?? 'tint'
    const headerHeight = headerStyle === 'none' ? 0 : 48
    const bodyTop = paddingTop + (headerStyle === 'none' ? 18 : headerHeight)
    const headerRectRadius = Math.min(cornerRadius, 12)

    objects.push(
      new Rect({
        width,
        height,
        rx: cornerRadius,
        ry: cornerRadius,
        fill: backgroundColor,
        stroke: borderColor,
        strokeWidth: borderWidth,
      }),
    )

    if (headerStyle === 'filled' || headerStyle === 'tint') {
      const fill = metadata.headerBackgroundColor ?? metadata.accentColor
      const opacity =
        headerStyle === 'filled'
          ? metadata.headerBackgroundOpacity ?? 1
          : metadata.headerBackgroundOpacity ?? 0.12
      objects.push(
        new Rect({
          width,
          height: headerHeight,
          rx: headerRectRadius,
          ry: headerRectRadius,
          fill,
          opacity,
        }),
      )
    }

    const titleColor =
      metadata.titleColor ?? (headerStyle === 'filled' ? '#ffffff' : '#0f172a')

    objects.push(
      new Textbox(metadata.title, {
        left: paddingX,
        top: paddingTop + (headerStyle === 'none' ? 2 : 12),
        width: width - paddingX * 2,
        fontSize: 15,
        fontFamily: 'Inter',
        fontWeight: 700,
        fill: titleColor,
        selectable: false,
      }),
    )

    if (headerStyle === 'minimal') {
      objects.push(
        new Line([paddingX, paddingTop + 34, width - paddingX, paddingTop + 34], {
          stroke: metadata.accentColor,
          strokeWidth: 2,
          selectable: false,
          opacity: 0.9,
        }),
      )
    }

    const rows = Math.max(1, metadata.rows)
    const availableHeight = Math.max(1, height - bodyTop - 22)
    const rowHeight = availableHeight / rows

    const checkboxSize = 14
    const checkboxLeft = paddingX
    const lineLeft = metadata.showCheckboxes ? checkboxLeft + checkboxSize + 12 : paddingX
    const lineRight = width - paddingX

    const lineColor = metadata.lineColor ?? '#e2e8f0'
    const checkboxColor = metadata.checkboxColor ?? metadata.accentColor

    for (let i = 0; i < rows; i++) {
      const y = bodyTop + i * rowHeight + rowHeight / 2

      if (metadata.showCheckboxes) {
        objects.push(
          new Rect({
            left: checkboxLeft,
            top: y - checkboxSize / 2,
            width: checkboxSize,
            height: checkboxSize,
            rx: 4,
            ry: 4,
            fill: '#ffffff',
            stroke: checkboxColor,
            strokeWidth: 2,
            selectable: false,
          }),
        )
      }

      objects.push(
        new Line([lineLeft, y + 6, lineRight, y + 6], {
          stroke: lineColor,
          strokeWidth: 1,
          selectable: false,
        }),
      )
    }

    return new Group(objects, {
      subTargetCheck: false,
      hoverCursor: 'move',
    })
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
  
  function initializeCanvas(canvasElement: HTMLCanvasElement): void {
    if (!project.value) return 

    const normalized = normalizeCanvasSize(project.value.canvas)
    project.value.canvas.width = normalized.width
    project.value.canvas.height = normalized.height

    canvas.value = new Canvas(canvasElement, {
      width: project.value.canvas.width,
      height: project.value.canvas.height,
      backgroundColor: project.value.canvas.backgroundColor || '#ffffff',
      selection: true,
      preserveObjectStacking: true,
      // Enable image smoothing for better quality at different zoom levels
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high',
    })

    // Set canvas element to allow proper panning via viewportTransform
    const canvasEl = canvas.value.getElement()
    const canvasWrapperEl = canvas.value.wrapperEl
    if (canvasEl && canvasWrapperEl) {
      // Ensure canvas can pan within its container
      canvasWrapperEl.style.position = 'absolute'
      canvasWrapperEl.style.top = '0'
      canvasWrapperEl.style.left = '0'
      canvasWrapperEl.style.width = '100%'
      canvasWrapperEl.style.height = '100%'
      
      // Canvas element should be able to extend beyond container for panning
      canvasEl.style.position = 'absolute'
      canvasEl.style.top = '0'
      canvasEl.style.left = '0'
      canvasEl.style.transformOrigin = 'top left'
    }

    // Set up event listeners
    setupCanvasEvents()

    // Load existing objects if any
    if (project.value.canvas.objects.length) {
      loadCanvasState(project.value.canvas)
    }

    // Save initial state to history
    saveToHistory()
  }

  function setupCanvasEvents(): void {
    if (!canvas.value) return

    canvas.value.on('selection:created', handleSelectionChange)
    canvas.value.on('selection:updated', handleSelectionChange)
    canvas.value.on('selection:cleared', handleSelectionCleared)
    canvas.value.on('object:modified', handleObjectModified)
    canvas.value.on('object:added', handleObjectAdded)
    canvas.value.on('object:removed', handleObjectRemoved)
  }


  function handleSelectionChange(): void {
    const selected = (canvas.value?.getActiveObjects?.() ?? []) as any[]
    selected.forEach((obj) => ensureObjectIdentity(obj))
    selectedObjectIds.value = selected.map((obj) => obj.id).filter(Boolean)
  }

  function handleSelectionCleared(): void {
    selectedObjectIds.value = []
  }

  let isBakingCalendarScale = false

  function bakeScaledCalendarElementSize(target: FabricObject): void {
    if (!canvas.value) return
    if (isBakingCalendarScale) return

    const meta = (target as any)?.data?.elementMetadata as CanvasElementMetadata | undefined
    if (!meta) return
    if (meta.kind !== 'calendar-grid' && meta.kind !== 'week-strip' && meta.kind !== 'date-cell') return

    const scaleX = Number((target as any).scaleX ?? 1) || 1
    const scaleY = Number((target as any).scaleY ?? 1) || 1
    const hasScale = Math.abs(scaleX - 1) > 1e-3 || Math.abs(scaleY - 1) > 1e-3
    if (!hasScale) return

    // Convert the scaled display size into the authoritative metadata.size, then rebuild at scale 1.
    const nextWidth = Math.max(10, Math.round(target.getScaledWidth()))
    const nextHeight = Math.max(10, Math.round(target.getScaledHeight()))

    const nextMetadata = JSON.parse(JSON.stringify(meta)) as CanvasElementMetadata
    ;(nextMetadata as any).size = { width: nextWidth, height: nextHeight }

    isBakingCalendarScale = true
    try {
      target.set({ scaleX: 1, scaleY: 1 })
      ;(target as any).dirty = true
      if (typeof (target as any).setCoords === 'function') {
        ;(target as any).setCoords()
      }

      const rebuilt = rebuildElementWithMetadata(target, nextMetadata)
      if (!rebuilt) return

      canvas.value.remove(target)
      canvas.value.add(rebuilt)
      canvas.value.setActiveObject(rebuilt)
      canvas.value.renderAll()
    } finally {
      isBakingCalendarScale = false
    }
  }

  function handleObjectModified(e: any): void {
    const target = (e?.target as FabricObject | undefined) ?? null
    if (target) {
      bakeScaledCalendarElementSize(target)
    }
    isDirty.value = true
    saveToHistory()
  }

  function handleObjectAdded(): void {
    if (canvas.value) {
      const objects = canvas.value.getObjects() as any[]
      const last = objects[objects.length - 1]
      if (last) ensureObjectIdentity(last)
    }
    isDirty.value = true
  }

  function handleObjectRemoved(): void {
    isDirty.value = true
    saveToHistory()
  }

  function destroyCanvas(): void {
    if (canvas.value) {
      canvas.value.dispose()
      canvas.value = null
    }
  }

  function getObjectTypeName(type: string): string {
    const names: Record<string, string> = {
      textbox: 'Text',
      rect: 'Rectangle',
      circle: 'Circle',
      line: 'Line',
      image: 'Image',
      group: 'Group',
    }
    return names[type] || type
  }

  function getFriendlyObjectName(obj: any): string {
    const metadata = obj?.data?.elementMetadata as CanvasElementMetadata | undefined
    if (metadata?.kind === 'calendar-grid') return 'Calendar Grid'
    if (metadata?.kind === 'week-strip') return 'Week Strip'
    if (metadata?.kind === 'date-cell') return 'Date Cell'
    if (metadata?.kind === 'planner-note') return 'Notes Panel'
    if (metadata?.kind === 'schedule') return 'Schedule'
    if (metadata?.kind === 'checklist') return 'Checklist'
    return getObjectTypeName(obj?.type)
  }

  function getLayerNameForMetadata(metadata: CanvasElementMetadata): string {
    if (metadata.kind === 'planner-note') return `Notes: ${metadata.title}`
    if (metadata.kind === 'schedule') return `Schedule: ${metadata.title}`
    if (metadata.kind === 'checklist') return `Checklist: ${metadata.title}`
    if (metadata.kind === 'week-strip') return `Week Strip: ${metadata.label ?? 'Week Plan'}`
    return getFriendlyObjectName({ data: { elementMetadata: metadata } })
  }

  function ensureObjectIdentity(obj: any): void {
    if (!obj) return
    if (!obj.id) {
      obj.set?.('id', generateObjectId(obj.type || 'object'))
      if (!obj.id) obj.id = generateObjectId(obj.type || 'object')
    }
    const metadata = obj?.data?.elementMetadata as CanvasElementMetadata | undefined
    const friendly = getFriendlyObjectName(obj)
    const shouldReplaceName =
      !obj.name ||
      obj.name === friendly ||
      obj.name === 'Group'

    if (metadata && shouldReplaceName) {
      const next = getLayerNameForMetadata(metadata)
      obj.set?.('name', next)
      if (!obj.name) obj.name = next
      return
    }

    if (!obj.name) {
      obj.set?.('name', friendly)
      if (!obj.name) obj.name = friendly
    }

    const isArrowGroup =
      obj?.type === 'group' &&
      (obj?.data?.shapeKind === 'arrow' ||
        (Array.isArray(obj?._objects) && obj._objects.some((o: any) => o?.data?.arrowPart)))

    if (isArrowGroup) {
      ;(obj as any).data = {
        ...((obj as any).data ?? {}),
        shapeKind: 'arrow',
      }
      refreshArrowGroupGeometry(obj as unknown as Group)
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // OBJECT OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  function addObject(type: ObjectType, options: Partial<any> = {}): void {
    if (!canvas.value) return

    const id = generateObjectId(type)
    let fabricObject: FabricObject | null = null

    switch (type) {
      case 'text':
        fabricObject = createTextObject(id, options)
        break
      case 'image':
        // Image objects are handled separately via addImage
        break
      case 'shape':
        fabricObject = createShapeObject(id, options)
        break
      case 'calendar-grid':
        fabricObject = createCalendarGridObject(id, options)
        break
      case 'week-strip':
        fabricObject = createWeekStripObject(id, options)
        break
      case 'date-cell':
        fabricObject = createDateCellObject(id, options)
        break
      case 'notes-panel':
        fabricObject = createNotesPanelObject(id, options)
        break
      case 'schedule':
        fabricObject = createScheduleObject(id, options)
        break
      case 'checklist':
        fabricObject = createChecklistObject(id, options)
        break
    }

    if (fabricObject) {
      ensureObjectIdentity(fabricObject as any)
      canvas.value.add(fabricObject)
      canvas.value.setActiveObject(fabricObject)
      canvas.value.renderAll()
      snapshotCanvasState()
    }
  }

  function createTextObject(id: string, options: any): FabricObject {
    const {
      content: rawContent,
      x,
      y,
      left,
      top,
      color,
      fill,
      selectable,
      evented,
      width,
      fontFamily,
      fontSize: providedFontSize,
      textAlign,
      originX,
      originY,
      ...other
    } = options

    const content =
      typeof rawContent === 'number'
        ? String(rawContent)
        : rawContent || 'Double-click to edit'

    const fontSize = providedFontSize || 24
    const estimatedWidth = Math.max(content.length * fontSize * 0.6 + 8, fontSize)

    const textbox = new Textbox(content, {
      id,
      name: options.name ?? 'Text',
      left: x ?? left ?? 100,
      top: y ?? top ?? 100,
      fontFamily: fontFamily ?? 'Inter',
      fontSize,
      fill: color ?? fill ?? '#000000',
      textAlign: textAlign ?? 'left',
      originX: originX ?? 'center',
      originY: originY ?? 'top',
      selectable: selectable ?? true,
      evented: evented ?? true,
      lockRotation: options.lockRotation ?? true,
      hasRotatingPoint: options.hasRotatingPoint ?? false,
      borderColor: options.borderColor ?? '#2563eb',
      cornerColor: options.cornerColor ?? '#ffffff',
      cornerStrokeColor: options.cornerStrokeColor ?? '#2563eb',
      cornerStyle: options.cornerStyle ?? 'circle',
      cornerSize: options.cornerSize ?? 8,
      transparentCorners: options.transparentCorners ?? false,
      borderScaleFactor: options.borderScaleFactor ?? 1,
      padding: options.padding ?? 0,
      hoverCursor: options.hoverCursor ?? 'pointer',
      ...other,
    })

    const measuredWidth = textbox.getLineWidth(0) + textbox.padding * 2
    const finalWidth = width ?? Math.max(measuredWidth, estimatedWidth)
    textbox.set({ width: finalWidth })
    textbox.initDimensions()

    return textbox
  }

  function createShapeObject(id: string, options: any): FabricObject {
    const {
      shapeType = 'rect',
      x,
      y,
      left,
      top,
      width,
      height,
      fill,
      stroke,
      strokeWidth,
      radius,
      cornerRadius,
      selectable,
      evented,
      ...other
    } = options

    const basePosition = {
      left: x ?? left ?? 100,
      top: y ?? top ?? 100,
      selectable: selectable ?? true,
      evented: evented ?? true,
    }

    switch (shapeType) {
      case 'circle':
        return new Circle({
          id,
          name: options.name ?? 'Circle',
          radius: radius ?? (width ? width / 2 : 50),
          fill: fill ?? '#3b82f6',
          stroke: stroke ?? '',
          strokeWidth: strokeWidth ?? 0,
          cornerStyle: other.cornerStyle ?? 'circle',
          cornerColor: other.cornerColor ?? '#ffffff',
          cornerStrokeColor: other.cornerStrokeColor ?? '#2563eb',
          borderColor: other.borderColor ?? '#2563eb',
          transparentCorners: other.transparentCorners ?? false,
          cornerSize: other.cornerSize ?? 8,
          ...basePosition,
          ...other,
        })
      case 'arrow':
        return createArrowObject(id, {
          name: options.name ?? 'Arrow',
          width,
          stroke,
          strokeWidth,
          ...basePosition,
          ...other,
        })
      case 'line':
        return new Line([0, 0, width ?? 100, 0], {
          id,
          name: options.name ?? 'Line',
          stroke: stroke ?? '#000000',
          strokeWidth: strokeWidth ?? 2,
          ...basePosition,
          ...other,
        })
      default:
        return new Rect({
          id,
          name: options.name ?? 'Rectangle',
          width: width ?? 100,
          height: height ?? 100,
          fill: fill ?? '#3b82f6',
          stroke: stroke ?? '',
          strokeWidth: strokeWidth ?? 0,
          rx: cornerRadius ?? other.rx ?? 0,
          ry: cornerRadius ?? other.ry ?? 0,
          ...basePosition,
          ...other,
        })
    }
  }

  function getArrowParts(group: Group): {
    line: Line | null
    startHead: Polygon | null
    endHead: Polygon | null
  } {
    const objs = (group.getObjects?.() ?? []) as any[]
    const line = (objs.find((o) => o?.data?.arrowPart === 'line' || o?.type === 'line') ?? null) as Line | null

    const startHead = (objs.find((o) => o?.data?.arrowPart === 'startHead') ?? null) as Polygon | null
    const endHead = (objs.find((o) => o?.data?.arrowPart === 'endHead') ?? null) as Polygon | null

    return { line, startHead, endHead }
  }

  function createArrowHeadPolygon(
    part: 'startHead' | 'endHead',
    headLength: number,
    headWidth: number,
    stroke: string,
    strokeWidth: number,
    style: 'filled' | 'open',
    strokeLineCap?: CanvasLineCap,
    strokeLineJoin?: CanvasLineJoin,
  ): Polygon {
    const points =
      part === 'endHead'
        ? [
            { x: 0, y: 0 },
            { x: 0, y: headWidth },
            { x: headLength, y: headWidth / 2 },
          ]
        : [
            { x: headLength, y: 0 },
            { x: headLength, y: headWidth },
            { x: 0, y: headWidth / 2 },
          ]

    const isOpen = style === 'open'

    const poly = new Polygon(points as any, {
      fill: isOpen ? 'transparent' : stroke,
      stroke,
      strokeWidth: isOpen ? strokeWidth : 0,
      strokeLineCap,
      strokeLineJoin,
      selectable: false,
      evented: false,
      objectCaching: false,
    })

    ;(poly as any).data = { ...(poly as any).data, arrowPart: part }
    return poly
  }

  function refreshArrowGroupGeometry(group: Group): void {
    const data = ((group as any).data ?? {}) as any
    const opts = (data.arrowOptions ?? {}) as any
    const { line, startHead, endHead } = getArrowParts(group)

    const stroke = (line as any)?.stroke ?? opts.stroke ?? '#000000'
    const strokeWidth = Math.max(1, Number((line as any)?.strokeWidth ?? opts.strokeWidth ?? 2) || 2)
    const strokeLineCap = ((line as any)?.strokeLineCap ?? opts.strokeLineCap) as CanvasLineCap | undefined
    const strokeLineJoin = ((line as any)?.strokeLineJoin ?? opts.strokeLineJoin) as CanvasLineJoin | undefined

    const headLength = Math.max(4, Number(opts.arrowHeadLength ?? Math.max(14, strokeWidth * 4)) || Math.max(14, strokeWidth * 4))
    const headWidth = Math.max(4, Number(opts.arrowHeadWidth ?? Math.max(10, headLength * 0.7)) || Math.max(10, headLength * 0.7))
    const arrowEnds = (opts.arrowEnds ?? 'end') as 'none' | 'start' | 'end' | 'both'
    const headStyle = (opts.arrowHeadStyle ?? 'filled') as 'filled' | 'open'

    const hasStart = arrowEnds === 'start' || arrowEnds === 'both'
    const hasEnd = arrowEnds === 'end' || arrowEnds === 'both'

    const inferredLineLen =
      line && typeof (line as any).x1 === 'number' && typeof (line as any).x2 === 'number'
        ? Math.abs(Number((line as any).x2) - Number((line as any).x1))
        : Math.max(10, Number((group as any).width ?? 140) || 140)

    const inferredBaseWidth = Math.max(10, inferredLineLen + (hasStart ? headLength : 0) + (hasEnd ? headLength : 0))
    const baseWidth = Math.max(10, Number(opts.baseWidth ?? inferredBaseWidth ?? (group as any).width ?? 140) || 140)

    const offsetX = -baseWidth / 2
    const y = 0
    const x1 = hasStart ? headLength : 0
    const x2 = Math.max(x1, baseWidth - (hasEnd ? headLength : 0))

    if (line) {
      const len = Math.max(0, x2 - x1)
      line.set({
        originX: 'left',
        originY: 'center',
        x1: 0,
        y1: 0,
        x2: len,
        y2: 0,
        left: offsetX + x1,
        top: y,
        objectCaching: false,
      } as any)
    }

    const addHead = (part: 'startHead' | 'endHead') => {
      const created = createArrowHeadPolygon(part, headLength, headWidth, stroke, strokeWidth, headStyle, strokeLineCap, strokeLineJoin)
      if (typeof (group as any).addWithUpdate === 'function') {
        ;(group as any).addWithUpdate(created)
      } else {
        ;(group as any).add?.(created)
      }
      return created
    }

    const removeHead = (head: Polygon | null) => {
      if (!head) return
      if (typeof (group as any).removeWithUpdate === 'function') {
        ;(group as any).removeWithUpdate(head)
      } else {
        ;(group as any).remove?.(head)
      }
    }

    if (!hasStart) {
      removeHead(startHead)
    }

    if (!hasEnd) {
      removeHead(endHead)
    }

    const nextStart = hasStart ? (startHead ?? addHead('startHead')) : null
    const nextEnd = hasEnd ? (endHead ?? addHead('endHead')) : null

    const updateHead = (head: Polygon, part: 'startHead' | 'endHead') => {
      const updated = createArrowHeadPolygon(part, headLength, headWidth, stroke, strokeWidth, headStyle, strokeLineCap, strokeLineJoin)
      head.set({
        points: (updated as any).points,
        fill: (updated as any).fill,
        stroke: (updated as any).stroke,
        strokeWidth: (updated as any).strokeWidth,
        strokeLineCap: (updated as any).strokeLineCap,
        strokeLineJoin: (updated as any).strokeLineJoin,
        originX: 'left',
        originY: 'center',
        left: offsetX + (part === 'endHead' ? baseWidth - headLength : 0),
        top: y,
        objectCaching: false,
      } as any)
    }

    if (nextStart) updateHead(nextStart, 'startHead')
    if (nextEnd) updateHead(nextEnd, 'endHead')

    ;(group as any).data = {
      ...data,
      shapeKind: 'arrow',
      arrowOptions: {
        ...opts,
        baseWidth,
        arrowHeadLength: headLength,
        arrowHeadWidth: headWidth,
        arrowHeadStyle: headStyle,
        arrowEnds,
        stroke,
        strokeWidth,
      },
    }

    ;(group as any).dirty = true
    ;(group as any)._calcBounds?.()
    ;(group as any)._updateObjectsCoords?.()
    ;(group as any).setCoords?.()
  }

  function createArrowObject(id: string, options: any): FabricObject {
    const {
      width: providedWidth,
      stroke: providedStroke,
      strokeWidth: providedStrokeWidth,
      arrowEnds: providedArrowEnds,
      arrowHeadStyle: providedHeadStyle,
      arrowHeadLength: providedHeadLength,
      arrowHeadWidth: providedHeadWidth,
      strokeDashArray,
      strokeLineCap,
      strokeLineJoin,
      ...groupOther
    } = options

    const width = Math.max(10, Number(providedWidth ?? 140) || 140)
    const stroke = providedStroke ?? '#000000'
    const strokeWidth = Math.max(1, Number(providedStrokeWidth ?? 2) || 2)
    const headLength = Math.max(4, Number(providedHeadLength ?? Math.max(14, strokeWidth * 4)) || Math.max(14, strokeWidth * 4))
    const headWidth = Math.max(4, Number(providedHeadWidth ?? Math.max(10, headLength * 0.7)) || Math.max(10, headLength * 0.7))
    const arrowEnds = (providedArrowEnds ?? 'end') as 'none' | 'start' | 'end' | 'both'
    const headStyle = (providedHeadStyle ?? 'filled') as 'filled' | 'open'

    const hasStart = arrowEnds === 'start' || arrowEnds === 'both'
    const hasEnd = arrowEnds === 'end' || arrowEnds === 'both'

    const offsetX = -width / 2
    const y = 0
    const x1 = hasStart ? headLength : 0
    const x2 = Math.max(x1, width - (hasEnd ? headLength : 0))

    const len = Math.max(0, x2 - x1)
    const line = new Line([0, 0, len, 0], {
      stroke,
      strokeWidth,
      strokeDashArray,
      strokeLineCap,
      strokeLineJoin,
      originX: 'left',
      originY: 'center',
      left: offsetX + x1,
      top: y,
      selectable: false,
      evented: false,
      objectCaching: false,
    })
    ;(line as any).data = { ...(line as any).data, arrowPart: 'line' }

    const objects: FabricObject[] = [line]

    if (hasStart) {
      const startHead = createArrowHeadPolygon('startHead', headLength, headWidth, stroke, strokeWidth, headStyle, strokeLineCap, strokeLineJoin)
      startHead.set({ originX: 'left', originY: 'center', left: offsetX + 0, top: y } as any)
      objects.push(startHead)
    }

    if (hasEnd) {
      const endHead = createArrowHeadPolygon('endHead', headLength, headWidth, stroke, strokeWidth, headStyle, strokeLineCap, strokeLineJoin)
      endHead.set({ originX: 'left', originY: 'center', left: offsetX + (width - headLength), top: y } as any)
      objects.push(endHead)
    }

    const group = new Group(objects, {
      id,
      name: options.name ?? 'Arrow',
      left: options.left ?? 100,
      top: options.top ?? 100,
      selectable: options.selectable ?? true,
      evented: options.evented ?? true,
      subTargetCheck: false,
      hoverCursor: 'move',
      objectCaching: false,
      ...groupOther,
    })

    ;(group as any).data = {
      ...((group as any).data ?? {}),
      shapeKind: 'arrow',
      arrowOptions: {
        baseWidth: width,
        arrowHeadLength: headLength,
        arrowHeadWidth: headWidth,
        arrowHeadStyle: headStyle,
        arrowEnds,
        stroke,
        strokeWidth,
      },
    }

    refreshArrowGroupGeometry(group)
    return group
  }

  function createCalendarGridObject(id: string, options: any): FabricObject {
    const metadata = getDefaultCalendarMetadata({
      mode: options.calendarMode,
      year: options.year,
      month: options.month,
      startDay: options.startDay,
      showHeader: options.showHeader,
      showWeekdays: options.showWeekdays,
      size: options.width && options.height ? { width: options.width, height: options.height } : undefined,
    })
    const group = buildCalendarGridGraphics(metadata)
    group.set({
      left: options.x ?? options.left ?? 100,
      top: options.y ?? options.top ?? 120,
      id,
      name: options.name ?? 'Calendar Grid',
      subTargetCheck: false,
      hoverCursor: 'move',
    })
    attachElementMetadata(group, metadata)
    return group
  }

  function createWeekStripObject(id: string, options: any): FabricObject {
    const metadata = getDefaultWeekStripMetadata({
      startDate: options.startDate,
      startDay: options.startDay,
      label: options.label,
      size: options.width && options.height ? { width: options.width, height: options.height } : undefined,
    })
    const group = buildWeekStripGraphics(metadata)
    group.set({
      left: options.x ?? options.left ?? 80,
      top: options.y ?? options.top ?? 120,
      id,
      name: options.name ?? 'Week Strip',
      subTargetCheck: false,
      hoverCursor: 'move',
    })
    attachElementMetadata(group, metadata)
    return group
  }

  function createDateCellObject(id: string, options: any): FabricObject {
    const metadata = getDefaultDateCellMetadata({
      date: options.date,
      highlightAccent: options.highlightAccent,
      notePlaceholder: options.notePlaceholder,
      size: options.width && options.height ? { width: options.width, height: options.height } : undefined,
    })
    const group = buildDateCellGraphics(metadata)
    group.set({
      left: options.x ?? options.left ?? 120,
      top: options.y ?? options.top ?? 140,
      id,
      name: options.name ?? 'Date Cell',
      subTargetCheck: false,
      hoverCursor: 'move',
    })
    attachElementMetadata(group, metadata)
    return group
  }

  function createNotesPanelObject(id: string, options: any): FabricObject {
    const metadata = getDefaultPlannerNoteMetadata(options.pattern ?? 'hero', {
      title: options.title,
      accentColor: options.accentColor,
      headerStyle: options.headerStyle,
      backgroundColor: options.backgroundColor,
      borderColor: options.borderColor,
      borderWidth: options.borderWidth,
      cornerRadius: options.cornerRadius,
      titleColor: options.titleColor,
      headerBackgroundColor: options.headerBackgroundColor,
      headerBackgroundOpacity: options.headerBackgroundOpacity,
      guideColor: options.guideColor,
      dotColor: options.dotColor,
      size: options.width && options.height ? { width: options.width, height: options.height } : undefined,
    })
    const group = buildPlannerNoteGraphics(metadata)
    group.set({
      left: options.x ?? options.left ?? 80,
      top: options.y ?? options.top ?? 80,
      id,
      name: options.name ?? getLayerNameForMetadata(metadata),
      subTargetCheck: false,
      hoverCursor: 'move',
    })
    attachElementMetadata(group, metadata)
    return group
  }

  function createScheduleObject(id: string, options: any): FabricObject {
    const metadata = getDefaultScheduleMetadata({
      title: options.title,
      accentColor: options.accentColor,
      startHour: options.startHour,
      endHour: options.endHour,
      intervalMinutes: options.intervalMinutes,
      headerStyle: options.headerStyle,
      backgroundColor: options.backgroundColor,
      borderColor: options.borderColor,
      borderWidth: options.borderWidth,
      cornerRadius: options.cornerRadius,
      titleColor: options.titleColor,
      headerBackgroundColor: options.headerBackgroundColor,
      headerBackgroundOpacity: options.headerBackgroundOpacity,
      lineColor: options.lineColor,
      timeLabelColor: options.timeLabelColor,
      size: options.width && options.height ? { width: options.width, height: options.height } : undefined,
    })
    const group = buildScheduleGraphics(metadata)
    group.set({
      left: options.x ?? options.left ?? 80,
      top: options.y ?? options.top ?? 120,
      id,
      name: options.name ?? getLayerNameForMetadata(metadata),
      subTargetCheck: false,
      hoverCursor: 'move',
    })
    attachElementMetadata(group, metadata)
    return group
  }

  function createChecklistObject(id: string, options: any): FabricObject {
    const metadata = getDefaultChecklistMetadata({
      title: options.title,
      accentColor: options.accentColor,
      rows: options.rows,
      showCheckboxes: options.showCheckboxes,
      headerStyle: options.headerStyle,
      backgroundColor: options.backgroundColor,
      borderColor: options.borderColor,
      borderWidth: options.borderWidth,
      cornerRadius: options.cornerRadius,
      titleColor: options.titleColor,
      headerBackgroundColor: options.headerBackgroundColor,
      headerBackgroundOpacity: options.headerBackgroundOpacity,
      lineColor: options.lineColor,
      checkboxColor: options.checkboxColor,
      size: options.width && options.height ? { width: options.width, height: options.height } : undefined,
    })
    const group = buildChecklistGraphics(metadata)
    group.set({
      left: options.x ?? options.left ?? 420,
      top: options.y ?? options.top ?? 160,
      id,
      name: options.name ?? getLayerNameForMetadata(metadata),
      subTargetCheck: false,
      hoverCursor: 'move',
    })
    attachElementMetadata(group, metadata)
    return group
  }

  async function addImage(url: string, options: any = {}): Promise<void> {
    if (!canvas.value) return

    return new Promise((resolve, reject) => {
      FabricImage.fromURL(url, {
        crossOrigin: 'anonymous',
      }).then((img: FabricImage) => {
        img.set({
          id: generateObjectId('image'),
          name: options.name ?? 'Image',
          left: options.x || 100,
          top: options.y || 100,
          // FabricImage might not have scaleX/Y directly in some versions or needs type assertion if strict
          scaleX: options.scaleX || 1,
          scaleY: options.scaleY || 1,
        })

        // Scale to fit if too large
        const maxSize = 400
        if (img.width! > maxSize || img.height! > maxSize) {
          const scale = maxSize / Math.max(img.width!, img.height!)
          img.scale(scale)
        }

        canvas.value!.add(img)
        canvas.value!.setActiveObject(img)
        canvas.value!.renderAll()
        snapshotCanvasState()
        resolve()
      }).catch(reject)
    })
  }

  function deleteSelected(): void {
    if (!canvas.value) return

    const activeObjects = canvas.value.getActiveObjects()
    if (activeObjects.length === 0) return

    activeObjects.forEach((obj) => {
      canvas.value!.remove(obj)
    })

    canvas.value.discardActiveObject()
    canvas.value.renderAll()
    snapshotCanvasState()
  }

  function duplicateSelected(): void {
    if (!canvas.value) return

    const activeObject = canvas.value.getActiveObject()
    if (!activeObject) return

    activeObject.clone().then((cloned: FabricObject) => {
      cloned.set({
        left: (cloned.left || 0) + 20,
        top: (cloned.top || 0) + 20,
        // @ts-ignore - id is added custom prop
        id: generateObjectId(activeObject.type || 'object'),
      })
      ensureObjectIdentity(cloned as any)
      canvas.value!.add(cloned)
      canvas.value!.setActiveObject(cloned)
      canvas.value!.renderAll()
      snapshotCanvasState()
    })
  }

  function copySelected(): void {
    if (!canvas.value) return

    const activeObject = canvas.value.getActiveObject()
    if (!activeObject) return

    activeObject.clone().then((cloned: FabricObject) => {
      clipboard.value = cloned as unknown as CanvasObject
    })
  }

  function paste(): void {
    if (!canvas.value || !clipboard.value) return

    const cloned = clipboard.value as unknown as FabricObject
    cloned.clone().then((pasted: FabricObject) => {
      pasted.set({
        left: (pasted.left || 0) + 20,
        top: (pasted.top || 0) + 20,
        // @ts-ignore
        id: generateObjectId(pasted.type || 'object'),
      })
      ensureObjectIdentity(pasted as any)
      canvas.value!.add(pasted)
      canvas.value!.setActiveObject(pasted)
      canvas.value!.renderAll()
      snapshotCanvasState()
    })
  }

  function cutSelected(): void {
    if (!canvas.value) return
    const activeObject = canvas.value.getActiveObject()
    if (!activeObject) return
    copySelected()
    deleteSelected()
  }

  function selectAll(): void {
    if (!canvas.value) return
    const allObjects = (canvas.value.getObjects() as any[]).filter((obj) => {
      if (!obj) return false
      if (obj.visible === false) return false
      if (obj.selectable === false) return false
      return true
    }) as FabricObject[]

    if (allObjects.length === 0) return
    if (allObjects.length === 1) {
      canvas.value.setActiveObject(allObjects[0]!)
      canvas.value.requestRenderAll?.()
      canvas.value.renderAll()
      return
    }

    const sel = new ActiveSelection(allObjects, { canvas: canvas.value })
    canvas.value.setActiveObject(sel)
    canvas.value.requestRenderAll?.()
    canvas.value.renderAll()
  }

  function nudgeSelection(dx: number, dy: number): void {
    if (!canvas.value) return
    const activeObjects = canvas.value.getActiveObjects()
    if (activeObjects.length === 0) return

    activeObjects.forEach((obj) => {
      const left = Number((obj as any).left ?? 0) || 0
      const top = Number((obj as any).top ?? 0) || 0
      obj.set({ left: left + dx, top: top + dy } as any)
      obj.setCoords?.()
    })

    canvas.value.getActiveObject()?.setCoords?.()
    canvas.value.requestRenderAll?.()
    canvas.value.renderAll()
    isDirty.value = true
    queueHistorySave()
  }

  function groupSelected(): void {
    if (!canvas.value) return
    const objects = canvas.value.getActiveObjects()
    const ids = selectedObjectIds.value

    const resolved =
      objects.length >= 2
        ? objects
        : ids
            .map((id) => getCanvasObjectById(id))
            .filter(Boolean) as FabricObject[]

    console.log('[groupSelected] start', {
      activeObjectsLen: objects.length,
      selectedIdsLen: ids.length,
      resolvedLen: resolved.length,
      activeType: (canvas.value.getActiveObject() as any)?.type ?? null,
    })

    if (resolved.length < 2) {
      console.log('[groupSelected] abort: need >=2 objects')
      return
    }

    const before = canvas.value.getObjects() as any[]
    console.log('[groupSelected] before objects', before.map((o) => ({ type: o?.type, id: o?.id })))

    const sel = new ActiveSelection(resolved, { canvas: canvas.value })
    canvas.value.setActiveObject(sel)

    const active: any = canvas.value.getActiveObject() as any
    console.log('[groupSelected] active after setActiveObject', {
      type: active?.type ?? null,
      hasToGroup: typeof active?.toGroup === 'function',
    })
    if (!active) {
      console.log('[groupSelected] abort: no active object')
      return
    }

    const canToGroup = typeof active.toGroup === 'function'

    if (!canToGroup) {
      console.log('[groupSelected] fallback: manual group')
      const all = canvas.value.getObjects() as any[]
      const indices = resolved.map((obj) => all.indexOf(obj as any)).filter((i) => i >= 0)
      const insertIndex = indices.length ? Math.max(...indices) : all.length

      canvas.value.discardActiveObject()

      const canvasAny: any = canvas.value as any
      try {
        resolved.forEach((obj) => {
          canvas.value!.remove(obj)
        })

        const group = new Group(resolved as any)
        ensureObjectIdentity(group as any)

        canvas.value.add(group)

        if (typeof canvasAny.moveObjectTo === 'function') {
          canvasAny.moveObjectTo(group, insertIndex)
        } else if (typeof (group as any).moveTo === 'function') {
          ;(group as any).moveTo(insertIndex)
        }

        canvas.value.setActiveObject(group)
        canvas.value.requestRenderAll?.()
        canvas.value.renderAll()
        snapshotCanvasState()
        console.log('[groupSelected] success (manual)', {
          groupId: (group as any)?.id ?? null,
          children: Array.isArray((group as any)?._objects) ? (group as any)._objects.length : null,
        })
        return
      } catch (err) {
        console.error('[groupSelected] manual group failed', err)
        resolved.forEach((obj) => {
          try {
            if (!(canvas.value!.getObjects() as any[]).includes(obj as any)) {
              canvas.value!.add(obj)
            }
          } catch {
            // ignore
          }
        })
        canvas.value.requestRenderAll?.()
        canvas.value.renderAll()
        return
      }
    }

    active.toGroup?.()
    const maybeGroup = canvas.value.getActiveObject() as any
    const after = canvas.value.getObjects() as any[]
    console.log('[groupSelected] after toGroup', {
      activeType: maybeGroup?.type ?? null,
      objects: after.map((o) => ({ type: o?.type, id: o?.id, children: Array.isArray(o?._objects) ? o._objects.length : 0 })),
    })

    const group =
      (maybeGroup && maybeGroup.type === 'group' ? maybeGroup : null) ??
      after.find((obj) => {
        if (!obj || obj.type !== 'group') return false
        const children = Array.isArray(obj._objects) ? obj._objects : []
        if (children.length !== resolved.length) return false
        return resolved.every((r) => children.includes(r))
      }) ??
      before.find((obj) => {
        if (!obj || obj.type !== 'group') return false
        const children = Array.isArray(obj._objects) ? obj._objects : []
        if (children.length !== resolved.length) return false
        return resolved.every((r) => children.includes(r))
      })

    if (!group || group.type !== 'group') {
      console.log('[groupSelected] abort: could not locate group')
      return
    }

    console.log('[groupSelected] success', {
      groupId: (group as any)?.id ?? null,
      children: Array.isArray((group as any)?._objects) ? (group as any)._objects.length : null,
    })

    ensureObjectIdentity(group as any)
    canvas.value.setActiveObject(group as any)
    canvas.value.requestRenderAll?.()
    canvas.value.renderAll()
    snapshotCanvasState()
  }

  function ungroupSelected(): void {
    if (!canvas.value) return
    const active = canvas.value.getActiveObject() as any
    if (!active) return
    if (active.type !== 'group') return

    const group = active as any
    const children = (Array.isArray(group._objects) ? group._objects.slice() : []) as FabricObject[]
    if (children.length === 0) return

    const canvasAny: any = canvas.value as any
    const all = canvas.value.getObjects() as any[]
    const groupIndex = all.indexOf(group)

    canvas.value.discardActiveObject()

    if (typeof group._restoreObjectsState === 'function') {
      group._restoreObjectsState()
    }

    canvas.value.remove(group)

    children.forEach((obj) => {
      ;(obj as any).group = undefined
      ensureObjectIdentity(obj as any)
      canvas.value!.add(obj)
      obj.setCoords?.()
    })

    if (typeof canvasAny.moveObjectTo === 'function' && groupIndex >= 0) {
      children.forEach((obj, i) => {
        canvasAny.moveObjectTo(obj, groupIndex + i)
      })
    }

    if (children.length === 1) {
      canvas.value.setActiveObject(children[0]!)
    } else {
      const sel = new ActiveSelection(children, { canvas: canvas.value })
      canvas.value.setActiveObject(sel)
    }

    canvas.value.getActiveObject()?.setCoords?.()
    canvas.value.requestRenderAll?.()
    canvas.value.renderAll()
    snapshotCanvasState()
  }

  function clearSelection(): void {
    if (!canvas.value) return
    canvas.value.discardActiveObject()
    canvas.value.requestRenderAll?.()
    canvas.value.renderAll()
  }

  function toggleLockSelected(): void {
    if (!canvas.value) return
    const activeObjects = canvas.value.getActiveObjects()
    if (activeObjects.length === 0) return

    const shouldUnlock = activeObjects.some((obj: any) => obj?.selectable === false)
    const nextSelectable = shouldUnlock

    activeObjects.forEach((obj: any) => {
      obj.selectable = nextSelectable
      obj.evented = nextSelectable
      obj.hasControls = nextSelectable
    })

    if (nextSelectable) {
      if (activeObjects.length === 1) {
        canvas.value.setActiveObject(activeObjects[0]!)
      } else {
        const sel = new ActiveSelection(activeObjects, { canvas: canvas.value })
        canvas.value.setActiveObject(sel)
      }
    } else {
      canvas.value.discardActiveObject()
    }

    canvas.value.requestRenderAll?.()
    canvas.value.renderAll()
    snapshotCanvasState()
  }

  function toggleVisibilitySelected(): void {
    if (!canvas.value) return
    const activeObjects = canvas.value.getActiveObjects()
    if (activeObjects.length === 0) return

    const shouldShow = activeObjects.some((obj: any) => obj?.visible === false)
    const nextVisible = shouldShow

    activeObjects.forEach((obj: any) => {
      obj.visible = nextVisible
    })

    canvas.value.discardActiveObject()
    canvas.value.requestRenderAll?.()
    canvas.value.renderAll()
    snapshotCanvasState()
  }

  // ═══════════════════════════════════════════════════════════════
  // OBJECT PROPERTIES
  // ═══════════════════════════════════════════════════════════════

  function updateObjectProperty(property: string, value: any): void {
    if (!canvas.value) return

    const activeObject = canvas.value.getActiveObject()
    if (!activeObject) return

    const isArrow =
      (activeObject as any)?.type === 'group' &&
      (activeObject as any)?.data?.shapeKind === 'arrow'

    if (isArrow) {
      const group = activeObject as unknown as Group
      const data = ((group as any).data ?? {}) as any
      const opts = (data.arrowOptions ?? {}) as any
      const { line, startHead, endHead } = getArrowParts(group)

      if (property === 'stroke' || property === 'strokeWidth') {
        const nextStroke = property === 'stroke' ? String(value ?? '') : ((line as any)?.stroke ?? opts.stroke ?? '#000000')
        const nextWidth = property === 'strokeWidth' ? Math.max(1, Number(value) || 1) : Math.max(1, Number((line as any)?.strokeWidth ?? opts.strokeWidth ?? 2) || 2)
        if (line) {
          line.set({ stroke: nextStroke, strokeWidth: nextWidth } as any)
        }
        const headStyle = (opts.arrowHeadStyle ?? 'filled') as 'filled' | 'open'
        const isOpen = headStyle === 'open'
        ;[startHead, endHead].filter(Boolean).forEach((h: any) => {
          h.set({
            fill: isOpen ? 'transparent' : nextStroke,
            stroke: nextStroke,
            strokeWidth: isOpen ? nextWidth : 0,
          } as any)
        })
        ;(group as any).data = {
          ...data,
          arrowOptions: {
            ...opts,
            stroke: nextStroke,
            strokeWidth: nextWidth,
          },
        }
        refreshArrowGroupGeometry(group)
      } else if (property === 'strokeDashArray' || property === 'strokeLineCap' || property === 'strokeLineJoin') {
        if (line) {
          line.set({ [property]: value } as any)
        }

        ;(group as any).data = {
          ...data,
          arrowOptions: {
            ...opts,
            [property]: value,
          },
        }

        refreshArrowGroupGeometry(group)
      } else if (
        property === 'arrowEnds' ||
        property === 'arrowHeadLength' ||
        property === 'arrowHeadWidth' ||
        property === 'arrowHeadStyle'
      ) {
        ;(group as any).data = {
          ...data,
          arrowOptions: {
            ...opts,
            [property]: value,
          },
        }
        refreshArrowGroupGeometry(group)
      } else {
        activeObject.set(property as any, value)
      }
    } else {
      activeObject.set({ [property]: value } as any)
    }

    // Calendar elements: if the user changes scale (via width/height inspector), convert it into metadata.size
    // so internal layout is recomputed at the new size.
    if (property === 'scaleX' || property === 'scaleY') {
      bakeScaledCalendarElementSize(activeObject)
      queueHistorySave()
    }

    // Fonts: make sure the font is actually available, and force Fabric to re-measure text.
    if (property === 'fontFamily' || property === 'fontWeight' || property === 'fontSize') {
      const family = (activeObject as any).fontFamily as string | undefined
      const weight = (activeObject as any).fontWeight as string | number | undefined
      const size = (activeObject as any).fontSize as number | undefined
      if (family) {
        requestFontLoad(family, weight, size)
      }

      ;(activeObject as any).dirty = true
      if (typeof (activeObject as any).initDimensions === 'function') {
        ;(activeObject as any).initDimensions()
      }
      if (typeof (activeObject as any).setCoords === 'function') {
        ;(activeObject as any).setCoords()
      }
    }

    canvas.value.requestRenderAll?.()
    canvas.value.renderAll()
    isDirty.value = true
  }

  function getCanvasObjectById(id: string): FabricObject | null {
    if (!canvas.value) return null
    const target = (canvas.value.getObjects() as any[]).find((obj) => obj.id === id)
    return (target as FabricObject) ?? null
  }

  function selectObjectById(id: string): void {
    if (!canvas.value) return
    const obj = getCanvasObjectById(id)
    if (!obj) return
    canvas.value.setActiveObject(obj)
    canvas.value.renderAll()
  }

  function toggleObjectVisibility(id: string): void {
    if (!canvas.value) return
    const obj: any = getCanvasObjectById(id)
    if (!obj) return
    obj.visible = obj.visible === false
    canvas.value.renderAll()
    snapshotCanvasState()
  }

  function toggleObjectLock(id: string): void {
    if (!canvas.value) return
    const obj: any = getCanvasObjectById(id)
    if (!obj) return
    const nextSelectable = obj.selectable === false
    obj.selectable = nextSelectable
    obj.evented = nextSelectable
    obj.hasControls = nextSelectable
    canvas.value.renderAll()
    snapshotCanvasState()
  }

  function deleteObjectById(id: string): void {
    if (!canvas.value) return
    const obj = getCanvasObjectById(id)
    if (!obj) return
    canvas.value.remove(obj)
    canvas.value.discardActiveObject()
    canvas.value.renderAll()
    snapshotCanvasState()
  }

  function bringForward(): void {
    if (!canvas.value) return
    const activeObject = canvas.value.getActiveObject()
    if (activeObject) {
      canvas.value.bringObjectForward(activeObject)
      canvas.value.renderAll()
      saveToHistory()
    }
  }

  function sendBackward(): void {
    if (!canvas.value) return
    const activeObject = canvas.value.getActiveObject()
    if (activeObject) {
      canvas.value.sendObjectBackwards(activeObject)
      canvas.value.renderAll()
      saveToHistory()
    }
  }

  function bringToFront(): void {
    if (!canvas.value) return
    const activeObject = canvas.value.getActiveObject()
    if (activeObject) {
      canvas.value.bringObjectToFront(activeObject)
      canvas.value.renderAll()
      saveToHistory()
    }
  }

  function sendToBack(): void {
    if (!canvas.value) return
    const activeObject = canvas.value.getActiveObject()
    if (activeObject) {
      canvas.value.sendObjectToBack(activeObject)
      canvas.value.renderAll()
      saveToHistory()
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ALIGNMENT
  // ═══════════════════════════════════════════════════════════════

  function alignObjects(alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'): void {
    if (!canvas.value) return

    // Keep this legacy helper, but use the robust selection aligner so originX/originY
    // and different object types (e.g. Textbox origin center) still align correctly.
    alignSelection(alignment, 'canvas')
  }

  function alignSelection(
    alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom',
    mode: 'selection' | 'canvas' = 'selection',
  ): void {
    if (!canvas.value) return

    // Get the active selection group if objects are multi-selected
    const activeObject = canvas.value.getActiveObject()
    const isActiveSelection = activeObject && (activeObject as any).type === 'activeselection'
    
    // IMPORTANT: Get objects BEFORE discarding the selection
    // After discarding, _objects reference becomes invalid
    const objects: FabricObject[] = isActiveSelection 
      ? [...((activeObject as any)._objects || [])]  // Copy the array before discarding
      : canvas.value.getActiveObjects()
    if (!objects.length) return
    
    // For ActiveSelection, discard it so objects have their absolute coordinates
    if (isActiveSelection) {
      canvas.value.discardActiveObject()
    }
    
    // Get object bounds using getBoundingRect which gives absolute canvas coordinates
    const getObjectBounds = (obj: FabricObject) => {
      obj.setCoords?.()
      
      // getBoundingRect returns absolute coordinates regardless of origin
      const boundingRect = obj.getBoundingRect?.() || {
        left: Number((obj as any).left ?? 0),
        top: Number((obj as any).top ?? 0),
        width: obj.getScaledWidth?.() ?? (obj as any).width ?? 0,
        height: obj.getScaledHeight?.() ?? (obj as any).height ?? 0,
      }
      
      return {
        left: boundingRect.left,
        top: boundingRect.top,
        width: boundingRect.width,
        height: boundingRect.height,
        right: boundingRect.left + boundingRect.width,
        bottom: boundingRect.top + boundingRect.height,
        centerX: boundingRect.left + boundingRect.width / 2,
        centerY: boundingRect.top + boundingRect.height / 2
      }
    }

    // Use the actual canvas dimensions (artboard size) from project, not affected by zoom
    // canvas.value.width/height can be affected by viewport transform, so we use project dimensions
    const canvasWidth = project.value?.canvas.width || canvas.value.width || 0
    const canvasHeight = project.value?.canvas.height || canvas.value.height || 0

    type ObjectBoundsEntry = { obj: FabricObject; bounds: ReturnType<typeof getObjectBounds> }
    
    const objectBounds: ObjectBoundsEntry[] = objects.map((obj: FabricObject) => ({
      obj,
      bounds: getObjectBounds(obj),
    }))

    // For multi-select "selection" mode, find the key object based on alignment direction
    // Left align -> use leftmost object, Right align -> use rightmost, etc.
    // This matches behavior of design apps like Figma, Adobe XD, etc.
    const getKeyEntry = (): ObjectBoundsEntry | null => {
      if (mode !== 'selection' || objectBounds.length <= 1) return null
      
      switch (alignment) {
        case 'left':
          // Use the leftmost object as reference
          return objectBounds.reduce((best: ObjectBoundsEntry, cur: ObjectBoundsEntry) => 
            cur.bounds.left < best.bounds.left ? cur : best, objectBounds[0]!)
        case 'right':
          // Use the rightmost object as reference
          return objectBounds.reduce((best: ObjectBoundsEntry, cur: ObjectBoundsEntry) => 
            cur.bounds.right > best.bounds.right ? cur : best, objectBounds[0]!)
        case 'center':
          // Use the object closest to the horizontal center of all objects
          const allCenterX = objectBounds.reduce((sum, e) => sum + e.bounds.centerX, 0) / objectBounds.length
          return objectBounds.reduce((best: ObjectBoundsEntry, cur: ObjectBoundsEntry) => 
            Math.abs(cur.bounds.centerX - allCenterX) < Math.abs(best.bounds.centerX - allCenterX) ? cur : best, objectBounds[0]!)
        case 'top':
          // Use the topmost object as reference
          return objectBounds.reduce((best: ObjectBoundsEntry, cur: ObjectBoundsEntry) => 
            cur.bounds.top < best.bounds.top ? cur : best, objectBounds[0]!)
        case 'bottom':
          // Use the bottommost object as reference
          return objectBounds.reduce((best: ObjectBoundsEntry, cur: ObjectBoundsEntry) => 
            cur.bounds.bottom > best.bounds.bottom ? cur : best, objectBounds[0]!)
        case 'middle':
          // Use the object closest to the vertical center of all objects
          const allCenterY = objectBounds.reduce((sum, e) => sum + e.bounds.centerY, 0) / objectBounds.length
          return objectBounds.reduce((best: ObjectBoundsEntry, cur: ObjectBoundsEntry) => 
            Math.abs(cur.bounds.centerY - allCenterY) < Math.abs(best.bounds.centerY - allCenterY) ? cur : best, objectBounds[0]!)
        default:
          return null
      }
    }
    
    const keyEntry = getKeyEntry()
    
    // DEBUG
    console.log('=== ALIGN DEBUG ===')
    console.log('mode:', mode, 'alignment:', alignment)
    console.log('objectBounds.length:', objectBounds.length)
    console.log('All objects:', objectBounds.map(e => ({ type: (e.obj as any).type, left: e.bounds.left, right: e.bounds.right })))
    console.log('keyEntry:', keyEntry ? { type: (keyEntry.obj as any).type, bounds: keyEntry.bounds } : null)

    type BoundsAccumulator = { left: number; top: number; right: number; bottom: number; centerX: number; centerY: number }
    
    // Define the target bounds for alignment
    const targetBounds: BoundsAccumulator =
      mode === 'canvas'
        ? { left: 0, top: 0, right: canvasWidth, bottom: canvasHeight, centerX: canvasWidth / 2, centerY: canvasHeight / 2 }
        : keyEntry
          ? keyEntry.bounds
          : objectBounds.reduce(
              (acc: BoundsAccumulator, entry: ObjectBoundsEntry) => {
                acc.left = Math.min(acc.left, entry.bounds.left)
                acc.top = Math.min(acc.top, entry.bounds.top)
                acc.right = Math.max(acc.right, entry.bounds.right)
                acc.bottom = Math.max(acc.bottom, entry.bounds.bottom)
                return acc
              },
              {
                left: Number.POSITIVE_INFINITY,
                top: Number.POSITIVE_INFINITY,
                right: Number.NEGATIVE_INFINITY,
                bottom: Number.NEGATIVE_INFINITY,
                centerX: 0,
                centerY: 0
              },
            )

    // Calculate center if not already set
    if (!('centerX' in targetBounds) || targetBounds.centerX === 0) {
      (targetBounds as any).centerX = (targetBounds.left + targetBounds.right) / 2
      ;(targetBounds as any).centerY = (targetBounds.top + targetBounds.bottom) / 2
    }

    // Now align objects - ActiveSelection was already discarded above if needed
    objectBounds.forEach(({ obj, bounds }: { obj: FabricObject; bounds: ReturnType<typeof getObjectBounds> }) => {
      // Skip the key object in selection mode
      if (keyEntry && obj === keyEntry.obj) return
      
      const objLeft = Number((obj as any).left ?? 0)
      const objTop = Number((obj as any).top ?? 0)

      let nextLeft = objLeft
      let nextTop = objTop

      // Calculate the offset needed to align
      switch (alignment) {
        case 'left':
          nextLeft = objLeft + (targetBounds.left - bounds.left)
          break
        case 'center':
          nextLeft = objLeft + ((targetBounds as any).centerX - bounds.centerX)
          break
        case 'right':
          nextLeft = objLeft + (targetBounds.right - bounds.right)
          break
        case 'top':
          nextTop = objTop + (targetBounds.top - bounds.top)
          break
        case 'middle':
          nextTop = objTop + ((targetBounds as any).centerY - bounds.centerY)
          break
        case 'bottom':
          nextTop = objTop + (targetBounds.bottom - bounds.bottom)
          break
      }

      obj.set({ left: nextLeft, top: nextTop } as any)
      obj.setCoords?.()
    })
    
    // Re-select all objects if we had an ActiveSelection
    if (isActiveSelection) {
      const allObjects = objectBounds.map((e: { obj: FabricObject }) => e.obj)
      if (allObjects.length > 1) {
        const sel = new ActiveSelection(allObjects, { canvas: canvas.value })
        canvas.value.setActiveObject(sel)
      } else if (allObjects.length === 1 && allObjects[0]) {
        canvas.value.setActiveObject(allObjects[0])
      }
    }

    // Keep the active selection box in sync
    canvas.value.getActiveObject()?.setCoords?.()
    canvas.value.requestRenderAll?.()
    canvas.value.renderAll()
    saveToHistory()
  }

  function distributeSelection(axis: 'horizontal' | 'vertical'): void {
    if (!canvas.value) return

    // Get object bounds in canvas coordinates (not affected by viewportTransform)
    const getObjectBounds = (obj: FabricObject) => {
      obj.setCoords?.()
      
      const left = Number((obj as any).left ?? 0)
      const top = Number((obj as any).top ?? 0)
      const width = obj.getScaledWidth?.() ?? (obj as any).width ?? 0
      const height = obj.getScaledHeight?.() ?? (obj as any).height ?? 0
      
      const originX = (obj as any).originX ?? 'left'
      const originY = (obj as any).originY ?? 'top'
      
      let adjustedLeft = left
      let adjustedTop = top
      
      if (originX === 'center') {
        adjustedLeft = left - width / 2
      } else if (originX === 'right') {
        adjustedLeft = left - width
      }
      
      if (originY === 'center') {
        adjustedTop = top - height / 2
      } else if (originY === 'bottom') {
        adjustedTop = top - height
      }
      
      return {
        left: adjustedLeft,
        top: adjustedTop,
        width,
        height,
        right: adjustedLeft + width,
        bottom: adjustedTop + height,
        centerX: adjustedLeft + width / 2,
        centerY: adjustedTop + height / 2
      }
    }

    const objects = canvas.value.getActiveObjects()
    if (objects.length < 3) return

    const entries = objects.map((obj) => {
      const bounds = getObjectBounds(obj)
      return { obj, ...bounds }
    })

    if (axis === 'horizontal') {
      const sorted = [...entries].sort((a, b) => a.centerX - b.centerX)
      const boundsLeft = Math.min(...sorted.map((e) => e.left))
      const boundsRight = Math.max(...sorted.map((e) => e.right))
      const totalWidth = sorted.reduce((sum, e) => sum + e.width, 0)
      const gap = (boundsRight - boundsLeft - totalWidth) / (sorted.length - 1)

      let cursor = boundsLeft
      sorted.forEach((e) => {
        const objLeft = Number((e.obj as any).left ?? 0) || 0
        const dx = cursor - e.left
        e.obj.set({ left: objLeft + dx } as any)
        e.obj.setCoords?.()
        cursor += e.width + (Number.isFinite(gap) ? gap : 0)
      })
    } else {
      const sorted = [...entries].sort((a, b) => a.centerY - b.centerY)
      const boundsTop = Math.min(...sorted.map((e) => e.top))
      const boundsBottom = Math.max(...sorted.map((e) => e.bottom))
      const totalHeight = sorted.reduce((sum, e) => sum + e.height, 0)
      const gap = (boundsBottom - boundsTop - totalHeight) / (sorted.length - 1)

      let cursor = boundsTop
      sorted.forEach((e) => {
        const objTop = Number((e.obj as any).top ?? 0) || 0
        const dy = cursor - e.top
        e.obj.set({ top: objTop + dy } as any)
        e.obj.setCoords?.()
        cursor += e.height + (Number.isFinite(gap) ? gap : 0)
      })
    }

    canvas.value.requestRenderAll?.()
    canvas.value.renderAll()
    saveToHistory()
  }

  // ═══════════════════════════════════════════════════════════════
  // ZOOM & PAN (Adobe-like using FabricJS native viewportTransform)
  // ═══════════════════════════════════════════════════════════════

  const MIN_ZOOM = 0.1
  const MAX_ZOOM = 8

  function setZoom(newZoom: number, _point?: { x: number; y: number }): void {
    if (!canvas.value) return

    const clampedZoom = Math.min(Math.max(newZoom, MIN_ZOOM), MAX_ZOOM)
    zoom.value = clampedZoom
    
    // NOTE: Visual zoom is handled by CSS transforms in AdobeCanvas.vue
    // We do NOT apply FabricJS's zoomToPoint here because it would create
    // a double-zoom effect and interfere with object coordinate calculations.
    // The viewportTransform should remain at identity [1,0,0,1,0,0] so that
    // object left/top values are always in pure canvas coordinates.
    
    canvas.value.requestRenderAll()
  }

  function zoomToPoint(newZoom: number, point: { x: number; y: number }): void {
    setZoom(newZoom, point)
  }

  function zoomIn(): void {
    setZoom(zoom.value * 1.25)
  }

  function zoomOut(): void {
    setZoom(zoom.value / 1.25)
  }

  function resetZoom(): void {
    if (!canvas.value) return
    
    // Reset zoom - visual zoom is handled by CSS transforms in AdobeCanvas.vue
    // Keep viewportTransform at identity so object coordinates remain in pure canvas space
    zoom.value = 1
    panOffset.value = { x: 0, y: 0 }
    canvas.value.requestRenderAll()
  }

  function setPan(x: number, y: number): void {
    if (!canvas.value) return
    
    // Pan is handled by CSS transforms in AdobeCanvas.vue
    // We only update the panOffset ref here for state tracking
    panOffset.value = { x, y }
    canvas.value.requestRenderAll()
  }

  function panBy(deltaX: number, deltaY: number): void {
    if (!canvas.value) return
    
    // Pan is handled by CSS transforms in AdobeCanvas.vue
    // We only update the panOffset ref here for state tracking
    panOffset.value = { x: panOffset.value.x + deltaX, y: panOffset.value.y + deltaY }
    canvas.value.requestRenderAll()
  }

  function fitToScreen(): void {
    if (!canvas.value || !project.value) return

    const containerWidth = canvas.value.wrapperEl?.clientWidth || 800
    const containerHeight = canvas.value.wrapperEl?.clientHeight || 600
    const canvasWidth = project.value.canvas.width
    const canvasHeight = project.value.canvas.height

    // Calculate scale to fit with padding
    const padding = 80
    const scaleX = (containerWidth - padding) / canvasWidth
    const scaleY = (containerHeight - padding) / canvasHeight
    const scale = Math.min(scaleX, scaleY, 2) // Allow up to 200% for small canvases

    // Calculate center position
    const centerX = (containerWidth - canvasWidth * scale) / 2
    const centerY = (containerHeight - canvasHeight * scale) / 2

    // Visual zoom/pan is handled by CSS transforms in AdobeCanvas.vue
    // We only update the refs here for state tracking
    // Do NOT apply FabricJS viewportTransform as it would interfere with object coordinates
    zoom.value = scale
    panOffset.value = { x: centerX, y: centerY }
    canvas.value.requestRenderAll()
  }

  function centerCanvas(): void {
    if (!canvas.value || !project.value) return

    const containerWidth = canvas.value.wrapperEl?.clientWidth || 800
    const containerHeight = canvas.value.wrapperEl?.clientHeight || 600
    const canvasWidth = project.value.canvas.width
    const canvasHeight = project.value.canvas.height
    const currentZoom = zoom.value

    const centerX = (containerWidth - canvasWidth * currentZoom) / 2
    const centerY = (containerHeight - canvasHeight * currentZoom) / 2

    setPan(centerX, centerY)
  }

  function getViewportTransform(): number[] | null {
    return canvas.value?.viewportTransform ?? null
  }

  // ═══════════════════════════════════════════════════════════════
  // HISTORY (UNDO/REDO)
  // ═══════════════════════════════════════════════════════════════

  function saveToHistory(): void {
    if (!canvas.value) return

    const state = (canvas.value as any).toJSON(['id', 'name', 'data', 'visible', 'selectable', 'evented']) as unknown as CanvasState

    // Remove any redo states
    if (historyIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, historyIndex.value + 1)
    }

    // Add new state
    history.value.push(state)

    // Limit history length
    if (history.value.length > maxHistoryLength) {
      history.value.shift()
    } else {
      historyIndex.value++
    }
  }

  function undo(): void {
    if (!canUndo.value || !canvas.value) return

    historyIndex.value--
    loadCanvasState(history.value[historyIndex.value]!)
  }

  function redo(): void {
    if (!canRedo.value || !canvas.value) return

    historyIndex.value++
    loadCanvasState(history.value[historyIndex.value]!)
  }

  function loadCanvasState(state: CanvasState): void {
    if (!canvas.value) return

    canvas.value.loadFromJSON(state).then(() => {
      ;(canvas.value!.getObjects() as any[]).forEach((obj) => ensureObjectIdentity(obj))
      canvas.value!.renderAll()
    })
  }

  function snapshotCanvasState(): void {
    if (!canvas.value) return
    saveToHistory()
    isDirty.value = true
  }

  // ═══════════════════════════════════════════════════════════════
  // PROJECT OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  function ensureTemplateOptions(options?: Partial<TemplateOptions>): TemplateOptions {
    return mergeTemplateOptions(options)
  }

  function syncCalendarStoreConfig(next: CalendarConfig): void {
    calendarStore.updateConfig({
      year: next.year,
      country: next.country,
      language: next.language,
      layout: next.layout,
      startDay: next.startDay,
      showHolidays: next.showHolidays,
      showCustomHolidays: next.showCustomHolidays,
      showWeekNumbers: next.showWeekNumbers,
    })
    calendarStore.generateCalendar()
  }

  function createNewProject(config: CalendarConfig): void {
    config.templateOptions = ensureTemplateOptions(config.templateOptions)

    const normalized = normalizeCanvasSize(null)
    project.value = {
      id: generateObjectId('project'),
      userId: authStore.user?.id || '',
      name: 'Untitled Calendar',
      config,
      canvas: {
        width: normalized.width,
        height: normalized.height,
        unit: 'px',
        dpi: 72,
        backgroundColor: '#ffffff',
        objects: [],
      },
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Reset history
    history.value = []
    historyIndex.value = -1
    isDirty.value = false

    selectedObjectIds.value = []
    clipboard.value = null

    syncCalendarStoreConfig(config)
  }

  function setProjectName(name: string): void {
    if (!project.value) return
    project.value.name = name
    project.value.updatedAt = new Date().toISOString()
    isDirty.value = true
  }

  function setProjectTemplateId(templateId: string | undefined): void {
    if (!project.value) return
    project.value.templateId = templateId
    project.value.updatedAt = new Date().toISOString()
    isDirty.value = true
  }

  async function loadProjectById(id: string): Promise<void> {
    loading.value = true
    try {
      const found = await projectsService.getById(id)
      if (!found) {
        createNewProject({
          year: new Date().getFullYear(),
          country: 'KE',
          language: 'en',
          layout: 'monthly',
          startDay: 0,
          showHolidays: true,
          showCustomHolidays: false,
          showWeekNumbers: false,
        })
        if (project.value) project.value.id = id
        return
      }

      loadProject(found)
    } finally {
      loading.value = false
    }
  }

  function loadProject(loadedProject: Project): void {
    const normalized = normalizeCanvasSize(loadedProject?.canvas)
    project.value = {
      ...loadedProject,
      config: {
        ...loadedProject.config,
        templateOptions: ensureTemplateOptions(loadedProject.config.templateOptions),
      },
      canvas: {
        ...loadedProject.canvas,
        width: normalized.width,
        height: normalized.height,
      },
    }
    
    // Reset history
    history.value = []
    historyIndex.value = -1
    isDirty.value = false

    selectedObjectIds.value = []
    clipboard.value = null

    syncCalendarStoreConfig(project.value.config)
  }

  function getCanvasState(): CanvasState | null {
    if (!canvas.value) return null
    const json = (canvas.value as any).toJSON(['id', 'name', 'data', 'visible', 'selectable', 'evented', 'width', 'height', 'backgroundColor'])
    return {
      ...json,
      width: canvas.value.width,
      height: canvas.value.height,
      backgroundColor: canvas.value.backgroundColor?.toString(),
    } as unknown as CanvasState
  }

  async function saveProject(): Promise<void> {
    if (!project.value || !canvas.value) return

    saving.value = true

    try {
      // Update canvas state
      project.value.canvas = getCanvasState() as CanvasState
      project.value.updatedAt = new Date().toISOString()

      // Generate thumbnail
      const thumbnail = canvas.value.toDataURL({
        format: 'jpeg',
        quality: 0.5,
        multiplier: 0.25,
      })
      project.value.thumbnail = thumbnail

      if (!project.value.userId) {
        project.value.userId = authStore.user?.id || ''
      }

      await projectsService.save(project.value)

      isDirty.value = false
    } finally {
      saving.value = false
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // CANVAS SETTINGS
  // ═══════════════════════════════════════════════════════════════

  function setCanvasSize(width: number, height: number): void {
    if (!canvas.value || !project.value) return

    canvas.value.setWidth(width)
    canvas.value.setHeight(height)
    project.value.canvas.width = width
    project.value.canvas.height = height
    canvas.value.renderAll()
    canvas.value.calcOffset()
    isDirty.value = true
  }

  function setBackgroundColor(color: string): void {
    if (!canvas.value || !project.value) return

    canvas.value.backgroundColor = color
    project.value.canvas.backgroundColor = color
    canvas.value.renderAll()
    isDirty.value = true
  }

  function updateTemplateOptions(partial: Partial<TemplateOptions>): void {
    if (!project.value) return

    project.value.config.templateOptions = ensureTemplateOptions({
      ...project.value.config.templateOptions,
      ...partial,
    })
    isDirty.value = true
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
    // Metadata-aware helpers
    getActiveElementMetadata,
    updateSelectedElementMetadata,
  }
})
