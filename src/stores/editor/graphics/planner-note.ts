import { Group, Line, Rect, Textbox, type Object as FabricObject } from 'fabric'
import type { PlannerNoteMetadata } from '@/types'

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
  const showHeader = metadata.showHeader !== false
  const customHeaderHeight = metadata.headerHeight ?? 50

  const paddingX = 24
  const paddingTop = showHeader && headerStyle !== 'none' ? 18 : 12
  const headerHeight = !showHeader || headerStyle === 'none' ? 0 : customHeaderHeight
  const bodyTop = !showHeader || headerStyle === 'none' ? paddingTop : paddingTop + headerHeight
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

  if (metadata.pattern === 'ruled') {
    const guideColor = metadata.guideColor ?? '#e2e8f0'
    const guideWidth = Math.max(0.5, metadata.guideWidth ?? 1)
    const contentPadding = showHeader && headerStyle !== 'none' ? 16 : 6
    const lineSpacing = 26
    const availableHeight = height - bodyTop - contentPadding - 16
    const numLines = Math.floor(availableHeight / lineSpacing)
    const totalLinesHeight = (numLines - 1) * lineSpacing
    const startY = bodyTop + contentPadding + (availableHeight - totalLinesHeight) / 2

    for (let i = 0; i < numLines; i++) {
      const y = startY + i * lineSpacing
      objects.push(
        new Line([16, y, width - 16, y], {
          stroke: guideColor,
          strokeWidth: guideWidth,
          selectable: false,
        }),
      )
    }
  }

  if (metadata.pattern === 'grid') {
    const guideColor = metadata.guideColor ?? '#eff6ff'
    const guideWidth = Math.max(0.5, metadata.guideWidth ?? 1)
    const contentPadding = showHeader && headerStyle !== 'none' ? 6 : 4
    const gridSpacing = 20
    const edgeMargin = 16
    const availableWidth = width - 2 * edgeMargin
    const availableHeight = height - bodyTop - contentPadding - 16

    const cols = Math.floor(availableWidth / gridSpacing)
    const rows = Math.floor(availableHeight / gridSpacing)

    const gridWidth = cols * gridSpacing
    const gridHeight = rows * gridSpacing

    const startX = edgeMargin + (availableWidth - gridWidth) / 2
    const startY = bodyTop + contentPadding + (availableHeight - gridHeight) / 2

    // Horizontal lines
    for (let i = 0; i <= rows; i++) {
      const y = startY + i * gridSpacing
      objects.push(
        new Line([startX, y, startX + gridWidth, y], {
          stroke: guideColor,
          strokeWidth: guideWidth,
          selectable: false,
        }),
      )
    }
    // Vertical lines
    for (let i = 0; i <= cols; i++) {
      const x = startX + i * gridSpacing
      objects.push(
        new Line([x, startY, x, startY + gridHeight], {
          stroke: guideColor,
          strokeWidth: guideWidth,
          selectable: false,
        }),
      )
    }
  }

  if (metadata.pattern === 'dot') {
    const dotColor = metadata.dotColor ?? metadata.guideColor ?? '#cbd5f5'
    const dotSize = Math.max(1, Math.min(8, metadata.guideWidth ?? 2))
    const contentPadding = showHeader && headerStyle !== 'none' ? 12 : 6
    const edgeMargin = 16
    const spacing = 18
    const availableWidth = width - 2 * edgeMargin
    const availableHeight = height - bodyTop - contentPadding - 16

    const cols = Math.floor(availableWidth / spacing)
    const rows = Math.floor(availableHeight / spacing)

    const gridWidth = (cols - 1) * spacing
    const gridHeight = (rows - 1) * spacing

    const startX = edgeMargin + (availableWidth - gridWidth) / 2
    const startY = bodyTop + contentPadding + (availableHeight - gridHeight) / 2

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        objects.push(
          new Rect({
            left: startX + i * spacing,
            top: startY + j * spacing,
            width: dotSize,
            height: dotSize,
            rx: dotSize / 2,
            ry: dotSize / 2,
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
