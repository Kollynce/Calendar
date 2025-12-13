import { defineStore } from 'pinia'
import { ref, computed, shallowRef } from 'vue'
import { Canvas, Object as FabricObject, Textbox, Rect, Circle, Line, Group, FabricImage } from 'fabric'
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
  PhotoBlockMetadata,
  DateCellMetadata,
  PlannerPatternVariant
} from '@/types'
import { mergeTemplateOptions } from '@/config/editor-defaults'
import { calendarGeneratorService } from '@/services/calendar/generator.service'

export const useEditorStore = defineStore('editor', () => {
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
      size,
    }
  }

  function getDefaultPhotoBlockMetadata(
    overrides: Partial<PhotoBlockMetadata> = {},
  ): PhotoBlockMetadata {
    const defaultSize = { width: 280, height: 220 }
    const size = overrides.size ? { ...defaultSize, ...overrides.size } : defaultSize
    return {
      kind: 'photo-block',
      label: overrides.label ?? 'Add photo',
      accentColor: overrides.accentColor ?? '#0ea5e9',
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
      case 'photo-block':
        rebuilt = buildPhotoBlockGraphics(metadata)
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

  function updateSelectedElementMetadata(
    updater: (metadata: CanvasElementMetadata) => CanvasElementMetadata | null,
  ): void {
    if (!canvas.value) return
    const active = canvas.value.getActiveObject()
    if (!active) return
    const existingMetadata = (active as any).data?.elementMetadata as CanvasElementMetadata | undefined
    if (!existingMetadata) return
    const draft = JSON.parse(JSON.stringify(existingMetadata)) as CanvasElementMetadata
    const nextMetadata = updater(draft)
    if (!nextMetadata) return
    const rebuilt = rebuildElementWithMetadata(active, nextMetadata)
    if (!rebuilt) return
    canvas.value.remove(active)
    canvas.value.add(rebuilt)
    canvas.value.setActiveObject(rebuilt)
    canvas.value.renderAll()
    saveToHistory()
  }

  function buildCalendarGridGraphics(metadata: CalendarGridMetadata): Group {
    const { width, height } = metadata.size
    const objects: FabricObject[] = []
    const headerHeight = metadata.showHeader ? 60 : 0
    const weekdayHeight = metadata.showWeekdays ? 36 : 0
    const gridHeight = height - headerHeight - weekdayHeight
    const cellHeight = gridHeight / 6
    const cellWidth = width / 7

    objects.push(
      new Rect({
        width,
        height,
        rx: 26,
        ry: 26,
        fill: '#ffffff',
        stroke: '#e5e7eb',
        strokeWidth: 1,
      }),
    )

    if (metadata.showHeader) {
      const monthName = calendarGeneratorService.getMonthName(metadata.month)
      objects.push(
        new Rect({
          top: 0,
          left: 0,
          width,
          height: headerHeight,
          rx: 26,
          ry: 26,
          fill: '#111827',
          opacity: 0.95,
        }),
      )
      objects.push(
        new Textbox(`${monthName} ${metadata.year}`, {
          left: 32,
          top: headerHeight / 2 - 12,
          width: width - 64,
          fontSize: 24,
          fontFamily: 'Outfit',
          fontWeight: 600,
          fill: '#ffffff',
          selectable: false,
        }),
      )
    }

    if (metadata.showWeekdays) {
      const labels = calendarGeneratorService.getWeekdayNames(metadata.startDay, 'en', 'short')
      labels.forEach((label, index) => {
        objects.push(
          new Textbox(label.toUpperCase(), {
            left: index * cellWidth + 12,
            top: headerHeight + 8,
            width: cellWidth - 24,
            fontSize: 12,
            fontWeight: 600,
            fill: '#6b7280',
            textAlign: 'center',
            selectable: false,
          }),
        )
      })
    }

    const monthData =
      metadata.mode === 'month'
        ? calendarGeneratorService.generateMonth(metadata.year, metadata.month, [], metadata.startDay)
        : null
    const weeks = monthData?.weeks ?? Array.from({ length: 6 }, () => Array(7).fill(null))

    weeks.forEach((week, weekIndex) => {
      week.forEach((maybeDay, dayIndex) => {
        const top =
          headerHeight + weekdayHeight + weekIndex * cellHeight
        const left = dayIndex * cellWidth

        objects.push(
          new Rect({
            top,
            left,
            width: cellWidth,
            height: cellHeight,
            fill: 'transparent',
            stroke: '#e5e7eb',
            strokeWidth: 1,
            selectable: false,
          }),
        )

        if (maybeDay) {
          objects.push(
            new Textbox(String(maybeDay.dayOfMonth), {
              left: left + cellWidth - 28,
              top: top + 8,
              width: 24,
              fontSize: 16,
              fontWeight: 600,
              fill: maybeDay.isCurrentMonth ? '#1f2937' : '#9ca3af',
              textAlign: 'right',
              selectable: false,
            }),
          )

          if (maybeDay.holidays?.length) {
            objects.push(
              new Rect({
                left: left + 12,
                top: top + cellHeight - 16,
                width: cellWidth - 24,
                height: 4,
                rx: 2,
                ry: 2,
                fill: '#ef4444',
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

    objects.push(
      new Rect({
        width,
        height,
        rx: 24,
        ry: 24,
        fill: '#ffffff',
        stroke: '#e5e7eb',
        strokeWidth: 1,
      }),
    )

    const label = metadata.label ?? 'Weekly Focus'
    objects.push(
      new Textbox(label, {
        left: 24,
        top: 20,
        width: width - 48,
        fontSize: 16,
        fontWeight: 600,
        fill: '#0f172a',
        selectable: false,
      }),
    )

    const days = calendarGeneratorService.generateWeek(new Date(metadata.startDate), [], metadata.startDay)
    const bodyTop = 60
    const cellWidth = width / days.length

    days.forEach((day, index) => {
      const left = index * cellWidth
      objects.push(
        new Rect({
          left,
          top: bodyTop,
          width: cellWidth,
          height: height - bodyTop - 16,
          fill: 'transparent',
          stroke: '#f1f5f9',
          strokeWidth: 1,
          selectable: false,
        }),
      )
      objects.push(
        new Textbox(day.date.toLocaleDateString('en', { weekday: 'short' }), {
          left: left + 8,
          top: bodyTop + 8,
          width: cellWidth - 16,
          fontSize: 12,
          fontWeight: 600,
          fill: '#64748b',
          selectable: false,
          textAlign: 'center',
        }),
      )
      objects.push(
        new Textbox(String(day.dayOfMonth), {
          left: left + cellWidth / 2 - 12,
          top: bodyTop + 28,
          width: 24,
          fontSize: 22,
          fontWeight: 700,
          fill: '#0f172a',
          selectable: false,
          textAlign: 'center',
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

    objects.push(
      new Rect({
        width,
        height,
        rx: 24,
        ry: 24,
        fill: '#ffffff',
        stroke: '#e2e8f0',
        strokeWidth: 1,
      }),
    )

    objects.push(
      new Rect({
        width,
        height: height * 0.4,
        rx: 24,
        ry: 24,
        fill: metadata.highlightAccent,
      }),
    )

    objects.push(
      new Textbox(date.toLocaleDateString('en', { weekday: 'long' }), {
        left: 16,
        top: 16,
        width: width - 32,
        fontSize: 13,
        fontWeight: 600,
        fill: '#78350f',
        selectable: false,
      }),
    )

    objects.push(
      new Textbox(String(date.getDate()), {
        left: 16,
        top: 48,
        width: width - 32,
        fontSize: 52,
        fontWeight: 700,
        fill: '#92400e',
        selectable: false,
      }),
    )

    objects.push(
      new Textbox(metadata.notePlaceholder ?? 'Add event', {
        left: 16,
        top: height * 0.45,
        width: width - 32,
        fontSize: 13,
        fill: '#475569',
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

    objects.push(
      new Rect({
        width,
        height,
        rx: 28,
        ry: 28,
        fill: '#ffffff',
        stroke: '#e2e8f0',
        strokeWidth: 1,
      }),
    )

    if (metadata.pattern === 'hero') {
      objects.push(
        new Rect({
          width,
          height: 68,
          rx: 28,
          ry: 28,
          fill: metadata.accentColor,
        }),
      )
      objects.push(
        new Textbox(metadata.title, {
          left: 24,
          top: 24,
          width: width - 48,
          fontSize: 18,
          fontWeight: 600,
          fill: '#ffffff',
          selectable: false,
        }),
      )
    } else {
      objects.push(
        new Textbox(metadata.title, {
          left: 24,
          top: 18,
          width: width - 48,
          fontSize: 16,
          fontWeight: 600,
          fill: '#0f172a',
          selectable: false,
        }),
      )
    }

    if (metadata.pattern === 'ruled') {
      for (let y = 80; y < height - 24; y += 26) {
        objects.push(
          new Line([24, y, width - 24, y], {
            stroke: '#e2e8f0',
            strokeWidth: 1,
            selectable: false,
          }),
        )
      }
    }

    if (metadata.pattern === 'grid') {
      for (let x = 24; x < width - 24; x += 24) {
        objects.push(
          new Line([x, 70, x, height - 24], {
            stroke: '#eff6ff',
            strokeWidth: 1,
            selectable: false,
          }),
        )
      }
      for (let y = 70; y < height - 24; y += 24) {
        objects.push(
          new Line([24, y, width - 24, y], {
            stroke: '#eff6ff',
            strokeWidth: 1,
            selectable: false,
          }),
        )
      }
    }

    if (metadata.pattern === 'dot') {
      for (let x = 28; x < width - 28; x += 20) {
        for (let y = 80; y < height - 28; y += 20) {
          objects.push(
            new Rect({
              left: x,
              top: y,
              width: 2,
              height: 2,
              rx: 1,
              ry: 1,
              fill: '#cbd5f5',
              selectable: false,
            }),
          )
        }
      }
    }

    return new Group(objects, {
      subTargetCheck: false,
      hoverCursor: 'text',
    })
  }

  function buildPhotoBlockGraphics(metadata: PhotoBlockMetadata): Group {
    const { width, height } = metadata.size
    const objects: FabricObject[] = []

    objects.push(
      new Rect({
        width,
        height,
        rx: 24,
        ry: 24,
        fill: '#f0f9ff',
        stroke: metadata.accentColor,
        strokeDashArray: [14, 10],
        strokeWidth: 2,
      }),
    )

    objects.push(
      new Textbox('+', {
        left: width / 2 - 20,
        top: height / 2 - 54,
        width: 40,
        fontSize: 54,
        fontWeight: 200,
        fill: metadata.accentColor,
        selectable: false,
        textAlign: 'center',
      }),
    )

    objects.push(
      new Textbox(metadata.label, {
        left: 0,
        top: height / 2 + 8,
        width,
        fontSize: 15,
        fontWeight: 600,
        fill: '#0f172a',
        textAlign: 'center',
        selectable: false,
      }),
    )

    return new Group(objects, {
      subTargetCheck: false,
      hoverCursor: 'pointer',
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

    canvas.value = new Canvas(canvasElement, {
      width: project.value.canvas.width || 800,
      height: project.value.canvas.height || 600,
      backgroundColor: project.value.canvas.backgroundColor || '#ffffff',
      selection: true,
      preserveObjectStacking: true,
    })

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

  function handleSelectionChange(e: any): void {
    selectedObjectIds.value = e.selected?.map((obj: any) => obj.id) || []
  }

  function handleSelectionCleared(): void {
    selectedObjectIds.value = []
  }

  function handleObjectModified(): void {
    isDirty.value = true
    saveToHistory()
  }

  function handleObjectAdded(): void {
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

  // ═══════════════════════════════════════════════════════════════
  // OBJECT OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  function addObject(type: ObjectType, options: Partial<any> = {}): void {
    if (!canvas.value) return

    const id = `${type}-${Date.now()}`
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
      case 'photo-block':
        fabricObject = createPhotoBlockObject(id, options)
        break
    }

    if (fabricObject) {
      canvas.value.add(fabricObject)
      canvas.value.setActiveObject(fabricObject)
      canvas.value.renderAll()
      saveToHistory()
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
      case 'line':
        return new Line([0, 0, width ?? 100, 0], {
          id,
          stroke: stroke ?? '#000000',
          strokeWidth: strokeWidth ?? 2,
          ...basePosition,
          ...other,
        })
      default:
        return new Rect({
          id,
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
      size: options.width && options.height ? { width: options.width, height: options.height } : undefined,
    })
    const group = buildPlannerNoteGraphics(metadata)
    group.set({
      left: options.x ?? options.left ?? 80,
      top: options.y ?? options.top ?? 80,
      id,
      subTargetCheck: false,
      hoverCursor: 'text',
    })
    attachElementMetadata(group, metadata)
    return group
  }

  function createPhotoBlockObject(id: string, options: any): FabricObject {
    const metadata = getDefaultPhotoBlockMetadata({
      label: options.label,
      accentColor: options.accentColor,
      size: options.width && options.height ? { width: options.width, height: options.height } : undefined,
    })
    const group = buildPhotoBlockGraphics(metadata)
    group.set({
      left: options.x ?? options.left ?? 160,
      top: options.y ?? options.top ?? 140,
      id,
      subTargetCheck: false,
      hoverCursor: 'pointer',
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
          id: `image-${Date.now()}`,
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
        saveToHistory()
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
    saveToHistory()
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
        id: `${activeObject.type}-${Date.now()}`,
      })
      canvas.value!.add(cloned)
      canvas.value!.setActiveObject(cloned)
      canvas.value!.renderAll()
      saveToHistory()
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
        id: `${pasted.type}-${Date.now()}`,
      })
      canvas.value!.add(pasted)
      canvas.value!.setActiveObject(pasted)
      canvas.value!.renderAll()
      saveToHistory()
    })
  }

  // ═══════════════════════════════════════════════════════════════
  // OBJECT PROPERTIES
  // ═══════════════════════════════════════════════════════════════

  function updateObjectProperty(property: string, value: any): void {
    if (!canvas.value) return

    const activeObject = canvas.value.getActiveObject()
    if (!activeObject) return

    activeObject.set(property as any, value)
    canvas.value.renderAll()
    isDirty.value = true
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

    const activeObject = canvas.value.getActiveObject()
    if (!activeObject) return

    const canvasWidth = canvas.value.width || 0
    const canvasHeight = canvas.value.height || 0
    const objWidth = activeObject.getScaledWidth()
    const objHeight = activeObject.getScaledHeight()

    switch (alignment) {
      case 'left':
        activeObject.set('left', 0)
        break
      case 'center':
        activeObject.set('left', (canvasWidth - objWidth) / 2)
        break
      case 'right':
        activeObject.set('left', canvasWidth - objWidth)
        break
      case 'top':
        activeObject.set('top', 0)
        break
      case 'middle':
        activeObject.set('top', (canvasHeight - objHeight) / 2)
        break
      case 'bottom':
        activeObject.set('top', canvasHeight - objHeight)
        break
    }

    canvas.value.renderAll()
    saveToHistory()
  }

  // ═══════════════════════════════════════════════════════════════
  // ZOOM & PAN
  // ═══════════════════════════════════════════════════════════════

  function setZoom(newZoom: number): void {
    if (!canvas.value) return

    const clampedZoom = Math.min(Math.max(newZoom, 0.1), 5)
    zoom.value = clampedZoom
    canvas.value.setZoom(clampedZoom)
    canvas.value.renderAll()
  }

  function zoomIn(): void {
    setZoom(zoom.value * 1.2)
  }

  function zoomOut(): void {
    setZoom(zoom.value / 1.2)
  }

  function resetZoom(): void {
    setZoom(1)
  }

  function fitToScreen(): void {
    if (!canvas.value || !project.value) return

    const containerWidth = canvas.value.wrapperEl?.clientWidth || 800
    const containerHeight = canvas.value.wrapperEl?.clientHeight || 600
    const canvasWidth = project.value.canvas.width
    const canvasHeight = project.value.canvas.height

    const scaleX = (containerWidth - 100) / canvasWidth
    const scaleY = (containerHeight - 100) / canvasHeight
    const scale = Math.min(scaleX, scaleY, 1)

    setZoom(scale)
  }

  // ═══════════════════════════════════════════════════════════════
  // HISTORY (UNDO/REDO)
  // ═══════════════════════════════════════════════════════════════

  function saveToHistory(): void {
    if (!canvas.value) return

    const state = (canvas.value as any).toJSON(['id']) as unknown as CanvasState

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

  function ensureTemplateOptions(options?: TemplateOptions): TemplateOptions {
    return mergeTemplateOptions(options)
  }

  function createNewProject(config: CalendarConfig): void {
    config.templateOptions = ensureTemplateOptions(config.templateOptions)
    project.value = {
      id: `project-${Date.now()}`,
      userId: '', // Set from auth store
      name: 'Untitled Calendar',
      config,
      canvas: {
        width: 800,
        height: 600,
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
  }

  function loadProject(loadedProject: Project): void {
    project.value = {
      ...loadedProject,
      config: {
        ...loadedProject.config,
        templateOptions: ensureTemplateOptions(loadedProject.config.templateOptions),
      },
    }
    
    // Reset history
    history.value = []
    historyIndex.value = -1
    isDirty.value = false
  }

  function getCanvasState(): CanvasState | null {
    if (!canvas.value) return null
    const json = (canvas.value as any).toJSON(['id', 'width', 'height', 'backgroundColor'])
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

      // Save to Firestore (implement in service)
      // await projectsService.save(project.value)

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
    paste,
    updateObjectProperty,
    // Layers
    bringForward,
    sendBackward,
    bringToFront,
    sendToBack,
    // Alignment
    alignObjects,
    // Zoom
    setZoom,
    zoomIn,
    zoomOut,
    resetZoom,
    fitToScreen,
    // History
    undo,
    redo,
    snapshotCanvasState,
    // Project
    createNewProject,
    loadProject,
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
