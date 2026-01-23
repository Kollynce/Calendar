import type { CalendarConfig, WeekDay, LanguageCode, CountryCode } from './calendar.types'

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
  backgroundPattern?: CanvasPatternConfig
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
  | 'collage'
  | 'table'
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

export type CanvasBackgroundPattern = 'none' | 'ruled' | 'grid' | 'dot'

export interface CanvasPatternConfig {
  pattern: CanvasBackgroundPattern
  color: string
  spacing: number
  opacity: number
}

export type PlannerHeaderStyle = 'none' | 'minimal' | 'filled' | 'tint'

export type CanvasElementMetadata =
  | CalendarGridMetadata
  | WeekStripMetadata
  | DateCellMetadata
  | PlannerNoteMetadata
  | ScheduleMetadata
  | ChecklistMetadata
  | CollageMetadata
  | TableMetadata

export type TableTextAlign = 'left' | 'center' | 'right'

export interface TableCellContent {
  row: number
  column: number
  text?: string
  textAlign?: TableTextAlign
  fontFamily?: string
  fontSize?: number
  fontWeight?: string | number
  textColor?: string
  backgroundColor?: string
}

export interface TableCellMerge {
  row: number
  column: number
  rowSpan: number
  colSpan: number
}

export interface TableMetadata {
  kind: 'table'
  rows: number
  columns: number
  size: {
    width: number
    height: number
  }
  showOuterFrame?: boolean
  showBackground?: boolean
  showBorder?: boolean
  headerRows?: number
  footerRows?: number
  stripeEvenRows?: boolean
  stripeColor?: string
  borderColor?: string
  borderWidth?: number
  cornerRadius?: number
  backgroundColor?: string
  cellBackgroundColor?: string
  headerBackgroundColor?: string
  headerTextColor?: string
  footerBackgroundColor?: string
  footerTextColor?: string
  gridLineColor?: string
  gridLineWidth?: number
  showGridLines?: boolean
  cellPadding?: number
  cellFontFamily?: string
  cellFontSize?: number
  cellFontWeight?: string | number
  cellTextColor?: string
  cellTextAlign?: TableTextAlign
  columnWidths?: number[]
  rowHeights?: number[]
  cellContents?: TableCellContent[]
  merges?: TableCellMerge[]
}

export interface CalendarGridMetadata {
  kind: 'calendar-grid'
  
  // Layout
  size: {
    width: number
    height: number
  }
  headerHeight?: number
  weekdayHeight?: number
  cellGap?: number
  dayNumberInsetX?: number
  dayNumberInsetY?: number

  // Content
  mode: 'blank' | 'month'
  year: number
  month: number
  startDay: WeekDay
  title?: string
  country?: CountryCode
  language?: LanguageCode

  // Appearance - General
  backgroundColor?: string
  borderColor?: string
  borderWidth?: number
  showBackground?: boolean
  showBorder?: boolean
  cornerRadius?: number
  gridLineColor?: string
  gridLineWidth?: number

  // Appearance - Header
  showHeader: boolean
  headerBackgroundColor?: string
  headerBackgroundOpacity?: number
  headerTextColor?: string
  headerFontFamily?: string
  headerFontSize?: number
  headerFontWeight?: string | number
  headerTextAlign?: 'left' | 'center' | 'right'

  // Appearance - Weekdays
  showWeekdays: boolean
  weekdayFormat?: 'long' | 'short' | 'narrow'
  weekdayTextColor?: string
  weekdayFontFamily?: string
  weekdayFontSize?: number
  weekdayFontWeight?: string | number

  // Appearance - Day Numbers
  dayNumberColor?: string
  dayNumberMutedColor?: string
  dayNumberFontFamily?: string
  dayNumberFontSize?: number
  dayNumberFontWeight?: string | number
  weekendBackgroundColor?: string
  todayBackgroundColor?: string

  // Holidays
  showHolidayMarkers?: boolean
  holidayMarkerStyle?: 'bar' | 'dot' | 'square' | 'background' | 'text' | 'border' | 'triangle'
  holidayMarkerColor?: string
  holidayMarkerHeight?: number
  showHolidayList?: boolean
  holidayListTitle?: string
  holidayListMaxItems?: number
  holidayListTextColor?: string
  holidayListAccentColor?: string
  holidayListHeight?: number
  holidayListTitleFontSize?: number
  holidayListEntryFontSize?: number
}

export interface WeekStripMetadata {
  kind: 'week-strip'
  
  // Layout
  size: {
    width: number
    height: number
  }
  cornerRadius?: number

  // Content
  mode?: 'month' | 'blank'
  startDate: string
  startDay: WeekDay
  label?: string
  country?: CountryCode
  language?: LanguageCode

  // Appearance - General
  backgroundColor?: string
  borderColor?: string
  borderWidth?: number
  showBackground?: boolean
  showBorder?: boolean
  cellBorderColor?: string
  cellBorderWidth?: number

  // Appearance - Labels & Typography
  showHeader?: boolean
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

  // Holidays
  showHolidayMarkers?: boolean
  holidayMarkerStyle?: 'bar' | 'dot' | 'square' | 'background' | 'text' | 'border' | 'triangle'
  holidayMarkerColor?: string
  holidayMarkerHeight?: number
  showHolidayList?: boolean
  holidayListTitle?: string
  holidayListMaxItems?: number
  holidayListHeight?: number
  holidayListTextColor?: string
  holidayListAccentColor?: string
}

export interface DateCellMetadata {
  kind: 'date-cell'

  // Layout
  size: {
    width: number
    height: number
  }
  cornerRadius?: number
  accentHeightRatio?: number

  // Content
  date: string
  highlightAccent: string
  notePlaceholder: string
  country?: CountryCode
  language?: LanguageCode

  // Appearance - General
  backgroundColor?: string
  borderColor?: string
  borderWidth?: number
  showBackground?: boolean
  showBorder?: boolean

  // Appearance - Typography
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

  // Holidays
  showHolidayMarkers?: boolean
  holidayMarkerStyle?: 'bar' | 'dot' | 'square' | 'background' | 'text' | 'border' | 'triangle'
  holidayMarkerColor?: string
  holidayMarkerHeight?: number
  showHolidayList?: boolean
  holidayListTitle?: string
  holidayListMaxItems?: number
  holidayListHeight?: number
  holidayListTextColor?: string
  holidayListAccentColor?: string
  showHolidayInfo?: boolean
  holidayInfoPosition?: 'top' | 'bottom' | 'overlay'
  holidayInfoTextColor?: string
  holidayInfoAccentColor?: string
  holidayInfoFontSize?: number
}

export interface PlannerNoteMetadata {
  kind: 'planner-note'

  // Layout
  size: {
    width: number
    height: number
  }
  headerHeight?: number
  cornerRadius?: number

  // Content
  title: string
  pattern: PlannerPatternVariant

  // Appearance - General
  accentColor: string
  backgroundColor?: string
  borderColor?: string
  borderWidth?: number
  showBackground?: boolean
  showBorder?: boolean
  guideColor?: string
  guideWidth?: number
  dotColor?: string

  // Appearance - Header
  showHeader?: boolean
  headerStyle?: PlannerHeaderStyle
  headerBackgroundColor?: string
  headerBackgroundOpacity?: number
  titleColor?: string
  titleAlign?: 'left' | 'center' | 'right'
}

export interface ScheduleMetadata {
  kind: 'schedule'

  // Layout
  size: {
    width: number
    height: number
  }
  headerHeight?: number
  cornerRadius?: number

  // Content
  title: string
  startHour: number
  endHour: number
  intervalMinutes: 30 | 60

  // Appearance - General
  accentColor: string
  backgroundColor?: string
  borderColor?: string
  borderWidth?: number
  showBackground?: boolean
  showBorder?: boolean
  lineColor?: string
  lineWidth?: number
  timeLabelColor?: string

  // Appearance - Header
  showHeader?: boolean
  headerStyle?: PlannerHeaderStyle
  headerBackgroundColor?: string
  headerBackgroundOpacity?: number
  titleColor?: string
  titleAlign?: 'left' | 'center' | 'right'
}

export interface ChecklistMetadata {
  kind: 'checklist'

  // Layout
  size: {
    width: number
    height: number
  }
  headerHeight?: number
  cornerRadius?: number

  // Content
  title: string
  rows: number
  showCheckboxes: boolean

  // Appearance - General
  accentColor: string
  backgroundColor?: string
  borderColor?: string
  borderWidth?: number
  showBackground?: boolean
  showBorder?: boolean
  lineColor?: string
  lineWidth?: number
  checkboxColor?: string

  // Appearance - Header
  showHeader?: boolean
  headerStyle?: PlannerHeaderStyle
  headerBackgroundColor?: string
  headerBackgroundOpacity?: number
  titleColor?: string
  titleAlign?: 'left' | 'center' | 'right'
}

export type CollageLayoutType =
  | 'grid-2x2'
  | 'grid-3x3'
  | 'grid-2x3'
  | 'masonry'
  | 'polaroid'
  | 'filmstrip'
  | 'scrapbook'
  | 'mood-board'

export interface CollageSlot {
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  imageUrl?: string
  imageFit?: 'cover' | 'contain' | 'fill'
}

export interface CollageMetadata {
  kind: 'collage'
  layout: CollageLayoutType
  title?: string
  slots: CollageSlot[]
  backgroundColor?: string
  borderColor?: string
  borderWidth?: number
  cornerRadius?: number
  slotCornerRadius?: number
  slotBorderColor?: string
  slotBorderWidth?: number
  slotBackgroundColor?: string
  gap?: number
  padding?: number
  showFrame?: boolean
  showShadow?: boolean
  shadowColor?: string
  shadowBlur?: number
  shadowOffsetX?: number
  shadowOffsetY?: number
  size: {
    width: number
    height: number
  }
}
