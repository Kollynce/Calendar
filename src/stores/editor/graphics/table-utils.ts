import type { TableCellContent, TableCellMerge, TableMetadata } from '@/types'

export function computeStripeFill(
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

export function getCellContent(
  row: number,
  column: number,
  metadata: TableMetadata,
): TableCellContent | undefined {
  return metadata.cellContents?.find((item) => item.row === row && item.column === column)
}

export function getMergeForCell(
  row: number,
  column: number,
  merges?: TableCellMerge[],
): TableCellMerge | undefined {
  return merges?.find((merge) => row >= merge.row && row < merge.row + merge.rowSpan && column >= merge.column && column < merge.column + merge.colSpan)
}

export function isCellCoveredByMerge(
  row: number,
  column: number,
  merge: TableCellMerge,
): boolean {
  return row > merge.row && row < merge.row + merge.rowSpan && column >= merge.column && column < merge.column + merge.colSpan
}
