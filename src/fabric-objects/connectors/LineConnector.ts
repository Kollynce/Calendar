import { Line, classRegistry } from 'fabric'
import { DEFAULT_SHAPE_STYLES, DEFAULT_STROKE, DEFAULT_STROKE_WIDTH } from '../base/types'

export interface LineConnectorOptions {
  id?: string
  name?: string
  connectorKind?: 'line'
  x1?: number
  y1?: number
  x2?: number
  y2?: number
  left?: number
  top?: number
  stroke?: string
  strokeWidth?: number
  strokeDashArray?: number[]
  strokeLineCap?: CanvasLineCap
  strokeLineJoin?: CanvasLineJoin
  opacity?: number
  [key: string]: any
}

function generateLineId(): string {
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function createLineConnector(options: LineConnectorOptions = {}): Line {
  const x1 = options.x1 ?? 0
  const y1 = options.y1 ?? 0
  const x2 = options.x2 ?? 100
  const y2 = options.y2 ?? 0

  const line = new Line([x1, y1, x2, y2], {
    ...DEFAULT_SHAPE_STYLES,
    stroke: options.stroke ?? DEFAULT_STROKE,
    strokeWidth: options.strokeWidth ?? DEFAULT_STROKE_WIDTH,
    strokeDashArray: options.strokeDashArray,
    strokeLineCap: options.strokeLineCap ?? 'round',
    strokeLineJoin: options.strokeLineJoin ?? 'round',
    left: options.left ?? 100,
    top: options.top ?? 100,
    opacity: options.opacity,
  })

  const obj = line as any
  obj.id = options.id || generateLineId()
  obj.name = options.name || 'Line'
  obj.connectorKind = 'line'

  return line
}

classRegistry.setClass(Line, 'line')
