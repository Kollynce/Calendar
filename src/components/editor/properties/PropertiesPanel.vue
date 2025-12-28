<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor.store'
import { storeToRefs } from 'pinia'
import { TrashIcon } from '@heroicons/vue/24/outline'
import ColorPicker from '../ColorPicker.vue'
import TypographyProperties from './TypographyProperties.vue'
import MonthGridProperties from './MonthGridProperties.vue'
import WeekStripProperties from './WeekStripProperties.vue'
import DateCellProperties from './DateCellProperties.vue'
import CollageProperties from './CollageProperties.vue'
import CanvasProperties from './CanvasProperties.vue'
import type { CanvasElementMetadata, CalendarGridMetadata, WeekStripMetadata, DateCellMetadata, CollageMetadata } from '@/types'

const props = defineProps<{
  alignTarget: 'canvas' | 'selection'
}>()

const emit = defineEmits<{
  (e: 'align', direction: string): void
  (e: 'distribute', direction: string): void
  (e: 'update:alignTarget', value: 'canvas' | 'selection'): void
}>()

const editorStore = useEditorStore()
const { selectedObjects, hasSelection } = storeToRefs(editorStore)

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

// Size properties
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
  editorStore.updateActiveElementMetadata({ size: newSize })
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

// Metadata
const calendarMetadata = computed<CalendarGridMetadata | null>(() =>
  elementMetadata.value?.kind === 'calendar-grid' ? elementMetadata.value : null,
)

const weekStripMetadata = computed<WeekStripMetadata | null>(() =>
  elementMetadata.value?.kind === 'week-strip' ? elementMetadata.value : null,
)

const dateCellMetadata = computed<DateCellMetadata | null>(() =>
  elementMetadata.value?.kind === 'date-cell' ? elementMetadata.value : null,
)

const collageMetadata = computed<CollageMetadata | null>(() =>
  elementMetadata.value?.kind === 'collage' ? elementMetadata.value : null,
)

function updateCalendarMetadata(updates: Partial<CalendarGridMetadata>) {
  editorStore.updateActiveElementMetadata(updates)
}

function updateWeekStripMetadata(updates: Partial<WeekStripMetadata>) {
  editorStore.updateActiveElementMetadata(updates)
}

function updateDateCellMetadata(updates: Partial<DateCellMetadata>) {
  editorStore.updateActiveElementMetadata(updates)
}

function updateCollageMetadata(updates: Partial<CollageMetadata>) {
  editorStore.updateActiveElementMetadata(updates)
}

const localAlignTarget = computed({
  get: () => props.alignTarget,
  set: (value) => emit('update:alignTarget', value),
})
</script>

<template>
  <div class="space-y-5">
    <!-- Canvas Properties (Visible when no selection) -->
    <CanvasProperties v-if="!hasSelection" />

    <template v-else>
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

    <!-- Collage Properties -->
    <CollageProperties v-if="collageMetadata" :collage-metadata="collageMetadata" :update-collage-metadata="updateCollageMetadata" />

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
            <input v-model.number="lineStrokeWidth" type="range" min="1" max="20" class="flex-1 accent-primary-400" />
            <span class="text-xs text-white/70 w-8 text-right">{{ lineStrokeWidth }}px</span>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs font-medium text-white/60 mb-1.5 block">Dash</label>
            <select v-model="dashStyle" class="control-glass-sm w-full">
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
              <option value="dotted">Dotted</option>
              <option value="dash-dot">Dash-dot</option>
            </select>
          </div>
          <div>
            <label class="text-xs font-medium text-white/60 mb-1.5 block">Cap</label>
            <select v-model="lineCap" class="control-glass-sm w-full">
              <option value="butt">Butt</option>
              <option value="round">Round</option>
              <option value="square">Square</option>
            </select>
          </div>
        </div>
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Join</label>
          <select v-model="lineJoin" class="control-glass-sm w-full">
            <option value="miter">Miter</option>
            <option value="round">Round</option>
            <option value="bevel">Bevel</option>
          </select>
        </div>
        <template v-if="isArrow">
          <div class="pt-2 space-y-3">
            <p class="text-[11px] font-semibold text-white/60">Arrowhead</p>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs font-medium text-white/60 mb-1.5 block">Ends</label>
                <select v-model="arrowEnds" class="control-glass-sm w-full">
                  <option value="end">End</option>
                  <option value="start">Start</option>
                  <option value="both">Both</option>
                  <option value="none">None</option>
                </select>
              </div>
              <div>
                <label class="text-xs font-medium text-white/60 mb-1.5 block">Style</label>
                <select v-model="arrowHeadStyle" class="control-glass-sm w-full">
                  <option value="filled">Filled</option>
                  <option value="open">Open</option>
                </select>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs font-medium text-white/60 mb-1.5 block">Length</label>
                <input v-model.number="arrowHeadLength" type="number" min="4" max="50" class="control-glass" />
              </div>
              <div>
                <label class="text-xs font-medium text-white/60 mb-1.5 block">Width</label>
                <input v-model.number="arrowHeadWidth" type="number" min="4" max="50" class="control-glass" />
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

    <!-- Shape Properties (Rectangle, Circle, Ellipse, Triangle) -->
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

    <!-- Common Properties -->
    <template class="pt-4 border-t border-white/10 space-y-4">
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
    </template>
  </div>
</template>
