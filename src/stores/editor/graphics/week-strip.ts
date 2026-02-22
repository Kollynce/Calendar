import { Group, Polygon, Rect, Textbox, type Object as FabricObject } from 'fabric'
import type { CalendarDay, Holiday, WeekStripMetadata } from '@/types'
import { calendarGeneratorService } from '@/services/calendar/generator.service'
import type { HolidaysGetter } from './types'

type WeekStripDay = CalendarDay

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
  const normalizedStartDay = typeof metadata.startDay === 'number' ? metadata.startDay : 0
  const isBlank = metadata.mode === 'blank'
  const showHeader = metadata.showHeader !== false
  const showWeekdays = metadata.showWeekdays !== false
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
  const blankWeekStart = (() => {
    if (!isBlank) return null
    const alignedStart = new Date(startDate)
    const startWeekday = alignedStart.getDay()
    const offset = (startWeekday - normalizedStartDay + 7) % 7
    if (!Number.isNaN(offset)) {
      alignedStart.setDate(alignedStart.getDate() - offset)
    }
    return alignedStart
  })()

  const days = isBlank
    ? (Array.from({ length: 7 }, (_, index) => {
        const date = new Date((blankWeekStart ?? startDate).getTime())
        date.setDate((blankWeekStart ?? startDate).getDate() + index)
        return {
          date,
          dayOfMonth: 0,
          isCurrentMonth: false,
          isToday: false,
          isWeekend: false,
          weekNumber: 0,
          holidays: [],
        }
      }) as WeekStripDay[])
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
    const headerForBase = showHeader ? computeHeaderHeight(height) : 0
    const basePadding = Math.max(12, Math.round(height * 0.12))
    const baseBodyMin =
      height > 140 ? Math.max(56, Math.round(height * 0.28)) : Math.max(32, Math.round(height * 0.25))
    const minContentHeight = headerForBase + baseBodyMin + basePadding
    height = Math.max(minContentHeight, height - estimatedListSpace)
  }

  const headerHeight = showHeader ? computeHeaderHeight(height) : 0
  const labelTop =
    showHeader && headerHeight > 0
      ? Math.max(12, Math.min(20, Math.round((headerHeight - labelFontSize) / 2)))
      : 0

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

  if (showHeader) {
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
  }

  const weekdayRowHeightRaw = Math.max(18, Math.round(height * 0.16))
  const weekdayRowHeight = showWeekdays
    ? Math.max(12, Math.min(34, Math.min(weekdayRowHeightRaw, height - headerHeight - paddingBottom - listHeight - 48)))
    : 0
  const bodyTop = headerHeight + weekdayRowHeight
  const cellHeight = Math.max(32, height - bodyTop - paddingBottom - listHeight)
  const cellWidth = days.length > 0 ? width / days.length : width

  const cellInsetX = 12
  const dayNumberInsetX = 12
  const dayNumberInsetY = 8

  if (showWeekdays && weekdayRowHeight > 0) {
    const weekdayFontSizeEff = Math.min(weekdayFontSize, Math.max(8, Math.floor(weekdayRowHeight * 0.55)))
    const weekdayTextTop = headerHeight + Math.max(0, (weekdayRowHeight - weekdayFontSizeEff) / 2)
    const weekdayLabels = calendarGeneratorService.getWeekdayNames(
      normalizedStartDay,
      metadata.language || 'en',
      'short',
    ) as string[]
    days.forEach((day: WeekStripDay, index: number) => {
      const weekdayLabel = weekdayLabels[index % weekdayLabels.length] ?? ''
      const dayName = isBlank
        ? weekdayLabel.toUpperCase()
        : day.date.toLocaleDateString(metadata.language || 'en', { weekday: 'short' }).toUpperCase()
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
