import { Group, Line, Polygon, Rect, Textbox, type Object as FabricObject } from 'fabric'
import type {
  CalendarGridMetadata,
  ChecklistMetadata,
  DateCellMetadata,
  Holiday,
  PlannerNoteMetadata,
  ScheduleMetadata,
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

type WeekStripDay = {
  date: Date
  dayOfMonth: number
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
      fill: backgroundColor,
      stroke: borderColor,
      strokeWidth: borderWidth,
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
  })
}

export function buildWeekStripGraphics(metadata: WeekStripMetadata): Group {
  const { width, height } = metadata.size
  const objects: FabricObject[] = []

  const cornerRadius = Math.max(0, metadata.cornerRadius ?? 24)
  const borderWidth = Math.max(0, metadata.borderWidth ?? 1)
  const backgroundColor = metadata.backgroundColor ?? '#ffffff'
  const borderColor = metadata.borderColor ?? '#e5e7eb'
  const cellBorderColor = metadata.cellBorderColor ?? '#f1f5f9'
  const cellBorderWidth = Math.max(0, metadata.cellBorderWidth ?? 1)

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

  objects.push(
    new Rect({
      width,
      height,
      rx: cornerRadius,
      ry: cornerRadius,
      fill: backgroundColor,
      stroke: borderColor,
      strokeWidth: borderWidth,
    }),
  )

  const label = metadata.label ?? 'Weekly Focus'

  const paddingX = 24
  const paddingBottom = Math.max(12, Math.round(height * 0.12))
  const headerHeight = Math.min(
    Math.max(40, Math.round(labelFontSize + 24)),
    Math.max(44, Math.round(height * 0.45)),
  )
  const labelTop = Math.max(12, Math.min(20, Math.round((headerHeight - labelFontSize) / 2)))
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

  const days = calendarGeneratorService.generateWeek(
    new Date(metadata.startDate),
    [],
    metadata.startDay,
  ) as WeekStripDay[]
  const cellWidth = width / days.length

  const weekdayRowHeightRaw = Math.max(18, Math.round(height * 0.16))
  const weekdayRowHeight = Math.max(
    0,
    Math.min(34, Math.min(weekdayRowHeightRaw, height - headerHeight - paddingBottom)),
  )
  const bodyTop = headerHeight + weekdayRowHeight
  const cellHeight = Math.max(0, height - bodyTop - paddingBottom)

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

  days.forEach((day: WeekStripDay, index: number) => {
    const left = index * cellWidth
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
    objects.push(
      new Textbox(String(day.dayOfMonth), {
        left: left + cellWidth - dayNumberInsetX - dayNumberBoxWidth,
        top: bodyTop + dayNumberInsetY,
        width: dayNumberBoxWidth,
        fontSize: dayNumberFontSizeEff,
        fontFamily: dayNumberFontFamily,
        fontWeight: dayNumberFontWeight,
        fill: dayNumberColor,
        textAlign: 'right',
        selectable: false,
      }),
    )
  })

  return new Group(objects, {
    subTargetCheck: false,
    hoverCursor: 'move',
  })
}

export function buildDateCellGraphics(metadata: DateCellMetadata): Group {
  const { width, height } = metadata.size
  const objects: FabricObject[] = []
  const date = new Date(metadata.date)

  const cornerRadius = Math.max(0, metadata.cornerRadius ?? 24)
  const borderWidth = Math.max(0, metadata.borderWidth ?? 1)
  const backgroundColor = metadata.backgroundColor ?? '#ffffff'
  const borderColor = metadata.borderColor ?? '#e2e8f0'
  const accentRatioRaw = metadata.accentHeightRatio ?? 0.4
  const accentRatio = Math.max(0.05, Math.min(0.85, Number(accentRatioRaw) || 0.4))
  const accentHeight = height * accentRatio
  const paddingX = 16
  const paddingY = 16

  const weekdayColor = metadata.weekdayColor ?? '#78350f'
  const weekdayFontFamily = metadata.weekdayFontFamily ?? 'Inter'
  const weekdayFontSize = metadata.weekdayFontSize ?? 13
  const weekdayFontWeight = metadata.weekdayFontWeight ?? 600

  const dayNumberColor = metadata.dayNumberColor ?? '#92400e'
  const dayNumberFontFamily = metadata.dayNumberFontFamily ?? 'Inter'
  const dayNumberFontSize = metadata.dayNumberFontSize ?? 52
  const dayNumberFontWeight = metadata.dayNumberFontWeight ?? 700

  const placeholderColor = metadata.placeholderColor ?? '#475569'
  const placeholderFontFamily = metadata.placeholderFontFamily ?? 'Inter'
  const placeholderFontSize = metadata.placeholderFontSize ?? 13
  const placeholderFontWeight = metadata.placeholderFontWeight ?? 400

  objects.push(
    new Rect({
      width,
      height,
      rx: cornerRadius,
      ry: cornerRadius,
      fill: backgroundColor,
      stroke: borderColor,
      strokeWidth: borderWidth,
    }),
  )

  objects.push(
    new Rect({
      width,
      height: accentHeight,
      rx: cornerRadius,
      ry: cornerRadius,
      fill: metadata.highlightAccent,
    }),
  )

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
      fill: dayNumberColor,
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

  return new Group(objects, {
    subTargetCheck: false,
    hoverCursor: 'move',
  })
}

export function buildPlannerNoteGraphics(metadata: PlannerNoteMetadata): Group {
  const { width, height } = metadata.size
  const objects: FabricObject[] = []

  const cornerRadius = Math.max(0, metadata.cornerRadius ?? 22)
  const borderWidth = Math.max(0, metadata.borderWidth ?? 1)
  const borderColor = metadata.borderColor ?? '#e2e8f0'
  const backgroundColor = metadata.backgroundColor ?? '#ffffff'
  const headerStyle = metadata.headerStyle ?? (metadata.pattern === 'hero' ? 'filled' : 'minimal')

  const paddingX = 24
  const paddingTop = 18
  const headerHeight = headerStyle === 'none' ? 0 : 48
  const bodyTop = paddingTop + (headerStyle === 'none' ? 18 : headerHeight)
  const headerRectRadius = Math.min(cornerRadius, 12)

  objects.push(
    new Rect({
      width,
      height,
      rx: cornerRadius,
      ry: cornerRadius,
      fill: backgroundColor,
      stroke: borderColor,
      strokeWidth: borderWidth,
    }),
  )

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
  const headerStyle = metadata.headerStyle ?? 'minimal'
  const headerHeight = headerStyle === 'none' ? 0 : 48
  const bodyTop = paddingTop + (headerStyle === 'none' ? 18 : headerHeight)
  const headerRectRadius = Math.min(cornerRadius, 12)

  objects.push(
    new Rect({
      width,
      height,
      rx: cornerRadius,
      ry: cornerRadius,
      fill: backgroundColor,
      stroke: borderColor,
      strokeWidth: borderWidth,
    }),
  )

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
  const headerStyle = metadata.headerStyle ?? 'tint'
  const headerHeight = headerStyle === 'none' ? 0 : 48
  const bodyTop = paddingTop + (headerStyle === 'none' ? 18 : headerHeight)
  const headerRectRadius = Math.min(cornerRadius, 12)

  objects.push(
    new Rect({
      width,
      height,
      rx: cornerRadius,
      ry: cornerRadius,
      fill: backgroundColor,
      stroke: borderColor,
      strokeWidth: borderWidth,
    }),
  )

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
  })
}
