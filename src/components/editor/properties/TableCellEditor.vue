<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { TableCellContent, TableMetadata, TableTextAlign } from '@/types'

const props = defineProps<{
  open: boolean
  tableMetadata: TableMetadata
  updateTableMetadata: (updater: (draft: TableMetadata) => void) => void
}>()

const emit = defineEmits<{ (e: 'close'): void }>()

type CellState = { text: string; textAlign: TableTextAlign }

const alignOptions: TableTextAlign[] = ['left', 'center', 'right']
const cellStates = ref<CellState[][]>([])

const summary = computed(() => ({
  rows: Math.max(1, props.tableMetadata.rows),
  columns: Math.max(1, props.tableMetadata.columns),
}))

function hydrateFromMetadata() {
  const rows = Math.max(1, props.tableMetadata.rows)
  const columns = Math.max(1, props.tableMetadata.columns)
  const defaultAlign = props.tableMetadata.cellTextAlign ?? 'left'
  const contents = new Map<string, TableCellContent>()
  ;(props.tableMetadata.cellContents ?? []).forEach((entry: TableCellContent) => {
    contents.set(`${entry.row}-${entry.column}`, entry)
  })

  cellStates.value = Array.from({ length: rows }, (_, row) =>
    Array.from({ length: columns }, (_, column) => {
      const key = `${row}-${column}`
      const entry = contents.get(key)
      const textAlign = (entry?.textAlign ?? defaultAlign) as TableTextAlign
      return {
        text: entry?.text ?? '',
        textAlign,
      }
    }),
  )
}

watch(
  () => props.tableMetadata.cellContents,
  () => {
    if (props.open) hydrateFromMetadata()
  },
  { deep: true },
)

watch(
  () => [props.tableMetadata.rows, props.tableMetadata.columns],
  () => {
    if (props.open) hydrateFromMetadata()
  },
)

watch(
  () => props.open,
  (open) => {
    if (open) hydrateFromMetadata()
  },
  { immediate: true },
)

function cycleAlign(row: number, column: number) {
  const rowCells = cellStates.value[row]
  if (!rowCells) return
  const cell = rowCells[column]
  if (!cell || alignOptions.length === 0) return
  const currentIndex = alignOptions.indexOf(cell.textAlign)
  const nextIndex = ((currentIndex >= 0 ? currentIndex : 0) + 1) % alignOptions.length
  const next = alignOptions[nextIndex]!
  rowCells[column] = {
    ...cell,
    textAlign: next,
  }
}

function clearAllCells() {
  cellStates.value = cellStates.value.map((row) =>
    row.map((cell) => ({
      ...cell,
      text: '',
    })),
  )
}

function closeModal() {
  emit('close')
}

function saveChanges() {
  const entries: TableCellContent[] = []
  cellStates.value.forEach((row, rowIndex) => {
    row.forEach((cell, columnIndex) => {
      const text = cell.text.trim()
      if (!text) return
      entries.push({
        row: rowIndex,
        column: columnIndex,
        text,
        textAlign: cell.textAlign,
      })
    })
  })

  props.updateTableMetadata((draft) => {
    draft.cellContents = entries
  })
  closeModal()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div class="w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl border border-white/10 bg-slate-900/95 shadow-2xl">
          <div class="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <div>
              <h2 class="text-lg font-semibold text-white">Edit Table Cells</h2>
              <p class="text-xs text-white/60">
                {{ summary.rows }} rows · {{ summary.columns }} columns. Click a cell to edit text, tap Align to cycle alignment.
              </p>
            </div>
            <button class="btn-glass-sm" @click="closeModal">Close</button>
          </div>

          <div class="p-6 space-y-4 overflow-y-auto max-h-[65vh]">
            <div class="grid gap-4" :style="{ gridTemplateColumns: `repeat(${summary.columns}, minmax(140px, 1fr))` }">
              <div
                v-for="(row, rowIndex) in cellStates"
                :key="`row-${rowIndex}`"
                class="contents"
              >
                <div
                  v-for="(cell, columnIndex) in row"
                  :key="`cell-${rowIndex}-${columnIndex}`"
                  class="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2"
                >
                  <div class="flex items-center justify-between">
                    <p class="text-[11px] font-semibold text-white/60">R{{ rowIndex + 1 }} · C{{ columnIndex + 1 }}</p>
                    <button
                      type="button"
                      class="text-[11px] text-white/50 hover:text-white transition-colors"
                      @click="cycleAlign(rowIndex, columnIndex)"
                    >
                      Align: {{ cell.textAlign.charAt(0).toUpperCase() }}
                    </button>
                  </div>
                  <textarea
                    v-model="cell.text"
                    rows="3"
                    class="w-full rounded-lg border border-white/10 bg-white/10 p-2 text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-primary-400"
                    placeholder="Cell text..."
                  ></textarea>
                </div>
              </div>
            </div>
          </div>

          <div class="px-6 py-4 border-t border-white/10 flex items-center justify-between">
            <button type="button" class="btn-glass-sm" @click="clearAllCells">Clear All</button>
            <div class="flex items-center gap-2">
              <button type="button" class="btn-glass-sm" @click="closeModal">Cancel</button>
              <button type="button" class="btn-primary" @click="saveChanges">Save Changes</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
