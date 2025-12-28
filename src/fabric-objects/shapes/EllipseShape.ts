import { Ellipse, classRegistry } from 'fabric'
import type { EllipseProps } from 'fabric'
import { DEFAULT_SHAPE_STYLES, DEFAULT_SHAPE_FILL } from '../base/types'

export interface EllipseShapeOptions extends Partial<EllipseProps> {
  id?: string
  name?: string
  shapeKind?: 'ellipse'
}

function generateEllipseId(): string {
  return `ellipse-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function createEllipseShape(options: EllipseShapeOptions = {}): Ellipse {
  const ellipse = new Ellipse({
    ...DEFAULT_SHAPE_STYLES,
    fill: DEFAULT_SHAPE_FILL,
    stroke: '',
    strokeWidth: 0,
    rx: options.rx ?? 60,
    ry: options.ry ?? 40,
    left: options.left ?? 100,
    top: options.top ?? 100,
    ...options,
  })

  const obj = ellipse as any
  obj.id = options.id || generateEllipseId()
  obj.name = options.name || 'Ellipse'
  obj.shapeKind = 'ellipse'

  return ellipse
}

classRegistry.setClass(Ellipse, 'ellipse')
