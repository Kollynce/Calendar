import { Group, Polygon, Rect, Textbox, type Object as FabricObject } from 'fabric'
import type { CalendarGridMetadata, Holiday } from '@/types'
import { calendarGeneratorService } from '@/services/calendar/generator.service'

type CalendarGridDay = {
  dayOfMonth: number
  isWeekend?: boolean
  isCurrentMonth?: boolean
  isToday?: boolean
  holidays?: unknown[]
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
        textAlign: metadata.headerTextAlign ?? 'center',
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
                  top,
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
