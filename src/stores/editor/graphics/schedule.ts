import { Group, Line, Rect, Textbox, type Object as FabricObject } from 'fabric'
import type { ScheduleMetadata } from '@/types'

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
  const showHeader = metadata.showHeader !== false
  const customHeaderHeight = metadata.headerHeight ?? 50
  const headerHeight = !showHeader || headerStyle === 'none' ? 0 : customHeaderHeight
  const bodyTop = paddingTop + (!showHeader || headerStyle === 'none' ? 18 : headerHeight)
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

  if (showHeader && (headerStyle === 'filled' || headerStyle === 'tint')) {
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

  if (showHeader && headerStyle !== 'none') {
    objects.push(
      new Textbox(metadata.title, {
        left: paddingX,
        top: paddingTop + 12,
        width: width - paddingX * 2,
        fontSize: 15,
        fontFamily: 'Inter',
        fontWeight: 700,
        fill: titleColor,
        textAlign: metadata.titleAlign ?? 'left',
        selectable: false,
      }),
    )
  }

  if (showHeader && headerStyle === 'minimal') {
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
        strokeWidth: Math.max(0.5, metadata.lineWidth ?? 1),
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
