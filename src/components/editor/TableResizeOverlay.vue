<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { TableMetadata } from '@/types'

type TableResizeState = {
  rect: { left: number; top: number; width: number; height: number }
  metadata: TableMetadata
}

const props = defineProps<{
  state: TableResizeState
}>()

const emit = defineEmits<{
  (e: 'adjust-column', payload: { boundaryIndex: number; delta: number }): void
  (e: 'adjust-row', payload: { boundaryIndex: number; delta: number }): void
}>()

const dragState = ref<{
  kind: 'column' | 'row'
  boundaryIndex: number
  axis: 'x' | 'y'
  pointerId: number
  startValue: number
  lastDelta: number
} | null>(null)

const MIN_COLUMNS = 2
const MIN_ROWS = 2

const columnHandles = computed(() => {
  const metadata = props.state.metadata
  const columns = Math.max(1, metadata.columns)
  if (columns < MIN_COLUMNS) return []
  const totalWidth = Math.max(1, metadata.size?.width ?? props.state.rect.width)
  const widths = resolveSizes(columns, totalWidth, metadata.columnWidths)
  let offset = 0
  return widths.slice(0, -1).map((width, index) => {
    offset += width
    return {
      boundaryIndex: index,
      percent: offset / totalWidth,
    }
  })
})

const rowHandles = computed(() => {
  const metadata = props.state.metadata
  const rows = Math.max(1, metadata.rows)
  if (rows < MIN_ROWS) return []
  const totalHeight = Math.max(1, metadata.size?.height ?? props.state.rect.height)
  const heights = resolveSizes(rows, totalHeight, metadata.rowHeights)
  let offset = 0
  return heights.slice(0, -1).map((height, index) => {
    offset += height
    return {
      boundaryIndex: index,
      percent: offset / totalHeight,
    }
  })
})

watch(
  () => props.state,
  () => {
    if (!props.state) {
      dragState.value = null
    }
  },
)

function resolveSizes(count: number, total: number, overrides?: number[] | null): number[] {
  const base = total / count
  return Array.from({ length: count }, (_, idx) => {
    const value = overrides?.[idx]
    return Number.isFinite(value) && Number(value) > 0 ? Number(value) : base
  })
}

function startDrag(kind: 'column' | 'row', boundaryIndex: number, event: PointerEvent) {
  event.preventDefault()
  event.stopPropagation()
  const axis = kind === 'column' ? 'x' : 'y'
  dragState.value = {
    kind,
    boundaryIndex,
    axis,
    pointerId: event.pointerId,
    startValue: axis === 'x' ? event.clientX : event.clientY,
    lastDelta: 0,
  }
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function handlePointerMove(event: PointerEvent) {
  if (!dragState.value) return
  if (event.pointerId !== dragState.value.pointerId) return

  const axisValue = dragState.value.axis === 'x' ? event.clientX : event.clientY
  const deltaFromStart = axisValue - dragState.value.startValue
  const incrementalDelta = deltaFromStart - dragState.value.lastDelta
  if (incrementalDelta === 0) return
  dragState.value.lastDelta = deltaFromStart

  if (dragState.value.kind === 'column') {
    emit('adjust-column', {
      boundaryIndex: dragState.value.boundaryIndex,
      delta: incrementalDelta,
    })
  } else {
    emit('adjust-row', {
      boundaryIndex: dragState.value.boundaryIndex,
      delta: incrementalDelta,
    })
  }
}

function stopDrag(event: PointerEvent) {
  if (!dragState.value) return
  if (event.pointerId !== dragState.value.pointerId) return
  ;(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId)
  dragState.value = null
}
</script>

<template>
  <transition name="fade">
    <div
      v-if="state"
      class="table-resize-overlay absolute"
      :style="{
        left: `${state.rect.left}px`,
        top: `${state.rect.top}px`,
        width: `${state.rect.width}px`,
        height: `${state.rect.height}px`,
      }"
    >
      <!-- Column handles -->
      <button
        v-for="handle in columnHandles"
        :key="`col-${handle.boundaryIndex}`"
        type="button"
        class="resize-handle resize-handle--column"
        :class="{
          'resize-handle--active':
            dragState?.kind === 'column' && dragState?.boundaryIndex === handle.boundaryIndex,
        }"
        :style="{ left: `${handle.percent * 100}%` }"
        @pointerdown="startDrag('column', handle.boundaryIndex, $event)"
        @pointermove="handlePointerMove"
        @pointerup="stopDrag"
        @pointercancel="stopDrag"
      >
        <span class="handle-bar" />
      </button>

      <!-- Row handles -->
      <button
        v-for="handle in rowHandles"
        :key="`row-${handle.boundaryIndex}`"
        type="button"
        class="resize-handle resize-handle--row"
        :class="{
          'resize-handle--active':
            dragState?.kind === 'row' && dragState?.boundaryIndex === handle.boundaryIndex,
        }"
        :style="{ top: `${handle.percent * 100}%` }"
        @pointerdown="startDrag('row', handle.boundaryIndex, $event)"
        @pointermove="handlePointerMove"
        @pointerup="stopDrag"
        @pointercancel="stopDrag"
      >
        <span class="handle-bar" />
      </button>
    </div>
  </transition>
</template>

<style scoped>
.table-resize-overlay {
  z-index: 5;
}

.resize-handle {
  position: absolute;
  pointer-events: auto;
  background: none;
  border: none;
  padding: 0;
  margin: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.resize-handle--column {
  top: 0;
  height: 100%;
  width: 24px;
  transform: translateX(-50%);
  cursor: col-resize;
}

.resize-handle--row {
  left: 0;
  width: 100%;
  height: 24px;
  transform: translateY(-50%);
  cursor: row-resize;
}

.handle-bar {
  display: block;
  background: rgba(148, 163, 184, 0.8);
  backdrop-filter: blur(6px);
  border-radius: 999px;
  transition: background 0.2s ease, opacity 0.2s ease;
}

.resize-handle--column .handle-bar {
  width: 2px;
  height: 60%;
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.35);
}

.resize-handle--row .handle-bar {
  height: 2px;
  width: 60%;
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.35);
}

.resize-handle:hover .handle-bar,
.resize-handle--active .handle-bar {
  background: rgba(59, 130, 246, 0.9);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
