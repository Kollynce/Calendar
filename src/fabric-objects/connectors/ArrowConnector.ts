import { Group, Line, Polygon, classRegistry } from 'fabric'
import type { FabricObject } from 'fabric'
import { DEFAULT_SHAPE_STYLES, DEFAULT_STROKE, DEFAULT_STROKE_WIDTH } from '../base/types'
import type { ArrowEnds, ArrowHeadStyle, ArrowOptions } from '../base/types'

export interface ArrowConnectorOptions {
  id?: string
  name?: string
  connectorKind?: 'arrow'
  left?: number
  top?: number
  width?: number
  stroke?: string
  strokeWidth?: number
  strokeDashArray?: number[]
  strokeLineCap?: CanvasLineCap
  strokeLineJoin?: CanvasLineJoin
  arrowEnds?: ArrowEnds
  arrowHeadStyle?: ArrowHeadStyle
  arrowHeadLength?: number
  arrowHeadWidth?: number
  opacity?: number
  selectable?: boolean
  evented?: boolean
  [key: string]: any
}

function generateArrowId(): string {
  return `arrow-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function createArrowHeadPolygon(
  part: 'startHead' | 'endHead',
  headLength: number,
  headWidth: number,
  stroke: string,
  strokeWidth: number,
  style: ArrowHeadStyle,
  strokeLineCap?: CanvasLineCap,
  strokeLineJoin?: CanvasLineJoin
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

  ;(poly as any).data = { arrowPart: part }
  return poly
}

export function createArrowConnector(options: ArrowConnectorOptions = {}): Group {
  const width = Math.max(10, Number(options.width ?? 140) || 140)
  const stroke = options.stroke ?? DEFAULT_STROKE
  const strokeWidth = Math.max(1, Number(options.strokeWidth ?? DEFAULT_STROKE_WIDTH) || DEFAULT_STROKE_WIDTH)
  const headLength = Math.max(4, Number(options.arrowHeadLength ?? Math.max(14, strokeWidth * 4)) || Math.max(14, strokeWidth * 4))
  const headWidth = Math.max(4, Number(options.arrowHeadWidth ?? Math.max(10, headLength * 0.7)) || Math.max(10, headLength * 0.7))
  const arrowEnds: ArrowEnds = options.arrowEnds ?? 'end'
  const headStyle: ArrowHeadStyle = options.arrowHeadStyle ?? 'filled'

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
    strokeDashArray: options.strokeDashArray,
    strokeLineCap: options.strokeLineCap,
    strokeLineJoin: options.strokeLineJoin,
    originX: 'left',
    originY: 'center',
    left: offsetX + x1,
    top: y,
    selectable: false,
    evented: false,
    objectCaching: false,
  })
  ;(line as any).data = { arrowPart: 'line' }

  const objects: FabricObject[] = [line]

  if (hasStart) {
    const startHead = createArrowHeadPolygon(
      'startHead',
      headLength,
      headWidth,
      stroke,
      strokeWidth,
      headStyle,
      options.strokeLineCap,
      options.strokeLineJoin
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
      options.strokeLineCap,
      options.strokeLineJoin
    )
    endHead.set({ originX: 'left', originY: 'center', left: offsetX + (width - headLength), top: y } as any)
    objects.push(endHead)
  }

  const group = new Group(objects, {
    ...DEFAULT_SHAPE_STYLES,
    left: options.left ?? 100,
    top: options.top ?? 100,
    selectable: options.selectable ?? true,
    evented: options.evented ?? true,
    subTargetCheck: false,
    hoverCursor: 'move',
    objectCaching: false,
    opacity: options.opacity,
  })

  const obj = group as any
  obj.id = options.id || generateArrowId()
  obj.name = options.name || 'Arrow'
  obj.connectorKind = 'arrow'
  obj.data = {
    ...(obj.data ?? {}),
    shapeKind: 'arrow',
    arrowOptions: {
      baseWidth: width,
      arrowHeadLength: headLength,
      arrowHeadWidth: headWidth,
      arrowHeadStyle: headStyle,
      arrowEnds,
      stroke,
      strokeWidth,
    } as ArrowOptions,
  }

  return group
}

export function getArrowParts(group: Group): {
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

export function refreshArrowGroupGeometry(group: Group): void {
  const data = ((group as any).data ?? {}) as any
  const opts = (data.arrowOptions ?? {}) as ArrowOptions
  const { line, startHead, endHead } = getArrowParts(group)

  if (!line) return

  const width = Number(opts.baseWidth ?? 140) || 140
  const strokeWidth = Math.max(1, Number(opts.strokeWidth ?? (line as any).strokeWidth ?? 2) || 2)
  const headLength = Math.max(4, Number(opts.arrowHeadLength ?? Math.max(14, strokeWidth * 4)) || Math.max(14, strokeWidth * 4))

  const arrowEnds = (opts.arrowEnds ?? 'end') as ArrowEnds

  const hasStart = arrowEnds === 'start' || arrowEnds === 'both'
  const hasEnd = arrowEnds === 'end' || arrowEnds === 'both'

  const offsetX = -width / 2
  const x1 = hasStart ? headLength : 0
  const x2 = Math.max(x1, width - (hasEnd ? headLength : 0))
  const len = Math.max(0, x2 - x1)

  line.set({ x1: 0, y1: 0, x2: len, y2: 0, left: offsetX + x1, top: 0 } as any)

  if (startHead) {
    startHead.set({ left: offsetX, top: 0, visible: hasStart } as any)
  }
  if (endHead) {
    endHead.set({ left: offsetX + width - headLength, top: 0, visible: hasEnd } as any)
  }

  group.setCoords()
}

classRegistry.setClass(Group, 'group')
