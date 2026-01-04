<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import ColorPicker from '../ColorPicker.vue'
import TableCellEditor from './TableCellEditor.vue'
import type { TableMetadata, TableCellMerge } from '@/types'

interface Props {
  tableMetadata: TableMetadata
  updateTableMetadata: (updater: (draft: TableMetadata) => void) => void
}

const props = defineProps<Props>()

const fontOptions = [
  'Inter',
  'Outfit',
  'Poppins',
  'Playfair Display',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
]

const rowInput = ref(1)
const columnInput = ref(1)
const cellText = ref('')
const cellAlign = ref<TableMetadata['cellTextAlign']>('left')

const mergeRowInput = ref(1)
const mergeColumnInput = ref(1)
const mergeRowSpanInput = ref(1)
const mergeColSpanInput = ref(1)
const isCellEditorOpen = ref(false)

const cellEntries = computed(() => props.tableMetadata.cellContents ?? [])
const mergeEntries = computed(() => props.tableMetadata.merges ?? [])
type MergeEntry = NonNullable<TableMetadata['merges']>[number]
const columnWidthDisplay = computed(() =>
  Array.from({ length: props.tableMetadata.columns }, (_, idx) => {
    const value = props.tableMetadata.columnWidths?.[idx]
    return value && value > 0 ? String(value) : ''
  }),
)
const rowHeightDisplay = computed(() =>
  Array.from({ length: props.tableMetadata.rows }, (_, idx) => {
    const value = props.tableMetadata.rowHeights?.[idx]
    return value && value > 0 ? String(value) : ''
  }),
)

watch(
  () => props.tableMetadata.rows,
  (rows) => {
    const safeRows = Math.max(1, rows)
    rowInput.value = clamp(rowInput.value, 1, safeRows)
    mergeRowInput.value = clamp(mergeRowInput.value, 1, safeRows)
    mergeRowSpanInput.value = clamp(
      mergeRowSpanInput.value,
      1,
      Math.max(1, safeRows - mergeRowInput.value + 1),
    )
  },
)

watch(
  () => props.tableMetadata.columns,
  (columns) => {
    const safeColumns = Math.max(1, columns)
    columnInput.value = clamp(columnInput.value, 1, safeColumns)
    mergeColumnInput.value = clamp(mergeColumnInput.value, 1, safeColumns)
    mergeColSpanInput.value = clamp(
      mergeColSpanInput.value,
      1,
      Math.max(1, safeColumns - mergeColumnInput.value + 1),
    )
  },
)

watch(
  () => props.tableMetadata.cellTextAlign,
  (align) => {
    if (align) cellAlign.value = align
  },
  { immediate: true },
)

watch(mergeRowInput, () => {
  mergeRowSpanInput.value = clamp(
    mergeRowSpanInput.value,
    1,
    Math.max(1, props.tableMetadata.rows - mergeRowInput.value + 1),
  )
})

watch(mergeColumnInput, () => {
  mergeColSpanInput.value = clamp(
    mergeColSpanInput.value,
    1,
    Math.max(1, props.tableMetadata.columns - mergeColumnInput.value + 1),
  )
})

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  if (max < min) return min
  return Math.max(min, Math.min(max, value))
}

function sanitizeTableMetadata(draft: TableMetadata) {
  const maxRowIndex = Math.max(0, draft.rows - 1)
  const maxColIndex = Math.max(0, draft.columns - 1)

  if (draft.cellContents) {
    draft.cellContents = draft.cellContents.filter(
      (entry) =>
        entry.row >= 0 &&
        entry.column >= 0 &&
        entry.row <= maxRowIndex &&
        entry.column <= maxColIndex,
    )
  }

  if (draft.merges) {
    draft.merges = draft.merges
      .map((merge) => {
        const safeRow = clamp(Math.floor(merge.row ?? 0), 0, maxRowIndex)
        const safeColumn = clamp(Math.floor(merge.column ?? 0), 0, maxColIndex)
        const maxRowSpan = Math.max(1, draft.rows - safeRow)
        const maxColSpan = Math.max(1, draft.columns - safeColumn)
        if (safeRow > maxRowIndex || safeColumn > maxColIndex) return null
        return {
          row: safeRow,
          column: safeColumn,
          rowSpan: clamp(Math.floor(merge.rowSpan ?? 1), 1, maxRowSpan),
          colSpan: clamp(Math.floor(merge.colSpan ?? 1), 1, maxColSpan),
        } satisfies TableCellMerge
      })
      .filter((merge): merge is TableCellMerge => Boolean(merge))
  }

  if (draft.columnWidths) {
    const normalized = draft.columnWidths
      .slice(0, draft.columns)
      .map((value) => (Number.isFinite(value) && Number(value) > 0 ? Number(value) : 0))
    draft.columnWidths = trimSizeArray(normalized)
  }

  if (draft.rowHeights) {
    const normalized = draft.rowHeights
      .slice(0, draft.rows)
      .map((value) => (Number.isFinite(value) && Number(value) > 0 ? Number(value) : 0))
    draft.rowHeights = trimSizeArray(normalized)
  }
}

function trimSizeArray(values: number[]): number[] | undefined {
  let lastNonZero = -1
  for (let i = values.length - 1; i >= 0; i--) {
    const entry = values[i] ?? 0
    if (entry > 0) {
      lastNonZero = i
      break
    }
  }
  if (lastNonZero < 0) return undefined
  return values.slice(0, lastNonZero + 1)
}

function normalizeRow(): number {
  return clamp(rowInput.value, 1, Math.max(1, props.tableMetadata.rows))
}

function normalizeColumn(): number {
  return clamp(columnInput.value, 1, Math.max(1, props.tableMetadata.columns))
}

function normalizeMergeRow(): number {
  return clamp(mergeRowInput.value, 1, Math.max(1, props.tableMetadata.rows))
}

function normalizeMergeColumn(): number {
  return clamp(mergeColumnInput.value, 1, Math.max(1, props.tableMetadata.columns))
}

function normalizeMergeRowSpan(): number {
  const startRow = normalizeMergeRow()
  const max = Math.max(1, props.tableMetadata.rows - startRow + 1)
  return clamp(mergeRowSpanInput.value, 1, max)
}

function normalizeMergeColSpan(): number {
  const startColumn = normalizeMergeColumn()
  const max = Math.max(1, props.tableMetadata.columns - startColumn + 1)
  return clamp(mergeColSpanInput.value, 1, max)
}

function parseDimensionInput(value: string): number | null {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return null
  if (numeric <= 0) return null
  return numeric
}

function updateSizeArray(
  source: number[] | undefined,
  index: number,
  value: number | null,
  upperBound: number,
): number[] | undefined {
  if (upperBound <= 0) return undefined
  const targetIndex = Math.min(Math.max(index, 0), upperBound - 1)
  const next = source ? [...source] : []
  while (next.length <= targetIndex) next.push(0)
  next[targetIndex] = value && value > 0 ? value : 0
  return trimSizeArray(next) ?? undefined
}

function commitColumnWidth(index: number, raw: string) {
  const value = parseDimensionInput(raw)
  props.updateTableMetadata((draft) => {
    draft.columnWidths = updateSizeArray(draft.columnWidths, index, value, draft.columns)
  })
}

function syncOuterFrame(draft: TableMetadata) {
  draft.showOuterFrame = (draft.showBackground !== false) || (draft.showBorder !== false)
}

function resetColumnWidth(index: number) {
  props.updateTableMetadata((draft) => {
    draft.columnWidths = updateSizeArray(draft.columnWidths, index, null, draft.columns)
  })
}

function commitRowHeight(index: number, raw: string) {
  const value = parseDimensionInput(raw)
  props.updateTableMetadata((draft) => {
    draft.rowHeights = updateSizeArray(draft.rowHeights, index, value, draft.rows)
  })
}

function resetRowHeight(index: number) {
  props.updateTableMetadata((draft) => {
    draft.rowHeights = updateSizeArray(draft.rowHeights, index, null, draft.rows)
  })
}

function resetMergeSpan() {
  mergeRowSpanInput.value = 1
  mergeColSpanInput.value = 1
}

function applyCellEdit(): void {
  const rowIndex = normalizeRow() - 1
  const columnIndex = normalizeColumn() - 1
  const text = cellText.value.trim()
  const align = cellAlign.value ?? props.tableMetadata.cellTextAlign ?? 'left'

  props.updateTableMetadata((draft) => {
    const contents = draft.cellContents ? [...draft.cellContents] : []
    const existingIndex = contents.findIndex((entry) => entry.row === rowIndex && entry.column === columnIndex)
    if (!text) {
      if (existingIndex >= 0) contents.splice(existingIndex, 1)
    } else {
      const payload = {
        row: rowIndex,
        column: columnIndex,
        text,
        textAlign: align,
      }
      if (existingIndex >= 0) contents.splice(existingIndex, 1, { ...contents[existingIndex], ...payload })
      else contents.push(payload)
    }
    draft.cellContents = contents
  })
}

type CellEntry = NonNullable<TableMetadata['cellContents']>[number]

function loadCell(entry: CellEntry) {
  rowInput.value = entry.row + 1
  columnInput.value = entry.column + 1
  cellText.value = entry.text ?? ''
  cellAlign.value = entry.textAlign ?? props.tableMetadata.cellTextAlign ?? 'left'
}

function removeCell(row: number, column: number) {
  props.updateTableMetadata((draft) => {
    draft.cellContents = (draft.cellContents ?? []).filter((entry) => !(entry.row === row && entry.column === column))
  })
}

function clearCell() {
  cellText.value = ''
  applyCellEdit()
}

function applyMergeEdit() {
  const rowIndex = normalizeMergeRow() - 1
  const columnIndex = normalizeMergeColumn() - 1
  const rowSpan = normalizeMergeRowSpan()
  const colSpan = normalizeMergeColSpan()

  props.updateTableMetadata((draft) => {
    const merges = draft.merges ? [...draft.merges] : []
    const payload: TableCellMerge = {
      row: rowIndex,
      column: columnIndex,
      rowSpan,
      colSpan,
    }
    const existingIndex = merges.findIndex((merge) => merge.row === rowIndex && merge.column === columnIndex)
    if (existingIndex >= 0) merges.splice(existingIndex, 1, payload)
    else merges.push(payload)
    draft.merges = merges
  })
}

function loadMerge(merge: MergeEntry) {
  mergeRowInput.value = merge.row + 1
  mergeColumnInput.value = merge.column + 1
  mergeRowSpanInput.value = merge.rowSpan
  mergeColSpanInput.value = merge.colSpan
}

function removeMerge(row: number, column: number) {
  props.updateTableMetadata((draft) => {
    draft.merges = (draft.merges ?? []).filter((merge) => !(merge.row === row && merge.column === column))
  })
}
</script>

<template>
  <div class="pt-4 border-t border-white/10 space-y-6">
    <div class="flex items-center justify-between">
      <p class="text-xs font-semibold uppercase tracking-widest text-white/60">Table</p>
      <span class="text-[11px] text-white/50">Rows × Columns</span>
    </div>

    <TableCellEditor
      :open="isCellEditorOpen"
      :table-metadata="tableMetadata"
      :update-table-metadata="updateTableMetadata"
      @close="isCellEditorOpen = false"
    />

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="text-xs font-medium text-white/60 mb-1.5 block">Rows</label>
        <input
          type="number"
          min="1"
          max="30"
          class="control-glass"
          :value="tableMetadata.rows"
          @change="updateTableMetadata((draft) => { draft.rows = clamp(Number(($event.target as HTMLInputElement).value) || draft.rows, 1, 30); sanitizeTableMetadata(draft) })"
        />
      </div>
      <div>
        <label class="text-xs font-medium text-white/60 mb-1.5 block">Columns</label>
        <input
          type="number"
          min="1"
          max="12"
          class="control-glass"
          :value="tableMetadata.columns"
          @change="updateTableMetadata((draft) => { draft.columns = clamp(Number(($event.target as HTMLInputElement).value) || draft.columns, 1, 12); sanitizeTableMetadata(draft) })"
        />
      </div>
    </div>

    <div class="grid grid-cols-3 gap-3">
      <div>
        <label class="text-xs font-medium text-white/60 mb-1.5 block">Header rows</label>
        <input
          type="number"
          min="0"
          :max="tableMetadata.rows - (tableMetadata.footerRows ?? 0)"
          class="control-glass"
          :value="tableMetadata.headerRows ?? 1"
          @change="updateTableMetadata((draft) => { 
            const max = Math.max(0, draft.rows - (draft.footerRows ?? 0))
            draft.headerRows = clamp(Number(($event.target as HTMLInputElement).value) || 0, 0, max)
          })"
        />
      </div>
      <div>
        <label class="text-xs font-medium text-white/60 mb-1.5 block">Footer rows</label>
        <input
          type="number"
          min="0"
          :max="tableMetadata.rows - (tableMetadata.headerRows ?? 0)"
          class="control-glass"
          :value="tableMetadata.footerRows ?? 0"
          @change="updateTableMetadata((draft) => { 
            const max = Math.max(0, draft.rows - (draft.headerRows ?? 0))
            draft.footerRows = clamp(Number(($event.target as HTMLInputElement).value) || 0, 0, max)
          })"
        />
      </div>
      <div>
        <label class="text-xs font-medium text-white/60 mb-1.5 block">Cell padding</label>
        <input
          type="number"
          min="0"
          max="60"
          class="control-glass"
          :value="tableMetadata.cellPadding ?? 12"
          @change="updateTableMetadata((draft) => { draft.cellPadding = clamp(Number(($event.target as HTMLInputElement).value) || 12, 0, 60) })"
        />
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="text-xs font-medium text-white/60 mb-1.5 block">Background</label>
        <ColorPicker
          :model-value="tableMetadata.backgroundColor ?? '#ffffff'"
          @update:modelValue="(color) => updateTableMetadata((draft) => { draft.backgroundColor = color })"
        />
      </div>
      <div>
        <label class="text-xs font-medium text-white/60 mb-1.5 block">Cell fill</label>
        <ColorPicker
          :model-value="tableMetadata.cellBackgroundColor ?? '#ffffff'"
          @update:modelValue="(color) => updateTableMetadata((draft) => { draft.cellBackgroundColor = color })"
        />
      </div>
    </div>
    <div class="flex flex-wrap items-center gap-4 text-xs text-white/80">
      <label class="flex items-center gap-2">
        <input
          type="checkbox"
          class="accent-primary-400"
          :checked="tableMetadata.showBackground !== false"
          @change="updateTableMetadata((draft) => {
            draft.showBackground = ($event.target as HTMLInputElement).checked
            syncOuterFrame(draft)
          })"
        />
        <span>Show outer background</span>
      </label>
      <label class="flex items-center gap-2">
        <input
          type="checkbox"
          class="accent-primary-400"
          :checked="tableMetadata.showBorder !== false"
          @change="updateTableMetadata((draft) => {
            draft.showBorder = ($event.target as HTMLInputElement).checked
            syncOuterFrame(draft)
          })"
        />
        <span>Show outer border</span>
      </label>
    </div>

    <div class="grid grid-cols-3 gap-3">
      <div>
        <label class="text-xs font-medium text-white/60 mb-1.5 block">Header</label>
        <ColorPicker
          :model-value="tableMetadata.headerBackgroundColor ?? '#111827'"
          @update:modelValue="(color) => updateTableMetadata((draft) => { draft.headerBackgroundColor = color })"
        />
      </div>
      <div>
        <label class="text-xs font-medium text-white/60 mb-1.5 block">Header text</label>
        <ColorPicker
          :model-value="tableMetadata.headerTextColor ?? '#ffffff'"
          @update:modelValue="(color) => updateTableMetadata((draft) => { draft.headerTextColor = color })"
        />
      </div>
      <div>
        <label class="text-xs font-medium text-white/60 mb-1.5 block">Footer</label>
        <ColorPicker
          :model-value="tableMetadata.footerBackgroundColor ?? '#f3f4f6'"
          @update:modelValue="(color) => updateTableMetadata((draft) => { draft.footerBackgroundColor = color })"
        />
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="text-xs font-medium text-white/60 mb-1.5 block">Stripe rows</label>
        <label class="flex items-center gap-2 text-sm text-white/80 control-toggle">
          <input
            type="checkbox"
            class="accent-primary-400"
            :checked="tableMetadata.stripeEvenRows ?? false"
            @change="updateTableMetadata((draft) => { draft.stripeEvenRows = ($event.target as HTMLInputElement).checked })"
          />
          <span>Enable zebra striping</span>
        </label>
      </div>
      <div v-if="tableMetadata.stripeEvenRows">
        <label class="text-xs font-medium text-white/60 mb-1.5 block">Stripe color</label>
        <ColorPicker
          :model-value="tableMetadata.stripeColor ?? '#f9fafb'"
          @update:modelValue="(color) => updateTableMetadata((draft) => { draft.stripeColor = color })"
        />
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="text-xs font-medium text-white/60 mb-1.5 block">Border</label>
        <ColorPicker
          :model-value="tableMetadata.borderColor ?? '#d1d5db'"
          @update:modelValue="(color) => updateTableMetadata((draft) => { draft.borderColor = color })"
        />
      </div>
      <div>
        <label class="text-xs font-medium text-white/60 mb-1.5 block">Border width</label>
        <input
          type="number"
          min="0"
          max="12"
          class="control-glass"
          :value="tableMetadata.borderWidth ?? 1"
          @change="updateTableMetadata((draft) => { draft.borderWidth = clamp(Number(($event.target as HTMLInputElement).value) || 1, 0, 12) })"
        />
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="text-xs font-medium text-white/60 mb-1.5 block">Grid lines</label>
        <label class="flex items-center gap-2 text-sm text-white/80 control-toggle">
          <input
            type="checkbox"
            min="1"
            class="control-glass"
            :checked="tableMetadata.showGridLines !== false"
            @change="updateTableMetadata((draft) => { draft.showGridLines = ($event.target as HTMLInputElement).checked })"
          />
          <span>Show internal lines</span>
        </label>
      </div>
      <div v-if="tableMetadata.showGridLines !== false" class="grid grid-cols-2 gap-3 col-span-2">
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Line color</label>
          <ColorPicker
            :model-value="tableMetadata.gridLineColor ?? '#e5e7eb'"
            @update:modelValue="(color) => updateTableMetadata((draft) => { draft.gridLineColor = color })"
          />
        </div>
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Line width</label>
          <input
            type="number"
            min="0"
            max="8"
            class="control-glass"
            :value="tableMetadata.gridLineWidth ?? 1"
            @change="updateTableMetadata((draft) => { draft.gridLineWidth = clamp(Number(($event.target as HTMLInputElement).value) || 1, 0, 8) })"
          />
        </div>
      </div>
    </div>

    <div class="space-y-3">
      <p class="text-xs font-semibold uppercase tracking-widest text-white/60">Typography</p>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Font</label>
          <select
            class="control-glass"
            :value="tableMetadata.cellFontFamily ?? 'Inter'"
            @change="updateTableMetadata((draft) => { draft.cellFontFamily = ($event.target as HTMLSelectElement).value })"
          >
            <option
              v-for="font in fontOptions"
              :key="font"
              :value="font"
            >
              {{ font }}
            </option>
          </select>
        </div>
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Font size</label>
          <input
            type="number"
            min="8"
            max="64"
            class="control-glass"
            :value="tableMetadata.cellFontSize ?? 14"
            @change="updateTableMetadata((draft) => { draft.cellFontSize = clamp(Number(($event.target as HTMLInputElement).value) || 14, 8, 64) })"
          />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Weight</label>
          <input
            type="number"
            min="100"
            max="900"
            step="100"
            class="control-glass"
            :value="Number(tableMetadata.cellFontWeight ?? 500)"
            @change="updateTableMetadata((draft) => { draft.cellFontWeight = clamp(Number(($event.target as HTMLInputElement).value) || 500, 100, 900) })"
          />
        </div>
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Text color</label>
          <ColorPicker
            :model-value="tableMetadata.cellTextColor ?? '#111827'"
            @update:modelValue="(color) => updateTableMetadata((draft) => { draft.cellTextColor = color })"
          />
        </div>
      </div>
    </div>

    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <p class="text-xs font-semibold uppercase tracking-widest text-white/60">Column widths</p>
        <span class="text-[11px] text-white/50">{{ tableMetadata.columns }} cols</span>
      </div>
      <div class="overflow-x-auto">
        <div class="flex gap-2">
          <div
            v-for="(value, index) in columnWidthDisplay"
            :key="`col-${index}`"
            class="flex flex-col gap-1 min-w-[90px]"
          >
            <label class="text-[10px] uppercase tracking-wide text-white/40">Col {{ index + 1 }}</label>
            <div class="flex gap-1">
              <input
                type="number"
                min="20"
                class="control-glass flex-1"
                :value="value"
                placeholder="Auto"
                @change="commitColumnWidth(index, ($event.target as HTMLInputElement).value)"
              />
              <button
                type="button"
                class="btn-glass-sm px-2"
                title="Auto width"
                @click="resetColumnWidth(index)"
              >
                Auto
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <p class="text-xs font-semibold uppercase tracking-widest text-white/60">Row heights</p>
        <span class="text-[11px] text-white/50">{{ tableMetadata.rows }} rows</span>
      </div>
      <div class="overflow-x-auto">
        <div class="flex gap-2">
          <div
            v-for="(value, index) in rowHeightDisplay"
            :key="`row-${index}`"
            class="flex flex-col gap-1 min-w-[90px]"
          >
            <label class="text-[10px] uppercase tracking-wide text-white/40">Row {{ index + 1 }}</label>
            <div class="flex gap-1">
              <input
                type="number"
                min="20"
                class="control-glass flex-1"
                :value="value"
                placeholder="Auto"
                @change="commitRowHeight(index, ($event.target as HTMLInputElement).value)"
              />
              <button
                type="button"
                class="btn-glass-sm px-2"
                title="Auto height"
                @click="resetRowHeight(index)"
              >
                Auto
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <p class="text-xs font-semibold uppercase tracking-widest text-white/60">Cell content</p>
        <div class="flex items-center gap-2">
          <span class="text-[11px] text-white/50">{{ cellEntries.length }} entries</span>
          <button type="button" class="btn-glass-sm" @click="isCellEditorOpen = true">Open Editor</button>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Row (#)</label>
          <input v-model.number="rowInput" type="number" min="1" class="control-glass" />
        </div>
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Column (#)</label>
          <input v-model.number="columnInput" type="number" min="1" class="control-glass" />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Align</label>
          <select v-model="cellAlign" class="control-glass">
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </div>
      </div>
      <textarea
        v-model="cellText"
        rows="3"
        class="control-glass resize-none"
        placeholder="Cell text..."
      ></textarea>
      <div class="flex items-center gap-3">
        <button type="button" class="btn-glass-sm flex-1" @click="applyCellEdit">Save Cell</button>
        <button
          type="button"
          class="btn-glass-sm flex-1"
          @click="clearCell"
        >
          Clear Cell
        </button>
      </div>
      <div
        v-if="cellEntries.length"
        class="space-y-2 max-h-48 overflow-y-auto"
      >
        <div
          v-for="entry in cellEntries"
          :key="`${entry.row}-${entry.column}`"
          class="flex items-center justify-between gap-3 rounded-xl border border-white/10 px-3 py-2 bg-white/5"
        >
          <button class="text-left flex-1" @click="loadCell(entry)">
            <p class="text-xs text-white/70 font-semibold">Row {{ entry.row + 1 }}, Col {{ entry.column + 1 }}</p>
            <p class="text-[11px] text-white/60 truncate">{{ entry.text || '—' }}</p>
          </button>
          <button
            class="text-xs text-red-300 hover:text-red-100 transition-colors"
            @click="removeCell(entry.row, entry.column)"
          >
            Remove
          </button>
        </div>
      </div>
      <p v-else class="text-[11px] text-white/40">No custom cell content yet.</p>
    </div>

    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <p class="text-xs font-semibold uppercase tracking-widest text-white/60">Cell merges</p>
        <span class="text-[11px] text-white/50">{{ mergeEntries.length }} active</span>
      </div>
      <div class="grid grid-cols-4 gap-3">
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Row (#)</label>
          <input v-model.number="mergeRowInput" type="number" min="1" class="control-glass" />
        </div>
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Column (#)</label>
          <input v-model.number="mergeColumnInput" type="number" min="1" class="control-glass" />
        </div>
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Row span</label>
          <input v-model.number="mergeRowSpanInput" type="number" min="1" class="control-glass" />
        </div>
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Col span</label>
          <input v-model.number="mergeColSpanInput" type="number" min="1" class="control-glass" />
        </div>
      </div>
      <div class="flex items-center gap-3">
        <button type="button" class="btn-glass-sm flex-1" @click="applyMergeEdit">Save Merge</button>
        <button type="button" class="btn-glass-sm flex-1" @click="resetMergeSpan">
          Reset Span
        </button>
      </div>
      <div v-if="mergeEntries.length" class="space-y-2 max-h-48 overflow-y-auto">
        <div
          v-for="merge in mergeEntries"
          :key="`${merge.row}-${merge.column}`"
          class="flex items-center justify-between gap-3 rounded-xl border border-white/10 px-3 py-2 bg-white/5"
        >
          <button class="text-left flex-1" @click="loadMerge(merge)">
            <p class="text-xs text-white/70 font-semibold">
              Start (r{{ merge.row + 1 }}, c{{ merge.column + 1 }})
            </p>
            <p class="text-[11px] text-white/60">Span {{ merge.rowSpan }}×{{ merge.colSpan }}</p>
          </button>
          <button
            class="text-xs text-red-300 hover:text-red-100 transition-colors"
            @click="removeMerge(merge.row, merge.column)"
          >
            Remove
          </button>
        </div>
      </div>
      <p v-else class="text-[11px] text-white/40">No merged cells yet.</p>
    </div>
  </div>
</template>
