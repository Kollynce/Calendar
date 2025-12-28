import type { FabricObject } from 'fabric'
import {
  createRectangleShape,
  createCircleShape,
  createEllipseShape,
  createTriangleShape,
} from '@/fabric-objects/shapes'

export type ShapeType = 'rect' | 'rectangle' | 'circle' | 'ellipse' | 'triangle'

export interface ShapeCreationOptions {
  id?: string
  name?: string
  left?: number
  top?: number
  x?: number
  y?: number
  width?: number
  height?: number
  radius?: number
  rx?: number
  ry?: number
  fill?: string
  stroke?: string
  strokeWidth?: number
  cornerRadius?: number
  opacity?: number
  angle?: number
  selectable?: boolean
  evented?: boolean
  [key: string]: any
}

export class ShapeFactory {
  static create(type: ShapeType, options: ShapeCreationOptions = {}): FabricObject {
    const left = options.x ?? options.left ?? 100
    const top = options.y ?? options.top ?? 100
    const baseOptions = { ...options, left, top }

    switch (type) {
      case 'rect':
      case 'rectangle':
        return createRectangleShape({
          ...baseOptions,
          rx: options.cornerRadius ?? options.rx ?? 0,
          ry: options.cornerRadius ?? options.ry ?? 0,
        })

      case 'circle':
        return createCircleShape({
          ...baseOptions,
          radius: options.radius ?? (options.width ? options.width / 2 : 50),
        })

      case 'ellipse':
        return createEllipseShape({
          ...baseOptions,
          rx: options.rx ?? (options.width ? options.width / 2 : 60),
          ry: options.ry ?? (options.height ? options.height / 2 : 40),
        })

      case 'triangle':
        return createTriangleShape(baseOptions)

      default:
        return createRectangleShape(baseOptions)
    }
  }

  static getDefaultName(type: ShapeType): string {
    const names: Record<ShapeType, string> = {
      rect: 'Rectangle',
      rectangle: 'Rectangle',
      circle: 'Circle',
      ellipse: 'Ellipse',
      triangle: 'Triangle',
    }
    return names[type] || 'Shape'
  }

  static getSupportedTypes(): ShapeType[] {
    return ['rect', 'circle', 'ellipse', 'triangle']
  }
}
