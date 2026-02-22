import { Group, Line, Rect, Textbox, type Object as FabricObject } from 'fabric'
import type { ChecklistMetadata } from '@/types'

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

  const rows = Math.max(1, metadata.rows)
  const availableHeight = Math.max(1, height - bodyTop - 22)
  const rowHeight = availableHeight / rows

  const checkboxSize = 14
  const checkboxLeft = paddingX
  const lineLeft = metadata.showCheckboxes ? checkboxLeft + checkboxSize + 12 : paddingX
  const lineRight = width - paddingX

  const lineColor = metadata.lineColor ?? '#e2e8f0'
  const lineWidth = Math.max(0.5, metadata.lineWidth ?? 1)
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
        strokeWidth: lineWidth,
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
