import type {
  CalendarGridMetadata,
  ChecklistMetadata,
  DateCellMetadata,
  PlannerNoteMetadata,
  PlannerPatternVariant,
  ScheduleMetadata,
  WeekStripMetadata,
} from '@/types'

const today = new Date()

export function getISODateString(date: Date = new Date()): string {
  return date.toISOString()
}

export function getDefaultCalendarMetadata(
  overrides: Partial<CalendarGridMetadata> = {},
): CalendarGridMetadata {
  const defaultSize = { width: 460, height: 360 }
  const size = overrides.size ? { ...defaultSize, ...overrides.size } : defaultSize
  return {
    kind: 'calendar-grid',
    mode: overrides.mode ?? 'month',
    year: overrides.year ?? today.getFullYear(),
    month: overrides.month ?? today.getMonth() + 1,
    startDay: overrides.startDay ?? 0,
    showHeader: overrides.showHeader ?? true,
    showWeekdays: overrides.showWeekdays ?? true,
    title: overrides.title,
    backgroundColor: overrides.backgroundColor ?? '#ffffff',
    borderColor: overrides.borderColor ?? '#e5e7eb',
    borderWidth: overrides.borderWidth ?? 1,
    cornerRadius: overrides.cornerRadius ?? 26,
    headerHeight: overrides.headerHeight ?? 60,
    weekdayHeight: overrides.weekdayHeight ?? 36,
    cellGap: overrides.cellGap ?? 0,
    dayNumberInsetX: overrides.dayNumberInsetX ?? 12,
    dayNumberInsetY: overrides.dayNumberInsetY ?? 8,
    headerBackgroundColor: overrides.headerBackgroundColor ?? '#111827',
    headerBackgroundOpacity: overrides.headerBackgroundOpacity ?? 0.95,
    headerTextColor: overrides.headerTextColor ?? '#ffffff',
    headerFontFamily: overrides.headerFontFamily ?? 'Outfit',
    headerFontSize: overrides.headerFontSize ?? 24,
    headerFontWeight: overrides.headerFontWeight ?? 600,
    weekdayTextColor: overrides.weekdayTextColor ?? '#6b7280',
    weekdayFontFamily: overrides.weekdayFontFamily ?? 'Inter',
    weekdayFontSize: overrides.weekdayFontSize ?? 12,
    weekdayFontWeight: overrides.weekdayFontWeight ?? 600,
    weekdayFormat: overrides.weekdayFormat ?? 'short',
    gridLineColor: overrides.gridLineColor ?? '#e5e7eb',
    gridLineWidth: overrides.gridLineWidth ?? 1,
    dayNumberColor: overrides.dayNumberColor ?? '#1f2937',
    dayNumberMutedColor: overrides.dayNumberMutedColor ?? '#9ca3af',
    dayNumberFontFamily: overrides.dayNumberFontFamily ?? 'Inter',
    dayNumberFontSize: overrides.dayNumberFontSize ?? 16,
    dayNumberFontWeight: overrides.dayNumberFontWeight ?? 600,
    weekendBackgroundColor: overrides.weekendBackgroundColor,
    todayBackgroundColor: overrides.todayBackgroundColor,
    showHolidayMarkers: overrides.showHolidayMarkers ?? true,
    holidayMarkerColor: overrides.holidayMarkerColor ?? '#ef4444',
    holidayMarkerHeight: overrides.holidayMarkerHeight ?? 4,
    showHolidayList: overrides.showHolidayList ?? true,
    holidayListTitle: overrides.holidayListTitle ?? 'Holidays',
    holidayListMaxItems: overrides.holidayListMaxItems ?? 4,
    holidayListTextColor: overrides.holidayListTextColor ?? '#4b5563',
    holidayListAccentColor: overrides.holidayListAccentColor ?? '#ef4444',
    holidayListHeight: overrides.holidayListHeight ?? 96,
    holidayListTitleFontSize: overrides.holidayListTitleFontSize ?? 14,
    holidayListEntryFontSize: overrides.holidayListEntryFontSize ?? 12,
    country: overrides.country ?? 'KE',
    language: overrides.language ?? 'en',
    size,
  }
}

export function getDefaultWeekStripMetadata(
  overrides: Partial<WeekStripMetadata> = {},
): WeekStripMetadata {
  const defaultSize = { width: 520, height: 150 }
  const size = overrides.size ? { ...defaultSize, ...overrides.size } : defaultSize
  return {
    kind: 'week-strip',
    mode: overrides.mode ?? 'month',
    startDate: overrides.startDate ?? getISODateString(),
    startDay: overrides.startDay ?? 0,
    label: overrides.label ?? 'Week Plan',
    backgroundColor: overrides.backgroundColor ?? '#ffffff',
    borderColor: overrides.borderColor ?? '#e5e7eb',
    borderWidth: overrides.borderWidth ?? 1,
    cornerRadius: overrides.cornerRadius ?? 24,
    cellBorderColor: overrides.cellBorderColor ?? '#f1f5f9',
    cellBorderWidth: overrides.cellBorderWidth ?? 1,
    labelColor: overrides.labelColor ?? '#0f172a',
    labelFontFamily: overrides.labelFontFamily ?? 'Inter',
    labelFontSize: overrides.labelFontSize ?? 16,
    labelFontWeight: overrides.labelFontWeight ?? 600,
    weekdayColor: overrides.weekdayColor ?? '#64748b',
    weekdayFontFamily: overrides.weekdayFontFamily ?? 'Inter',
    weekdayFontSize: overrides.weekdayFontSize ?? 12,
    weekdayFontWeight: overrides.weekdayFontWeight ?? 600,
    dayNumberColor: overrides.dayNumberColor ?? '#0f172a',
    dayNumberFontFamily: overrides.dayNumberFontFamily ?? 'Inter',
    dayNumberFontSize: overrides.dayNumberFontSize ?? 22,
    dayNumberFontWeight: overrides.dayNumberFontWeight ?? 700,
    showHolidayMarkers: overrides.showHolidayMarkers ?? true,
    holidayMarkerStyle: overrides.holidayMarkerStyle ?? 'text',
    holidayMarkerColor: overrides.holidayMarkerColor ?? '#ef4444',
    holidayMarkerHeight: overrides.holidayMarkerHeight ?? 4,
    showHolidayList: overrides.showHolidayList !== false,
    holidayListTitle: overrides.holidayListTitle ?? 'Holidays',
    holidayListMaxItems: overrides.holidayListMaxItems ?? 4,
    holidayListHeight: overrides.holidayListHeight ?? 96,
    holidayListTextColor: overrides.holidayListTextColor ?? '#4b5563',
    holidayListAccentColor: overrides.holidayListAccentColor ?? overrides.holidayMarkerColor ?? '#ef4444',
    country: overrides.country ?? 'KE',
    language: overrides.language ?? 'en',
    size,
  }
}

export function getDefaultPlannerNoteMetadata(
  pattern: PlannerPatternVariant = 'ruled',
  overrides: Partial<PlannerNoteMetadata> = {},
): PlannerNoteMetadata {
  const defaultSize = { width: 280, height: 320 }
  const size = overrides.size ? { ...defaultSize, ...overrides.size } : defaultSize
  return {
    kind: 'planner-note',
    pattern: overrides.pattern ?? pattern,
    title: overrides.title ?? 'Notes',
    accentColor: overrides.accentColor ?? '#2563eb',
    headerStyle:
      overrides.headerStyle ??
      ((overrides.pattern ?? pattern) === 'hero' ? 'filled' : 'minimal'),
    backgroundColor: overrides.backgroundColor ?? '#ffffff',
    borderColor: overrides.borderColor ?? '#e2e8f0',
    borderWidth: overrides.borderWidth ?? 1,
    cornerRadius: overrides.cornerRadius ?? 22,
    titleColor: overrides.titleColor,
    headerBackgroundColor: overrides.headerBackgroundColor,
    headerBackgroundOpacity: overrides.headerBackgroundOpacity,
    guideColor: overrides.guideColor,
    dotColor: overrides.dotColor,
    size,
  }
}

export function getDefaultDateCellMetadata(
  overrides: Partial<DateCellMetadata> = {},
): DateCellMetadata {
  const defaultSize = { width: 200, height: 220 }
  const size = overrides.size ? { ...defaultSize, ...overrides.size } : defaultSize
  return {
    kind: 'date-cell',
    date: overrides.date ?? getISODateString(),
    highlightAccent: overrides.highlightAccent ?? '#fef3c7',
    notePlaceholder: overrides.notePlaceholder ?? 'Add event',
    backgroundColor: overrides.backgroundColor ?? '#ffffff',
    borderColor: overrides.borderColor ?? '#e2e8f0',
    borderWidth: overrides.borderWidth ?? 1,
    cornerRadius: overrides.cornerRadius ?? 24,
    accentHeightRatio: overrides.accentHeightRatio ?? 0.4,
    weekdayColor: overrides.weekdayColor ?? '#78350f',
    weekdayFontFamily: overrides.weekdayFontFamily ?? 'Inter',
    weekdayFontSize: overrides.weekdayFontSize ?? 13,
    weekdayFontWeight: overrides.weekdayFontWeight ?? 600,
    dayNumberColor: overrides.dayNumberColor ?? '#92400e',
    dayNumberFontFamily: overrides.dayNumberFontFamily ?? 'Inter',
    dayNumberFontSize: overrides.dayNumberFontSize ?? 52,
    dayNumberFontWeight: overrides.dayNumberFontWeight ?? 700,
    placeholderColor: overrides.placeholderColor ?? '#475569',
    placeholderFontFamily: overrides.placeholderFontFamily ?? 'Inter',
    placeholderFontSize: overrides.placeholderFontSize ?? 13,
    placeholderFontWeight: overrides.placeholderFontWeight ?? 400,
    showHolidayMarkers: overrides.showHolidayMarkers ?? true,
    holidayMarkerStyle: overrides.holidayMarkerStyle ?? 'dot',
    holidayMarkerColor: overrides.holidayMarkerColor ?? '#ef4444',
    holidayMarkerHeight: overrides.holidayMarkerHeight ?? 4,
    showHolidayList: overrides.showHolidayList ?? true,
    holidayListTitle: overrides.holidayListTitle ?? 'Holidays',
    holidayListMaxItems: overrides.holidayListMaxItems ?? 4,
    holidayListHeight: overrides.holidayListHeight ?? 96,
    holidayListTextColor: overrides.holidayListTextColor ?? '#4b5563',
    holidayListAccentColor: overrides.holidayListAccentColor ?? overrides.holidayMarkerColor ?? '#ef4444',
    country: overrides.country ?? 'KE',
    language: overrides.language ?? 'en',
    showHolidayInfo: overrides.showHolidayInfo ?? true,
    holidayInfoPosition: overrides.holidayInfoPosition ?? 'bottom',
    holidayInfoTextColor: overrides.holidayInfoTextColor ?? '#4b5563',
    holidayInfoAccentColor: overrides.holidayInfoAccentColor ?? overrides.holidayMarkerColor ?? '#ef4444',
    holidayInfoFontSize: overrides.holidayInfoFontSize ?? 12,
    size,
  }
}

export function getDefaultScheduleMetadata(
  overrides: Partial<ScheduleMetadata> = {},
): ScheduleMetadata {
  const defaultSize = { width: 320, height: 640 }
  const size = overrides.size ? { ...defaultSize, ...overrides.size } : defaultSize
  return {
    kind: 'schedule',
    title: overrides.title ?? 'Schedule',
    accentColor: overrides.accentColor ?? '#a855f7',
    startHour: overrides.startHour ?? 6,
    endHour: overrides.endHour ?? 20,
    intervalMinutes: overrides.intervalMinutes ?? 60,
    headerStyle: overrides.headerStyle ?? 'minimal',
    backgroundColor: overrides.backgroundColor ?? '#ffffff',
    borderColor: overrides.borderColor ?? '#e2e8f0',
    borderWidth: overrides.borderWidth ?? 1,
    cornerRadius: overrides.cornerRadius ?? 22,
    titleColor: overrides.titleColor,
    headerBackgroundColor: overrides.headerBackgroundColor,
    headerBackgroundOpacity: overrides.headerBackgroundOpacity,
    lineColor: overrides.lineColor,
    timeLabelColor: overrides.timeLabelColor,
    size,
  }
}

export function getDefaultChecklistMetadata(
  overrides: Partial<ChecklistMetadata> = {},
): ChecklistMetadata {
  const defaultSize = { width: 320, height: 420 }
  const size = overrides.size ? { ...defaultSize, ...overrides.size } : defaultSize
  return {
    kind: 'checklist',
    title: overrides.title ?? 'To Do',
    accentColor: overrides.accentColor ?? '#ec4899',
    rows: overrides.rows ?? 8,
    showCheckboxes: overrides.showCheckboxes ?? true,
    headerStyle: overrides.headerStyle ?? 'tint',
    backgroundColor: overrides.backgroundColor ?? '#ffffff',
    borderColor: overrides.borderColor ?? '#e2e8f0',
    borderWidth: overrides.borderWidth ?? 1,
    cornerRadius: overrides.cornerRadius ?? 22,
    titleColor: overrides.titleColor,
    headerBackgroundColor: overrides.headerBackgroundColor,
    headerBackgroundOpacity: overrides.headerBackgroundOpacity,
    lineColor: overrides.lineColor,
    checkboxColor: overrides.checkboxColor,
    size,
  }
}
