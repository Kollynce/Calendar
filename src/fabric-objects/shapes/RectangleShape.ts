import { Rect, classRegistry } from 'fabric'
import type { RectProps } from 'fabric'
import { DEFAULT_SHAPE_STYLES, DEFAULT_SHAPE_FILL } from '../base/types'

export interface RectangleShapeOptions extends Partial<RectProps> {
  id?: string
  name?: string
  shapeKind?: 'rectangle'
}

function generateRectId(): string {
  return `rect-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function createRectangleShape(options: RectangleShapeOptions = {}): Rect {
  const rect = new Rect({
    ...DEFAULT_SHAPE_STYLES,
    fill: DEFAULT_SHAPE_FILL,
    stroke: '',
    strokeWidth: 0,
    rx: options.rx ?? 0,
    ry: options.ry ?? 0,
    width: options.width ?? 100,
    height: options.height ?? 100,
    left: options.left ?? 100,
    top: options.top ?? 100,
    ...options,
  })

  // Attach custom properties
  const obj = rect as any
  obj.id = options.id || generateRectId()
  obj.name = options.name || 'Rectangle'
  obj.shapeKind = 'rectangle'

  return rect
}

// Register for serialization support
classRegistry.setClass(Rect, 'rect')
