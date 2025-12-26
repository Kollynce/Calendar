import type { Ref } from 'vue'
import {
  ActiveSelection,
  Canvas,
  Circle,
  FabricImage,
  Group,
  Line,
  Polygon,
  Rect,
  Textbox,
  type Object as FabricObject,
} from 'fabric'
import type { CanvasElementMetadata, CanvasObject, ObjectType } from '@/types'
import {
  buildCalendarGridGraphics,
  buildChecklistGraphics,
  buildDateCellGraphics,
  buildPlannerNoteGraphics,
  buildScheduleGraphics,
  buildWeekStripGraphics,
} from '@/stores/editor/graphics-builders'
import {
  getDefaultCalendarMetadata,
  getDefaultChecklistMetadata,
  getDefaultDateCellMetadata,
  getDefaultPlannerNoteMetadata,
  getDefaultScheduleMetadata,
  getDefaultWeekStripMetadata,
} from '@/stores/editor/metadata-defaults'

export function createObjectIdentityHelper(params: {
  generateObjectId: (prefix: string) => string
}) {
  const { generateObjectId } = params

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

  function refreshArrowGroupGeometry(group: Group): void {
    const data = ((group as any).data ?? {}) as any
    const opts = (data.arrowOptions ?? {}) as any
    const { line, startHead, endHead } = getArrowParts(group)

    if (!line) return

    const width = Number(opts.baseWidth ?? 140) || 140
    const strokeWidth = Math.max(1, Number(opts.strokeWidth ?? (line as any).strokeWidth ?? 2) || 2)
    const headLength = Math.max(4, Number(opts.arrowHeadLength ?? Math.max(14, strokeWidth * 4)) || Math.max(14, strokeWidth * 4))

    const arrowEnds = (opts.arrowEnds ?? 'end') as 'none' | 'start' | 'end' | 'both'

    const hasStart = arrowEnds === 'start' || arrowEnds === 'both'
    const hasEnd = arrowEnds === 'end' || arrowEnds === 'both'

    const offsetX = -width / 2
    const x1 = hasStart ? headLength : 0
    const x2 = Math.max(x1, width - (hasEnd ? headLength : 0))

    const len = Math.max(0, x2 - x1)

    line.set({
      originX: 'left',
      originY: 'center',
      left: offsetX + x1,
      top: 0,
    } as any)

      ; (line as any).set?.({ x1: 0, y1: 0, x2: len, y2: 0 } as any)

    if (startHead) {
      startHead.set({ originX: 'left', originY: 'center', left: offsetX + 0, top: 0 } as any)
    }

    if (endHead) {
      endHead.set({ originX: 'left', originY: 'center', left: offsetX + (width - headLength), top: 0 } as any)
    }

    ; (group as any).dirty = true
      ; (group as any)._calcBounds?.()
      ; (group as any)._updateObjectsCoords?.()
      ; (group as any).setCoords?.()
  }

  function ensureObjectIdentity(obj: any): void {
    if (!obj) return
    if (!obj.id) {
      obj.set?.('id', generateObjectId(obj.type || 'object'))
      if (!obj.id) obj.id = generateObjectId(obj.type || 'object')
    }
    const metadata = obj?.data?.elementMetadata as CanvasElementMetadata | undefined
    const friendly = getFriendlyObjectName(obj)
    const shouldReplaceName = !obj.name || obj.name === friendly || obj.name === 'Group'

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
      ; (obj as any).data = {
        ...((obj as any).data ?? {}),
        shapeKind: 'arrow',
      }
      refreshArrowGroupGeometry(obj as unknown as Group)
    }
  }

  return {
    getFriendlyObjectName,
    getLayerNameForMetadata,
    ensureObjectIdentity,
    getArrowParts,
    refreshArrowGroupGeometry,
  }
}

export function createObjectsModule(params: {
  canvas: Ref<Canvas | null>
  project: Ref<any>
  selectedObjectIds: Ref<string[]>
  clipboard: Ref<CanvasObject | null>
  isDirty: Ref<boolean>
  generateObjectId: (prefix: string) => string
  ensureObjectIdentity: (obj: any) => void
  getLayerNameForMetadata: (metadata: CanvasElementMetadata) => string
  getHolidaysForCalendarYear: (year: number, country?: string, language?: string) => any[]
  attachElementMetadata: (obj: FabricObject, metadata?: CanvasElementMetadata) => void
  snapshotCanvasState: () => void
  queueHistorySave: () => void
  saveToHistory: () => void
  requestFontLoad: (fontFamily: string, fontWeight?: string | number, fontSize?: number) => void
  bakeScaledCalendarElementSize: (target: FabricObject) => void
  getArrowParts: (group: Group) => { line: Line | null; startHead: Polygon | null; endHead: Polygon | null }
  refreshArrowGroupGeometry: (group: Group) => void
}) {
  const {
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
  } = params

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

    const content = typeof rawContent === 'number' ? String(rawContent) : rawContent || 'Double-click to edit'

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

      ; (poly as any).data = { ...(poly as any).data, arrowPart: part }
    return poly
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
    const headLength = Math.max(
      4,
      Number(providedHeadLength ?? Math.max(14, strokeWidth * 4)) || Math.max(14, strokeWidth * 4),
    )
    const headWidth = Math.max(
      4,
      Number(providedHeadWidth ?? Math.max(10, headLength * 0.7)) || Math.max(10, headLength * 0.7),
    )
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
      ; (line as any).data = { ...(line as any).data, arrowPart: 'line' }

    const objects: FabricObject[] = [line]

    if (hasStart) {
      const startHead = createArrowHeadPolygon(
        'startHead',
        headLength,
        headWidth,
        stroke,
        strokeWidth,
        headStyle,
        strokeLineCap,
        strokeLineJoin,
      )
      startHead.set({ originX: 'left', originY: 'center', left: offsetX + 0, top: y } as any)
      objects.push(startHead)
    }

    if (hasEnd) {
      const endHead = createArrowHeadPolygon(
        'endHead',
        headLength,
        headWidth,
        stroke,
        strokeWidth,
        headStyle,
        strokeLineCap,
        strokeLineJoin,
      )
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

      ; (group as any).data = {
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
      ...options,
      mode: options.calendarMode || options.mode,
      size: options.width && options.height ? { width: options.width, height: options.height } : options.size,
    })
    const group = buildCalendarGridGraphics(metadata, getHolidaysForCalendarYear)
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
      ...options,
      size: options.width && options.height ? { width: options.width, height: options.height } : options.size,
    })
    const group = buildWeekStripGraphics(metadata, getHolidaysForCalendarYear)
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
      ...options,
      size: options.width && options.height ? { width: options.width, height: options.height } : options.size,
    })
    const group = buildDateCellGraphics(metadata, getHolidaysForCalendarYear)
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
      ...options,
      size: options.width && options.height ? { width: options.width, height: options.height } : options.size,
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
      ...options,
      size: options.width && options.height ? { width: options.width, height: options.height } : options.size,
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
      ...options,
      size: options.width && options.height ? { width: options.width, height: options.height } : options.size,
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
      })
        .then((img: FabricImage) => {
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
        })
        .catch(reject)
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

  function getCanvasObjectById(id: string): FabricObject | null {
    if (!canvas.value) return null
    const target = (canvas.value.getObjects() as any[]).find((obj) => obj.id === id)
    return (target as FabricObject) ?? null
  }

  function groupSelected(): void {
    if (!canvas.value) return
    const objects = canvas.value.getActiveObjects()
    const ids = selectedObjectIds.value

    const resolved =
      objects.length >= 2
        ? objects
        : (ids.map((id) => getCanvasObjectById(id)).filter(Boolean) as FabricObject[])

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
    console.log(
      '[groupSelected] before objects',
      before.map((o) => ({ type: o?.type, id: o?.id })),
    )

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
          ; (group as any).moveTo(insertIndex)
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
      objects: after.map((o) => ({
        type: o?.type,
        id: o?.id,
        children: Array.isArray(o?._objects) ? o._objects.length : 0,
      })),
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
      ; (obj as any).group = undefined
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

  function updateObjectProperty(property: string, value: any): void {
    if (!canvas.value) return

    const activeObject = canvas.value.getActiveObject()
    if (!activeObject) return

    const isArrow = (activeObject as any)?.type === 'group' && (activeObject as any)?.data?.shapeKind === 'arrow'

    if (isArrow) {
      const group = activeObject as unknown as Group
      const data = ((group as any).data ?? {}) as any
      const opts = (data.arrowOptions ?? {}) as any
      const { line, startHead, endHead } = getArrowParts(group)

      if (property === 'stroke' || property === 'strokeWidth') {
        const nextStroke =
          property === 'stroke' ? String(value ?? '') : ((line as any)?.stroke ?? opts.stroke ?? '#000000')
        const nextWidth =
          property === 'strokeWidth'
            ? Math.max(1, Number(value) || 1)
            : Math.max(1, Number((line as any)?.strokeWidth ?? opts.strokeWidth ?? 2) || 2)
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
          ; (group as any).data = {
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

        ; (group as any).data = {
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
        ; (group as any).data = {
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

      ; (activeObject as any).dirty = true
      if (typeof (activeObject as any).initDimensions === 'function') {
        ; (activeObject as any).initDimensions()
      }
      if (typeof (activeObject as any).setCoords === 'function') {
        ; (activeObject as any).setCoords()
      }
    }

    canvas.value.requestRenderAll?.()
    canvas.value.renderAll()
    isDirty.value = true
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

    const activeObject = canvas.value.getActiveObject()
    const isActiveSelection = activeObject && (activeObject as any).type === 'activeselection'

    const objects: FabricObject[] = isActiveSelection
      ? [...((activeObject as any)._objects || [])]
      : canvas.value.getActiveObjects()
    if (!objects.length) return

    if (isActiveSelection) {
      canvas.value.discardActiveObject()
    }

    const getObjectBounds = (obj: FabricObject) => {
      obj.setCoords?.()

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
        centerY: boundingRect.top + boundingRect.height / 2,
      }
    }

    const canvasWidth = project.value?.canvas?.width || canvas.value.width || 0
    const canvasHeight = project.value?.canvas?.height || canvas.value.height || 0

    type ObjectBoundsEntry = { obj: FabricObject; bounds: ReturnType<typeof getObjectBounds> }

    const objectBounds: ObjectBoundsEntry[] = objects.map((obj: FabricObject) => ({
      obj,
      bounds: getObjectBounds(obj),
    }))

    const getKeyEntry = (): ObjectBoundsEntry | null => {
      if (mode !== 'selection' || objectBounds.length <= 1) return null

      switch (alignment) {
        case 'left':
          return objectBounds.reduce(
            (best: ObjectBoundsEntry, cur: ObjectBoundsEntry) =>
              cur.bounds.left < best.bounds.left ? cur : best,
            objectBounds[0]!,
          )
        case 'right':
          return objectBounds.reduce(
            (best: ObjectBoundsEntry, cur: ObjectBoundsEntry) =>
              cur.bounds.right > best.bounds.right ? cur : best,
            objectBounds[0]!,
          )
        case 'center':
          const allCenterX =
            objectBounds.reduce((sum, e) => sum + e.bounds.centerX, 0) / objectBounds.length
          return objectBounds.reduce(
            (best: ObjectBoundsEntry, cur: ObjectBoundsEntry) =>
              Math.abs(cur.bounds.centerX - allCenterX) < Math.abs(best.bounds.centerX - allCenterX)
                ? cur
                : best,
            objectBounds[0]!,
          )
        case 'top':
          return objectBounds.reduce(
            (best: ObjectBoundsEntry, cur: ObjectBoundsEntry) =>
              cur.bounds.top < best.bounds.top ? cur : best,
            objectBounds[0]!,
          )
        case 'bottom':
          return objectBounds.reduce(
            (best: ObjectBoundsEntry, cur: ObjectBoundsEntry) =>
              cur.bounds.bottom > best.bounds.bottom ? cur : best,
            objectBounds[0]!,
          )
        case 'middle':
          const allCenterY =
            objectBounds.reduce((sum, e) => sum + e.bounds.centerY, 0) / objectBounds.length
          return objectBounds.reduce(
            (best: ObjectBoundsEntry, cur: ObjectBoundsEntry) =>
              Math.abs(cur.bounds.centerY - allCenterY) < Math.abs(best.bounds.centerY - allCenterY)
                ? cur
                : best,
            objectBounds[0]!,
          )
        default:
          return null
      }
    }

    const keyEntry = getKeyEntry()

    console.log('=== ALIGN DEBUG ===')
    console.log('mode:', mode, 'alignment:', alignment)
    console.log('objectBounds.length:', objectBounds.length)
    console.log(
      'All objects:',
      objectBounds.map((e) => ({ type: (e.obj as any).type, left: e.bounds.left, right: e.bounds.right })),
    )
    console.log('keyEntry:', keyEntry ? { type: (keyEntry.obj as any).type, bounds: keyEntry.bounds } : null)

    type BoundsAccumulator = {
      left: number
      top: number
      right: number
      bottom: number
      centerX: number
      centerY: number
    }

    const targetBounds: BoundsAccumulator =
      mode === 'canvas'
        ? {
          left: 0,
          top: 0,
          right: canvasWidth,
          bottom: canvasHeight,
          centerX: canvasWidth / 2,
          centerY: canvasHeight / 2,
        }
        : keyEntry
          ? (keyEntry.bounds as any)
          : (objectBounds.reduce(
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
              centerY: 0,
            },
          ) as any)

    if (!('centerX' in targetBounds) || targetBounds.centerX === 0) {
      ; (targetBounds as any).centerX = (targetBounds.left + targetBounds.right) / 2
        ; (targetBounds as any).centerY = (targetBounds.top + targetBounds.bottom) / 2
    }

    objectBounds.forEach(({ obj, bounds }: { obj: FabricObject; bounds: ReturnType<typeof getObjectBounds> }) => {
      if (keyEntry && obj === keyEntry.obj) return

      const objLeft = Number((obj as any).left ?? 0)
      const objTop = Number((obj as any).top ?? 0)

      let nextLeft = objLeft
      let nextTop = objTop

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

    if (isActiveSelection) {
      const allObjects = objectBounds.map((e: { obj: FabricObject }) => e.obj)
      if (allObjects.length > 1) {
        const sel = new ActiveSelection(allObjects, { canvas: canvas.value })
        canvas.value.setActiveObject(sel)
      } else if (allObjects.length === 1 && allObjects[0]) {
        canvas.value.setActiveObject(allObjects[0])
      }
    }

    canvas.value.getActiveObject()?.setCoords?.()
    canvas.value.requestRenderAll?.()
    canvas.value.renderAll()
    saveToHistory()
  }

  function distributeSelection(axis: 'horizontal' | 'vertical'): void {
    if (!canvas.value) return

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
        centerY: adjustedTop + height / 2,
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

  return {
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
  }
}
