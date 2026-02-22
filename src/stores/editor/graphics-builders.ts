import { Group, Rect, Textbox, type Object as FabricObject } from 'fabric'
export { buildCalendarGridGraphics } from './graphics/calendar-grid'
export { buildDateCellGraphics } from './graphics/date-cell'
export { buildWeekStripGraphics } from './graphics/week-strip'
export { buildPlannerNoteGraphics } from './graphics/planner-note'
export { buildScheduleGraphics } from './graphics/schedule'
export { buildChecklistGraphics } from './graphics/checklist'
export { buildCollageGraphics } from './graphics/collage'

import type { TableMetadata } from '@/types'
import {
  computeStripeFill,
  getCellContent,
  getMergeForCell,
  isCellCoveredByMerge,
} from './graphics/table-utils'

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


