import type {
  CalendarGridMetadata,
  ChecklistMetadata,
  CollageLayoutType,
  CollageMetadata,
  CollageSlot,
  DateCellMetadata,
  PlannerNoteMetadata,
  PlannerPatternVariant,
  ScheduleMetadata,
  TableMetadata,
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
    showBackground: overrides.showBackground ?? true,
    showBorder: overrides.showBorder ?? true,
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
    headerTextAlign: overrides.headerTextAlign ?? 'center',
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

export function getDefaultTableMetadata(overrides: Partial<TableMetadata> = {}): TableMetadata {
  const defaultSize = { width: 440, height: 360 }
  const size = overrides.size ? { ...defaultSize, ...overrides.size } : defaultSize
  const safeRows = Math.max(1, overrides.rows ?? 4)
  const safeColumns = Math.max(1, overrides.columns ?? 4)
  const resolvedBorderWidth = Math.max(0, overrides.borderWidth ?? 0)
  const resolvedBackgroundColor = overrides.backgroundColor ?? 'transparent'
  const showOuterFrame =
    overrides.showOuterFrame ??
    (resolvedBorderWidth > 0 ||
      (resolvedBackgroundColor !== 'transparent' && resolvedBackgroundColor !== 'rgba(0,0,0,0)'))
  return {
    kind: 'table',
    rows: safeRows,
    columns: safeColumns,
    size,
    showOuterFrame,
    showBackground: overrides.showBackground ?? showOuterFrame,
    showBorder: overrides.showBorder ?? showOuterFrame,
    cellPadding: overrides.cellPadding ?? 12,
    borderColor: overrides.borderColor ?? '#d1d5db',
    borderWidth: resolvedBorderWidth,
    backgroundColor: resolvedBackgroundColor,
    cellBackgroundColor: overrides.cellBackgroundColor ?? '#ffffff',
    headerRows: overrides.headerRows ?? 1,
    headerBackgroundColor: overrides.headerBackgroundColor ?? '#111827',
    headerTextColor: overrides.headerTextColor ?? '#ffffff',
    footerRows: overrides.footerRows ?? 0,
    footerBackgroundColor: overrides.footerBackgroundColor ?? '#f3f4f6',
    footerTextColor: overrides.footerTextColor ?? '#111827',
    stripeEvenRows: overrides.stripeEvenRows ?? false,
    stripeColor: overrides.stripeColor ?? '#f9fafb',
    gridLineColor: overrides.gridLineColor ?? '#e5e7eb',
    gridLineWidth: overrides.gridLineWidth ?? 1,
    showGridLines: overrides.showGridLines ?? true,
    cellFontFamily: overrides.cellFontFamily ?? 'Inter',
    cellFontSize: overrides.cellFontSize ?? 14,
    cellFontWeight: overrides.cellFontWeight ?? 500,
    cellTextColor: overrides.cellTextColor ?? '#111827',
    cellTextAlign: overrides.cellTextAlign ?? 'left',
    columnWidths: overrides.columnWidths,
    rowHeights: overrides.rowHeights,
    cellContents: overrides.cellContents,
    merges: overrides.merges,
    cornerRadius: overrides.cornerRadius ?? 0,
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
    showBackground: overrides.showBackground ?? true,
    showBorder: overrides.showBorder ?? true,
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
    titleAlign: overrides.titleAlign ?? 'left',
    backgroundColor: overrides.backgroundColor ?? '#ffffff',
    borderColor: overrides.borderColor ?? '#e2e8f0',
    borderWidth: overrides.borderWidth ?? 1,
    showBackground: overrides.showBackground ?? true,
    showBorder: overrides.showBorder ?? true,
    cornerRadius: overrides.cornerRadius ?? 22,
    titleColor: overrides.titleColor,
    headerBackgroundColor: overrides.headerBackgroundColor,
    headerBackgroundOpacity: overrides.headerBackgroundOpacity,
    guideColor: overrides.guideColor ?? '#e2e8f0',
    guideWidth: overrides.guideWidth ?? 1,
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
    titleAlign: overrides.titleAlign ?? 'left',
    backgroundColor: overrides.backgroundColor ?? '#ffffff',
    borderColor: overrides.borderColor ?? '#e2e8f0',
    borderWidth: overrides.borderWidth ?? 1,
    cornerRadius: overrides.cornerRadius ?? 22,
    titleColor: overrides.titleColor ?? '#0f172a',
    headerBackgroundColor: overrides.headerBackgroundColor ?? '#a855f7',
    headerBackgroundOpacity: overrides.headerBackgroundOpacity ?? 0.12,
    lineColor: overrides.lineColor ?? '#e2e8f0',
    lineWidth: overrides.lineWidth ?? 1,
    timeLabelColor: overrides.timeLabelColor ?? '#64748b',
    showBackground: overrides.showBackground ?? true,
    showBorder: overrides.showBorder ?? true,
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
    titleAlign: overrides.titleAlign ?? 'left',
    backgroundColor: overrides.backgroundColor ?? '#ffffff',
    borderColor: overrides.borderColor ?? '#e2e8f0',
    borderWidth: overrides.borderWidth ?? 1,
    showBackground: overrides.showBackground ?? true,
    showBorder: overrides.showBorder ?? true,
    cornerRadius: overrides.cornerRadius ?? 22,
    titleColor: overrides.titleColor,
    headerBackgroundColor: overrides.headerBackgroundColor,
    headerBackgroundOpacity: overrides.headerBackgroundOpacity,
    lineColor: overrides.lineColor ?? '#e2e8f0',
    lineWidth: overrides.lineWidth ?? 1,
    checkboxColor: overrides.checkboxColor,
    size,
  }
}

function generateCollageSlots(
  layout: CollageLayoutType,
  width: number,
  height: number,
  gap: number,
  padding: number,
): CollageSlot[] {
  const innerWidth = width - padding * 2
  const innerHeight = height - padding * 2

  switch (layout) {
    case 'grid-2x2': {
      const cellW = (innerWidth - gap) / 2
      const cellH = (innerHeight - gap) / 2
      return [
        { x: padding, y: padding, width: cellW, height: cellH },
        { x: padding + cellW + gap, y: padding, width: cellW, height: cellH },
        { x: padding, y: padding + cellH + gap, width: cellW, height: cellH },
        { x: padding + cellW + gap, y: padding + cellH + gap, width: cellW, height: cellH },
      ]
    }
    case 'grid-3x3': {
      const cellW = (innerWidth - gap * 2) / 3
      const cellH = (innerHeight - gap * 2) / 3
      const slots: CollageSlot[] = []
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          slots.push({
            x: padding + col * (cellW + gap),
            y: padding + row * (cellH + gap),
            width: cellW,
            height: cellH,
          })
        }
      }
      return slots
    }
    case 'grid-2x3': {
      const cellW = (innerWidth - gap) / 2
      const cellH = (innerHeight - gap * 2) / 3
      const slots: CollageSlot[] = []
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 2; col++) {
          slots.push({
            x: padding + col * (cellW + gap),
            y: padding + row * (cellH + gap),
            width: cellW,
            height: cellH,
          })
        }
      }
      return slots
    }
    case 'masonry': {
      const col1W = innerWidth * 0.55
      const col2W = innerWidth - col1W - gap
      return [
        { x: padding, y: padding, width: col1W, height: innerHeight * 0.6 },
        { x: padding, y: padding + innerHeight * 0.6 + gap, width: col1W, height: innerHeight * 0.4 - gap },
        { x: padding + col1W + gap, y: padding, width: col2W, height: innerHeight * 0.35 },
        { x: padding + col1W + gap, y: padding + innerHeight * 0.35 + gap, width: col2W, height: innerHeight * 0.35 },
        { x: padding + col1W + gap, y: padding + innerHeight * 0.7 + gap * 2, width: col2W, height: innerHeight * 0.3 - gap * 2 },
      ]
    }
    case 'polaroid': {
      const polaroidW = innerWidth * 0.4
      const polaroidH = polaroidW * 1.2
      const centerX = width / 2
      const centerY = height / 2
      return [
        { x: centerX - polaroidW * 0.8, y: centerY - polaroidH * 0.6, width: polaroidW, height: polaroidH, rotation: -8 },
        { x: centerX - polaroidW * 0.3, y: centerY - polaroidH * 0.5, width: polaroidW, height: polaroidH, rotation: 5 },
        { x: centerX + polaroidW * 0.1, y: centerY - polaroidH * 0.4, width: polaroidW, height: polaroidH, rotation: -3 },
      ]
    }
    case 'filmstrip': {
      const frameH = innerHeight * 0.7
      const frameW = frameH * 0.75
      const totalFrames = 4
      const totalWidth = totalFrames * frameW + (totalFrames - 1) * gap
      const startX = padding + (innerWidth - totalWidth) / 2
      const startY = padding + (innerHeight - frameH) / 2
      const slots: CollageSlot[] = []
      for (let i = 0; i < totalFrames; i++) {
        slots.push({
          x: startX + i * (frameW + gap),
          y: startY,
          width: frameW,
          height: frameH,
        })
      }
      return slots
    }
    case 'scrapbook': {
      return [
        { x: padding, y: padding, width: innerWidth * 0.5, height: innerHeight * 0.55, rotation: -2 },
        { x: padding + innerWidth * 0.45, y: padding + innerHeight * 0.1, width: innerWidth * 0.55, height: innerHeight * 0.45, rotation: 3 },
        { x: padding + innerWidth * 0.05, y: padding + innerHeight * 0.5, width: innerWidth * 0.45, height: innerHeight * 0.48, rotation: 1 },
        { x: padding + innerWidth * 0.48, y: padding + innerHeight * 0.52, width: innerWidth * 0.5, height: innerHeight * 0.46, rotation: -4 },
      ]
    }
    case 'mood-board': {
      return [
        { x: padding, y: padding, width: innerWidth * 0.65, height: innerHeight * 0.5 },
        { x: padding + innerWidth * 0.65 + gap, y: padding, width: innerWidth * 0.35 - gap, height: innerHeight * 0.3 },
        { x: padding + innerWidth * 0.65 + gap, y: padding + innerHeight * 0.3 + gap, width: innerWidth * 0.35 - gap, height: innerHeight * 0.2 - gap },
        { x: padding, y: padding + innerHeight * 0.5 + gap, width: innerWidth * 0.4, height: innerHeight * 0.5 - gap },
        { x: padding + innerWidth * 0.4 + gap, y: padding + innerHeight * 0.5 + gap, width: innerWidth * 0.6 - gap, height: innerHeight * 0.5 - gap },
      ]
    }
    default:
      return []
  }
}

export function getDefaultCollageMetadata(
  layout: CollageLayoutType = 'grid-2x2',
  overrides: Partial<CollageMetadata> = {},
): CollageMetadata {
  const defaultSize = { width: 400, height: 400 }
  const size = overrides.size ? { ...defaultSize, ...overrides.size } : defaultSize
  const gap = overrides.gap ?? 8
  const padding = overrides.padding ?? 12

  const slots = overrides.slots ?? generateCollageSlots(layout, size.width, size.height, gap, padding)

  return {
    kind: 'collage',
    layout: overrides.layout ?? layout,
    title: overrides.title,
    slots,
    backgroundColor: overrides.backgroundColor ?? '#ffffff',
    borderColor: overrides.borderColor ?? '#e2e8f0',
    borderWidth: overrides.borderWidth ?? 1,
    cornerRadius: overrides.cornerRadius ?? 16,
    slotCornerRadius: overrides.slotCornerRadius ?? 8,
    slotBorderColor: overrides.slotBorderColor ?? '#e5e7eb',
    slotBorderWidth: overrides.slotBorderWidth ?? 1,
    slotBackgroundColor: overrides.slotBackgroundColor ?? '#f3f4f6',
    gap,
    padding,
    showShadow: overrides.showShadow ?? false,
    shadowColor: overrides.shadowColor ?? 'rgba(0,0,0,0.1)',
    shadowBlur: overrides.shadowBlur ?? 8,
    shadowOffsetX: overrides.shadowOffsetX ?? 0,
    shadowOffsetY: overrides.shadowOffsetY ?? 4,
    size,
  }
}
