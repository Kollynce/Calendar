import type { FabricObject } from 'fabric'
import { createLineConnector, createArrowConnector } from '@/fabric-objects/connectors'
import type { ArrowEnds, ArrowHeadStyle } from '@/fabric-objects/base/types'

export type ConnectorType = 'line' | 'arrow'

export interface ConnectorCreationOptions {
  id?: string
  name?: string
  left?: number
  top?: number
  x?: number
  y?: number
  width?: number
  length?: number
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

export class ConnectorFactory {
  static create(type: ConnectorType, options: ConnectorCreationOptions = {}): FabricObject {
    const left = options.x ?? options.left ?? 100
    const top = options.y ?? options.top ?? 100
    const width = options.width ?? options.length ?? 140

    switch (type) {
      case 'line':
        return createLineConnector({
          ...options,
          left,
          top,
          x2: width,
        })

      case 'arrow':
        return createArrowConnector({
          ...options,
          left,
          top,
          width,
        })

      default:
        return createLineConnector({
          ...options,
          left,
          top,
          x2: width,
        })
    }
  }

  static getDefaultName(type: ConnectorType): string {
    const names: Record<ConnectorType, string> = {
      line: 'Line',
      arrow: 'Arrow',
    }
    return names[type] || 'Connector'
  }

  static getSupportedTypes(): ConnectorType[] {
    return ['line', 'arrow']
  }
}
