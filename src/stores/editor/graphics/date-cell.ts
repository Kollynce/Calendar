import { Group, Polygon, Rect, Textbox, type Object as FabricObject } from 'fabric'
import type { DateCellMetadata } from '@/types'
import type { HolidaysGetter } from './types'

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
  const effectiveDayNumberColor =
    showHolidayMarkers && markerStyle === 'text' && hasHoliday
      ? markerColor
      : (metadata.dayNumberColor ?? dayNumberColor)
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
