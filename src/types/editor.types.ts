import type { CalendarConfig, WeekDay } from './calendar.types'

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
  | 'week-strip'
  | 'date-cell'
  | 'notes-panel'
  | 'schedule'
  | 'checklist'
  | 'text'
  | 'image'
  | 'shape'
  | 'logo'

export type ObjectProperties = 
  | CalendarGridProperties
  | TextProperties
  | ImageProperties
  | ShapeProperties
  | PlannerElementProperties

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

export interface PlannerElementProperties {
  variant: 'notes-panel' | 'week-strip' | 'date-cell' | 'schedule' | 'checklist'
  accentColor?: string
  title?: string
  [key: string]: any
}

export type PlannerPatternVariant = 'hero' | 'ruled' | 'grid' | 'dot'

export type PlannerHeaderStyle = 'none' | 'minimal' | 'filled' | 'tint'

export type CanvasElementMetadata =
  | CalendarGridMetadata
  | WeekStripMetadata
  | DateCellMetadata
  | PlannerNoteMetadata
  | ScheduleMetadata
  | ChecklistMetadata

export interface CalendarGridMetadata {
  kind: 'calendar-grid'
  mode: 'blank' | 'month'
  year: number
  month: number
  startDay: WeekDay
  showHeader: boolean
  showWeekdays: boolean
  title?: string
  backgroundColor?: string
  borderColor?: string
  borderWidth?: number
  cornerRadius?: number
  headerHeight?: number
  weekdayHeight?: number
  cellGap?: number
  dayNumberInsetX?: number
  dayNumberInsetY?: number
  headerBackgroundColor?: string
  headerBackgroundOpacity?: number
  headerTextColor?: string
  headerFontFamily?: string
  headerFontSize?: number
  headerFontWeight?: string | number
  weekdayTextColor?: string
  weekdayFontFamily?: string
  weekdayFontSize?: number
  weekdayFontWeight?: string | number
  gridLineColor?: string
  gridLineWidth?: number
  dayNumberColor?: string
  dayNumberMutedColor?: string
  dayNumberFontFamily?: string
  dayNumberFontSize?: number
  dayNumberFontWeight?: string | number
  weekendBackgroundColor?: string
  todayBackgroundColor?: string
  showHolidayMarkers?: boolean
  holidayMarkerColor?: string
  holidayMarkerHeight?: number
  size: {
    width: number
    height: number
  }
}

export interface WeekStripMetadata {
  kind: 'week-strip'
  startDate: string
  startDay: WeekDay
  label?: string
  backgroundColor?: string
  borderColor?: string
  borderWidth?: number
  cornerRadius?: number
  cellBorderColor?: string
  cellBorderWidth?: number
  labelColor?: string
  labelFontFamily?: string
  labelFontSize?: number
  labelFontWeight?: string | number
  weekdayColor?: string
  weekdayFontFamily?: string
  weekdayFontSize?: number
  weekdayFontWeight?: string | number
  dayNumberColor?: string
  dayNumberFontFamily?: string
  dayNumberFontSize?: number
  dayNumberFontWeight?: string | number
  size: {
    width: number
    height: number
  }
}

export interface DateCellMetadata {
  kind: 'date-cell'
  date: string
  highlightAccent: string
  notePlaceholder: string
  backgroundColor?: string
  borderColor?: string
  borderWidth?: number
  cornerRadius?: number
  accentHeightRatio?: number
  weekdayColor?: string
  weekdayFontFamily?: string
  weekdayFontSize?: number
  weekdayFontWeight?: string | number
  dayNumberColor?: string
  dayNumberFontFamily?: string
  dayNumberFontSize?: number
  dayNumberFontWeight?: string | number
  placeholderColor?: string
  placeholderFontFamily?: string
  placeholderFontSize?: number
  placeholderFontWeight?: string | number
  size: {
    width: number
    height: number
  }
}

export interface PlannerNoteMetadata {
  kind: 'planner-note'
  pattern: PlannerPatternVariant
  title: string
  accentColor: string
  headerStyle?: PlannerHeaderStyle
  backgroundColor?: string
  borderColor?: string
  borderWidth?: number
  cornerRadius?: number
  titleColor?: string
  headerBackgroundColor?: string
  headerBackgroundOpacity?: number
  guideColor?: string
  dotColor?: string
  size: {
    width: number
    height: number
  }
}

export interface ScheduleMetadata {
  kind: 'schedule'
  title: string
  accentColor: string
  startHour: number
  endHour: number
  intervalMinutes: 30 | 60
  headerStyle?: PlannerHeaderStyle
  backgroundColor?: string
  borderColor?: string
  borderWidth?: number
  cornerRadius?: number
  titleColor?: string
  headerBackgroundColor?: string
  headerBackgroundOpacity?: number
  lineColor?: string
  timeLabelColor?: string
  size: {
    width: number
    height: number
  }
}

export interface ChecklistMetadata {
  kind: 'checklist'
  title: string
  accentColor: string
  rows: number
  showCheckboxes: boolean
  headerStyle?: PlannerHeaderStyle
  backgroundColor?: string
  borderColor?: string
  borderWidth?: number
  cornerRadius?: number
  titleColor?: string
  headerBackgroundColor?: string
  headerBackgroundOpacity?: number
  lineColor?: string
  checkboxColor?: string
  size: {
    width: number
    height: number
  }
}
