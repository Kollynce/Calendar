<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor.store'
import { storeToRefs } from 'pinia'
import { TrashIcon } from '@heroicons/vue/24/outline'
import ColorPicker from '../ColorPicker.vue'
import TypographyProperties from '../properties/TypographyProperties.vue'
import MonthGridProperties from '../properties/MonthGridProperties.vue'
import WeekStripProperties from '../properties/WeekStripProperties.vue'
import DateCellProperties from '../properties/DateCellProperties.vue'
import CollageProperties from '../properties/CollageProperties.vue'
import CanvasProperties from '../properties/CanvasProperties.vue'
import TableProperties from '../properties/TableProperties.vue'
import AppTierBadge from '@/components/ui/AppTierBadge.vue'
import { useAuthStore } from '@/stores'
import type {
  CanvasElementMetadata,
  CalendarGridMetadata,
  WeekStripMetadata,
  DateCellMetadata,
  ScheduleMetadata,
  ChecklistMetadata,
  PlannerNoteMetadata,
  CollageMetadata,
  PlannerHeaderStyle,
  TableMetadata,
} from '@/types'

const props = defineProps<{
  alignTarget: 'canvas' | 'selection'
}>()

const emit = defineEmits<{
  (e: 'align', direction: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'): void
  (e: 'distribute', direction: 'horizontal' | 'vertical'): void
  (e: 'update:alignTarget', value: 'canvas' | 'selection'): void
}>()

const editorStore = useEditorStore()
const authStore = useAuthStore()
const { selectedObjects } = storeToRefs(editorStore)

const isPro = computed(() => authStore.isPro)

const selectedObject = computed(() => selectedObjects.value[0])

const objectType = computed(() => {
  if (!selectedObject.value) return null
  return selectedObject.value.type
})

// Position properties
const positionX = computed({
  get: () => Math.round(((selectedObject.value as any)?.left ?? 0) as number),
  set: (value) => editorStore.updateObjectProperty('left', Number(value) || 0),
})

const positionY = computed({
  get: () => Math.round(((selectedObject.value as any)?.top ?? 0) as number),
  set: (value) => editorStore.updateObjectProperty('top', Number(value) || 0),
})

// Element metadata
const elementMetadata = computed<CanvasElementMetadata | null>(() => {
  void selectedObjects.value
  return editorStore.getActiveElementMetadata()
})

const elementSize = computed(() => {
  const meta = elementMetadata.value
  if (!meta || !('size' in meta)) return null
  return meta.size as { width: number; height: number }
})

const objectWidth = computed({
  get: () => {
    const obj = selectedObject.value as any
    if (!obj) return 100
    if (typeof obj.getScaledWidth === 'function') {
      return Math.round(obj.getScaledWidth())
    }
    return Math.round((obj.width ?? 100) * (obj.scaleX ?? 1))
  },
  set: (value) => {
    const obj = selectedObject.value as any
    if (!obj) return
    const newScale = value / (obj.width ?? 100)
    editorStore.updateObjectProperty('scaleX', newScale)
  },
})

const objectHeight = computed({
  get: () => {
    const obj = selectedObject.value as any
    if (!obj) return 100
    if (typeof obj.getScaledHeight === 'function') {
      return Math.round(obj.getScaledHeight())
    }
    return Math.round((obj.height ?? 100) * (obj.scaleY ?? 1))
  },
  set: (value) => {
    const obj = selectedObject.value as any
    if (!obj) return
    const newScale = value / (obj.height ?? 100)
    editorStore.updateObjectProperty('scaleY', newScale)
  },
})

function updateElementSize(newSize: { width: number; height: number }) {
  editorStore.updateSelectedElementMetadata((metadata) => {
    if ('size' in metadata) {
      (metadata as any).size = newSize
    }
    return metadata
  })
}

// Text properties
const textContent = computed({
  get: () => (selectedObject.value as any)?.text || '',
  set: (value) => editorStore.updateObjectProperty('text', value),
})

// Shape properties
const fillColor = computed({
  get: () => (selectedObject.value as any)?.fill || '#3b82f6',
  set: (value) => editorStore.updateObjectProperty('fill', value),
})

const strokeColor = computed({
  get: () => (selectedObject.value as any)?.stroke || '',
  set: (value) => editorStore.updateObjectProperty('stroke', value),
})

const strokeWidth = computed({
  get: () => (selectedObject.value as any)?.strokeWidth || 0,
  set: (value) => editorStore.updateObjectProperty('strokeWidth', value),
})

const cornerRadius = computed({
  get: () => (selectedObject.value as any)?.rx || 0,
  set: (value) => {
    editorStore.updateObjectProperty('rx', value)
    editorStore.updateObjectProperty('ry', value)
  },
})

// Arrow detection
const isArrow = computed(() => {
  const obj: any = selectedObject.value as any
  if (!obj) return false
  if (obj.type === 'group' && obj?.data?.shapeKind === 'arrow') return true
  if (obj.type !== 'group') return false
  const parts = (obj?._objects ?? []).map((o: any) => o?.data?.arrowPart).filter(Boolean)
  return parts.includes('line') && (parts.includes('startHead') || parts.includes('endHead'))
})

const isLineOrArrow = computed(() => {
  const obj: any = selectedObject.value as any
  return obj?.type === 'line' || isArrow.value
})

// Line/Arrow properties
const lineStrokeColor = computed({
  get: () => {
    const obj: any = selectedObject.value as any
    if (isArrow.value) return obj?.data?.arrowOptions?.stroke ?? '#000000'
    return obj?.stroke ?? '#000000'
  },
  set: (value) => editorStore.updateObjectProperty('stroke', value),
})

const lineStrokeWidth = computed({
  get: () => {
    const obj: any = selectedObject.value as any
    if (isArrow.value) return Number(obj?.data?.arrowOptions?.strokeWidth ?? 2) || 2
    return Number(obj?.strokeWidth ?? 0) || 0
  },
  set: (value) => editorStore.updateObjectProperty('strokeWidth', Number(value) || 0),
})

const lineCap = computed({
  get: () => {
    const obj: any = selectedObject.value as any
    const line = isArrow.value ? obj?._objects?.find((o: any) => o?.data?.arrowPart === 'line') : obj
    return line?.strokeLineCap ?? 'butt'
  },
  set: (value) => editorStore.updateObjectProperty('strokeLineCap', value),
})

const lineJoin = computed({
  get: () => {
    const obj: any = selectedObject.value as any
    const line = isArrow.value ? obj?._objects?.find((o: any) => o?.data?.arrowPart === 'line') : obj
    return line?.strokeLineJoin ?? 'miter'
  },
  set: (value) => editorStore.updateObjectProperty('strokeLineJoin', value),
})

const dashStyle = computed({
  get: () => {
    const obj: any = selectedObject.value as any
    const line = isArrow.value ? obj?._objects?.find((o: any) => o?.data?.arrowPart === 'line') : obj
    const dash = line?.strokeDashArray
    if (!dash || dash.length === 0) return 'solid'
    const key = JSON.stringify(dash)
    if (key === JSON.stringify([10, 8])) return 'dashed'
    if (key === JSON.stringify([2, 6])) return 'dotted'
    if (key === JSON.stringify([20, 10, 6, 10])) return 'dash-dot'
    return 'solid'
  },
  set: (value) => {
    if (value === 'solid') editorStore.updateObjectProperty('strokeDashArray', undefined)
    else if (value === 'dashed') editorStore.updateObjectProperty('strokeDashArray', [10, 8])
    else if (value === 'dotted') editorStore.updateObjectProperty('strokeDashArray', [2, 6])
    else if (value === 'dash-dot') editorStore.updateObjectProperty('strokeDashArray', [20, 10, 6, 10])
  },
})

// Arrow-specific properties
const arrowEnds = computed({
  get: () => {
    const obj: any = selectedObject.value as any
    return obj?.data?.arrowOptions?.arrowEnds ?? 'end'
  },
  set: (value) => editorStore.updateObjectProperty('arrowEnds', value),
})

const arrowHeadStyle = computed({
  get: () => {
    const obj: any = selectedObject.value as any
    return obj?.data?.arrowOptions?.arrowHeadStyle ?? 'filled'
  },
  set: (value) => editorStore.updateObjectProperty('arrowHeadStyle', value),
})

const arrowHeadLength = computed({
  get: () => {
    const obj: any = selectedObject.value as any
    return Number(obj?.data?.arrowOptions?.arrowHeadLength ?? 18) || 18
  },
  set: (value) => editorStore.updateObjectProperty('arrowHeadLength', Math.max(4, Number(value) || 4)),
})

const arrowHeadWidth = computed({
  get: () => {
    const obj: any = selectedObject.value as any
    return Number(obj?.data?.arrowOptions?.arrowHeadWidth ?? 14) || 14
  },
  set: (value) => editorStore.updateObjectProperty('arrowHeadWidth', Math.max(4, Number(value) || 4)),
})

// Common properties
const opacity = computed({
  get: () => ((selectedObject.value as any)?.opacity || 1) * 100,
  set: (value) => editorStore.updateObjectProperty('opacity', value / 100),
})

// Metadata for different element types
const calendarMetadata = computed<CalendarGridMetadata | null>(() =>
  elementMetadata.value?.kind === 'calendar-grid' ? elementMetadata.value : null,
)

const weekStripMetadata = computed<WeekStripMetadata | null>(() =>
  elementMetadata.value?.kind === 'week-strip' ? elementMetadata.value : null,
)

const dateCellMetadata = computed<DateCellMetadata | null>(() =>
  elementMetadata.value?.kind === 'date-cell' ? elementMetadata.value : null,
)

const scheduleMetadata = computed<ScheduleMetadata | null>(() =>
  elementMetadata.value?.kind === 'schedule' ? elementMetadata.value : null,
)

const checklistMetadata = computed<ChecklistMetadata | null>(() =>
  elementMetadata.value?.kind === 'checklist' ? elementMetadata.value : null,
)

const notesPanelMetadata = computed<PlannerNoteMetadata | null>(() =>
  elementMetadata.value?.kind === 'planner-note' ? elementMetadata.value : null,
)

const collageMetadata = computed<CollageMetadata | null>(() =>
  elementMetadata.value?.kind === 'collage' ? elementMetadata.value : null,
)

const tableMetadata = computed<TableMetadata | null>(() =>
  elementMetadata.value?.kind === 'table' ? elementMetadata.value : null,
)

function updateCalendarMetadata(updater: (draft: CalendarGridMetadata) => void) {
  editorStore.updateSelectedElementMetadata((metadata) => {
    if (metadata.kind !== 'calendar-grid') return null
    updater(metadata as CalendarGridMetadata)
    return metadata
  })
}

function updateWeekStripMetadata(updater: (draft: WeekStripMetadata) => void) {
  editorStore.updateSelectedElementMetadata((metadata) => {
    if (metadata.kind !== 'week-strip') return null
    updater(metadata as WeekStripMetadata)
    return metadata
  })
}

function updateDateCellMetadata(updater: (draft: DateCellMetadata) => void) {
  editorStore.updateSelectedElementMetadata((metadata) => {
    if (metadata.kind !== 'date-cell') return null
    updater(metadata as DateCellMetadata)
    return metadata
  })
}

function updateScheduleMetadata(updater: (draft: ScheduleMetadata) => void) {
  editorStore.updateSelectedElementMetadata((metadata) => {
    if (metadata.kind !== 'schedule') return null
    updater(metadata as ScheduleMetadata)
    return metadata
  })
}

function updateChecklistMetadata(updater: (draft: ChecklistMetadata) => void) {
  editorStore.updateSelectedElementMetadata((metadata) => {
    if (metadata.kind !== 'checklist') return null
    updater(metadata as ChecklistMetadata)
    return metadata
  })
}

function updateNotesPanelMetadata(updater: (draft: PlannerNoteMetadata) => void) {
  editorStore.updateSelectedElementMetadata((metadata) => {
    if (metadata.kind !== 'planner-note') return null
    updater(metadata as PlannerNoteMetadata)
    return metadata
  })
}

function updateCollageMetadata(updates: Partial<CollageMetadata>) {
  editorStore.updateActiveElementMetadata(updates)
}

function updateTableMetadata(updater: (draft: TableMetadata) => void) {
  editorStore.updateSelectedElementMetadata((metadata) => {
    if (metadata.kind !== 'table') return null
    updater(metadata as TableMetadata)
    return metadata
  })
}

const localAlignTarget = computed({
  get: () => props.alignTarget,
  set: (value) => emit('update:alignTarget', value),
})

// Options for dropdowns
const scheduleIntervalOptions = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
]

const headerStyleOptions = [
  { value: 'minimal', label: 'Minimal' },
  { value: 'tint', label: 'Tinted' },
  { value: 'solid', label: 'Solid' },
]

const titleAlignOptions = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
]

const patternVariantOptions = [
  { value: 'ruled', label: 'Lines' },
  { value: 'dot', label: 'Dots' },
  { value: 'grid', label: 'Grid' },
  { value: 'none', label: 'None' },
]
</script>

<template>
  <!-- Canvas Properties (Visible when no selection) -->
  <CanvasProperties v-if="!selectedObject" />

  <section v-else class="rounded-2xl border border-white/10 bg-white/5 backdrop-blur px-4 py-4 space-y-5">
      <!-- Object Type Header -->
    <div class="flex items-center justify-between">
      <span class="text-xs font-semibold uppercase tracking-widest text-white/60">{{ objectType }}</span>
      <button @click="editorStore.deleteSelected()" class="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors group" title="Delete">
        <TrashIcon class="w-4 h-4 text-white/50 group-hover:text-red-200" />
      </button>
    </div>

    <!-- Layout (Position & Size) -->
    <div class="space-y-3">
      <p class="text-xs font-semibold uppercase tracking-widest text-white/60">Layout</p>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">X</label>
          <input v-model.number="positionX" type="number" class="control-glass" />
        </div>
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Y</label>
          <input v-model.number="positionY" type="number" class="control-glass" />
        </div>
      </div>
      <div v-if="elementSize" class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">W</label>
          <input type="number" min="10" class="control-glass" :value="Math.round(elementSize.width)" @change="updateElementSize({ width: Number(($event.target as HTMLInputElement).value), height: elementSize.height })" />
        </div>
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">H</label>
          <input type="number" min="10" class="control-glass" :value="Math.round(elementSize.height)" @change="updateElementSize({ width: elementSize.width, height: Number(($event.target as HTMLInputElement).value) })" />
        </div>
      </div>
      <div v-else class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">W</label>
          <input v-model.number="objectWidth" type="number" min="1" class="control-glass" />
        </div>
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">H</label>
          <input v-model.number="objectHeight" type="number" min="1" class="control-glass" />
        </div>
      </div>
    </div>

    <!-- Align & Distribute -->
    <div class="pt-4 border-t border-white/10 space-y-3">
      <div class="flex items-center justify-between gap-3">
        <p class="text-xs font-semibold uppercase tracking-widest text-white/60">Align</p>
        <select v-model="localAlignTarget" class="control-glass-sm w-auto">
          <option value="canvas">To Page</option>
          <option value="selection">To Selection</option>
        </select>
      </div>
      <div class="grid grid-cols-3 gap-2">
        <button type="button" class="btn-glass-sm w-full" @click="$emit('align', 'left')">Left</button>
        <button type="button" class="btn-glass-sm w-full" @click="$emit('align', 'center')">Center</button>
        <button type="button" class="btn-glass-sm w-full" @click="$emit('align', 'right')">Right</button>
        <button type="button" class="btn-glass-sm w-full" @click="$emit('align', 'top')">Top</button>
        <button type="button" class="btn-glass-sm w-full" @click="$emit('align', 'middle')">Middle</button>
        <button type="button" class="btn-glass-sm w-full" @click="$emit('align', 'bottom')">Bottom</button>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <button type="button" class="btn-glass-sm w-full" :disabled="selectedObjects.length < 3" :class="selectedObjects.length < 3 ? 'opacity-50 cursor-not-allowed' : ''" @click="$emit('distribute', 'horizontal')">Distribute H</button>
        <button type="button" class="btn-glass-sm w-full" :disabled="selectedObjects.length < 3" :class="selectedObjects.length < 3 ? 'opacity-50 cursor-not-allowed' : ''" @click="$emit('distribute', 'vertical')">Distribute V</button>
      </div>
      <p class="text-[11px] text-white/50">Tip: single object → "To Page". Multiple → "To Selection".</p>
    </div>

    <!-- Calendar Grid Properties -->
    <MonthGridProperties v-if="calendarMetadata" :calendar-metadata="calendarMetadata" :update-calendar-metadata="updateCalendarMetadata" />

    <!-- Week Strip Properties -->
    <WeekStripProperties v-if="weekStripMetadata" :week-strip-metadata="weekStripMetadata" :update-week-strip-metadata="updateWeekStripMetadata" />

    <!-- Date Cell Properties -->
    <DateCellProperties v-if="dateCellMetadata" :date-cell-metadata="dateCellMetadata" :update-date-cell-metadata="updateDateCellMetadata" />

    <!-- Table Properties -->
    <TableProperties v-if="tableMetadata" :table-metadata="tableMetadata" :update-table-metadata="updateTableMetadata" />

    <!-- Collage Properties -->
    <template v-if="collageMetadata">
      <div 
        class="pt-4 border-t border-white/10 mb-4 transition-opacity"
        :class="{ 'opacity-60 pointer-events-none': !isPro }"
      >
        <div class="flex items-center gap-2 mb-2">
          <p class="text-xs font-semibold uppercase tracking-widest text-white/60">Photo Collage</p>
          <AppTierBadge v-if="!isPro" tier="pro" size="sm" />
        </div>
        <CollageProperties 
          :collage-metadata="collageMetadata" 
          :update-collage-metadata="updateCollageMetadata" 
          :disabled="!isPro"
        />
      </div>
    </template>

    <!-- Lines & Arrows -->
    <template v-if="isLineOrArrow">
      <div class="pt-4 border-t border-white/10 space-y-4">
        <p class="text-[11px] font-semibold text-white/60">Lines &amp; Arrows</p>
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Stroke</label>
          <ColorPicker v-model="lineStrokeColor" />
        </div>
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Stroke Width</label>
          <div class="flex items-center gap-3">
            <input v-model.number="lineStrokeWidth" type="range" min="1" max="24" class="flex-1 accent-primary-400" />
            <span class="text-xs text-white/70 w-8 text-right">{{ lineStrokeWidth }}px</span>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs font-medium text-white/60 mb-1.5 block">Dash</label>
            <select class="control-glass" :value="dashStyle" @change="dashStyle = ($event.target as HTMLSelectElement).value as any">
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
              <option value="dotted">Dotted</option>
              <option value="dash-dot">Dash-dot</option>
            </select>
          </div>
          <div>
            <label class="text-xs font-medium text-white/60 mb-1.5 block">Cap</label>
            <select class="control-glass" :value="lineCap" @change="lineCap = ($event.target as HTMLSelectElement).value">
              <option value="butt">Butt</option>
              <option value="round">Round</option>
              <option value="square">Square</option>
            </select>
          </div>
        </div>
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Join</label>
          <select class="control-glass" :value="lineJoin" @change="lineJoin = ($event.target as HTMLSelectElement).value">
            <option value="miter">Miter</option>
            <option value="round">Round</option>
            <option value="bevel">Bevel</option>
          </select>
        </div>
        <template v-if="isArrow">
          <div class="pt-3 border-t border-white/10 space-y-3">
            <p class="text-[11px] font-semibold text-white/60">Arrowhead</p>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs font-medium text-white/60 mb-1.5 block">Ends</label>
                <select class="control-glass" :value="arrowEnds" @change="arrowEnds = ($event.target as HTMLSelectElement).value">
                  <option value="end">End</option>
                  <option value="start">Start</option>
                  <option value="both">Both</option>
                  <option value="none">None</option>
                </select>
              </div>
              <div>
                <label class="text-xs font-medium text-white/60 mb-1.5 block">Style</label>
                <select class="control-glass" :value="arrowHeadStyle" @change="arrowHeadStyle = ($event.target as HTMLSelectElement).value">
                  <option value="filled">Filled</option>
                  <option value="open">Open</option>
                </select>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs font-medium text-white/60 mb-1.5 block">Length</label>
                <input v-model.number="arrowHeadLength" type="number" min="4" max="80" class="control-glass" />
              </div>
              <div>
                <label class="text-xs font-medium text-white/60 mb-1.5 block">Width</label>
                <input v-model.number="arrowHeadWidth" type="number" min="4" max="80" class="control-glass" />
              </div>
            </div>
          </div>
        </template>
      </div>
    </template>

    <!-- Text Properties -->
    <template v-if="objectType === 'textbox'">
      <div class="space-y-4">
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Content</label>
          <textarea v-model="textContent" rows="3" class="control-glass resize-none"></textarea>
        </div>
        <div class="pt-4 border-t border-white/10">
          <TypographyProperties />
        </div>
      </div>
    </template>

    <!-- Shape Properties -->
    <template v-if="objectType === 'rect' || objectType === 'circle' || objectType === 'ellipse' || objectType === 'triangle'">
      <div class="pt-4 border-t border-white/10 space-y-4">
        <p class="text-xs font-semibold uppercase tracking-widest text-white/60">Shape</p>
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Fill Color</label>
          <ColorPicker v-model="fillColor" />
        </div>
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Stroke Color</label>
          <ColorPicker v-model="strokeColor" />
        </div>
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Stroke Width</label>
          <div class="flex items-center gap-3">
            <input v-model.number="strokeWidth" type="range" min="0" max="20" class="flex-1 accent-primary-400" />
            <span class="text-xs text-white/70 w-8 text-right">{{ strokeWidth }}px</span>
          </div>
        </div>
        <div v-if="objectType === 'rect'">
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Corner Radius</label>
          <div class="flex items-center gap-3">
            <input v-model.number="cornerRadius" type="range" min="0" max="50" class="flex-1 accent-primary-400" />
            <span class="text-xs text-white/70 w-8 text-right">{{ cornerRadius }}px</span>
          </div>
        </div>
      </div>
    </template>

    <!-- Schedule Block -->
    <template v-if="scheduleMetadata">
      <div 
        class="pt-4 border-t border-white/10 space-y-4 transition-opacity"
        :class="{ 'opacity-60 pointer-events-none': !isPro }"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <p class="text-xs font-semibold uppercase tracking-widest text-white/60">Schedule</p>
            <AppTierBadge v-if="!isPro" tier="pro" size="sm" />
          </div>
          <select 
            class="control-glass-sm" 
            :value="scheduleMetadata.intervalMinutes" 
            :disabled="!isPro"
            @change="updateScheduleMetadata((draft) => { draft.intervalMinutes = Number(($event.target as HTMLSelectElement).value) as ScheduleMetadata['intervalMinutes'] })"
          >
            <option v-for="opt in scheduleIntervalOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Title</label>
          <input 
            type="text" 
            class="control-glass" 
            :value="scheduleMetadata.title" 
            :disabled="!isPro"
            @input="updateScheduleMetadata((draft) => { draft.title = ($event.target as HTMLInputElement).value })" 
          />
        </div>
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Header Style</label>
          <select 
            class="control-glass" 
            :value="scheduleMetadata.headerStyle ?? 'minimal'" 
            :disabled="!isPro"
            @change="updateScheduleMetadata((draft) => { draft.headerStyle = ($event.target as HTMLSelectElement).value as PlannerHeaderStyle })"
          >
            <option v-for="opt in headerStyleOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Title alignment</label>
          <select
            class="control-glass"
            :value="scheduleMetadata.titleAlign ?? 'left'"
            :disabled="!isPro"
            @change="updateScheduleMetadata((draft) => { draft.titleAlign = ($event.target as HTMLSelectElement).value as ScheduleMetadata['titleAlign'] })"
          >
            <option v-for="opt in titleAlignOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="flex flex-wrap items-center gap-4 text-xs text-white/80">
          <label class="flex items-center gap-2">
            <input 
              type="checkbox" 
              class="accent-primary-400" 
              :checked="scheduleMetadata.showHeader !== false" 
              :disabled="!isPro"
              @change="updateScheduleMetadata((draft) => { draft.showHeader = ($event.target as HTMLInputElement).checked })" 
            />
            <span>Show header</span>
          </label>
        </div>
        <div v-if="scheduleMetadata.showHeader !== false">
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Header height</label>
          <div class="flex items-center gap-3">
            <input
              type="range"
              min="30"
              max="100"
              step="5"
              class="flex-1 accent-primary-400"
              :value="scheduleMetadata.headerHeight ?? 50"
              :disabled="!isPro"
              @input="updateScheduleMetadata((draft) => { draft.headerHeight = Number(($event.target as HTMLInputElement).value) })"
            />
            <span class="text-xs text-white/70 w-12 text-right">{{ scheduleMetadata.headerHeight ?? 50 }}px</span>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs font-medium text-white/60 mb-1.5 block">Accent</label>
            <ColorPicker 
              :model-value="scheduleMetadata.accentColor" 
              :disabled="!isPro"
              @update:modelValue="(c) => updateScheduleMetadata((draft) => { draft.accentColor = c })" 
            />
          </div>
          <div>
            <label class="text-xs font-medium text-white/60 mb-1.5 block">Line color</label>
            <ColorPicker 
              :model-value="scheduleMetadata.lineColor ?? '#e2e8f0'" 
              :disabled="!isPro"
              @update:modelValue="(c) => updateScheduleMetadata((draft) => { draft.lineColor = c })" 
            />
          </div>
        </div>
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Line thickness</label>
          <input
            type="number"
            min="0.5"
            max="8"
            step="0.5"
            class="control-glass"
            :value="scheduleMetadata.lineWidth ?? 1"
            :disabled="!isPro"
            @change="updateScheduleMetadata((draft) => { draft.lineWidth = Math.max(0.5, Math.min(8, Number(($event.target as HTMLInputElement).value) || 1)) })"
          />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs font-medium text-white/60 mb-1.5 block">Background</label>
            <ColorPicker 
              :model-value="scheduleMetadata.backgroundColor ?? '#ffffff'" 
              :disabled="!isPro"
              @update:modelValue="(c) => updateScheduleMetadata((draft) => { draft.backgroundColor = c })" 
            />
          </div>
          <div>
            <label class="text-xs font-medium text-white/60 mb-1.5 block">Border</label>
            <ColorPicker 
              :model-value="scheduleMetadata.borderColor ?? '#e2e8f0'" 
              :disabled="!isPro"
              @update:modelValue="(c) => updateScheduleMetadata((draft) => { draft.borderColor = c })" 
            />
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-4 text-xs text-white/80">
          <label class="flex items-center gap-2">
            <input 
              type="checkbox" 
              class="accent-primary-400" 
              :checked="scheduleMetadata.showBackground !== false" 
              :disabled="!isPro"
              @change="updateScheduleMetadata((draft) => { draft.showBackground = ($event.target as HTMLInputElement).checked })" 
            />
            <span>Show background</span>
          </label>
          <label class="flex items-center gap-2">
            <input 
              type="checkbox" 
              class="accent-primary-400" 
              :checked="scheduleMetadata.showBorder !== false" 
              :disabled="!isPro"
              @change="updateScheduleMetadata((draft) => { draft.showBorder = ($event.target as HTMLInputElement).checked })" 
            />
            <span>Show border</span>
          </label>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs font-medium text-white/60 mb-1.5 block">Radius</label>
            <input 
              type="number" 
              min="0" 
              max="80" 
              class="control-glass" 
              :value="scheduleMetadata.cornerRadius ?? 22" 
              :disabled="!isPro"
              @change="updateScheduleMetadata((draft) => { draft.cornerRadius = Math.max(0, Math.min(80, Number(($event.target as HTMLInputElement).value) || 0)) })" 
            />
          </div>
          <div>
            <label class="text-xs font-medium text-white/60 mb-1.5 block">Border Width</label>
            <input 
              type="number" 
              min="0" 
              max="10" 
              class="control-glass" 
              :value="scheduleMetadata.borderWidth ?? 1" 
              :disabled="!isPro"
              @change="updateScheduleMetadata((draft) => { draft.borderWidth = Math.max(0, Math.min(10, Number(($event.target as HTMLInputElement).value) || 0)) })" 
            />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs font-medium text-white/60 mb-1.5 block">Start Hour</label>
            <input 
              type="number" 
              min="0" 
              max="23" 
              class="control-glass" 
              :value="scheduleMetadata.startHour" 
              :disabled="!isPro"
              @change="updateScheduleMetadata((draft) => { draft.startHour = Math.max(0, Math.min(23, Number(($event.target as HTMLInputElement).value) || draft.startHour)) })" 
            />
          </div>
          <div>
            <label class="text-xs font-medium text-white/60 mb-1.5 block">End Hour</label>
            <input 
              type="number" 
              min="0" 
              max="23" 
              class="control-glass" 
              :value="scheduleMetadata.endHour" 
              :disabled="!isPro"
              @change="updateScheduleMetadata((draft) => { draft.endHour = Math.max(0, Math.min(23, Number(($event.target as HTMLInputElement).value) || draft.endHour)) })" 
            />
          </div>
        </div>
      </div>
    </template>


    <!-- Checklist Block -->
    <template v-if="checklistMetadata">
      <div 
        class="pt-4 border-t border-white/10 space-y-4 transition-opacity"
        :class="{ 'opacity-60 pointer-events-none': !isPro }"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <p class="text-xs font-semibold uppercase tracking-widest text-white/60">Checklist</p>
            <AppTierBadge v-if="!isPro" tier="pro" size="sm" />
          </div>
        </div>
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Title</label>
          <input 
            type="text" 
            class="control-glass" 
            :value="checklistMetadata.title" 
            :disabled="!isPro"
            @input="updateChecklistMetadata((draft) => { draft.title = ($event.target as HTMLInputElement).value })" 
          />
        </div>
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Header Style</label>
          <select 
            class="control-glass" 
            :value="checklistMetadata.headerStyle ?? 'tint'" 
            :disabled="!isPro"
            @change="updateChecklistMetadata((draft) => { draft.headerStyle = ($event.target as HTMLSelectElement).value as PlannerHeaderStyle })"
          >
            <option v-for="opt in headerStyleOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Title alignment</label>
          <select
            class="control-glass"
            :value="checklistMetadata.titleAlign ?? 'left'"
            :disabled="!isPro"
            @change="updateChecklistMetadata((draft) => { draft.titleAlign = ($event.target as HTMLSelectElement).value as ChecklistMetadata['titleAlign'] })"
          >
            <option v-for="opt in titleAlignOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="flex flex-wrap items-center gap-4 text-xs text-white/80">
          <label class="flex items-center gap-2">
            <input 
              type="checkbox" 
              class="accent-primary-400" 
              :checked="checklistMetadata.showHeader !== false" 
              :disabled="!isPro"
              @change="updateChecklistMetadata((draft) => { draft.showHeader = ($event.target as HTMLInputElement).checked })" 
            />
            <span>Show header</span>
          </label>
        </div>
        <div v-if="checklistMetadata.showHeader !== false">
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Header height</label>
          <div class="flex items-center gap-3">
            <input
              type="range"
              min="30"
              max="100"
              step="5"
              class="flex-1 accent-primary-400"
              :value="checklistMetadata.headerHeight ?? 50"
              :disabled="!isPro"
              @input="updateChecklistMetadata((draft) => { draft.headerHeight = Number(($event.target as HTMLInputElement).value) })"
            />
            <span class="text-xs text-white/70 w-12 text-right">{{ checklistMetadata.headerHeight ?? 50 }}px</span>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs font-medium text-white/60 mb-1.5 block">Accent</label>
            <ColorPicker 
              :model-value="checklistMetadata.accentColor" 
              :disabled="!isPro"
              @update:modelValue="(c) => updateChecklistMetadata((draft) => { draft.accentColor = c })" 
            />
          </div>
          <div>
            <label class="text-xs font-medium text-white/60 mb-1.5 block">Checkbox</label>
            <ColorPicker 
              :model-value="checklistMetadata.checkboxColor ?? checklistMetadata.accentColor" 
              :disabled="!isPro"
              @update:modelValue="(c) => updateChecklistMetadata((draft) => { draft.checkboxColor = c })" 
            />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs font-medium text-white/60 mb-1.5 block">Line color</label>
            <ColorPicker 
              :model-value="checklistMetadata.lineColor ?? '#e2e8f0'" 
              :disabled="!isPro"
              @update:modelValue="(c) => updateChecklistMetadata((draft) => { draft.lineColor = c })" 
            />
          </div>
          <div>
            <label class="text-xs font-medium text-white/60 mb-1.5 block">Line thickness</label>
            <input 
              type="number" 
              min="0.5" 
              max="8" 
              step="0.5"
              class="control-glass" 
              :value="checklistMetadata.lineWidth ?? 1" 
              :disabled="!isPro"
              @change="updateChecklistMetadata((draft) => { draft.lineWidth = Math.max(0.5, Math.min(8, Number(($event.target as HTMLInputElement).value) || 1)) })" 
            />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-white/60 font-medium mb-1.5 block">Background</label>
            <ColorPicker 
              :model-value="checklistMetadata.backgroundColor ?? '#ffffff'" 
              :disabled="!isPro"
              @update:modelValue="(c) => updateChecklistMetadata((draft) => { draft.backgroundColor = c })" 
            />
          </div>
          <div>
            <label class="text-xs font-medium text-white/60 mb-1.5 block">Border</label>
            <ColorPicker 
              :model-value="checklistMetadata.borderColor ?? '#e2e8f0'" 
              :disabled="!isPro"
              @update:modelValue="(c) => updateChecklistMetadata((draft) => { draft.borderColor = c })" 
            />
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-4 text-xs text-white/80">
          <label class="flex items-center gap-2">
            <input 
              type="checkbox" 
              class="accent-primary-400" 
              :checked="checklistMetadata.showBackground !== false" 
              :disabled="!isPro"
              @change="updateChecklistMetadata((draft) => { draft.showBackground = ($event.target as HTMLInputElement).checked })" 
            />
            <span>Show background</span>
          </label>
          <label class="flex items-center gap-2">
            <input 
              type="checkbox" 
              class="accent-primary-400" 
              :checked="checklistMetadata.showBorder !== false" 
              :disabled="!isPro"
              @change="updateChecklistMetadata((draft) => { draft.showBorder = ($event.target as HTMLInputElement).checked })" 
            />
            <span>Show border</span>
          </label>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs font-medium text-white/60 mb-1.5 block">Radius</label>
            <input 
              type="number" 
              min="0" 
              max="80" 
              class="control-glass" 
              :value="checklistMetadata.cornerRadius ?? 22" 
              :disabled="!isPro"
              @change="updateChecklistMetadata((draft) => { draft.cornerRadius = Math.max(0, Math.min(80, Number(($event.target as HTMLInputElement).value) || 0)) })" 
            />
          </div>
          <div>
            <label class="text-xs font-medium text-white/60 mb-1.5 block">Border Width</label>
            <input 
              type="number" 
              min="0" 
              max="10" 
              class="control-glass" 
              :value="checklistMetadata.borderWidth ?? 1" 
              :disabled="!isPro"
              @change="updateChecklistMetadata((draft) => { draft.borderWidth = Math.max(0, Math.min(10, Number(($event.target as HTMLInputElement).value) || 0)) })" 
            />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs font-medium text-white/60 mb-1.5 block">Rows</label>
            <input 
              type="number" 
              min="1" 
              max="30" 
              class="control-glass" 
              :value="checklistMetadata.rows" 
              :disabled="!isPro"
              @change="updateChecklistMetadata((draft) => { draft.rows = Math.max(1, Math.min(30, Number(($event.target as HTMLInputElement).value) || draft.rows)) })" 
            />
          </div>
          <div class="flex items-end">
            <label class="flex items-center gap-2 text-sm text-white/80">
              <input 
                type="checkbox" 
                class="accent-primary-400" 
                :checked="checklistMetadata.showCheckboxes" 
                :disabled="!isPro"
                @change="updateChecklistMetadata((draft) => { draft.showCheckboxes = ($event.target as HTMLInputElement).checked })" 
              />
              <span>Checkboxes</span>
            </label>
          </div>
        </div>
      </div>
    </template>


    <!-- Notes Block -->
    <template v-if="notesPanelMetadata">
      <div 
        class="pt-4 border-t border-white/10 space-y-4 transition-opacity"
        :class="{ 'opacity-60 pointer-events-none': !isPro }"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <p class="text-xs font-semibold uppercase tracking-widest text-white/60">Notes</p>
            <AppTierBadge v-if="!isPro" tier="pro" size="sm" />
          </div>
          <select 
            class="control-glass-sm" 
            :value="notesPanelMetadata.pattern" 
            :disabled="!isPro"
            @change="updateNotesPanelMetadata((draft) => { draft.pattern = ($event.target as HTMLSelectElement).value as any })"
          >
            <option v-for="opt in patternVariantOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Title</label>
          <input 
            type="text" 
            class="control-glass" 
            :value="notesPanelMetadata.title" 
            :disabled="!isPro"
            @input="updateNotesPanelMetadata((draft) => { draft.title = ($event.target as HTMLInputElement).value })" 
          />
        </div>
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Header Style</label>
          <select 
            class="control-glass" 
            :value="notesPanelMetadata.headerStyle ?? (notesPanelMetadata.pattern === 'hero' ? 'filled' : 'minimal')" 
            :disabled="!isPro"
            @change="updateNotesPanelMetadata((draft) => { draft.headerStyle = ($event.target as HTMLSelectElement).value as PlannerHeaderStyle })"
          >
            <option v-for="opt in headerStyleOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Title alignment</label>
          <select
            class="control-glass"
            :value="notesPanelMetadata.titleAlign ?? 'left'"
            :disabled="!isPro"
            @change="updateNotesPanelMetadata((draft) => { draft.titleAlign = ($event.target as HTMLSelectElement).value as PlannerNoteMetadata['titleAlign'] })"
          >
            <option v-for="opt in titleAlignOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="flex flex-wrap items-center gap-4 text-xs text-white/80">
          <label class="flex items-center gap-2">
            <input 
              type="checkbox" 
              class="accent-primary-400" 
              :checked="notesPanelMetadata.showHeader !== false" 
              :disabled="!isPro"
              @change="updateNotesPanelMetadata((draft) => { draft.showHeader = ($event.target as HTMLInputElement).checked })" 
            />
            <span>Show header</span>
          </label>
        </div>
        <div v-if="notesPanelMetadata.showHeader !== false">
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Header height</label>
          <div class="flex items-center gap-3">
            <input
              type="range"
              min="30"
              max="100"
              step="5"
              class="flex-1 accent-primary-400"
              :value="notesPanelMetadata.headerHeight ?? 50"
              :disabled="!isPro"
              @input="updateNotesPanelMetadata((draft) => { draft.headerHeight = Number(($event.target as HTMLInputElement).value) })"
            />
            <span class="text-xs text-white/70 w-12 text-right">{{ notesPanelMetadata.headerHeight ?? 50 }}px</span>
          </div>
        </div>
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Accent</label>
          <ColorPicker 
            :model-value="notesPanelMetadata.accentColor" 
            :disabled="!isPro"
            @update:modelValue="(c) => updateNotesPanelMetadata((draft) => { draft.accentColor = c })" 
          />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs font-medium text-white/60 mb-1.5 block">Guide color</label>
            <ColorPicker 
              :model-value="notesPanelMetadata.guideColor ?? '#e2e8f0'" 
              :disabled="!isPro"
              @update:modelValue="(c) => updateNotesPanelMetadata((draft) => { draft.guideColor = c })" 
            />
          </div>
          <div>
            <label class="text-xs font-medium text-white/60 mb-1.5 block">Guide thickness</label>
            <input 
              type="number" 
              min="0.5" 
              max="8" 
              step="0.5"
              class="control-glass" 
              :value="notesPanelMetadata.guideWidth ?? 1" 
              :disabled="!isPro"
              @change="updateNotesPanelMetadata((draft) => { draft.guideWidth = Math.max(0.5, Math.min(8, Number(($event.target as HTMLInputElement).value) || 1)) })" 
            />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs font-medium text-white/60 mb-1.5 block">Background</label>
            <ColorPicker 
              :model-value="notesPanelMetadata.backgroundColor ?? '#ffffff'" 
              :disabled="!isPro"
              @update:modelValue="(c) => updateNotesPanelMetadata((draft) => { draft.backgroundColor = c })" 
            />
          </div>
          <div>
            <label class="text-xs font-medium text-white/60 mb-1.5 block">Border</label>
            <ColorPicker 
              :model-value="notesPanelMetadata.borderColor ?? '#e2e8f0'" 
              :disabled="!isPro"
              @update:modelValue="(c) => updateNotesPanelMetadata((draft) => { draft.borderColor = c })" 
            />
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-4 text-xs text-white/80">
          <label class="flex items-center gap-2">
            <input 
              type="checkbox" 
              class="accent-primary-400" 
              :checked="notesPanelMetadata.showBackground !== false" 
              :disabled="!isPro"
              @change="updateNotesPanelMetadata((draft) => { draft.showBackground = ($event.target as HTMLInputElement).checked })" 
            />
            <span>Show background</span>
          </label>
          <label class="flex items-center gap-2">
            <input 
              type="checkbox" 
              class="accent-primary-400" 
              :checked="notesPanelMetadata.showBorder !== false" 
              :disabled="!isPro"
              @change="updateNotesPanelMetadata((draft) => { draft.showBorder = ($event.target as HTMLInputElement).checked })" 
            />
            <span>Show border</span>
          </label>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs font-medium text-white/60 mb-1.5 block">Radius</label>
            <input 
              type="number" 
              min="0" 
              max="80" 
              class="control-glass" 
              :value="notesPanelMetadata.cornerRadius ?? 22" 
              :disabled="!isPro"
              @change="updateNotesPanelMetadata((draft) => { draft.cornerRadius = Math.max(0, Math.min(80, Number(($event.target as HTMLInputElement).value) || 0)) })" 
            />
          </div>
          <div>
            <label class="text-xs font-medium text-white/60 mb-1.5 block">Border Width</label>
            <input 
              type="number" 
              min="0" 
              max="10" 
              class="control-glass" 
              :value="notesPanelMetadata.borderWidth ?? 1" 
              :disabled="!isPro"
              @change="updateNotesPanelMetadata((draft) => { draft.borderWidth = Math.max(0, Math.min(10, Number(($event.target as HTMLInputElement).value) || 0)) })" 
            />
          </div>
        </div>
      </div>
    </template>


    <!-- Common Properties (Opacity & Layer Order) -->
    <div class="pt-4 border-t border-white/10 space-y-4">
      <div>
        <label class="text-xs font-medium text-white/60 mb-1.5 block">Opacity</label>
        <div class="flex items-center gap-3">
          <input v-model.number="opacity" type="range" min="0" max="100" class="flex-1 accent-primary-400" />
          <span class="text-xs text-white/70 w-10 text-right">{{ Math.round(opacity) }}%</span>
        </div>
      </div>
      <div>
        <label class="text-xs font-medium text-white/60 mb-2 block">Layer Order</label>
        <div class="grid grid-cols-2 gap-2">
          <button @click="editorStore.bringToFront()" class="btn-glass-sm w-full">Bring Front</button>
          <button @click="editorStore.sendToBack()" class="btn-glass-sm w-full">Send Back</button>
        </div>
      </div>
    </div>
  </section>
</template>
