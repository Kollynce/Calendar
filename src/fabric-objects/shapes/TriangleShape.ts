import { Triangle, classRegistry } from 'fabric'
import { DEFAULT_SHAPE_STYLES, DEFAULT_SHAPE_FILL } from '../base/types'

export interface TriangleShapeOptions {
  id?: string
  name?: string
  shapeKind?: 'triangle'
  width?: number
  height?: number
  left?: number
  top?: number
  fill?: string
  stroke?: string
  strokeWidth?: number
  opacity?: number
  angle?: number
  [key: string]: any
}

function generateTriangleId(): string {
  return `triangle-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function createTriangleShape(options: TriangleShapeOptions = {}): Triangle {
  const triangle = new Triangle({
    ...DEFAULT_SHAPE_STYLES,
    fill: options.fill ?? DEFAULT_SHAPE_FILL,
    stroke: options.stroke ?? '',
    strokeWidth: options.strokeWidth ?? 0,
    width: options.width ?? 100,
    height: options.height ?? 87,
    left: options.left ?? 100,
    top: options.top ?? 100,
    opacity: options.opacity,
    angle: options.angle,
  })

  const obj = triangle as any
  obj.id = options.id || generateTriangleId()
  obj.name = options.name || 'Triangle'
  obj.shapeKind = 'triangle'

  return triangle
}

classRegistry.setClass(Triangle, 'triangle')
