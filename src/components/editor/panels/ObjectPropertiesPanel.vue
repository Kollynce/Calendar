<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor.store'
import { storeToRefs } from 'pinia'
import { TrashIcon } from '@heroicons/vue/24/outline'
import ColorPicker from '@/components/editor/ColorPicker.vue'
import MonthGridProperties from '@/components/editor/properties/MonthGridProperties.vue'
import WeekStripProperties from '@/components/editor/properties/WeekStripProperties.vue'
import DateCellProperties from '@/components/editor/properties/DateCellProperties.vue'
import TypographyProperties from '@/components/editor/properties/TypographyProperties.vue'
import type {
  CanvasElementMetadata,
  CalendarGridMetadata,
  WeekStripMetadata,
  DateCellMetadata,
  PlannerNoteMetadata,
  PlannerPatternVariant,
  PlannerHeaderStyle,
  ScheduleMetadata,
  ChecklistMetadata,
  TableMetadata,
} from '@/types'

const props = defineProps<{
  alignTarget: 'canvas' | 'selection'
}>()

const emit = defineEmits<{
  (e: 'update:alignTarget', value: 'canvas' | 'selection'): void
  (e: 'align', action: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'): void
  (e: 'distribute', axis: 'horizontal' | 'vertical'): void
}>()

const editorStore = useEditorStore()
const { selectedObjects, hasSelection } = storeToRefs(editorStore)

const scheduleIntervalOptions: { value: ScheduleMetadata['intervalMinutes']; label: string }[] = [
  { value: 30, label: '30 min' },
  { value: 60, label: '60 min' },
]

const headerStyleOptions: { value: PlannerHeaderStyle; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'tint', label: 'Tint' },
  { value: 'filled', label: 'Filled' },
]

const titleAlignOptions = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
]

const plannerPatternOptions: { value: PlannerPatternVariant; label: string }[] = [
  { value: 'hero', label: 'Hero Banner' },
  { value: 'ruled', label: 'Ruled Lines' },
  { value: 'grid', label: 'Grid' },
  { value: 'dot', label: 'Dot Grid' },
]

const selectedObject = computed(() => selectedObjects.value[0])
const objectType = computed(() => selectedObject.value?.type ?? null)

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

function isColorVisible(value: any): boolean {
  if (!value) return false
  const normalized = String(value).toLowerCase()
  return !['transparent', 'rgba(0,0,0,0)', 'rgb(0,0,0,0)', 'none'].includes(normalized)
}

function updateShapeData(patch: Record<string, any>) {
  const obj = selectedObject.value as any
  if (!obj) return
  const nextData = { ...(obj.data ?? {}), ...patch }
  editorStore.updateObjectProperty('data', nextData)
}

const shapeFillVisible = computed(() => {
  const obj = selectedObject.value as any
  if (!obj) return true
  return isColorVisible(obj.fill ?? '#3b82f6')
})

function toggleShapeFillVisibility(next: boolean) {
  const obj = selectedObject.value as any
  if (!obj) return
  if (next) {
    const fallback =
      (obj.data?._lastFillColor && isColorVisible(obj.data._lastFillColor))
        ? obj.data._lastFillColor
        : '#3b82f6'
    editorStore.updateObjectProperty('fill', fallback)
  } else {
    const currentFill = obj.fill
    if (isColorVisible(currentFill)) {
      updateShapeData({ _lastFillColor: currentFill })
    }
    editorStore.updateObjectProperty('fill', 'transparent')
  }
}

const shapeStrokeVisible = computed(() => {
  const obj = selectedObject.value as any
  if (!obj) return true
  const width = Number(obj.strokeWidth ?? 0)
  return width > 0 && isColorVisible(obj.stroke ?? '#000000')
})

function toggleShapeStrokeVisibility(next: boolean) {
  const obj = selectedObject.value as any
  if (!obj) return
  if (next) {
    const fallbackColor =
      (obj.data?._lastStrokeColor && isColorVisible(obj.data._lastStrokeColor))
        ? obj.data._lastStrokeColor
        : '#0f172a'
    const fallbackWidth = Number(obj.data?._lastStrokeWidth ?? 2) || 2
    editorStore.updateObjectProperty('stroke', fallbackColor)
    editorStore.updateObjectProperty('strokeWidth', Math.max(1, fallbackWidth))
  } else {
    const currentStroke = obj.stroke
    const currentWidth = Number(obj.strokeWidth ?? 0)
    const patch: Record<string, any> = {}
    if (isColorVisible(currentStroke)) patch._lastStrokeColor = currentStroke
    if (currentWidth > 0) patch._lastStrokeWidth = currentWidth
    if (Object.keys(patch).length) {
      updateShapeData(patch)
    }
    editorStore.updateObjectProperty('strokeWidth', 0)
  }
}

// Line/Arrow detection
const isArrow = computed(() => {
  const obj: any = selectedObject.value
  if (!obj) return false
  if (obj.type === 'group' && obj?.data?.shapeKind === 'arrow') return true
  if (obj.type !== 'group') return false
  const parts = (obj?._objects ?? []).map((o: any) => o?.data?.arrowPart).filter(Boolean)
  return parts.includes('line') && (parts.includes('startHead') || parts.includes('endHead'))
})
const isLineOrArrow = computed(() => {
  const obj: any = selectedObject.value
  return obj?.type === 'line' || isArrow.value
})

const lineStrokeColor = computed({
  get: () => {
    const obj: any = selectedObject.value
    if (isArrow.value) return obj?.data?.arrowOptions?.stroke ?? '#000000'
    return obj?.stroke ?? '#000000'
  },
  set: (value) => editorStore.updateObjectProperty('stroke', value),
})
const lineStrokeWidth = computed({
  get: () => {
    const obj: any = selectedObject.value
    if (isArrow.value) return Number(obj?.data?.arrowOptions?.strokeWidth ?? 2) || 2
    return Number(obj?.strokeWidth ?? 0) || 0
  },
  set: (value) => editorStore.updateObjectProperty('strokeWidth', Number(value) || 0),
})
const lineCap = computed({
  get: () => {
    const obj: any = selectedObject.value
    const line = isArrow.value ? obj?._objects?.find((o: any) => o?.data?.arrowPart === 'line') : obj
    return line?.strokeLineCap ?? 'butt'
  },
  set: (value) => editorStore.updateObjectProperty('strokeLineCap', value),
})
const lineJoin = computed({
  get: () => {
    const obj: any = selectedObject.value
    const line = isArrow.value ? obj?._objects?.find((o: any) => o?.data?.arrowPart === 'line') : obj
    return line?.strokeLineJoin ?? 'miter'
  },
  set: (value) => editorStore.updateObjectProperty('strokeLineJoin', value),
})
const dashStyle = computed({
  get: () => {
    const obj: any = selectedObject.value
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
const arrowEnds = computed({
  get: () => (selectedObject.value as any)?.data?.arrowOptions?.arrowEnds ?? 'end',
  set: (value) => editorStore.updateObjectProperty('arrowEnds', value),
})
const arrowHeadStyle = computed({
  get: () => (selectedObject.value as any)?.data?.arrowOptions?.arrowHeadStyle ?? 'filled',
  set: (value) => editorStore.updateObjectProperty('arrowHeadStyle', value),
})
const arrowHeadLength = computed({
  get: () => Number((selectedObject.value as any)?.data?.arrowOptions?.arrowHeadLength ?? 18) || 18,
  set: (value) => editorStore.updateObjectProperty('arrowHeadLength', Math.max(4, Number(value) || 4)),
})
const arrowHeadWidth = computed({
  get: () => Number((selectedObject.value as any)?.data?.arrowOptions?.arrowHeadWidth ?? 14) || 14,
  set: (value) => editorStore.updateObjectProperty('arrowHeadWidth', Math.max(4, Number(value) || 4)),
})

// Common properties
const opacity = computed({
  get: () => ((selectedObject.value as any)?.opacity || 1) * 100,
  set: (value) => editorStore.updateObjectProperty('opacity', value / 100),
})
const positionX = computed({
  get: () => Math.round(((selectedObject.value as any)?.left ?? 0) as number),
  set: (value) => editorStore.updateObjectProperty('left', Number(value) || 0),
})
const positionY = computed({
  get: () => Math.round(((selectedObject.value as any)?.top ?? 0) as number),
  set: (value) => editorStore.updateObjectProperty('top', Number(value) || 0),
})
const objectWidth = computed({
  get: () => selectedObject.value ? Math.round(selectedObject.value.getScaledWidth()) : 0,
  set: (value) => {
    if (!selectedObject.value) return
    const target = Math.max(1, Number(value) || 1)
    const base = (selectedObject.value as any).width || selectedObject.value.getScaledWidth() || 1
    editorStore.updateObjectProperty('scaleX', target / base)
  },
})
const objectHeight = computed({
  get: () => selectedObject.value ? Math.round(selectedObject.value.getScaledHeight()) : 0,
  set: (value) => {
    if (!selectedObject.value) return
    const target = Math.max(1, Number(value) || 1)
    const base = (selectedObject.value as any).height || selectedObject.value.getScaledHeight() || 1
    editorStore.updateObjectProperty('scaleY', target / base)
  },
})

// Element metadata
const elementMetadata = computed<CanvasElementMetadata | null>(() => {
  void selectedObjects.value
  return editorStore.getActiveElementMetadata()
})
const calendarMetadata = computed<CalendarGridMetadata | null>(() => elementMetadata.value?.kind === 'calendar-grid' ? elementMetadata.value : null)
const weekStripMetadata = computed<WeekStripMetadata | null>(() => elementMetadata.value?.kind === 'week-strip' ? elementMetadata.value : null)
const dateCellMetadata = computed<DateCellMetadata | null>(() => elementMetadata.value?.kind === 'date-cell' ? elementMetadata.value : null)
const scheduleMetadata = computed<ScheduleMetadata | null>(() => elementMetadata.value?.kind === 'schedule' ? elementMetadata.value : null)
const checklistMetadata = computed<ChecklistMetadata | null>(() => elementMetadata.value?.kind === 'checklist' ? elementMetadata.value : null)
const plannerNoteMetadata = computed<PlannerNoteMetadata | null>(() => elementMetadata.value?.kind === 'planner-note' ? elementMetadata.value : null)
const elementSize = computed(() => {
  const meta = elementMetadata.value as any
  return meta?.size ? meta.size as { width: number; height: number } : null
})

// Metadata update functions
function updateScheduleMetadata(updater: (draft: ScheduleMetadata) => void) {
  editorStore.updateSelectedElementMetadata((metadata: any) => {
    if (metadata.kind !== 'schedule') return null
    updater(metadata)
    return metadata
  })
}
function updateChecklistMetadata(updater: (draft: ChecklistMetadata) => void) {
  editorStore.updateSelectedElementMetadata((metadata: any) => {
    if (metadata.kind !== 'checklist') return null
    updater(metadata)
    return metadata
  })
}
function updatePlannerMetadata(updater: (draft: PlannerNoteMetadata) => void) {
  editorStore.updateSelectedElementMetadata((metadata: any) => {
    if (metadata.kind !== 'planner-note') return null
    updater(metadata)
    return metadata
  })
}
function updateCalendarMetadata(updater: (draft: CalendarGridMetadata) => void) {
  editorStore.updateSelectedElementMetadata((metadata: any) => {
    if (metadata.kind !== 'calendar-grid') return null
    updater(metadata)
    return metadata
  })
}
function updateWeekStripMetadata(updater: (draft: WeekStripMetadata) => void) {
  editorStore.updateSelectedElementMetadata((metadata: any) => {
    if (metadata.kind !== 'week-strip') return null
    updater(metadata)
    return metadata
  })
}
function updateDateCellMetadata(updater: (draft: DateCellMetadata) => void) {
  editorStore.updateSelectedElementMetadata((metadata: any) => {
    if (metadata.kind !== 'date-cell') return null
    updater(metadata)
    return metadata
  })
}
function updateElementSize(next: { width: number; height: number }) {
  editorStore.updateSelectedElementMetadata((metadata: any) => {
    if (!metadata.size) return null
    metadata.size.width = Math.max(10, Number(next.width) || metadata.size.width)
    metadata.size.height = Math.max(10, Number(next.height) || metadata.size.height)
    return metadata
  })
}

const localAlignTarget = computed({
  get: () => props.alignTarget,
  set: (value) => emit('update:alignTarget', value),
})

const BASIC_SHAPE_TYPES = ['rect', 'circle', 'ellipse', 'triangle']
const METADATA_APPEARANCE_CAPABILITIES: Partial<
  Record<
    CanvasElementMetadata['kind'],
    {
      background: boolean
      border: boolean
    }
  >
> = {
  'planner-note': { background: true, border: true },
  schedule: { background: true, border: true },
  checklist: { background: true, border: true },
  table: { background: true, border: true },
  collage: { background: true, border: true },
}

type AppearanceSource = 'shape' | 'metadata'
interface AppearanceControls {
  source: AppearanceSource
  hasBackground: boolean
  hasBorder: boolean
  showBackground?: boolean
  showBorder?: boolean
  metadataKind?: CanvasElementMetadata['kind']
}

const appearanceControls = computed<AppearanceControls | null>(() => {
  const obj = selectedObject.value as any
  if (!obj) return null

  if (BASIC_SHAPE_TYPES.includes(obj.type)) {
    return {
      source: 'shape',
      hasBackground: true,
      hasBorder: true,
      showBackground: shapeFillVisible.value,
      showBorder: shapeStrokeVisible.value,
    }
  }

  const metadata = elementMetadata.value
  if (!metadata) return null

  const excludedKinds: CanvasElementMetadata['kind'][] = ['calendar-grid', 'week-strip', 'date-cell']
  if (excludedKinds.includes(metadata.kind)) {
    return null
  }

  const capabilities = METADATA_APPEARANCE_CAPABILITIES[metadata.kind]
  if (!capabilities) return null

  const hasBackground = capabilities.background
  const hasBorder = capabilities.border

  return {
    source: 'metadata',
    hasBackground,
    hasBorder,
    showBackground: hasBackground ? (metadata as any).showBackground !== false : undefined,
    showBorder: hasBorder ? (metadata as any).showBorder !== false : undefined,
    metadataKind: metadata.kind,
  }
})

function updateTableOuterFrame(metadata: TableMetadata) {
  metadata.showOuterFrame =
    (metadata.showBackground !== false) || (metadata.showBorder !== false)
}

function setAppearanceToggle(target: 'background' | 'border', value: boolean) {
  const controls = appearanceControls.value
  if (!controls) return

  if (controls.source === 'shape') {
    if (target === 'background') {
      toggleShapeFillVisibility(value)
    } else {
      toggleShapeStrokeVisibility(value)
    }
    return
  }

  editorStore.updateSelectedElementMetadata((metadata: any) => {
    if (!metadata || (!('showBackground' in metadata) && !('showBorder' in metadata))) {
      return null
    }

    if (target === 'background' && controls.hasBackground) {
      metadata.showBackground = value
    }

    if (target === 'border' && controls.hasBorder) {
      metadata.showBorder = value
    }

    if (metadata.kind === 'table') {
      updateTableOuterFrame(metadata as TableMetadata)
    }

    return metadata
  })
}
</script>

<template>
  <!-- No Selection State -->
  <section
    v-if="!hasSelection"
    class="rounded-2xl border border-dashed border-white/10 bg-white/5 backdrop-blur px-6 py-8 text-center space-y-4"
  >
    <div class="w-16 h-16 mx-auto bg-white/10 rounded-3xl flex items-center justify-center text-white/60">
      <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
      </svg>
    </div>
    <div>
      <p class="text-sm font-medium text-white">Select an object to edit</p>
      <p class="text-xs text-white/60">Click any layer on the canvas or in the list below.</p>
    </div>
  </section>
  
  <!-- Properties Panel -->
  <section v-else class="rounded-2xl border border-white/10 bg-white/5 backdrop-blur px-4 py-4 space-y-5">
    <!-- Object Type -->
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

    <!-- Appearance toggles -->
    <div v-if="appearanceControls" class="pt-4 border-t border-white/10 space-y-3">
      <p class="text-xs font-semibold uppercase tracking-widest text-white/60">Appearance</p>
      <div class="flex flex-wrap items-center gap-4 text-xs text-white/80">
        <label v-if="appearanceControls.hasBackground" class="flex items-center gap-2">
          <input
            type="checkbox"
            class="accent-primary-400"
            :checked="appearanceControls.showBackground"
            @change="setAppearanceToggle('background', ($event.target as HTMLInputElement).checked)"
          />
          <span>Show background</span>
        </label>
        <label v-if="appearanceControls.hasBorder" class="flex items-center gap-2">
          <input
            type="checkbox"
            class="accent-primary-400"
            :checked="appearanceControls.showBorder"
            @change="setAppearanceToggle('border', ($event.target as HTMLInputElement).checked)"
          />
          <span>Show border</span>
        </label>
      </div>
      <p class="text-[11px] text-white/50">Toggle the fill and outline for this element.</p>
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

    <!-- Month Grid Properties -->
    <MonthGridProperties v-if="calendarMetadata" :calendar-metadata="calendarMetadata" :update-calendar-metadata="updateCalendarMetadata" />

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
        <div v-if="isArrow" class="pt-3 border-t border-white/10 space-y-3">
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
      </div>
    </template>

    <!-- Week Strip Properties -->
    <WeekStripProperties v-if="weekStripMetadata" :week-strip-metadata="weekStripMetadata" :update-week-strip-metadata="updateWeekStripMetadata" />

    <!-- Date Cell Properties -->
    <DateCellProperties v-if="dateCellMetadata" :date-cell-metadata="dateCellMetadata" :update-date-cell-metadata="updateDateCellMetadata" />

    <!-- Schedule Block -->
    <template v-if="scheduleMetadata">
      <div class="pt-4 border-t border-white/10 space-y-4">
        <div class="flex items-center justify-between">
          <p class="text-xs font-semibold uppercase tracking-widest text-white/60">Schedule</p>
          <select class="control-glass-sm" :value="scheduleMetadata.intervalMinutes" @change="updateScheduleMetadata((draft) => { draft.intervalMinutes = Number(($event.target as HTMLSelectElement).value) as ScheduleMetadata['intervalMinutes'] })">
            <option v-for="opt in scheduleIntervalOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Title</label>
          <input type="text" class="control-glass" :value="scheduleMetadata.title" @input="updateScheduleMetadata((draft) => { draft.title = ($event.target as HTMLInputElement).value })" />
        </div>
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Header Style</label>
          <select class="control-glass" :value="scheduleMetadata.headerStyle ?? 'minimal'" @change="updateScheduleMetadata((draft) => { draft.headerStyle = ($event.target as HTMLSelectElement).value as PlannerHeaderStyle })">
            <option v-for="opt in headerStyleOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Title alignment</label>
          <select
            class="control-glass"
            :value="scheduleMetadata.titleAlign ?? 'left'"
            @change="updateScheduleMetadata((draft) => { draft.titleAlign = ($event.target as HTMLSelectElement).value as ScheduleMetadata['titleAlign'] })"
          >
            <option v-for="opt in titleAlignOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs font-medium text-white/60 mb-1.5 block">Accent</label>
            <ColorPicker :model-value="scheduleMetadata.accentColor" @update:modelValue="(c: string) => updateScheduleMetadata((draft) => { draft.accentColor = c })" />
          </div>
          <div>
            <label class="text-xs font-medium text-white/60 mb-1.5 block">Line color</label>
            <ColorPicker :model-value="scheduleMetadata.lineColor ?? '#e2e8f0'" @update:modelValue="(c: string) => updateScheduleMetadata((draft) => { draft.lineColor = c })" />
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
            @change="updateScheduleMetadata((draft) => { draft.lineWidth = Math.max(0.5, Math.min(8, Number(($event.target as HTMLInputElement).value) || 1)) })"
          />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs font-medium text-white/60 mb-1.5 block">Background</label>
            <ColorPicker :model-value="scheduleMetadata.backgroundColor ?? '#ffffff'" @update:modelValue="(c: string) => updateScheduleMetadata((draft) => { draft.backgroundColor = c })" />
          </div>
          <div>
            <label class="text-xs font-medium text-white/60 mb-1.5 block">Border</label>
            <ColorPicker :model-value="scheduleMetadata.borderColor ?? '#e2e8f0'" @update:modelValue="(c: string) => updateScheduleMetadata((draft) => { draft.borderColor = c })" />
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-4 text-xs text-white/80">
          <label class="flex items-center gap-2">
            <input
              type="checkbox"
              class="accent-primary-400"
              :checked="scheduleMetadata.showBackground !== false"
              @change="updateScheduleMetadata((draft) => { draft.showBackground = ($event.target as HTMLInputElement).checked })"
            />
            <span>Show background</span>
          </label>
          <label class="flex items-center gap-2">
            <input
              type="checkbox"
              class="accent-primary-400"
              :checked="scheduleMetadata.showBorder !== false"
              @change="updateScheduleMetadata((draft) => { draft.showBorder = ($event.target as HTMLInputElement).checked })"
            />
            <span>Show border</span>
          </label>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs font-medium text-white/60 mb-1.5 block">Radius</label>
            <input type="number" min="0" max="80" class="control-glass" :value="scheduleMetadata.cornerRadius ?? 22" @change="updateScheduleMetadata((draft) => { draft.cornerRadius = Math.max(0, Math.min(80, Number(($event.target as HTMLInputElement).value) || 0)) })" />
          </div>
          <div>
            <label class="text-xs font-medium text-white/60 mb-1.5 block">Border Width</label>
            <input type="number" min="0" max="10" class="control-glass" :value="scheduleMetadata.borderWidth ?? 1" @change="updateScheduleMetadata((draft) => { draft.borderWidth = Math.max(0, Math.min(10, Number(($event.target as HTMLInputElement).value) || 0)) })" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs font-medium text-white/60 mb-1.5 block">Start Hour</label>
            <input type="number" min="0" max="23" class="control-glass" :value="scheduleMetadata.startHour" @change="updateScheduleMetadata((draft) => { draft.startHour = Math.max(0, Math.min(23, Number(($event.target as HTMLInputElement).value) || draft.startHour)) })" />
          </div>
          <div>
            <label class="text-xs font-medium text-white/60 mb-1.5 block">End Hour</label>
            <input type="number" min="0" max="23" class="control-glass" :value="scheduleMetadata.endHour" @change="updateScheduleMetadata((draft) => { draft.endHour = Math.max(0, Math.min(23, Number(($event.target as HTMLInputElement).value) || draft.endHour)) })" />
          </div>
        </div>
      </div>
    </template>

    <!-- Checklist Block -->
    <template v-if="checklistMetadata">
      <div class="pt-4 border-t border-white/10 space-y-4">
        <p class="text-xs font-semibold uppercase tracking-widest text-white/60">Checklist</p>
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Title</label>
          <input type="text" class="control-glass" :value="checklistMetadata.title" @input="updateChecklistMetadata((draft) => { draft.title = ($event.target as HTMLInputElement).value })" />
        </div>
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Header Style</label>
          <select class="control-glass" :value="checklistMetadata.headerStyle ?? 'tint'" @change="updateChecklistMetadata((draft) => { draft.headerStyle = ($event.target as HTMLSelectElement).value as PlannerHeaderStyle })">
            <option v-for="opt in headerStyleOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Title alignment</label>
          <select
            class="control-glass"
            :value="checklistMetadata.titleAlign ?? 'left'"
            @change="updateChecklistMetadata((draft) => { draft.titleAlign = ($event.target as HTMLSelectElement).value as ChecklistMetadata['titleAlign'] })"
          >
            <option v-for="opt in titleAlignOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs font-medium text-white/60 mb-1.5 block">Accent</label>
            <ColorPicker :model-value="checklistMetadata.accentColor" @update:modelValue="(c: string) => updateChecklistMetadata((draft) => { draft.accentColor = c })" />
          </div>
          <div>
            <label class="text-xs font-medium text-white/60 mb-1.5 block">Checkbox</label>
            <ColorPicker :model-value="checklistMetadata.checkboxColor ?? checklistMetadata.accentColor" @update:modelValue="(c: string) => updateChecklistMetadata((draft) => { draft.checkboxColor = c })" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs font-medium text-white/60 mb-1.5 block">Line color</label>
            <ColorPicker :model-value="checklistMetadata.lineColor ?? '#e2e8f0'" @update:modelValue="(c: string) => updateChecklistMetadata((draft) => { draft.lineColor = c })" />
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
              @change="updateChecklistMetadata((draft) => { draft.lineWidth = Math.max(0.5, Math.min(8, Number(($event.target as HTMLInputElement).value) || 1)) })"
            />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs font-medium text-white/60 mb-1.5 block">Background</label>
            <ColorPicker :model-value="checklistMetadata.backgroundColor ?? '#ffffff'" @update:modelValue="(c: string) => updateChecklistMetadata((draft) => { draft.backgroundColor = c })" />
          </div>
          <div>
            <label class="text-xs font-medium text-white/60 mb-1.5 block">Border</label>
            <ColorPicker :model-value="checklistMetadata.borderColor ?? '#e2e8f0'" @update:modelValue="(c: string) => updateChecklistMetadata((draft) => { draft.borderColor = c })" />
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-4 text-xs text-white/80">
          <label class="flex items-center gap-2">
            <input
              type="checkbox"
              class="accent-primary-400"
              :checked="checklistMetadata.showBackground !== false"
              @change="updateChecklistMetadata((draft) => { draft.showBackground = ($event.target as HTMLInputElement).checked })"
            />
            <span>Show background</span>
          </label>
          <label class="flex items-center gap-2">
            <input
              type="checkbox"
              class="accent-primary-400"
              :checked="checklistMetadata.showBorder !== false"
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
              @change="updateChecklistMetadata((draft) => { draft.borderWidth = Math.max(0, Math.min(10, Number(($event.target as HTMLInputElement).value) || 0)) })"
            />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs font-medium text-white/60 mb-1.5 block">Rows</label>
            <input type="number" min="1" max="30" class="control-glass" :value="checklistMetadata.rows" @change="updateChecklistMetadata((draft) => { draft.rows = Math.max(1, Math.min(30, Number(($event.target as HTMLInputElement).value) || draft.rows)) })" />
          </div>
          <div class="flex items-end">
            <label class="flex items-center gap-2 text-sm text-white/80">
              <input type="checkbox" class="accent-primary-400" :checked="checklistMetadata.showCheckboxes" @change="updateChecklistMetadata((draft) => { draft.showCheckboxes = ($event.target as HTMLInputElement).checked })" />
              <span>Checkboxes</span>
            </label>
          </div>
        </div>
      </div>
    </template>

    <!-- Notes Block -->
    <template v-if="plannerNoteMetadata">
      <div class="pt-4 border-t border-white/10 space-y-4">
        <div class="flex items-center justify-between">
          <p class="text-xs font-semibold uppercase tracking-widest text-white/60">Notes</p>
          <select class="control-glass-sm" :value="plannerNoteMetadata.pattern" @change="updatePlannerMetadata((draft) => { draft.pattern = ($event.target as HTMLSelectElement).value as PlannerPatternVariant })">
            <option v-for="opt in plannerPatternOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Title</label>
          <input type="text" class="control-glass" :value="plannerNoteMetadata.title" @input="updatePlannerMetadata((draft) => { draft.title = ($event.target as HTMLInputElement).value })" />
        </div>
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Header Style</label>
          <select class="control-glass" :value="plannerNoteMetadata.headerStyle ?? (plannerNoteMetadata.pattern === 'hero' ? 'filled' : 'minimal')" @change="updatePlannerMetadata((draft) => { draft.headerStyle = ($event.target as HTMLSelectElement).value as PlannerHeaderStyle })">
            <option v-for="opt in headerStyleOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Title alignment</label>
          <select
            class="control-glass"
            :value="plannerNoteMetadata.titleAlign ?? 'left'"
            @change="updatePlannerMetadata((draft) => { draft.titleAlign = ($event.target as HTMLSelectElement).value as PlannerNoteMetadata['titleAlign'] })"
          >
            <option v-for="opt in titleAlignOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Accent</label>
          <ColorPicker :model-value="plannerNoteMetadata.accentColor" @update:modelValue="(c: string) => updatePlannerMetadata((draft) => { draft.accentColor = c })" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs font-medium text-white/60 mb-1.5 block">Guide color</label>
            <ColorPicker :model-value="plannerNoteMetadata.guideColor ?? '#e2e8f0'" @update:modelValue="(c: string) => updatePlannerMetadata((draft) => { draft.guideColor = c })" />
          </div>
          <div>
            <label class="text-xs font-medium text-white/60 mb-1.5 block">Guide thickness</label>
            <input
              type="number"
              min="0.5"
              max="8"
              step="0.5"
              class="control-glass"
              :value="plannerNoteMetadata.guideWidth ?? 1"
              @change="updatePlannerMetadata((draft) => { draft.guideWidth = Math.max(0.5, Math.min(8, Number(($event.target as HTMLInputElement).value) || 1)) })"
            />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs font-medium text-white/60 mb-1.5 block">Background</label>
            <ColorPicker :model-value="plannerNoteMetadata.backgroundColor ?? '#ffffff'" @update:modelValue="(c: string) => updatePlannerMetadata((draft) => { draft.backgroundColor = c })" />
          </div>
          <div>
            <label class="text-xs font-medium text-white/60 mb-1.5 block">Border</label>
            <ColorPicker :model-value="plannerNoteMetadata.borderColor ?? '#e2e8f0'" @update:modelValue="(c: string) => updatePlannerMetadata((draft) => { draft.borderColor = c })" />
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-4 text-xs text-white/80">
          <label class="flex items-center gap-2">
            <input
              type="checkbox"
              class="accent-primary-400"
              :checked="plannerNoteMetadata.showBackground !== false"
              @change="updatePlannerMetadata((draft) => { draft.showBackground = ($event.target as HTMLInputElement).checked })"
            />
            <span>Show background</span>
          </label>
          <label class="flex items-center gap-2">
            <input
              type="checkbox"
              class="accent-primary-400"
              :checked="plannerNoteMetadata.showBorder !== false"
              @change="updatePlannerMetadata((draft) => { draft.showBorder = ($event.target as HTMLInputElement).checked })"
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
              :value="plannerNoteMetadata.cornerRadius ?? 22"
              @change="updatePlannerMetadata((draft) => { draft.cornerRadius = Math.max(0, Math.min(80, Number(($event.target as HTMLInputElement).value) || 0)) })"
            />
          </div>
          <div>
            <label class="text-xs font-medium text-white/60 mb-1.5 block">Border Width</label>
            <input
              type="number"
              min="0"
              max="10"
              class="control-glass"
              :value="plannerNoteMetadata.borderWidth ?? 1"
              @change="updatePlannerMetadata((draft) => { draft.borderWidth = Math.max(0, Math.min(10, Number(($event.target as HTMLInputElement).value) || 0)) })"
            />
          </div>
        </div>
      </div>
    </template>
    
    <!-- Text Properties -->
    <template v-if="objectType === 'textbox'">
      <div class="space-y-4">
        <!-- Content -->
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Content</label>
          <textarea v-model="textContent" rows="3" class="control-glass resize-none"></textarea>
        </div>
        
        <!-- Typography Section -->
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
        <label class="flex items-center gap-2 text-sm text-white/80">
          <input
            type="checkbox"
            class="accent-primary-400"
            :checked="shapeFillVisible"
            @change="toggleShapeFillVisibility(($event.target as HTMLInputElement).checked)"
          />
          <span>Show fill</span>
        </label>
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Stroke Color</label>
          <ColorPicker v-model="strokeColor" />
        </div>
        <label class="flex items-center gap-2 text-sm text-white/80">
          <input
            type="checkbox"
            class="accent-primary-400"
            :checked="shapeStrokeVisible"
            @change="toggleShapeStrokeVisibility(($event.target as HTMLInputElement).checked)"
          />
          <span>Show stroke</span>
        </label>
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Stroke Width</label>
          <div class="flex items-center gap-3">
            <input v-model.number="strokeWidth" type="range" min="0" max="20" class="flex-1 accent-primary-400" />
            <span class="text-xs text-white/70 w-8 text-right">{{ strokeWidth }}px</span>
          </div>
        </div>
        <!-- Corner Radius for rectangles -->
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
