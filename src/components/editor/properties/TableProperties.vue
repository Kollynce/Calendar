<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import ColorPicker from '../ColorPicker.vue'
import TableCellEditor from './TableCellEditor.vue'
import PropertySection from './PropertySection.vue'
import PropertyField from './PropertyField.vue'
import PropertyRow from './PropertyRow.vue'
import type { TableMetadata, TableCellMerge } from '@/types'

interface Props {
  tableMetadata: TableMetadata
  updateTableMetadata: (updater: (draft: TableMetadata) => void) => void
}

const props = defineProps<Props>()

// Section management
const activeSections = ref<Set<string>>(new Set(['content']))

function toggleSection(id: string) {
  if (activeSections.value.has(id)) {
    activeSections.value.delete(id)
  } else {
    activeSections.value.add(id)
  }
}

function isSectionOpen(id: string) {
  return activeSections.value.has(id)
}

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
  <div class="space-y-0">
    <!-- Table Structure (Content) -->
    <PropertySection 
      title="Table Structure" 
      :is-open="isSectionOpen('content')"
      @toggle="toggleSection('content')"
    >
      <PropertyRow>
        <PropertyField label="Rows">
          <input
            type="number"
            min="1"
            max="30"
            class="control-glass text-xs"
            :value="tableMetadata.rows"
            @change="updateTableMetadata((draft) => { draft.rows = clamp(Number(($event.target as HTMLInputElement).value) || draft.rows, 1, 30); sanitizeTableMetadata(draft) })"
          />
        </PropertyField>
        <PropertyField label="Columns">
          <input
            type="number"
            min="1"
            max="12"
            class="control-glass text-xs"
            :value="tableMetadata.columns"
            @change="updateTableMetadata((draft) => { draft.columns = clamp(Number(($event.target as HTMLInputElement).value) || draft.columns, 1, 12); sanitizeTableMetadata(draft) })"
          />
        </PropertyField>
      </PropertyRow>

      <PropertyRow cols="3">
        <PropertyField label="Header Rows">
          <input
            type="number"
            min="0"
            :max="tableMetadata.rows - (tableMetadata.footerRows ?? 0)"
            class="control-glass text-xs"
            :value="tableMetadata.headerRows ?? 1"
            @change="updateTableMetadata((draft) => { 
              const max = Math.max(0, draft.rows - (draft.footerRows ?? 0))
              draft.headerRows = clamp(Number(($event.target as HTMLInputElement).value) || 0, 0, max)
            })"
          />
        </PropertyField>
        <PropertyField label="Footer Rows">
          <input
            type="number"
            min="0"
            :max="tableMetadata.rows - (tableMetadata.headerRows ?? 0)"
            class="control-glass text-xs"
            :value="tableMetadata.footerRows ?? 0"
            @change="updateTableMetadata((draft) => { 
              const max = Math.max(0, draft.rows - (draft.headerRows ?? 0))
              draft.footerRows = clamp(Number(($event.target as HTMLInputElement).value) || 0, 0, max)
            })"
          />
        </PropertyField>
        <PropertyField label="Cell Padding">
          <input
            type="number"
            min="0"
            max="60"
            class="control-glass text-xs"
            :value="tableMetadata.cellPadding ?? 12"
            @change="updateTableMetadata((draft) => { draft.cellPadding = clamp(Number(($event.target as HTMLInputElement).value) || 12, 0, 60) })"
          />
        </PropertyField>
      </PropertyRow>
    </PropertySection>

    <!-- Appearance Section -->
    <PropertySection 
      title="Appearance" 
      :is-open="isSectionOpen('appearance')"
      @toggle="toggleSection('appearance')"
    >
      <PropertyRow>
        <label class="flex items-center gap-2 text-[11px] text-white/60 cursor-pointer">
          <input
            type="checkbox"
            class="accent-primary-400"
            :checked="tableMetadata.showBackground !== false"
            @change="updateTableMetadata((draft) => { draft.showBackground = ($event.target as HTMLInputElement).checked; syncOuterFrame(draft) })"
          />
          <span>Show Background</span>
        </label>
        <label class="flex items-center gap-2 text-[11px] text-white/60 cursor-pointer">
          <input
            type="checkbox"
            class="accent-primary-400"
            :checked="tableMetadata.showBorder !== false"
            @change="updateTableMetadata((draft) => { draft.showBorder = ($event.target as HTMLInputElement).checked; syncOuterFrame(draft) })"
          />
          <span>Show Border</span>
        </label>
      </PropertyRow>

      <PropertyRow>
        <PropertyField label="Table Background">
          <ColorPicker
            :model-value="tableMetadata.backgroundColor ?? '#ffffff'"
            @update:modelValue="(color) => updateTableMetadata((draft) => { draft.backgroundColor = color })"
          />
        </PropertyField>
        <PropertyField label="Cell Background">
          <ColorPicker
            :model-value="tableMetadata.cellBackgroundColor ?? '#ffffff'"
            @update:modelValue="(color) => updateTableMetadata((draft) => { draft.cellBackgroundColor = color })"
          />
        </PropertyField>
      </PropertyRow>

      <div class="pt-4 border-t border-white/5 space-y-3">
        <span class="text-[10px] font-medium text-white/40 uppercase">Header & Footer</span>
        <PropertyRow cols="3" gap="2">
          <PropertyField label="Hdr BG">
            <ColorPicker
              :model-value="tableMetadata.headerBackgroundColor ?? '#111827'"
              @update:modelValue="(color) => updateTableMetadata((draft) => { draft.headerBackgroundColor = color })"
            />
          </PropertyField>
          <PropertyField label="Hdr Text">
            <ColorPicker
              :model-value="tableMetadata.headerTextColor ?? '#ffffff'"
              @update:modelValue="(color) => updateTableMetadata((draft) => { draft.headerTextColor = color })"
            />
          </PropertyField>
          <PropertyField label="Ftr BG">
            <ColorPicker
              :model-value="tableMetadata.footerBackgroundColor ?? '#f3f4f6'"
              @update:modelValue="(color) => updateTableMetadata((draft) => { draft.footerBackgroundColor = color })"
            />
          </PropertyField>
        </PropertyRow>
      </div>

      <div class="pt-4 border-t border-white/5 space-y-4">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-medium text-white/40 uppercase">Zebra Striping</span>
          <label class="flex items-center gap-2 text-[11px] text-white/60 cursor-pointer">
            <input
              type="checkbox"
              class="accent-primary-400"
              :checked="tableMetadata.stripeEvenRows ?? false"
              @change="updateTableMetadata((draft) => { draft.stripeEvenRows = ($event.target as HTMLInputElement).checked })"
            />
            <span>Enabled</span>
          </label>
        </div>
        <PropertyField v-if="tableMetadata.stripeEvenRows" label="Stripe Color">
          <ColorPicker
            :model-value="tableMetadata.stripeColor ?? '#f9fafb'"
            @update:modelValue="(color) => updateTableMetadata((draft) => { draft.stripeColor = color })"
          />
        </PropertyField>
      </div>

      <div class="pt-4 border-t border-white/5 space-y-4">
        <span class="text-[10px] font-medium text-white/40 uppercase">Borders & Grid</span>
        <PropertyRow>
          <PropertyField label="Border Color">
            <ColorPicker
              :model-value="tableMetadata.borderColor ?? '#d1d5db'"
              @update:modelValue="(color) => updateTableMetadata((draft) => { draft.borderColor = color })"
            />
          </PropertyField>
          <PropertyField label="Border Width">
            <input
              type="number"
              min="0"
              max="12"
              class="control-glass text-xs"
              :value="tableMetadata.borderWidth ?? 1"
              @change="updateTableMetadata((draft) => { draft.borderWidth = clamp(Number(($event.target as HTMLInputElement).value) || 1, 0, 12) })"
            />
          </PropertyField>
        </PropertyRow>

        <div class="flex items-center justify-between">
          <span class="text-[10px] font-medium text-white/40 uppercase">Internal Grid</span>
          <label class="flex items-center gap-2 text-[11px] text-white/60 cursor-pointer">
            <input
              type="checkbox"
              class="accent-primary-400"
              :checked="tableMetadata.showGridLines !== false"
              @change="updateTableMetadata((draft) => { draft.showGridLines = ($event.target as HTMLInputElement).checked })"
            />
            <span>Enabled</span>
          </label>
        </div>
        <PropertyRow v-if="tableMetadata.showGridLines !== false">
          <PropertyField label="Line Color">
            <ColorPicker
              :model-value="tableMetadata.gridLineColor ?? '#e5e7eb'"
              @update:modelValue="(color) => updateTableMetadata((draft) => { draft.gridLineColor = color })"
            />
          </PropertyField>
          <PropertyField label="Line Width">
            <input
              type="number"
              min="0"
              max="8"
              class="control-glass text-xs"
              :value="tableMetadata.gridLineWidth ?? 1"
              @change="updateTableMetadata((draft) => { draft.gridLineWidth = clamp(Number(($event.target as HTMLInputElement).value) || 1, 0, 8) })"
            />
          </PropertyField>
        </PropertyRow>
      </div>
    </PropertySection>

    <!-- Typography Section -->
    <PropertySection 
      title="Typography" 
      :is-open="isSectionOpen('typography')"
      @toggle="toggleSection('typography')"
    >
      <PropertyRow>
        <PropertyField label="Font Family">
          <select
            class="control-glass text-xs"
            :value="tableMetadata.cellFontFamily ?? 'Inter'"
            @change="updateTableMetadata((draft) => { draft.cellFontFamily = ($event.target as HTMLSelectElement).value })"
          >
            <option v-for="font in fontOptions" :key="font" :value="font">{{ font }}</option>
          </select>
        </PropertyField>
        <PropertyField label="Font Size">
          <input
            type="number"
            min="8"
            max="64"
            class="control-glass text-xs"
            :value="tableMetadata.cellFontSize ?? 14"
            @change="updateTableMetadata((draft) => { draft.cellFontSize = clamp(Number(($event.target as HTMLInputElement).value) || 14, 8, 64) })"
          />
        </PropertyField>
      </PropertyRow>
      <PropertyRow>
        <PropertyField label="Weight">
          <input
            type="number"
            min="100"
            max="900"
            step="100"
            class="control-glass text-xs"
            :value="Number(tableMetadata.cellFontWeight ?? 500)"
            @change="updateTableMetadata((draft) => { draft.cellFontWeight = clamp(Number(($event.target as HTMLInputElement).value) || 500, 100, 900) })"
          />
        </PropertyField>
        <PropertyField label="Body Text">
          <ColorPicker
            :model-value="tableMetadata.cellTextColor ?? '#111827'"
            @update:modelValue="(color) => updateTableMetadata((draft) => { draft.cellTextColor = color })"
          />
        </PropertyField>
      </PropertyRow>
    </PropertySection>

    <!-- Layout Section (Dimensions) -->
    <PropertySection 
      title="Column & Row Sizing" 
      :is-open="isSectionOpen('layout')"
      @toggle="toggleSection('layout')"
    >
      <div class="space-y-6">
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-medium text-white/40 uppercase">Column Widths</span>
            <span class="text-[10px] text-white/30">{{ tableMetadata.columns }} cols</span>
          </div>
          <div class="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10">
            <div class="flex gap-2 min-w-max">
              <div v-for="(value, index) in columnWidthDisplay" :key="`col-${index}`" class="flex flex-col gap-1 w-24">
                <label class="text-[9px] uppercase tracking-wide text-white/30">Col {{ index + 1 }}</label>
                <div class="flex flex-col gap-1">
                  <input
                    type="number"
                    min="20"
                    class="control-glass text-[10px] py-1 h-7"
                    :value="value"
                    placeholder="Auto"
                    @change="commitColumnWidth(index, ($event.target as HTMLInputElement).value)"
                  />
                  <button type="button" class="btn-glass-sm py-0.5 text-[9px] h-5" @click="resetColumnWidth(index)">Auto</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-3 pt-4 border-t border-white/5">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-medium text-white/40 uppercase">Row Heights</span>
            <span class="text-[10px] text-white/30">{{ tableMetadata.rows }} rows</span>
          </div>
          <div class="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10">
            <div class="flex gap-2 min-w-max">
              <div v-for="(value, index) in rowHeightDisplay" :key="`row-${index}`" class="flex flex-col gap-1 w-24">
                <label class="text-[9px] uppercase tracking-wide text-white/30">Row {{ index + 1 }}</label>
                <div class="flex flex-col gap-1">
                  <input
                    type="number"
                    min="20"
                    class="control-glass text-[10px] py-1 h-7"
                    :value="value"
                    placeholder="Auto"
                    @change="commitRowHeight(index, ($event.target as HTMLInputElement).value)"
                  />
                  <button type="button" class="btn-glass-sm py-0.5 text-[9px] h-5" @click="resetRowHeight(index)">Auto</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PropertySection>

    <!-- Data & Merges Section -->
    <PropertySection 
      title="Data & Cell Merges" 
      :is-open="isSectionOpen('data')"
      @toggle="toggleSection('data')"
      is-last
    >
      <TableCellEditor
        :open="isCellEditorOpen"
        :table-metadata="tableMetadata"
        :update-table-metadata="updateTableMetadata"
        @close="isCellEditorOpen = false"
      />

      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-medium text-white/40 uppercase">Quick Cell Access</span>
          <button type="button" class="btn-glass-sm px-2 py-1 text-[10px]" @click="isCellEditorOpen = true">Open Main Editor</button>
        </div>
        
        <PropertyRow>
          <PropertyField label="Row">
            <input v-model.number="rowInput" type="number" min="1" class="control-glass text-xs" />
          </PropertyField>
          <PropertyField label="Col">
            <input v-model.number="columnInput" type="number" min="1" class="control-glass text-xs" />
          </PropertyField>
        </PropertyRow>
        
        <PropertyRow class="items-end">
          <PropertyField label="Align">
            <select v-model="cellAlign" class="control-glass text-xs">
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </PropertyField>
          <button type="button" class="btn-glass-sm h-9" @click="applyCellEdit">Update Content</button>
        </PropertyRow>
        
        <PropertyField label="Content">
          <textarea
            v-model="cellText"
            rows="2"
            class="control-glass text-xs resize-none"
            placeholder="Static text for this cell..."
          ></textarea>
        </PropertyField>

        <div v-if="cellEntries.length" class="space-y-2 max-h-32 overflow-y-auto pr-1 scrollbar-thin">
          <div v-for="entry in cellEntries" :key="`${entry.row}-${entry.column}`" class="flex items-center justify-between gap-3 px-3 py-1.5 rounded-lg border border-white/5 bg-white/5">
            <button class="text-left flex-1 group" @click="loadCell(entry)">
              <p class="text-[10px] text-white/40 group-hover:text-white/60 transition-colors">R{{ entry.row + 1 }}, C{{ entry.column + 1 }}</p>
              <p class="text-[11px] text-white/60 truncate">{{ entry.text || '—' }}</p>
            </button>
            <button class="text-[10px] text-red-400/60 hover:text-red-400 transition-colors" @click="removeCell(entry.row, entry.column)">Remove</button>
          </div>
        </div>
      </div>

      <div class="space-y-4 pt-6 border-t border-white/5">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-medium text-white/40 uppercase">Cell Merges</span>
          <span class="text-[10px] text-white/30">{{ mergeEntries.length }} active</span>
        </div>
        
        <PropertyRow cols="4" gap="2">
          <PropertyField label="Row">
            <input v-model.number="mergeRowInput" type="number" min="1" class="control-glass text-[10px] px-1 h-7" />
          </PropertyField>
          <PropertyField label="Col">
            <input v-model.number="mergeColumnInput" type="number" min="1" class="control-glass text-[10px] px-1 h-7" />
          </PropertyField>
          <PropertyField label="R Span">
            <input v-model.number="mergeRowSpanInput" type="number" min="1" class="control-glass text-[10px] px-1 h-7" />
          </PropertyField>
          <PropertyField label="C Span">
            <input v-model.number="mergeColSpanInput" type="number" min="1" class="control-glass text-[10px] px-1 h-7" />
          </PropertyField>
        </PropertyRow>
        
        <PropertyRow>
          <button type="button" class="btn-glass-sm flex-1 h-8 text-[10px]" @click="applyMergeEdit">Save Merge</button>
          <button type="button" class="btn-glass-sm flex-1 h-8 text-[10px]" @click="resetMergeSpan">Reset</button>
        </PropertyRow>

        <div v-if="mergeEntries.length" class="space-y-2 max-h-32 overflow-y-auto pr-1 scrollbar-thin">
          <div v-for="merge in mergeEntries" :key="`${merge.row}-${merge.column}`" class="flex items-center justify-between gap-3 px-3 py-1.5 rounded-lg border border-white/5 bg-white/5">
            <button class="text-left flex-1 group" @click="loadMerge(merge)">
              <p class="text-[10px] text-white/40 group-hover:text-white/60 transition-colors">Start R{{ merge.row + 1 }}, C{{ merge.column + 1 }}</p>
              <p class="text-[11px] text-white/60">Span {{ merge.rowSpan }}×{{ merge.colSpan }}</p>
            </button>
            <button class="text-[10px] text-red-400/60 hover:text-red-400 transition-colors" @click="removeMerge(merge.row, merge.column)">Remove</button>
          </div>
        </div>
        <p v-else class="text-[11px] text-white/40 mt-2">No merged cells yet.</p>
      </div>
    </PropertySection>
  </div>
</template>
