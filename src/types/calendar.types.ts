export interface CalendarConfig {
  year: number
  country: CountryCode
  language: LanguageCode // Global language
  holidayLanguage?: LanguageCode // Holiday override
  layout: CalendarLayout
  startDay: WeekDay
  showHolidays: boolean
  showCustomHolidays: boolean
  showWeekNumbers: boolean
  currentMonth?: number // For monthly view navigation
  showWatermark?: boolean
  templateOptions?: TemplateOptions
}

export interface TemplateOptions {
  highlightToday: boolean
  highlightWeekends: boolean
  hasPhotoArea: boolean
  hasNotesArea: boolean
  primaryColor?: string
  accentColor?: string
  backgroundColor?: string
}

export type CalendarLayout =
  | 'year-grid'
  | 'monthly'
  | 'weekly'
  | 'daily'

export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6

// African countries
export type CountryCode =
  | 'DZ' | 'AO' | 'BJ' | 'BW' | 'BF' | 'BI' | 'CV' | 'CM' | 'CF' | 'TD'
  | 'KM' | 'CG' | 'CD' | 'CI' | 'DJ' | 'EG' | 'GQ' | 'ER' | 'SZ' | 'ET'
  | 'GA' | 'GM' | 'GH' | 'GN' | 'GW' | 'KE' | 'LS' | 'LR' | 'LY' | 'MG'
  | 'MW' | 'ML' | 'MR' | 'MU' | 'MA' | 'MZ' | 'NA' | 'NE' | 'NG' | 'RW'
  | 'ST' | 'SN' | 'SC' | 'SL' | 'SO' | 'ZA' | 'SS' | 'SD' | 'TZ' | 'TG'
  | 'TN' | 'UG' | 'ZM' | 'ZW'
  | (string & {})

export type LanguageCode =
  | 'en' | 'sw' | 'am' | 'yo' | 'zu' | 'ar' | 'fr' | 'pt' | 'ha' | 'ig'

export interface Holiday {
  id: string
  date: string
  name: string
  localName?: string
  type: HolidayType
  isPublic: boolean
  country: CountryCode
}

export type HolidayType =
  | 'public'
  | 'bank'
  | 'school'
  | 'optional'
  | 'observance'
  | 'custom'

export interface CustomHoliday extends Holiday {
  type: 'custom'
  color: string
  recurrence: RecurrenceRule | null
  notes?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface RecurrenceRule {
  frequency: 'yearly' | 'monthly' | 'weekly'
  interval: number
  endDate?: string
}

export interface CalendarDay {
  date: Date
  dayOfMonth: number
  isCurrentMonth: boolean
  isToday: boolean
  isWeekend: boolean
  weekNumber: number
  holidays: Holiday[]
}

export interface CalendarMonth {
  year: number
  month: number
  name: string
  shortName: string
  days: CalendarDay[]
  weeks: CalendarDay[][]
}

export interface CalendarYear {
  year: number
  months: CalendarMonth[]
}
