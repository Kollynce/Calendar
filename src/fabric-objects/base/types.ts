// import type { FabricObject, ObjectEvents, TClassProperties } from 'fabric'

export interface BaseObjectProps {
  id?: string
  name?: string
  locked?: boolean
}

export interface ShapeObjectProps extends BaseObjectProps {
  shapeKind?: ShapeKind
}

export interface ConnectorObjectProps extends BaseObjectProps {
  connectorKind?: ConnectorKind
}

export type ShapeKind = 'rectangle' | 'circle' | 'ellipse' | 'triangle' | 'polygon' | 'star'

export type ConnectorKind = 'line' | 'arrow' | 'curved-arrow'

export type ArrowEnds = 'none' | 'start' | 'end' | 'both'

export type ArrowHeadStyle = 'filled' | 'open'

export interface ArrowOptions {
  baseWidth: number
  stroke: string
  strokeWidth: number
  arrowEnds: ArrowEnds
  arrowHeadStyle: ArrowHeadStyle
  arrowHeadLength: number
  arrowHeadWidth: number
  strokeDashArray?: number[]
  strokeLineCap?: CanvasLineCap
  strokeLineJoin?: CanvasLineJoin
}

export const DEFAULT_SHAPE_STYLES = {
  cornerStyle: 'circle' as const,
  cornerColor: '#ffffff',
  cornerStrokeColor: '#2563eb',
  borderColor: '#2563eb',
  transparentCorners: false,
  cornerSize: 8,
  borderScaleFactor: 1,
}

export const DEFAULT_SHAPE_FILL = '#3b82f6'
export const DEFAULT_STROKE = '#000000'
export const DEFAULT_STROKE_WIDTH = 2
