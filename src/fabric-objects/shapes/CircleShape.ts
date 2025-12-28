import { Circle, classRegistry } from 'fabric'
import type { CircleProps } from 'fabric'
import { DEFAULT_SHAPE_STYLES, DEFAULT_SHAPE_FILL } from '../base/types'

export interface CircleShapeOptions extends Partial<CircleProps> {
  id?: string
  name?: string
  shapeKind?: 'circle'
}

function generateCircleId(): string {
  return `circle-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function createCircleShape(options: CircleShapeOptions = {}): Circle {
  const circle = new Circle({
    ...DEFAULT_SHAPE_STYLES,
    fill: DEFAULT_SHAPE_FILL,
    stroke: '',
    strokeWidth: 0,
    radius: options.radius ?? 50,
    left: options.left ?? 100,
    top: options.top ?? 100,
    ...options,
  })

  const obj = circle as any
  obj.id = options.id || generateCircleId()
  obj.name = options.name || 'Circle'
  obj.shapeKind = 'circle'

  return circle
}

classRegistry.setClass(Circle, 'circle')
