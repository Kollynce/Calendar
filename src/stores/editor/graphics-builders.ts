import { Group, Line, Polygon, Rect, Textbox, FabricImage, type Object as FabricObject } from 'fabric'

// Image cache to prevent flickering and repeated loads
const imageCache = new Map<string, HTMLImageElement>()

import type {
  CalendarDay,
  CalendarGridMetadata,
  ChecklistMetadata,
  CollageMetadata,
  DateCellMetadata,
  Holiday,
  PlannerNoteMetadata,
  ScheduleMetadata,
  TableCellContent,
  TableCellMerge,
  TableMetadata,
  WeekStripMetadata,
} from '@/types'
import { calendarGeneratorService } from '@/services/calendar/generator.service'

export type HolidaysGetter = (year: number, country?: string, language?: string) => Holiday[]

type CalendarGridDay = {
  dayOfMonth: number
  isWeekend?: boolean
  isCurrentMonth?: boolean
  isToday?: boolean
  holidays?: unknown[]
}

type WeekStripDay = CalendarDay

function computeStripeFill(
  index: number,
  metadata: TableMetadata,
  defaultFill: string,
  section: 'header' | 'body' | 'footer',
): string {
  if (section !== 'body') return defaultFill
  if (!metadata.stripeEvenRows) return defaultFill
  const stripeColor = metadata.stripeColor ?? '#f9fafb'
  return index % 2 === 1 ? stripeColor : defaultFill
}

function getCellContent(
  row: number,
  column: number,
  metadata: TableMetadata,
): TableCellContent | undefined {
  return metadata.cellContents?.find((item) => item.row === row && item.column === column)
}

function getMergeForCell(
  row: number,
  column: number,
  merges?: TableCellMerge[],
): TableCellMerge | undefined {
  return merges?.find((merge) => row >= merge.row && row < merge.row + merge.rowSpan && column >= merge.column && column < merge.column + merge.colSpan)
}

function isCellCoveredByMerge(
  row: number,
  column: number,
  merge: TableCellMerge,
): boolean {
  return row > merge.row && row < merge.row + merge.rowSpan && column >= merge.column && column < merge.column + merge.colSpan
}

export function buildCalendarGridGraphics(
  metadata: CalendarGridMetadata,
  getHolidaysForCalendarYear: (year: number, country?: string, language?: string) => Holiday[],
): Group {
  const width = metadata.size.width
  const baseHeight = metadata.size.height
  const objects: FabricObject[] = []

  const cornerRadius = Math.max(0, metadata.cornerRadius ?? 26)
  const borderWidth = Math.max(0, metadata.borderWidth ?? 1)
  const borderColor = metadata.borderColor ?? '#e5e7eb'
  const backgroundColor = metadata.backgroundColor ?? '#ffffff'
  const showBackground = metadata.showBackground !== false
  const showBorder = metadata.showBorder !== false
  const headerHeight = metadata.showHeader ? Math.max(0, metadata.headerHeight ?? 60) : 0
  const weekdayHeight = metadata.showWeekdays ? Math.max(0, metadata.weekdayHeight ?? 36) : 0
  const gridLineColor = metadata.gridLineColor ?? '#e5e7eb'
  const gridLineWidth = Math.max(0, metadata.gridLineWidth ?? 1)

  const headerBackgroundColor = metadata.headerBackgroundColor ?? '#111827'
  const headerBackgroundOpacity = metadata.headerBackgroundOpacity ?? 0.95
  const headerTextColor = metadata.headerTextColor ?? '#ffffff'
  const headerFontFamily = metadata.headerFontFamily ?? 'Outfit'
  const headerFontSize = metadata.headerFontSize ?? 24
  const headerFontWeight = metadata.headerFontWeight ?? 600

  const weekdayTextColor = metadata.weekdayTextColor ?? '#6b7280'
  const weekdayFontFamily = metadata.weekdayFontFamily ?? 'Inter'
  const weekdayFontSize = metadata.weekdayFontSize ?? 12
  const weekdayFontWeight = metadata.weekdayFontWeight ?? 600

  const dayNumberColor = metadata.dayNumberColor ?? '#1f2937'
  const dayNumberMutedColor = metadata.dayNumberMutedColor ?? '#9ca3af'
  const dayNumberFontFamily = metadata.dayNumberFontFamily ?? 'Inter'
  const dayNumberFontSize = metadata.dayNumberFontSize ?? 16
  const dayNumberFontWeight = metadata.dayNumberFontWeight ?? 600

  const cellGap = Math.max(0, Number(metadata.cellGap ?? 0) || 0)
  const dayNumberInsetX = Math.max(0, Number(metadata.dayNumberInsetX ?? 12) || 0)
  const dayNumberInsetY = Math.max(0, Number(metadata.dayNumberInsetY ?? 8) || 0)

  const holidaysForYear = getHolidaysForCalendarYear(metadata.year, metadata.country, metadata.language)
  const monthStr = metadata.month.toString().padStart(2, '0')
  const monthHolidays = holidaysForYear.filter((holiday) => {
    if (!holiday?.date) return false
    return (
      holiday.date.slice(0, 4) === String(metadata.year) &&
      holiday.date.slice(5, 7) === monthStr &&
      holiday.isPublic !== false
    )
  })

  const groupedByDate = monthHolidays.reduce<Record<string, string[]>>((acc, holiday) => {
    if (!holiday?.date) return acc
    const key = holiday.date
    const bucket = acc[key] ?? []
    const name = (holiday.localName || holiday.name).replace(/\s*\([^)]*\)/g, '').trim()
    bucket.push(name)
    acc[key] = bucket
    return acc
  }, {})

  const sortedDates = Object.keys(groupedByDate).sort()
  const maxItems = Math.max(0, metadata.holidayListMaxItems ?? 4)
  const holidaysToDisplay = sortedDates.slice(0, maxItems)
  const hasHolidayList = metadata.showHolidayList !== false && holidaysToDisplay.length > 0

  const listPaddingY = 6
  const listPaddingX = 10
  const listBottomPadding = 8
  const titleFontSize = metadata.holidayListTitleFontSize ?? 14
  const entryFontSize = metadata.holidayListEntryFontSize ?? 12
  const titleSpacing = 10
  const minConfiguredListHeight = 48
  const configuredListHeight = hasHolidayList
    ? Math.max(minConfiguredListHeight, metadata.holidayListHeight ?? 96)
    : 0
  const entryRowHeight = entryFontSize + 8
  const estimatedListHeight = hasHolidayList
    ? listPaddingY + titleFontSize + titleSpacing + holidaysToDisplay.length * entryRowHeight + listBottomPadding
    : 0
  const listHeight = hasHolidayList
    ? Math.min(configuredListHeight, Math.max(minConfiguredListHeight, estimatedListHeight))
    : 0

  // Constrain list height to available space to prevent overflow
  const maxAvailableListHeight = Math.max(0, baseHeight - headerHeight - weekdayHeight)
  const effectiveListHeight = Math.min(listHeight, maxAvailableListHeight)

  const totalHeight = baseHeight
  const gridAvailableHeight = Math.max(0, baseHeight - headerHeight - weekdayHeight - effectiveListHeight)
  const cellWidth = (width - cellGap * 6) / 7

  objects.push(
    new Rect({
      width,
      height: totalHeight,
      rx: cornerRadius,
      ry: cornerRadius,
      fill: showBackground ? backgroundColor : 'transparent',
      stroke: showBorder ? borderColor : undefined,
      strokeWidth: showBorder ? borderWidth : 0,
    }),
  )

  if (metadata.showHeader) {
    const monthName = calendarGeneratorService.getMonthName(metadata.month, metadata.language)
    const headerText = metadata.title ?? `${monthName} ${metadata.year}`
    const headerTextTop = Math.max(0, (headerHeight - headerFontSize) / 2)
    objects.push(
      new Rect({
        top: 0,
        left: 0,
        width,
        height: headerHeight,
        rx: cornerRadius,
        ry: cornerRadius,
        fill: headerBackgroundColor,
        opacity: headerBackgroundOpacity,
      }),
    )
    objects.push(
      new Textbox(headerText, {
        left: 12,
        top: headerTextTop,
        width: width - 24,
        fontSize: headerFontSize,
        fontFamily: headerFontFamily,
        fontWeight: headerFontWeight,
        fill: headerTextColor,
        textAlign: 'center',
        selectable: false,
      }),
    )
  }

  const effectiveStyle = metadata.holidayMarkerStyle ?? 'text'

  if (metadata.showWeekdays) {
    const weekdayFormat = metadata.weekdayFormat ?? 'short'
    const labels = calendarGeneratorService.getWeekdayNames(
      metadata.startDay,
      metadata.language || 'en',
      weekdayFormat,
    ) as string[]
    const weekdayTextTop = headerHeight + Math.max(0, (weekdayHeight - weekdayFontSize) / 2)
    labels.forEach((label: string, index: number) => {
      objects.push(
        new Textbox(label.toUpperCase(), {
          left: index * (cellWidth + cellGap) + 12,
          top: weekdayTextTop,
          width: cellWidth - 24,
          fontSize: weekdayFontSize,
          fontFamily: weekdayFontFamily,
          fontWeight: weekdayFontWeight,
          fill: weekdayTextColor,
          textAlign: 'center',
          selectable: false,
        }),
      )
    })
  }

  const monthData =
    metadata.mode === 'month'
      ? calendarGeneratorService.generateMonth(
        metadata.year,
        metadata.month,
        holidaysForYear,
        metadata.startDay,
        metadata.language,
      )
      : null
  const weeks = (monthData?.weeks ?? Array.from({ length: 6 }, () => Array(7).fill(null))) as Array<
    Array<CalendarGridDay | null>
  >
  const rowCount = Math.max(1, weeks.length || 0)
  const cellHeight =
    gridAvailableHeight > 0 && rowCount > 0
      ? (gridAvailableHeight - cellGap * Math.max(0, rowCount - 1)) / rowCount
      : 0

  weeks.forEach((week: Array<CalendarGridDay | null>, weekIndex: number) => {
    week.forEach((maybeDay: CalendarGridDay | null, dayIndex: number) => {
      const top = headerHeight + weekdayHeight + weekIndex * (cellHeight + cellGap)
      const left = dayIndex * (cellWidth + cellGap)

      if (
        maybeDay &&
        metadata.weekendBackgroundColor &&
        maybeDay.isWeekend &&
        maybeDay.isCurrentMonth
      ) {
        objects.push(
          new Rect({
            top,
            left,
            width: cellWidth,
            height: cellHeight,
            fill: metadata.weekendBackgroundColor,
            selectable: false,
            evented: false,
          }),
        )
      }

      if (maybeDay && metadata.todayBackgroundColor && maybeDay.isToday) {
        objects.push(
          new Rect({
            top,
            left,
            width: cellWidth,
            height: cellHeight,
            fill: metadata.todayBackgroundColor,
            selectable: false,
            evented: false,
          }),
        )
      }

      objects.push(
        new Rect({
          top,
          left,
          width: cellWidth,
          height: cellHeight,
          fill: 'transparent',
          stroke: gridLineColor,
          strokeWidth: gridLineWidth,
          selectable: false,
        }),
      )

      // Holiday Background (must be rendered before text)
      if (
        maybeDay &&
        metadata.showHolidayMarkers !== false &&
        metadata.holidayMarkerStyle === 'background' &&
        maybeDay.holidays?.length
      ) {
        objects.push(
          new Rect({
            top,
            left,
            width: cellWidth,
            height: cellHeight,
            fill: metadata.holidayMarkerColor ?? '#fee2e2',
            selectable: false,
            evented: false,
          }),
        )
      }

      if (maybeDay) {
        // Constrain box width to available space in cell
        const preferredWidth = Math.max(10, Math.min(40, dayNumberFontSize * 2))
        const availableWidth = Math.max(5, cellWidth - dayNumberInsetX)
        const dayNumberBoxWidth = Math.min(preferredWidth, availableWidth)

        objects.push(
          new Textbox(String(maybeDay.dayOfMonth), {
            left: left + cellWidth - dayNumberInsetX - dayNumberBoxWidth,
            top: top + dayNumberInsetY,
            width: dayNumberBoxWidth,
            fontSize: dayNumberFontSize,
            fontFamily: dayNumberFontFamily,
            fontWeight: dayNumberFontWeight,
            fill:
              metadata.showHolidayMarkers !== false &&
                effectiveStyle === 'text' &&
                maybeDay.holidays?.length
                ? metadata.holidayMarkerColor ?? '#ef4444'
                : maybeDay.isCurrentMonth
                  ? dayNumberColor
                  : dayNumberMutedColor,
            textAlign: 'right',
            selectable: false,
          }),
        )

        if (
          metadata.showHolidayMarkers !== false &&
          effectiveStyle !== 'background' &&
          effectiveStyle !== 'text' &&
          maybeDay.holidays?.length
        ) {
          const markerColor = metadata.holidayMarkerColor ?? '#ef4444'

          if (effectiveStyle === 'dot') {
            const size = Math.max(2, (metadata.holidayMarkerHeight ?? 4) / 2)
            objects.push(
              new Rect({
                left: left + cellWidth / 2 - size,
                top: top + cellHeight - 8 - size * 2,
                width: size * 2,
                height: size * 2,
                rx: size,
                ry: size,
                fill: markerColor,
                selectable: false,
              }),
            )
          } else if (effectiveStyle === 'square') {
            const size = Math.max(2, (metadata.holidayMarkerHeight ?? 4))
            objects.push(
              new Rect({
                left: left + cellWidth / 2 - size / 2,
                top: top + cellHeight - 8 - size,
                width: size,
                height: size,
                fill: markerColor,
                selectable: false,
              }),
            )
          } else if (effectiveStyle === 'border') {
            const width = Math.max(1, metadata.holidayMarkerHeight ?? 2)
            objects.push(
              new Rect({
                left: left + width / 2,
                top: top + width / 2,
                width: cellWidth - width,
                height: cellHeight - width,
                fill: 'transparent',
                stroke: markerColor,
                strokeWidth: width,
                selectable: false,
              }),
            )
          } else if (effectiveStyle === 'triangle') {
            const size = Math.max(4, (metadata.holidayMarkerHeight ?? 8))
            // Top-right corner triangle
            objects.push(
              new Polygon(
                [
                  { x: 0, y: 0 },
                  { x: size, y: 0 },
                  { x: size, y: size },
                ],
                {
                  left: left + cellWidth - size,
                  top: top,
                  fill: markerColor,
                  selectable: false,
                },
              ),
            )
          } else if (effectiveStyle === 'bar') {
            // Explicitly handle 'bar' style
            const markerHeight = Math.max(1, metadata.holidayMarkerHeight ?? 4)
            objects.push(
              new Rect({
                left: left + 12,
                top: top + cellHeight - 12 - markerHeight,
                width: cellWidth - 24,
                height: markerHeight,
                rx: 2,
                ry: 2,
                fill: markerColor,
                selectable: false,
              }),
            )
          }
        }
      }
    })
  })

  if (hasHolidayList && listHeight > 0) {
    const listTop = headerHeight + weekdayHeight + gridAvailableHeight
    const usableListHeight = Math.max(0, listHeight - listPaddingY - listBottomPadding)
    const entryAreaHeight = Math.max(0, usableListHeight - titleFontSize - titleSpacing)
    const entrySpacing = holidaysToDisplay.length
      ? Math.max(entryRowHeight, entryAreaHeight / holidaysToDisplay.length)
      : entryRowHeight
    const textColor = metadata.holidayListTextColor ?? '#4b5563'
    const accentColor = metadata.holidayListAccentColor ?? metadata.holidayMarkerColor ?? '#ef4444'
    const title = metadata.holidayListTitle ?? 'Holidays'

    objects.push(
      new Textbox(title, {
        left: listPaddingX,
        top: listTop + listPaddingY,
        width: width - listPaddingX * 2,
        fontSize: titleFontSize,
        fontFamily: headerFontFamily,
        fontWeight: 600,
        fill: textColor,
        selectable: false,
      }),
    )

    const entryTopBase = listTop + listPaddingY + titleFontSize + titleSpacing

    // Calculate how many items can fit
    const availableListSpace = usableListHeight - titleFontSize - titleSpacing
    const maxFitItems = Math.max(0, Math.floor(availableListSpace / entrySpacing))
    const itemsToShow = holidaysToDisplay.slice(0, maxFitItems)

    itemsToShow.forEach((dateKey, index) => {
      const entryTop = entryTopBase + index * entrySpacing
      const dayNumber = Number(dateKey.slice(8, 10))
      const monthName = calendarGeneratorService.getMonthName(metadata.month, metadata.language, 'short')
      const dateLabel = `${monthName} ${dayNumber}`
      const namesArray = groupedByDate[dateKey] ?? []
      const names = namesArray.join(', ')

      objects.push(
        new Textbox(dateLabel, {
          left: listPaddingX,
          top: entryTop,
          width: 45,
          fontSize: entryFontSize,
          fontFamily: weekdayFontFamily,
          fontWeight: 600,
          fill: accentColor,
          selectable: false,
        }),
      )

      objects.push(
        new Textbox(names, {
          left: listPaddingX + 50,
          top: entryTop,
          width: width - listPaddingX * 2 - 50,
          fontSize: entryFontSize,
          fontFamily: dayNumberFontFamily,
          fontWeight: 500,
          fill: textColor,
          selectable: false,
        }),
      )
    })
  }

  return new Group(objects, {
    subTargetCheck: false,
    hasControls: true,
    hoverCursor: 'move',
    objectCaching: false,
  })
}

export function buildWeekStripGraphics(
  metadata: WeekStripMetadata,
  getHolidaysForCalendarYear?: HolidaysGetter,
): Group {
  const { width } = metadata.size
  const baseHeight = metadata.size.height
  let height = baseHeight
  const objects: FabricObject[] = []

  const cornerRadius = Math.max(0, metadata.cornerRadius ?? 24)
  const borderWidth = Math.max(0, metadata.borderWidth ?? 1)
  const backgroundColor = metadata.backgroundColor ?? '#ffffff'
  const borderColor = metadata.borderColor ?? '#e5e7eb'
  const cellBorderColor = metadata.cellBorderColor ?? '#f1f5f9'
  const cellBorderWidth = Math.max(0, metadata.cellBorderWidth ?? 1)
  const showBackground = metadata.showBackground !== false
  const showBorder = metadata.showBorder !== false

  const labelColor = metadata.labelColor ?? '#0f172a'
  const labelFontFamily = metadata.labelFontFamily ?? 'Inter'
  const labelFontSize = metadata.labelFontSize ?? 16
  const labelFontWeight = metadata.labelFontWeight ?? 600

  const weekdayColor = metadata.weekdayColor ?? '#64748b'
  const weekdayFontFamily = metadata.weekdayFontFamily ?? 'Inter'
  const weekdayFontSize = metadata.weekdayFontSize ?? 12
  const weekdayFontWeight = metadata.weekdayFontWeight ?? 600

  const dayNumberColor = metadata.dayNumberColor ?? '#0f172a'
  const dayNumberFontFamily = metadata.dayNumberFontFamily ?? 'Inter'
  const dayNumberFontSize = metadata.dayNumberFontSize ?? 22
  const dayNumberFontWeight = metadata.dayNumberFontWeight ?? 700

  const label = metadata.label ?? 'Weekly Focus'
  const paddingX = 24
  const computeHeaderHeight = (targetHeight: number): number =>
    Math.min(Math.max(40, Math.round(labelFontSize + 24)), Math.max(44, Math.round(targetHeight * 0.45)))
  const startDate = new Date(metadata.startDate)
  const isBlank = metadata.mode === 'blank'
  // Get holidays for both the start year and end year (in case week spans two years like Dec 28 - Jan 3)
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + 6)
  const startYear = startDate.getFullYear()
  const endYear = endDate.getFullYear()
  let holidaysForYear: Holiday[] = []
  if (getHolidaysForCalendarYear) {
    holidaysForYear = getHolidaysForCalendarYear(startYear, metadata.country, metadata.language)
    if (endYear !== startYear) {
      const nextYearHolidays = getHolidaysForCalendarYear(endYear, metadata.country, metadata.language)
      holidaysForYear = [...holidaysForYear, ...nextYearHolidays]
    }
  }
  const days = isBlank
    ? (Array.from({ length: 7 }, () => ({
        date: new Date(startDate),
        dayOfMonth: 0,
        isCurrentMonth: false,
        isToday: false,
        isWeekend: false,
        weekNumber: 0,
        holidays: [],
      })) as WeekStripDay[])
    : (calendarGeneratorService.generateWeek(startDate, holidaysForYear, metadata.startDay) as WeekStripDay[])

  const holidayEntries = isBlank
    ? []
    : days
        .filter((day) => (day.holidays?.length ?? 0) > 0)
        .map((day) => {
          const names =
            day.holidays
              ?.map((holiday) => (holiday.localName || holiday.name || '').replace(/\s*\([^)]*\)/g, '').trim())
              .filter(Boolean) ?? []
          return {
            day,
            names,
          }
        })

  const maxListItems = Math.max(1, metadata.holidayListMaxItems ?? 4)
  const listEntries = holidayEntries.slice(0, maxListItems)
  const showHolidayList = metadata.showHolidayList !== false && listEntries.length > 0
  const configuredListHeight = metadata.holidayListHeight ?? 96

  const holidayDataAvailable = (holidaysForYear?.length ?? 0) > 0
  const reserveSpaceForList = !isBlank && (holidayDataAvailable ? showHolidayList : metadata.showHolidayList !== false)

  if (!reserveSpaceForList) {
    const estimatedListSpace = Math.max(48, Math.min(height * 0.6, configuredListHeight))
    const headerForBase = computeHeaderHeight(height)
    const basePadding = Math.max(12, Math.round(height * 0.12))
    const baseBodyMin =
      height > 140 ? Math.max(56, Math.round(height * 0.28)) : Math.max(32, Math.round(height * 0.25))
    const minContentHeight = headerForBase + baseBodyMin + basePadding
    height = Math.max(minContentHeight, height - estimatedListSpace)
  }

  const headerHeight = computeHeaderHeight(height)
  const labelTop = Math.max(12, Math.min(20, Math.round((headerHeight - labelFontSize) / 2)))

  // Calculate layout assuming holidays might be shown to prevent layout shifts
  const paddingBottomBase = Math.max(12, Math.round(height * 0.12))
  const paddingBottom = reserveSpaceForList ? Math.max(8, Math.round(height * 0.06)) : paddingBottomBase

  // Adjust bodyMinHeight based on total height to be more reasonable
  const bodyMinHeight = height > 140 ? Math.max(56, Math.round(height * 0.28)) : Math.max(32, Math.round(height * 0.25))

  const availableForList = Math.max(0, height - headerHeight - paddingBottom - bodyMinHeight)
  const desiredListHeight = Math.max(48, Math.min(height * 0.6, configuredListHeight))
  // Use reserveSpaceForList for layout calculations to reserve space only when needed
  const listHeight = reserveSpaceForList ? Math.min(desiredListHeight, availableForList) : 0
  const listTop = height - listHeight

  if (showBackground || showBorder) {
    objects.push(
      new Rect({
        width,
        height,
        rx: cornerRadius,
        ry: cornerRadius,
        fill: showBackground ? backgroundColor : 'transparent',
        stroke: showBorder ? borderColor : undefined,
        strokeWidth: showBorder ? borderWidth : 0,
      }),
    )
  }

  objects.push(
    new Textbox(label, {
      left: paddingX,
      top: labelTop,
      width: width - paddingX * 2,
      fontSize: labelFontSize,
      fontFamily: labelFontFamily,
      fontWeight: labelFontWeight,
      fill: labelColor,
      selectable: false,
    }),
  )

  const weekdayRowHeightRaw = Math.max(18, Math.round(height * 0.16))
  const weekdayRowHeight = Math.max(
    12,
    Math.min(34, Math.min(weekdayRowHeightRaw, height - headerHeight - paddingBottom - listHeight - 48)),
  )
  const bodyTop = headerHeight + weekdayRowHeight
  const cellHeight = Math.max(32, height - bodyTop - paddingBottom - listHeight)
  const cellWidth = days.length > 0 ? width / days.length : width

  const cellInsetX = 12
  const dayNumberInsetX = 12
  const dayNumberInsetY = 8

  if (weekdayRowHeight > 0) {
    const weekdayFontSizeEff = Math.min(weekdayFontSize, Math.max(8, Math.floor(weekdayRowHeight * 0.55)))
    const weekdayTextTop = headerHeight + Math.max(0, (weekdayRowHeight - weekdayFontSizeEff) / 2)
    days.forEach((day: WeekStripDay, index: number) => {
      const dayName = day.date.toLocaleDateString(metadata.language || 'en', { weekday: 'short' }).toUpperCase()
      objects.push(
        new Textbox(dayName, {
          left: index * cellWidth + cellInsetX,
          top: weekdayTextTop,
          width: cellWidth - cellInsetX * 2,
          fontSize: weekdayFontSizeEff,
          fontFamily: weekdayFontFamily,
          fontWeight: weekdayFontWeight,
          fill: weekdayColor,
          textAlign: 'center',
          selectable: false,
        }),
      )
    })
  }

  const dayNumberFontSizeEff = Math.min(dayNumberFontSize, Math.max(10, Math.floor(cellHeight * 0.42)))
  const dayNumberBoxWidth = Math.max(18, Math.min(40, dayNumberFontSizeEff * 2))

  const showHolidayMarkers = !isBlank && metadata.showHolidayMarkers !== false
  const markerStyle = metadata.holidayMarkerStyle ?? 'text'
  const markerColor = metadata.holidayMarkerColor ?? '#ef4444'
  const markerHeight = Math.max(1, metadata.holidayMarkerHeight ?? 4)

  days.forEach((day: WeekStripDay, index: number) => {
    const left = index * cellWidth
    const dayHasHoliday = !isBlank && (day.holidays?.length ?? 0) > 0

    if (dayHasHoliday && showHolidayMarkers && markerStyle === 'background') {
      objects.push(
        new Rect({
          left,
          top: bodyTop,
          width: cellWidth,
          height: cellHeight,
          fill: markerColor,
          opacity: 0.15,
          selectable: false,
          evented: false,
        }),
      )
    }

    objects.push(
      new Rect({
        left,
        top: bodyTop,
        width: cellWidth,
        height: cellHeight,
        fill: 'transparent',
        stroke: cellBorderColor,
        strokeWidth: cellBorderWidth,
        selectable: false,
      }),
    )
    // Show numbers only when not in blank mode
    const dayNumberText = isBlank ? '' : String(day.dayOfMonth ?? '')
    objects.push(
      new Textbox(dayNumberText, {
        left: left + cellWidth - dayNumberInsetX - dayNumberBoxWidth,
        top: bodyTop + dayNumberInsetY,
        width: dayNumberBoxWidth,
        fontSize: dayNumberFontSizeEff,
        fontFamily: dayNumberFontFamily,
        fontWeight: dayNumberFontWeight,
        fill: showHolidayMarkers && markerStyle === 'text' && dayHasHoliday ? markerColor : dayNumberColor,
        textAlign: 'right',
        selectable: false,
      }),
    )

    if (isBlank || !dayHasHoliday || !showHolidayMarkers || markerStyle === 'text' || markerStyle === 'background') {
      return
    }

    if (markerStyle === 'dot') {
      const size = markerHeight
      objects.push(
        new Rect({
          left: left + cellWidth / 2 - size,
          top: bodyTop + cellHeight - 12 - size * 2,
          width: size * 2,
          height: size * 2,
          rx: size,
          ry: size,
          fill: markerColor,
          selectable: false,
        }),
      )
    } else if (markerStyle === 'square') {
      const size = markerHeight * 1.2
      objects.push(
        new Rect({
          left: left + cellWidth / 2 - size / 2,
          top: bodyTop + cellHeight - 12 - size,
          width: size,
          height: size,
          fill: markerColor,
          selectable: false,
        }),
      )
    } else if (markerStyle === 'border') {
      objects.push(
        new Rect({
          left: left + markerHeight / 2,
          top: bodyTop + markerHeight / 2,
          width: cellWidth - markerHeight,
          height: cellHeight - markerHeight,
          fill: 'transparent',
          stroke: markerColor,
          strokeWidth: markerHeight,
          selectable: false,
        }),
      )
    } else if (markerStyle === 'triangle') {
      const size = Math.max(6, markerHeight * 2)
      objects.push(
        new Polygon(
          [
            { x: 0, y: 0 },
            { x: size, y: 0 },
            { x: size, y: size },
          ],
          {
            left: left + cellWidth - size - 4,
            top: bodyTop + 4,
            fill: markerColor,
            selectable: false,
          },
        ),
      )
    } else if (markerStyle === 'bar') {
      objects.push(
        new Rect({
          left: left + 12,
          top: bodyTop + cellHeight - markerHeight - 6,
          width: cellWidth - 24,
          height: markerHeight,
          rx: Math.min(3, markerHeight),
          ry: Math.min(3, markerHeight),
          fill: markerColor,
          selectable: false,
        }),
      )
    }
  })

  if (showHolidayList && listHeight > 0) {
    const title = metadata.holidayListTitle ?? 'Holidays'
    const textColor = metadata.holidayListTextColor ?? '#4b5563'
    const accentColor = metadata.holidayListAccentColor ?? markerColor
    const listPaddingX = 18
    const listPaddingY = 10
    const titleFontSize = 13
    const entryFontSize = 12

    objects.push(
      new Textbox(title, {
        left: listPaddingX,
        top: listTop + listPaddingY,
        width: width - listPaddingX * 2,
        fontSize: titleFontSize,
        fontFamily: labelFontFamily,
        fontWeight: 600,
        fill: textColor,
        selectable: false,
      }),
    )

    const entryTopBase = listTop + listPaddingY + titleFontSize + 6
    const availableHeight = Math.max(0, listTop + listHeight - entryTopBase - listPaddingY)
    const spacing = listEntries.length ? Math.max(entryFontSize + 6, availableHeight / listEntries.length) : 0

    listEntries.forEach(({ day, names }, index) => {
      const entryTop = entryTopBase + index * spacing
      const locale = metadata.language || 'en'
      const dateLabel = day.date.toLocaleDateString(locale, { weekday: 'short', day: 'numeric' })
      const namesText = names.join(', ')

      objects.push(
        new Textbox(dateLabel.toUpperCase(), {
          left: listPaddingX,
          top: entryTop,
          width: 60,
          fontSize: entryFontSize,
          fontFamily: weekdayFontFamily,
          fontWeight: 600,
          fill: accentColor,
          selectable: false,
        }),
      )

      objects.push(
        new Textbox(namesText, {
          left: listPaddingX + 64,
          top: entryTop,
          width: width - listPaddingX * 2 - 64,
          fontSize: entryFontSize,
          fontFamily: dayNumberFontFamily,
          fontWeight: 500,
          fill: textColor,
          selectable: false,
        }),
      )
    })
  }

  return new Group(objects, {
    subTargetCheck: false,
    hoverCursor: 'move',
    objectCaching: false,
  })
}

export function buildTableGraphics(metadata: TableMetadata): Group {
  const width = metadata.size.width
  const height = metadata.size.height
  const rows = Math.max(1, metadata.rows)
  const columns = Math.max(1, metadata.columns)
  const objects: FabricObject[] = []

  const normalizeSegments = (total: number, segments: number[]): number[] => {
    const safeTotal = Number.isFinite(total) && total > 0 ? total : 0
    if (!safeTotal) {
      const fallbackValue = segments.length ? 1 : 0
      return segments.map(() => fallbackValue)
    }
    const sanitized = segments.map((value) => {
      const numeric = Number(value)
      return Number.isFinite(numeric) && numeric > 0 ? numeric : safeTotal / Math.max(1, segments.length)
    })
    const sum = sanitized.reduce((acc, value) => acc + value, 0)
    if (!Number.isFinite(sum) || sum <= 0) {
      const fallback = safeTotal / Math.max(1, segments.length)
      return segments.map(() => fallback)
    }
    const scale = safeTotal / sum
    let accumulated = 0
    return sanitized.map((value, index) => {
      if (index === sanitized.length - 1) {
        return Math.max(0, safeTotal - accumulated)
      }
      const scaled = value * scale
      accumulated += scaled
      return scaled
    })
  }

  const showOuterFrame = metadata.showOuterFrame ?? false
  const showBackground = showOuterFrame && metadata.showBackground !== false
  const showBorder = showOuterFrame && metadata.showBorder !== false
  const borderColor = metadata.borderColor ?? '#d1d5db'
  const borderWidth = Math.max(0, metadata.borderWidth ?? 0)
  const cornerRadius = Math.max(0, metadata.cornerRadius ?? 0)
  const backgroundColor = metadata.backgroundColor ?? 'transparent'
  const cellPadding = Math.max(0, metadata.cellPadding ?? 12)
  const showGridLines = metadata.showGridLines !== false
  const gridLineColor = metadata.gridLineColor ?? '#e5e7eb'
  const gridLineWidth = Math.max(0, metadata.gridLineWidth ?? 1)

  const baseColumnWidth = width / columns
  const baseRowHeight = height / rows

  const rawColumnWidths = Array.from({ length: columns }, (_, idx) => {
    const explicit = metadata.columnWidths?.[idx]
    return Number.isFinite(explicit) && Number(explicit) > 0 ? Number(explicit) : baseColumnWidth
  })

  const rawRowHeights = Array.from({ length: rows }, (_, idx) => {
    const explicit = metadata.rowHeights?.[idx]
    return Number.isFinite(explicit) && Number(explicit) > 0 ? Number(explicit) : baseRowHeight
  })

  const columnWidths = normalizeSegments(width, rawColumnWidths)
  const rowHeights = normalizeSegments(height, rawRowHeights)

  if (showBackground || showBorder) {
    objects.push(
      new Rect({
        width,
        height,
        rx: cornerRadius,
        ry: cornerRadius,
        fill: showBackground ? backgroundColor : 'transparent',
        stroke: showBorder ? borderColor : undefined,
        strokeWidth: showBorder ? borderWidth : 0,
      }),
    )
  }

  const headerRows = Math.max(0, Math.min(rows, metadata.headerRows ?? 0))
  const footerRows = Math.max(0, Math.min(rows - headerRows, metadata.footerRows ?? 0))

  let currentTop = showBorder ? borderWidth / 2 : 0

  for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
    const rowHeight = rowHeights[rowIndex] ?? rowHeights[rowHeights.length - 1] ?? baseRowHeight
    let currentLeft = showBorder ? borderWidth / 2 : 0
    const section =
      rowIndex < headerRows ? 'header' : rowIndex >= rows - footerRows ? 'footer' : 'body'

    for (let colIndex = 0; colIndex < columns; colIndex++) {
      const columnWidth =
        columnWidths[colIndex] ?? columnWidths[columnWidths.length - 1] ?? baseColumnWidth
      const merge = getMergeForCell(rowIndex, colIndex, metadata.merges)

      if (merge && isCellCoveredByMerge(rowIndex, colIndex, merge)) {
        currentLeft += columnWidth
        continue
      }

      const spanWidth = (() => {
        if (!merge || merge.column !== colIndex || merge.row !== rowIndex) return columnWidth
        let total = 0
        for (let span = 0; span < Math.max(1, merge.colSpan); span++) {
          const idx = colIndex + span
          total += columnWidths[idx] ?? columnWidth
        }
        return total || columnWidth
      })()

      const spanHeight = (() => {
        if (!merge || merge.column !== colIndex || merge.row !== rowIndex) return rowHeight
        let total = 0
        for (let span = 0; span < Math.max(1, merge.rowSpan); span++) {
          const idx = rowIndex + span
          total += rowHeights[idx] ?? rowHeight
        }
        return total || rowHeight
      })()

      const defaultFill =
        section === 'header'
          ? metadata.headerBackgroundColor ?? '#111827'
          : section === 'footer'
            ? metadata.footerBackgroundColor ?? '#f3f4f6'
            : metadata.cellBackgroundColor ?? '#ffffff'

      const fill = computeStripeFill(
        rowIndex - headerRows,
        metadata,
        defaultFill,
        section,
      )

      objects.push(
        new Rect({
          left: currentLeft,
          top: currentTop,
          width: spanWidth,
          height: spanHeight,
          fill,
          selectable: false,
          stroke: showGridLines ? gridLineColor : undefined,
          strokeWidth: showGridLines ? gridLineWidth : 0,
        }),
      )

      const cellContent = getCellContent(rowIndex, colIndex, metadata)
      const text = cellContent?.text ?? ''
      if (text) {
        const fontFamily = cellContent?.fontFamily ?? metadata.cellFontFamily ?? 'Inter'
        const fontSize = cellContent?.fontSize ?? metadata.cellFontSize ?? 14
        const fontWeight = cellContent?.fontWeight ?? metadata.cellFontWeight ?? 500
        const textColor =
          cellContent?.textColor ??
          (section === 'header'
            ? metadata.headerTextColor ?? '#ffffff'
            : section === 'footer'
              ? metadata.footerTextColor ?? '#111827'
              : metadata.cellTextColor ?? '#111827')
        const textAlign = cellContent?.textAlign ?? metadata.cellTextAlign ?? 'left'

        objects.push(
          new Textbox(text, {
            left: currentLeft + cellPadding,
            top: currentTop + cellPadding,
            width: Math.max(4, spanWidth - cellPadding * 2),
            height: Math.max(4, spanHeight - cellPadding * 2),
            fontFamily,
            fontSize,
            fontWeight,
            fill: textColor,
            textAlign,
            selectable: false,
            verticalAlign: 'middle',
          }),
        )
      }

      currentLeft += columnWidth
    }

    currentTop += rowHeight
  }

  return new Group(objects, {
    subTargetCheck: false,
    hoverCursor: 'move',
    objectCaching: rows * columns > 64,
  })
}

export function buildDateCellGraphics(
  metadata: DateCellMetadata,
  getHolidaysForCalendarYear?: HolidaysGetter,
): Group {
  const { width, height } = metadata.size
  const objects: FabricObject[] = []
  const date = new Date(metadata.date)
  const dateKey = (metadata.date ?? '').split('T')[0] ?? ''
  const yearFromDate = dateKey ? Number(dateKey.slice(0, 4)) : undefined
  const holidaysForYear =
    getHolidaysForCalendarYear && yearFromDate
      ? getHolidaysForCalendarYear(yearFromDate, metadata.country, metadata.language)
      : []
  const holidayNames =
    dateKey && holidaysForYear.length
      ? holidaysForYear
          .filter((holiday) => holiday?.date?.slice(0, 10) === dateKey)
          .map((holiday) => (holiday?.localName || holiday?.name || '').replace(/\s*\([^)]*\)/g, '').trim())
          .filter(Boolean)
      : []
  const hasHoliday = holidayNames.length > 0

  const cornerRadius = Math.max(0, metadata.cornerRadius ?? 24)
  const borderWidth = Math.max(0, metadata.borderWidth ?? 1)
  const backgroundColor = metadata.backgroundColor ?? '#ffffff'
  const borderColor = metadata.borderColor ?? '#e2e8f0'
  const showBackground = metadata.showBackground !== false
  const showBorder = metadata.showBorder !== false
  const accentRatioRaw = metadata.accentHeightRatio ?? 0.4
  const accentRatio = Math.max(0.05, Math.min(0.85, Number(accentRatioRaw) || 0.4))
  const accentHeight = height * accentRatio
  const paddingX = 16
  const paddingY = 16

  const weekdayColor = metadata.weekdayColor ?? '#78350f'
  const weekdayFontFamily = metadata.weekdayFontFamily ?? 'Inter'
  const weekdayFontSize = metadata.weekdayFontSize ?? 13
  const weekdayFontWeight = metadata.weekdayFontWeight ?? 600
  const dayNumberColor = metadata.dayNumberColor ?? '#1f2937'
  const dayNumberFontFamily = metadata.dayNumberFontFamily ?? 'Inter'
  const dayNumberFontSize = metadata.dayNumberFontSize ?? 48
  const dayNumberFontWeight = metadata.dayNumberFontWeight ?? 700
  const placeholderColor = metadata.placeholderColor ?? '#94a3b8'
  const placeholderFontFamily = metadata.placeholderFontFamily ?? 'Inter'
  const placeholderFontSize = metadata.placeholderFontSize ?? 14
  const placeholderFontWeight = metadata.placeholderFontWeight ?? 500
  const showHolidayMarkers = metadata.showHolidayMarkers !== false
  const markerStyle = metadata.holidayMarkerStyle ?? 'text'
  const markerColor = metadata.holidayMarkerColor ?? '#ef4444'
  const markerHeight = Math.max(1, metadata.holidayMarkerHeight ?? 6)
  const effectiveDayNumberColor = showHolidayMarkers && markerStyle === 'text' && hasHoliday ? markerColor : (metadata.dayNumberColor ?? dayNumberColor)
  if (showBackground || showBorder) {
    objects.push(
      new Rect({
        width,
        height,
        rx: cornerRadius,
        ry: cornerRadius,
        fill: showBackground ? backgroundColor : 'transparent',
        stroke: showBorder ? borderColor : undefined,
        strokeWidth: showBorder ? borderWidth : 0,
      }),
    )
  }

  objects.push(
    new Rect({
      width,
      height: accentHeight,
      rx: cornerRadius,
      ry: cornerRadius,
      fill: metadata.highlightAccent,
    }),
  )

  if (hasHoliday && showHolidayMarkers && markerStyle === 'background') {
    objects.push(
      new Rect({
        width,
        height: accentHeight,
        rx: cornerRadius,
        ry: cornerRadius,
        fill: markerColor,
        opacity: 0.25,
        selectable: false,
        evented: false,
      }),
    )
  }

  const weekdayFontSizeEff = Math.min(weekdayFontSize, Math.max(10, Math.floor(accentHeight * 0.22)))
  const weekdayTop = Math.max(12, Math.min(paddingY, Math.floor(accentHeight * 0.18)))
  const dayNumberTopBase = weekdayTop + weekdayFontSizeEff + 6
  const dayNumberFontSizeEff = Math.max(
    18,
    Math.min(dayNumberFontSize, Math.floor(accentHeight - dayNumberTopBase - 10)),
  )

  const weekdayName = date.toLocaleDateString(metadata.language || 'en', { weekday: 'long' })

  objects.push(
    new Textbox(weekdayName, {
      left: paddingX,
      top: weekdayTop,
      width: width - paddingX * 2,
      fontSize: weekdayFontSizeEff,
      fontFamily: weekdayFontFamily,
      fontWeight: weekdayFontWeight,
      fill: weekdayColor,
      selectable: false,
    }),
  )

  objects.push(
    new Textbox(String(date.getDate()), {
      left: paddingX,
      top: dayNumberTopBase,
      width: width - paddingX * 2,
      fontSize: dayNumberFontSizeEff,
      fontFamily: dayNumberFontFamily,
      fontWeight: dayNumberFontWeight,
      fill: effectiveDayNumberColor,
      selectable: false,
    }),
  )

  const placeholderTop = accentHeight + 14
  const placeholderFontSizeEff = Math.min(
    placeholderFontSize,
    Math.max(10, Math.floor((height - placeholderTop - paddingY) * 0.22)),
  )
  objects.push(
    new Textbox(metadata.notePlaceholder ?? 'Add event', {
      left: paddingX,
      top: placeholderTop,
      width: width - paddingX * 2,
      fontSize: placeholderFontSizeEff,
      fontFamily: placeholderFontFamily,
      fontWeight: placeholderFontWeight,
      fill: placeholderColor,
      selectable: false,
    }),
  )

  if (hasHoliday && showHolidayMarkers && markerStyle !== 'text' && markerStyle !== 'background') {
    const markerLeft = width - paddingX - markerHeight * 2
    if (markerStyle === 'dot') {
      const radius = markerHeight
      objects.push(
        new Rect({
          left: markerLeft,
          top: weekdayTop - radius,
          width: radius * 2,
          height: radius * 2,
          rx: radius,
          ry: radius,
          fill: markerColor,
          selectable: false,
        }),
      )
    } else if (markerStyle === 'square') {
      const size = markerHeight * 1.5
      objects.push(
        new Rect({
          left: width - paddingX - size,
          top: weekdayTop - size / 2,
          width: size,
          height: size,
          fill: markerColor,
          selectable: false,
        }),
      )
    } else if (markerStyle === 'triangle') {
      const size = Math.max(6, markerHeight * 2)
      objects.push(
        new Polygon(
          [
            { x: 0, y: size },
            { x: size, y: size },
            { x: size, y: 0 },
          ],
          {
            left: width - paddingX - size,
            top: weekdayTop - size / 2,
            fill: markerColor,
            selectable: false,
          },
        ),
      )
    } else if (markerStyle === 'border') {
      objects.push(
        new Rect({
          left: markerHeight / 2,
          top: markerHeight / 2,
          width: width - markerHeight,
          height: height - markerHeight,
          rx: Math.max(0, cornerRadius - markerHeight / 2),
          ry: Math.max(0, cornerRadius - markerHeight / 2),
          fill: 'transparent',
          stroke: markerColor,
          strokeWidth: markerHeight,
          selectable: false,
        }),
      )
    } else if (markerStyle === 'bar') {
      objects.push(
        new Rect({
          left: paddingX,
          top: height - markerHeight - paddingY / 2,
          width: width - paddingX * 2,
          height: markerHeight,
          rx: Math.min(3, markerHeight),
          ry: Math.min(3, markerHeight),
          fill: markerColor,
          selectable: false,
        }),
      )
    }
  }

  const showHolidayInfo = metadata.showHolidayInfo !== false
  if (hasHoliday && showHolidayInfo) {
    const infoPosition = metadata.holidayInfoPosition ?? 'bottom'
    const infoFontSize = Math.max(8, Math.min(24, metadata.holidayInfoFontSize ?? 12))
    const infoTextColor = metadata.holidayInfoTextColor ?? '#475569'
    const infoAccentColor = metadata.holidayInfoAccentColor ?? markerColor
    const infoText = holidayNames.join(', ')
    const prefix = holidayNames.length > 1 ? 'Holidays' : 'Holiday'
    let infoTop = placeholderTop + placeholderFontSizeEff + 10
    if (infoPosition === 'top') {
      infoTop = weekdayTop + weekdayFontSizeEff + 6
    } else if (infoPosition === 'overlay') {
      infoTop = dayNumberTopBase + (dayNumberFontSizeEff / 2) - infoFontSize / 2
    }
    infoTop = Math.min(height - paddingY - infoFontSize, Math.max(weekdayTop, infoTop))
    const infoWidth = width - paddingX * 2

    if (infoPosition === 'overlay') {
      objects.push(
        new Rect({
          left: paddingX - 4,
          top: infoTop - 4,
          width: infoWidth + 8,
          height: infoFontSize + 8,
          rx: 10,
          ry: 10,
          fill: infoAccentColor,
          opacity: 0.15,
          selectable: false,
          evented: false,
        }),
      )
    }

    objects.push(
      new Rect({
        left: paddingX,
        top: infoTop,
        width: 4,
        height: infoFontSize + 4,
        fill: infoAccentColor,
        selectable: false,
      }),
    )

    objects.push(
      new Textbox(`${prefix}: ${infoText}`, {
        left: paddingX + 8,
        top: infoTop,
        width: infoWidth - 8,
        fontSize: infoFontSize,
        fontFamily: placeholderFontFamily,
        fontWeight: 600,
        fill: infoTextColor,
        selectable: false,
      }),
    )
  }

  return new Group(objects, {
    subTargetCheck: false,
    hoverCursor: 'move',
    objectCaching: false,
  })
}

export function buildPlannerNoteGraphics(metadata: PlannerNoteMetadata): Group {
  const { width, height } = metadata.size
  const objects: FabricObject[] = []

  const cornerRadius = Math.max(0, metadata.cornerRadius ?? 22)
  const borderWidth = Math.max(0, metadata.borderWidth ?? 1)
  const borderColor = metadata.borderColor ?? '#e2e8f0'
  const backgroundColor = metadata.backgroundColor ?? '#ffffff'
  const showBackground = metadata.showBackground !== false
  const showBorder = metadata.showBorder !== false
  const headerStyle = metadata.headerStyle ?? (metadata.pattern === 'hero' ? 'filled' : 'minimal')

  const paddingX = 24
  const paddingTop = 18
  const headerHeight = headerStyle === 'none' ? 0 : 48
  const bodyTop = paddingTop + (headerStyle === 'none' ? 18 : headerHeight)
  const headerRectRadius = Math.min(cornerRadius, 12)

  if (showBackground || showBorder) {
    objects.push(
      new Rect({
        width,
        height,
        rx: cornerRadius,
        ry: cornerRadius,
        fill: showBackground ? backgroundColor : 'transparent',
        stroke: showBorder ? borderColor : undefined,
        strokeWidth: showBorder ? borderWidth : 0,
      }),
    )
  }

  if (headerStyle === 'filled' || headerStyle === 'tint') {
    const fill = metadata.headerBackgroundColor ?? metadata.accentColor
    const opacity =
      headerStyle === 'filled'
        ? metadata.headerBackgroundOpacity ?? 1
        : metadata.headerBackgroundOpacity ?? 0.12

    objects.push(
      new Rect({
        width,
        height: headerHeight,
        rx: headerRectRadius,
        ry: headerRectRadius,
        fill,
        opacity,
      }),
    )
  }

  const titleColor = metadata.titleColor ?? (headerStyle === 'filled' ? '#ffffff' : '#0f172a')

  objects.push(
    new Textbox(metadata.title, {
      left: paddingX,
      top: paddingTop + (headerStyle === 'none' ? 2 : 12),
      width: width - paddingX * 2,
      fontSize: 15,
      fontFamily: 'Inter',
      fontWeight: 700,
      fill: titleColor,
      selectable: false,
    }),
  )

  if (headerStyle === 'minimal') {
    objects.push(
      new Line([paddingX, paddingTop + 34, width - paddingX, paddingTop + 34], {
        stroke: metadata.accentColor,
        strokeWidth: 2,
        selectable: false,
        opacity: 0.9,
      }),
    )
  }

  if (metadata.pattern === 'ruled') {
    const guideColor = metadata.guideColor ?? '#e2e8f0'
    for (let y = bodyTop + 16; y < height - 24; y += 26) {
      objects.push(
        new Line([24, y, width - 24, y], {
          stroke: guideColor,
          strokeWidth: 1,
          selectable: false,
        }),
      )
    }
  }

  if (metadata.pattern === 'grid') {
    const guideColor = metadata.guideColor ?? '#eff6ff'
    for (let x = 24; x < width - 24; x += 24) {
      objects.push(
        new Line([x, bodyTop + 6, x, height - 24], {
          stroke: guideColor,
          strokeWidth: 1,
          selectable: false,
        }),
      )
    }
    for (let y = bodyTop + 6; y < height - 24; y += 24) {
      objects.push(
        new Line([24, y, width - 24, y], {
          stroke: guideColor,
          strokeWidth: 1,
          selectable: false,
        }),
      )
    }
  }

  if (metadata.pattern === 'dot') {
    const dotColor = metadata.dotColor ?? '#cbd5f5'
    for (let x = 28; x < width - 28; x += 20) {
      for (let y = bodyTop + 16; y < height - 28; y += 20) {
        objects.push(
          new Rect({
            left: x,
            top: y,
            width: 2,
            height: 2,
            rx: 1,
            ry: 1,
            fill: dotColor,
            selectable: false,
          }),
        )
      }
    }
  }

  return new Group(objects, {
    subTargetCheck: false,
    hoverCursor: 'move',
    objectCaching: false,
  })
}

export function buildScheduleGraphics(metadata: ScheduleMetadata): Group {
  const { width, height } = metadata.size
  const objects: FabricObject[] = []

  const paddingX = 24
  const paddingTop = 18
  const cornerRadius = Math.max(0, metadata.cornerRadius ?? 22)
  const borderWidth = Math.max(0, metadata.borderWidth ?? 1)
  const borderColor = metadata.borderColor ?? '#e2e8f0'
  const backgroundColor = metadata.backgroundColor ?? '#ffffff'
  const showBackground = metadata.showBackground !== false
  const showBorder = metadata.showBorder !== false
  const headerStyle = metadata.headerStyle ?? 'minimal'
  const headerHeight = headerStyle === 'none' ? 0 : 48
  const bodyTop = paddingTop + (headerStyle === 'none' ? 18 : headerHeight)
  const headerRectRadius = Math.min(cornerRadius, 12)

  if (showBackground || showBorder) {
    objects.push(
      new Rect({
        width,
        height,
        rx: cornerRadius,
        ry: cornerRadius,
        fill: showBackground ? backgroundColor : 'transparent',
        stroke: showBorder ? borderColor : undefined,
        strokeWidth: showBorder ? borderWidth : 0,
      }),
    )
  }

  if (headerStyle === 'filled' || headerStyle === 'tint') {
    const fill = metadata.headerBackgroundColor ?? metadata.accentColor
    const opacity =
      headerStyle === 'filled'
        ? metadata.headerBackgroundOpacity ?? 1
        : metadata.headerBackgroundOpacity ?? 0.12
    objects.push(
      new Rect({
        width,
        height: headerHeight,
        rx: headerRectRadius,
        ry: headerRectRadius,
        fill,
        opacity,
      }),
    )
  }

  const titleColor = metadata.titleColor ?? (headerStyle === 'filled' ? '#ffffff' : '#0f172a')

  objects.push(
    new Textbox(metadata.title, {
      left: paddingX,
      top: paddingTop + (headerStyle === 'none' ? 2 : 12),
      width: width - paddingX * 2,
      fontSize: 15,
      fontFamily: 'Inter',
      fontWeight: 700,
      fill: titleColor,
      selectable: false,
    }),
  )

  if (headerStyle === 'minimal') {
    objects.push(
      new Line([paddingX, paddingTop + 34, width - paddingX, paddingTop + 34], {
        stroke: metadata.accentColor,
        strokeWidth: 2,
        selectable: false,
        opacity: 0.9,
      }),
    )
  }

  const totalMinutes = Math.max(0, (metadata.endHour - metadata.startHour) * 60)
  const step = metadata.intervalMinutes
  const slots = Math.max(1, Math.floor(totalMinutes / step) + 1)
  const availableHeight = Math.max(1, height - bodyTop - 22)
  const rowHeight = availableHeight / slots

  const timeLabelWidth = 56
  const lineLeft = paddingX + timeLabelWidth
  const lineRight = width - paddingX

  const lineColor = metadata.lineColor ?? '#e2e8f0'
  const timeLabelColor = metadata.timeLabelColor ?? '#64748b'

  for (let i = 0; i < slots; i++) {
    const minutes = metadata.startHour * 60 + i * step
    const hour = Math.floor(minutes / 60)
    const minute = minutes % 60
    const label = `${hour % 12 === 0 ? 12 : hour % 12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`
    const y = bodyTop + i * rowHeight

    objects.push(
      new Textbox(label, {
        left: paddingX,
        top: y - 8,
        width: timeLabelWidth - 8,
        fontSize: 10,
        fontFamily: 'Inter',
        fontWeight: 600,
        fill: timeLabelColor,
        selectable: false,
      }),
    )

    objects.push(
      new Line([lineLeft, y, lineRight, y], {
        stroke: lineColor,
        strokeWidth: 1,
        selectable: false,
      }),
    )
  }

  return new Group(objects, {
    subTargetCheck: false,
    hoverCursor: 'move',
    objectCaching: false,
  })
}

export function buildChecklistGraphics(metadata: ChecklistMetadata): Group {
  const { width, height } = metadata.size
  const objects: FabricObject[] = []

  const paddingX = 24
  const paddingTop = 18
  const cornerRadius = Math.max(0, metadata.cornerRadius ?? 22)
  const borderWidth = Math.max(0, metadata.borderWidth ?? 1)
  const borderColor = metadata.borderColor ?? '#e2e8f0'
  const backgroundColor = metadata.backgroundColor ?? '#ffffff'
  const showBackground = metadata.showBackground !== false
  const showBorder = metadata.showBorder !== false
  const headerStyle = metadata.headerStyle ?? 'tint'
  const headerHeight = headerStyle === 'none' ? 0 : 48
  const bodyTop = paddingTop + (headerStyle === 'none' ? 18 : headerHeight)
  const headerRectRadius = Math.min(cornerRadius, 12)

  if (showBackground || showBorder) {
    objects.push(
      new Rect({
        width,
        height,
        rx: cornerRadius,
        ry: cornerRadius,
        fill: showBackground ? backgroundColor : 'transparent',
        stroke: showBorder ? borderColor : undefined,
        strokeWidth: showBorder ? borderWidth : 0,
      }),
    )
  }

  if (headerStyle === 'filled' || headerStyle === 'tint') {
    const fill = metadata.headerBackgroundColor ?? metadata.accentColor
    const opacity =
      headerStyle === 'filled'
        ? metadata.headerBackgroundOpacity ?? 1
        : metadata.headerBackgroundOpacity ?? 0.12
    objects.push(
      new Rect({
        width,
        height: headerHeight,
        rx: headerRectRadius,
        ry: headerRectRadius,
        fill,
        opacity,
      }),
    )
  }

  const titleColor = metadata.titleColor ?? (headerStyle === 'filled' ? '#ffffff' : '#0f172a')

  objects.push(
    new Textbox(metadata.title, {
      left: paddingX,
      top: paddingTop + (headerStyle === 'none' ? 2 : 12),
      width: width - paddingX * 2,
      fontSize: 15,
      fontFamily: 'Inter',
      fontWeight: 700,
      fill: titleColor,
      selectable: false,
    }),
  )

  if (headerStyle === 'minimal') {
    objects.push(
      new Line([paddingX, paddingTop + 34, width - paddingX, paddingTop + 34], {
        stroke: metadata.accentColor,
        strokeWidth: 2,
        selectable: false,
        opacity: 0.9,
      }),
    )
  }

  const rows = Math.max(1, metadata.rows)
  const availableHeight = Math.max(1, height - bodyTop - 22)
  const rowHeight = availableHeight / rows

  const checkboxSize = 14
  const checkboxLeft = paddingX
  const lineLeft = metadata.showCheckboxes ? checkboxLeft + checkboxSize + 12 : paddingX
  const lineRight = width - paddingX

  const lineColor = metadata.lineColor ?? '#e2e8f0'
  const checkboxColor = metadata.checkboxColor ?? metadata.accentColor

  for (let i = 0; i < rows; i++) {
    const y = bodyTop + i * rowHeight + rowHeight / 2

    if (metadata.showCheckboxes) {
      objects.push(
        new Rect({
          left: checkboxLeft,
          top: y - checkboxSize / 2,
          width: checkboxSize,
          height: checkboxSize,
          rx: 4,
          ry: 4,
          fill: '#ffffff',
          stroke: checkboxColor,
          strokeWidth: 2,
          selectable: false,
        }),
      )
    }

    objects.push(
      new Line([lineLeft, y + 6, lineRight, y + 6], {
        stroke: lineColor,
        strokeWidth: 1,
        selectable: false,
      }),
    )
  }

  return new Group(objects, {
    subTargetCheck: false,
    hoverCursor: 'move',
    objectCaching: false,
  })
}

export function buildCollageGraphics(metadata: CollageMetadata): Group {
  const { size, slots } = metadata
  const width = size.width
  const height = size.height
  const objects: FabricObject[] = []

  const cornerRadius = Math.max(0, metadata.cornerRadius ?? 16)
  const borderWidth = Math.max(0, metadata.borderWidth ?? 1)
  const borderColor = metadata.borderColor ?? '#e2e8f0'
  const backgroundColor = metadata.backgroundColor ?? '#ffffff'

  const slotCornerRadius = Math.max(0, metadata.slotCornerRadius ?? 8)
  const slotBorderColor = metadata.slotBorderColor ?? '#e5e7eb'
  const slotBorderWidth = Math.max(0, metadata.slotBorderWidth ?? 1)
  const slotBackgroundColor = metadata.slotBackgroundColor ?? '#f3f4f6'

  // Background rectangle (Frame)
  if (metadata.showFrame !== false) {
    objects.push(
      new Rect({
        left: 0,
        top: 0,
        width,
        height,
        rx: cornerRadius,
        ry: cornerRadius,
        fill: backgroundColor,
        stroke: borderColor,
        strokeWidth: borderWidth,
        selectable: false,
      }),
    )
  }

  for (const slot of slots) {
    if (!slot) continue

    // Slot background/border
    const slotRect = new Rect({
      left: slot.x,
      top: slot.y,
      width: slot.width,
      height: slot.height,
      rx: slotCornerRadius,
      ry: slotCornerRadius,
      fill: slotBackgroundColor,
      stroke: slotBorderColor,
      strokeWidth: slotBorderWidth,
      angle: slot.rotation ?? 0,
      selectable: false,
    })

    objects.push(slotRect)

    if (slot.imageUrl) {
      const cachedImg = imageCache.get(slot.imageUrl)
      
      if (cachedImg && cachedImg.complete) {
        // Image is already loaded and cached, add it immediately
        const fabricImg = new FabricImage(cachedImg, {
          left: slot.x + slot.width / 2,
          top: slot.y + slot.height / 2,
          originX: 'center',
          originY: 'center',
          angle: slot.rotation ?? 0,
          selectable: false,
        })

        const scaleX = slot.width / fabricImg.width!
        const scaleY = slot.height / fabricImg.height!
        const scale = (slot.imageFit || 'cover') === 'cover' 
          ? Math.max(scaleX, scaleY) 
          : Math.min(scaleX, scaleY)

        fabricImg.set({ scaleX: scale, scaleY: scale })

        // clipPath is relative to the object's center when origin is center/center
        const clipPath = new Rect({
          originX: 'center',
          originY: 'center',
          left: 0,
          top: 0,
          width: slot.width / scale,
          height: slot.height / scale,
          rx: slotCornerRadius / scale,
          ry: slotCornerRadius / scale,
        })
        fabricImg.set('clipPath', clipPath)
        objects.push(fabricImg)
      } else {
        // Image not loaded yet, show placeholder and trigger load
        if (!cachedImg) {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.src = slot.imageUrl
          imageCache.set(slot.imageUrl, img)
          
          img.onload = () => {
            // Find the canvas and trigger re-render
            // This is a bit of a hack but necessary since graphics builders are sync
            // and don't have direct access to the canvas instance easily.
            // Most Fabric.js apps handle this via a global re-render event or store update.
            window.dispatchEvent(new CustomEvent('editor:request-render'))
          }
        }

        const iconSize = Math.min(slot.width, slot.height) * 0.25
        objects.push(
          new Textbox('⌛', {
            left: slot.x + slot.width / 2,
            top: slot.y + slot.height / 2,
            originX: 'center',
            originY: 'center',
            fontSize: Math.max(16, Math.min(32, iconSize)),
            fontFamily: 'Noto Color Emoji, Segoe UI Emoji, Apple Color Emoji, sans-serif',
            fill: '#9ca3af',
            textAlign: 'center',
            selectable: false,
            angle: slot.rotation ?? 0,
          }),
        )
      }
    } else {
      // Placeholder icon if no image
      const iconSize = Math.min(slot.width, slot.height) * 0.25
      objects.push(
        new Textbox('🖼️', {
          left: slot.x + slot.width / 2,
          top: slot.y + slot.height / 2,
          originX: 'center',
          originY: 'center',
          fontSize: Math.max(16, Math.min(32, iconSize)),
          fontFamily: 'Noto Color Emoji, Segoe UI Emoji, Apple Color Emoji, sans-serif',
          fill: '#9ca3af',
          textAlign: 'center',
          selectable: false,
          angle: slot.rotation ?? 0,
        }),
      )
    }
  }

  return new Group(objects, {
    subTargetCheck: false,
    hoverCursor: 'move',
    objectCaching: false,
  })
}
