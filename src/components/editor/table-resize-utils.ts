import type { TableMetadata } from '@/types'

export const MIN_RESIZE_CELL = 24

export function resolveColumnWidths(metadata: TableMetadata): number[] {
  const columns = Math.max(1, metadata.columns)
  const totalWidth = Math.max(1, metadata.size?.width ?? 1)
  const baseWidth = totalWidth / columns
  return Array.from({ length: columns }, (_, idx) => {
    const value = metadata.columnWidths?.[idx]
    return Number.isFinite(value) && Number(value) > 0 ? Number(value) : baseWidth
  })
}

export function resolveRowHeights(metadata: TableMetadata): number[] {
  const rows = Math.max(1, metadata.rows)
  const totalHeight = Math.max(1, metadata.size?.height ?? 1)
  const baseHeight = totalHeight / rows
  return Array.from({ length: rows }, (_, idx) => {
    const value = metadata.rowHeights?.[idx]
    return Number.isFinite(value) && Number(value) > 0 ? Number(value) : baseHeight
  })
}

export function applyColumnDelta(
  metadata: TableMetadata,
  boundaryIndex: number,
  delta: number,
): number[] | null {
  const columns = Math.max(1, metadata.columns)
  if (columns < 2 || boundaryIndex < 0 || boundaryIndex >= columns - 1) return null
  const widths = resolveColumnWidths(metadata)
  const leftIndex = boundaryIndex
  const rightIndex = boundaryIndex + 1
  const leftWidth = widths[leftIndex]
  const rightWidth = widths[rightIndex]
  if (typeof leftWidth !== 'number' || typeof rightWidth !== 'number') return null
  const maxPositive = rightWidth - MIN_RESIZE_CELL
  const maxNegative = -(leftWidth - MIN_RESIZE_CELL)
  const applied = Math.max(Math.min(delta, maxPositive), maxNegative)
  if (!Number.isFinite(applied) || applied === 0) return null
  widths[leftIndex] = leftWidth + applied
  widths[rightIndex] = rightWidth - applied
  return widths
}

export function applyRowDelta(
  metadata: TableMetadata,
  boundaryIndex: number,
  delta: number,
): number[] | null {
  const rows = Math.max(1, metadata.rows)
  if (rows < 2 || boundaryIndex < 0 || boundaryIndex >= rows - 1) return null
  const heights = resolveRowHeights(metadata)
  const topIndex = boundaryIndex
  const bottomIndex = boundaryIndex + 1
  const topHeight = heights[topIndex]
  const bottomHeight = heights[bottomIndex]
  if (typeof topHeight !== 'number' || typeof bottomHeight !== 'number') return null
  const maxPositive = bottomHeight - MIN_RESIZE_CELL
  const maxNegative = -(topHeight - MIN_RESIZE_CELL)
  const applied = Math.max(Math.min(delta, maxPositive), maxNegative)
  if (!Number.isFinite(applied) || applied === 0) return null
  heights[topIndex] = topHeight + applied
  heights[bottomIndex] = bottomHeight - applied
  return heights
}
