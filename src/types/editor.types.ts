import type { CalendarConfig } from './calendar.types'

export interface Project {
  id: string
  userId: string
  name: string
  description?: string
  templateId?: string
  config: CalendarConfig
  canvas: CanvasState
  thumbnail?: string
  status: ProjectStatus
  createdAt: string
  updatedAt: string
}

export type ProjectStatus = 'draft' | 'published' | 'archived'

export interface CanvasState {
  width: number
  height: number
  unit: 'px' | 'mm' | 'in'
  dpi: number
  backgroundColor: string
  objects: CanvasObject[]
  [key: string]: any
}

export interface CanvasObject {
  id: string
  type: ObjectType
  x: number
  y: number
  width: number
  height: number
  rotation: number
  opacity: number
  locked: boolean
  visible: boolean
  zIndex: number
  name?: string
  properties: ObjectProperties
}

export type ObjectType = 
  | 'calendar-grid'
  | 'text'
  | 'image'
  | 'shape'
  | 'logo'

export type ObjectProperties = 
  | CalendarGridProperties
  | TextProperties
  | ImageProperties
  | ShapeProperties

export interface CalendarGridProperties {
  month?: number
  theme: string
  showHeader: boolean
  showWeekdays: boolean
  cellPadding: number
}

export interface TextProperties {
  content: string
  fontFamily: string
  fontSize: number
  fontWeight: number
  fontStyle: 'normal' | 'italic'
  textAlign: 'left' | 'center' | 'right'
  color: string
  lineHeight: number
  letterSpacing: number
}

export interface ImageProperties {
  src: string
  fit: 'cover' | 'contain' | 'fill'
  filters?: ImageFilters
}

export interface ImageFilters {
  brightness: number
  contrast: number
  saturation: number
  blur: number
}

export interface ShapeProperties {
  shapeType: 'rectangle' | 'circle' | 'line' | 'polygon'
  fill: string
  stroke: string
  strokeWidth: number
  cornerRadius?: number
}
