<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useEditorStore } from '@/stores/editor.store'
import ColorPicker from './ColorPicker.vue'
import FontPicker from './FontPicker.vue'
import type {
  CalendarGridMetadata,
  WeekStripMetadata,
  DateCellMetadata,
  PlannerNoteMetadata,
  PlannerPatternVariant,
  PlannerHeaderStyle,
  CanvasElementMetadata,
  ScheduleMetadata,
  ChecklistMetadata,
} from '@/types'

const editorStore = useEditorStore()
const { selectedObjects, hasSelection } = storeToRefs(editorStore)

const alignTarget = ref<'canvas' | 'selection'>('canvas')

watch(
  () => selectedObjects.value.length,
  (len) => {
    alignTarget.value = len > 1 ? 'selection' : 'canvas'
  },
  { immediate: true },
)

const selectedObject = computed(() => selectedObjects.value[0])

const objectType = computed(() => {
  if (!selectedObject.value) return null
  return selectedObject.value.type
})

// Text properties
const textContent = computed({
  get: () => (selectedObject.value as any)?.text || '',
  set: (value) => editorStore.updateObjectProperty('text', value),
})

const fontSize = computed({
  get: () => (selectedObject.value as any)?.fontSize || 16,
  set: (value) => editorStore.updateObjectProperty('fontSize', value),
})

const fontFamily = computed({
  get: () => (selectedObject.value as any)?.fontFamily || 'Inter',
  set: (value) => editorStore.updateObjectProperty('fontFamily', value),
})

const textColor = computed({
  get: () => (selectedObject.value as any)?.fill || '#000000',
  set: (value) => editorStore.updateObjectProperty('fill', value),
})

const textAlign = computed({
  get: () => (selectedObject.value as any)?.textAlign || 'left',
  set: (value) => editorStore.updateObjectProperty('textAlign', value),
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

const isArrow = computed(() => {
  const obj: any = selectedObject.value as any
  return obj?.type === 'group' && obj?.data?.shapeKind === 'arrow'
})

const isLineOrArrow = computed(() => {
  const obj: any = selectedObject.value as any
  return obj?.type === 'line' || isArrow.value
})

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
    if (isArrow.value) return obj?._objects?.find((o: any) => o?.data?.arrowPart === 'line')?.strokeLineCap ?? 'butt'
    return obj?.strokeLineCap ?? 'butt'
  },
  set: (value) => editorStore.updateObjectProperty('strokeLineCap', value),
})

const lineJoin = computed({
  get: () => {
    const obj: any = selectedObject.value as any
    if (isArrow.value) return obj?._objects?.find((o: any) => o?.data?.arrowPart === 'line')?.strokeLineJoin ?? 'miter'
    return obj?.strokeLineJoin ?? 'miter'
  },
  set: (value) => editorStore.updateObjectProperty('strokeLineJoin', value),
})

const dashStyle = computed({
  get: () => {
    const obj: any = selectedObject.value as any
    const dash = isArrow.value
      ? obj?._objects?.find((o: any) => o?.data?.arrowPart === 'line')?.strokeDashArray
      : obj?.strokeDashArray
    if (!dash || dash.length === 0) return 'solid'
    const key = JSON.stringify(dash)
    if (key === JSON.stringify([10, 8])) return 'dashed'
    if (key === JSON.stringify([2, 6])) return 'dotted'
    if (key === JSON.stringify([20, 10, 6, 10])) return 'dash-dot'
    return 'custom'
  },
  set: (value) => {
    if (value === 'solid') editorStore.updateObjectProperty('strokeDashArray', undefined)
    else if (value === 'dashed') editorStore.updateObjectProperty('strokeDashArray', [10, 8])
    else if (value === 'dotted') editorStore.updateObjectProperty('strokeDashArray', [2, 6])
    else if (value === 'dash-dot') editorStore.updateObjectProperty('strokeDashArray', [20, 10, 6, 10])
  },
})

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

const elementMetadata = computed<CanvasElementMetadata | null>(() => {
  // Ensure this recomputes on selection changes (Fabric active object isn't reactive).
  void selectedObjects.value
  return editorStore.getActiveElementMetadata()
})

const calendarMetadata = computed<CalendarGridMetadata | null>(() =>
  elementMetadata.value?.kind === 'calendar-grid' ? elementMetadata.value : null,
)

const weekStripMetadata = computed<WeekStripMetadata | null>(() =>
  elementMetadata.value?.kind === 'week-strip' ? elementMetadata.value : null,
)

const dateCellMetadata = computed<DateCellMetadata | null>(() =>
  elementMetadata.value?.kind === 'date-cell' ? elementMetadata.value : null,
)

const plannerNoteMetadata = computed<PlannerNoteMetadata | null>(() =>
  elementMetadata.value?.kind === 'planner-note' ? elementMetadata.value : null,
)

const scheduleMetadata = computed<ScheduleMetadata | null>(() =>
  elementMetadata.value?.kind === 'schedule' ? elementMetadata.value : null,
)

const checklistMetadata = computed<ChecklistMetadata | null>(() =>
  elementMetadata.value?.kind === 'checklist' ? elementMetadata.value : null,
)

function handleAlign(action: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') {
  editorStore.alignSelection?.(action, alignTarget.value) ?? editorStore.alignObjects(action)
}

function handleDistribute(axis: 'horizontal' | 'vertical') {
  editorStore.distributeSelection?.(axis)
}

function updateCalendarMetadata(updater: (draft: CalendarGridMetadata) => void) {
  editorStore.updateSelectedElementMetadata((metadata) => {
    if (metadata.kind !== 'calendar-grid') return null
    updater(metadata)
    return metadata
  })
}

function updateWeekStripMetadata(updater: (draft: WeekStripMetadata) => void) {
  editorStore.updateSelectedElementMetadata((metadata) => {
    if (metadata.kind !== 'week-strip') return null
    updater(metadata)
    return metadata
  })
}

function updateDateCellMetadata(updater: (draft: DateCellMetadata) => void) {
  editorStore.updateSelectedElementMetadata((metadata) => {
    if (metadata.kind !== 'date-cell') return null
    updater(metadata)
    return metadata
  })
}

function updatePlannerMetadata(updater: (draft: PlannerNoteMetadata) => void) {
  editorStore.updateSelectedElementMetadata((metadata) => {
    if (metadata.kind !== 'planner-note') return null
    updater(metadata)
    return metadata
  })
}

function updateScheduleMetadata(updater: (draft: ScheduleMetadata) => void) {
  editorStore.updateSelectedElementMetadata((metadata) => {
    if (metadata.kind !== 'schedule') return null
    updater(metadata)
    return metadata
  })
}

function updateChecklistMetadata(updater: (draft: ChecklistMetadata) => void) {
  editorStore.updateSelectedElementMetadata((metadata) => {
    if (metadata.kind !== 'checklist') return null
    updater(metadata)
    return metadata
  })
}

const monthOptions = Array.from({ length: 12 }, (_, index) => ({
  value: index + 1,
  label: new Date(2024, index, 1).toLocaleDateString('en', { month: 'long' }),
}))

const weekStartOptions = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

const plannerPatternOptions: { value: PlannerPatternVariant; label: string }[] = [
  { value: 'hero', label: 'Hero Banner' },
  { value: 'ruled', label: 'Ruled Lines' },
  { value: 'grid', label: 'Grid' },
  { value: 'dot', label: 'Dot Grid' },
]

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

const weekStripDateValue = computed(() =>
  weekStripMetadata.value?.startDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
)

const dateCellDateValue = computed(() =>
  dateCellMetadata.value?.date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
)

function handleDateInput(value: string, updater: (iso: string) => void) {
  if (!value) return
  const iso = new Date(`${value}T00:00:00`).toISOString()
  updater(iso)
}

// Common properties
const opacity = computed({
  get: () => ((selectedObject.value as any)?.opacity || 1) * 100,
  set: (value) => editorStore.updateObjectProperty('opacity', value / 100),
})

const rotation = computed({
  get: () => (selectedObject.value as any)?.angle || 0,
  set: (value) => editorStore.updateObjectProperty('angle', value),
})

const positionX = computed({
  get: () => Math.round(((selectedObject.value as any)?.left ?? 0) as number),
  set: (value) => editorStore.updateObjectProperty('left', Number(value) || 0),
})

const positionY = computed({
  get: () => Math.round(((selectedObject.value as any)?.top ?? 0) as number),
  set: (value) => editorStore.updateObjectProperty('top', Number(value) || 0),
})

const elementSize = computed(() => {
  const meta = elementMetadata.value as any
  if (!meta || !meta.size) return null
  return meta.size as { width: number; height: number }
})

function updateElementSize(next: { width: number; height: number }) {
  editorStore.updateSelectedElementMetadata((metadata) => {
    const draft: any = metadata as any
    if (!draft.size) return null
    draft.size.width = Math.max(10, Number(next.width) || draft.size.width)
    draft.size.height = Math.max(10, Number(next.height) || draft.size.height)
    return metadata
  })
}

const objectWidth = computed({
  get: () => {
    if (!selectedObject.value) return 0
    return Math.round(selectedObject.value.getScaledWidth())
  },
  set: (value) => {
    if (!selectedObject.value) return
    const target = Math.max(1, Number(value) || 1)
    const base = (selectedObject.value as any).width || selectedObject.value.getScaledWidth() || 1
    const nextScale = target / base
    editorStore.updateObjectProperty('scaleX', nextScale)
  },
})

const objectHeight = computed({
  get: () => {
    if (!selectedObject.value) return 0
    return Math.round(selectedObject.value.getScaledHeight())
  },
  set: (value) => {
    if (!selectedObject.value) return
    const target = Math.max(1, Number(value) || 1)
    const base = (selectedObject.value as any).height || selectedObject.value.getScaledHeight() || 1
    const nextScale = target / base
    editorStore.updateObjectProperty('scaleY', nextScale)
  },
})
</script>

<template>
  <aside class="editor-properties w-72 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-y-auto">
    <!-- No Selection -->
    <div 
      v-if="!hasSelection" 
      class="p-4 text-center text-gray-500"
    >
      <p class="text-sm">Select an object to edit its properties</p>
    </div>

    <!-- Properties Panel -->
    <div v-else class="p-4 space-y-6">
      <!-- Object Type Header -->
      <div class="flex items-center justify-between">
        <h3 class="font-semibold text-gray-900 dark:text-white capitalize">
          {{ objectType }}
        </h3>
        <span class="text-xs text-gray-500">
          {{ selectedObjects.length }} selected
        </span>
      </div>

      <!-- Position & Size -->
      <div class="space-y-4 border border-gray-200 dark:border-gray-700 rounded-2xl p-4">
        <div>
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-widest">Layout</p>
          <p class="text-sm text-gray-700 dark:text-gray-100">Position & Size</p>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs text-gray-500 mb-1">X</label>
            <input
              v-model.number="positionX"
              type="number"
              class="input"
            />
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">Y</label>
            <input
              v-model.number="positionY"
              type="number"
              class="input"
            />
          </div>
        </div>

        <div v-if="elementSize" class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs text-gray-500 mb-1">W</label>
            <input
              type="number"
              min="10"
              class="input"
              :value="Math.round(elementSize.width)"
              @change="updateElementSize({ width: Number(($event.target as HTMLInputElement).value), height: elementSize.height })"
            />
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">H</label>
            <input
              type="number"
              min="10"
              class="input"
              :value="Math.round(elementSize.height)"
              @change="updateElementSize({ width: elementSize.width, height: Number(($event.target as HTMLInputElement).value) })"
            />
          </div>
        </div>

        <div v-else class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs text-gray-500 mb-1">W</label>
            <input
              v-model.number="objectWidth"
              type="number"
              min="1"
              class="input"
            />
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">H</label>
            <input
              v-model.number="objectHeight"
              type="number"
              min="1"
              class="input"
            />
          </div>
        </div>
      </div>

      <!-- Text Properties -->
      <template v-if="objectType === 'textbox'">
        <div class="space-y-4">
          <div>
              <label class="block text-gray-500 dark:text-gray-400 mb-1 font-medium text-xs leading-4">Content</label>
              <textarea 
                  v-model="textContent" 
                  class="input min-h-[60px]"
              />
          </div>
          <div>
            <label class="block text-gray-500 dark:text-gray-400 mb-1 font-medium text-xs leading-4">Font</label>
            <FontPicker v-model="fontFamily" />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-gray-500 dark:text-gray-400 mb-1 font-medium text-xs leading-4">Size</label>
              <input
                v-model.number="fontSize"
                type="number"
                min="8"
                max="200"
                class="input"
              />
            </div>
            <div>
              <label class="block text-gray-500 dark:text-gray-400 mb-1 font-medium text-xs leading-4">Color</label>
              <ColorPicker v-model="textColor" />
            </div>
          </div>

          <div>
            <label class="block text-gray-500 dark:text-gray-400 mb-1 font-medium text-xs leading-4">Alignment</label>
            <div class="flex gap-1">
              <button
                class="p-2 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                :class="{ 'bg-primary-100 border-primary-500 text-primary-600 dark:bg-primary-900/30 dark:border-primary-500 dark:text-primary-400': textAlign === 'left' }"
                @click="textAlign = 'left'"
              >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z" />
                </svg>
              </button>
              <button
                class="p-2 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                :class="{ 'bg-primary-100 border-primary-500 text-primary-600 dark:bg-primary-900/30 dark:border-primary-500 dark:text-primary-400': textAlign === 'center' }"
                @click="textAlign = 'center'"
              >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zM5 10a.75.75 0 01.75-.75h8.5a.75.75 0 010 1.5h-8.5A.75.75 0 015 10zm-3 5.25a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75z" />
                </svg>
              </button>
              <button
                class="p-2 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                :class="{ 'bg-primary-100 border-primary-500 text-primary-600 dark:bg-primary-900/30 dark:border-primary-500 dark:text-primary-400': textAlign === 'right' }"
                @click="textAlign = 'right'"
              >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm7 10.5a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </template>

      <template v-if="isLineOrArrow">
        <div class="space-y-4">
          <div>
            <label class="block text-gray-500 dark:text-gray-400 mb-1 font-medium text-xs leading-4">Stroke Color</label>
            <ColorPicker v-model="lineStrokeColor" />
          </div>

          <div>
            <label class="block text-gray-500 dark:text-gray-400 mb-1 font-medium text-xs leading-4">Stroke Width</label>
            <input
              v-model.number="lineStrokeWidth"
              type="range"
              min="1"
              max="24"
              class="w-full"
            />
            <span class="text-xs text-gray-500">{{ lineStrokeWidth }}px</span>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-gray-500 dark:text-gray-400 mb-1 font-medium text-xs leading-4">Dash</label>
              <select class="select" :value="dashStyle" @change="dashStyle = ($event.target as HTMLSelectElement).value as any">
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
                <option value="dash-dot">Dash-dot</option>
              </select>
            </div>
            <div>
              <label class="block text-gray-500 dark:text-gray-400 mb-1 font-medium text-xs leading-4">Cap</label>
              <select class="select" :value="lineCap" @change="lineCap = ($event.target as HTMLSelectElement).value">
                <option value="butt">Butt</option>
                <option value="round">Round</option>
                <option value="square">Square</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-gray-500 dark:text-gray-400 mb-1 font-medium text-xs leading-4">Join</label>
            <select class="select" :value="lineJoin" @change="lineJoin = ($event.target as HTMLSelectElement).value">
              <option value="miter">Miter</option>
              <option value="round">Round</option>
              <option value="bevel">Bevel</option>
            </select>
          </div>

          <div v-if="isArrow" class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-gray-500 dark:text-gray-400 mb-1 font-medium text-xs leading-4">Arrow Ends</label>
                <select class="select" :value="arrowEnds" @change="arrowEnds = ($event.target as HTMLSelectElement).value">
                  <option value="end">End</option>
                  <option value="start">Start</option>
                  <option value="both">Both</option>
                  <option value="none">None</option>
                </select>
              </div>
              <div>
                <label class="block text-gray-500 dark:text-gray-400 mb-1 font-medium text-xs leading-4">Head Style</label>
                <select class="select" :value="arrowHeadStyle" @change="arrowHeadStyle = ($event.target as HTMLSelectElement).value">
                  <option value="filled">Filled</option>
                  <option value="open">Open</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-gray-500 dark:text-gray-400 mb-1 font-medium text-xs leading-4">Head Length</label>
                <input v-model.number="arrowHeadLength" type="number" min="4" max="80" class="input" />
              </div>
              <div>
                <label class="block text-gray-500 dark:text-gray-400 mb-1 font-medium text-xs leading-4">Head Width</label>
                <input v-model.number="arrowHeadWidth" type="number" min="4" max="80" class="input" />
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Schedule Properties -->
      <template v-if="scheduleMetadata">
        <div class="space-y-4 border border-gray-200 dark:border-gray-700 rounded-2xl p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-widest">Schedule</p>
              <p class="text-sm text-gray-700 dark:text-gray-100">Timeline</p>
            </div>
            <select
              class="select-sm w-auto"
              :value="scheduleMetadata.intervalMinutes"
              @change="updateScheduleMetadata((draft) => { draft.intervalMinutes = Number(($event.target as HTMLSelectElement).value) as ScheduleMetadata['intervalMinutes'] })"
            >
              <option v-for="opt in scheduleIntervalOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-xs text-gray-500 mb-1">Header Style</label>
            <select
              class="select"
              :value="scheduleMetadata.headerStyle ?? 'minimal'"
              @change="updateScheduleMetadata((draft) => { draft.headerStyle = ($event.target as HTMLSelectElement).value as PlannerHeaderStyle })"
            >
              <option v-for="opt in headerStyleOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
          </div>

          <div>
            <label class="block text-xs text-gray-500 mb-1">Title</label>
            <input
              type="text"
              class="input"
              :value="scheduleMetadata.title"
              @input="updateScheduleMetadata((draft) => { draft.title = ($event.target as HTMLInputElement).value })"
            />
          </div>

          <div>
            <label class="block text-xs text-gray-500 mb-1">Accent Color</label>
            <ColorPicker
              :model-value="scheduleMetadata.accentColor"
              @update:model-value="(color) => updateScheduleMetadata((draft) => { draft.accentColor = color })"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs text-gray-500 mb-1">Background</label>
              <ColorPicker
                :model-value="scheduleMetadata.backgroundColor ?? '#ffffff'"
                @update:model-value="(color) => updateScheduleMetadata((draft) => { draft.backgroundColor = color })"
              />
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Border</label>
              <ColorPicker
                :model-value="scheduleMetadata.borderColor ?? '#e2e8f0'"
                @update:model-value="(color) => updateScheduleMetadata((draft) => { draft.borderColor = color })"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs text-gray-500 mb-1">Radius</label>
              <input
                type="number"
                min="0"
                max="80"
                class="input"
                :value="scheduleMetadata.cornerRadius ?? 22"
                @change="updateScheduleMetadata((draft) => { draft.cornerRadius = Math.max(0, Math.min(80, Number(($event.target as HTMLInputElement).value) || 0)) })"
              />
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Border Width</label>
              <input
                type="number"
                min="0"
                max="10"
                class="input"
                :value="scheduleMetadata.borderWidth ?? 1"
                @change="updateScheduleMetadata((draft) => { draft.borderWidth = Math.max(0, Math.min(10, Number(($event.target as HTMLInputElement).value) || 0)) })"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs text-gray-500 mb-1">Lines</label>
              <ColorPicker
                :model-value="scheduleMetadata.lineColor ?? '#e2e8f0'"
                @update:model-value="(color) => updateScheduleMetadata((draft) => { draft.lineColor = color })"
              />
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Time Labels</label>
              <ColorPicker
                :model-value="scheduleMetadata.timeLabelColor ?? '#64748b'"
                @update:model-value="(color) => updateScheduleMetadata((draft) => { draft.timeLabelColor = color })"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs text-gray-500 mb-1">Start Hour</label>
              <input
                type="number"
                min="0"
                max="23"
                class="input"
                :value="scheduleMetadata.startHour"
                @change="updateScheduleMetadata((draft) => { draft.startHour = Math.max(0, Math.min(23, Number(($event.target as HTMLInputElement).value) || draft.startHour)) })"
              />
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">End Hour</label>
              <input
                type="number"
                min="0"
                max="23"
                class="input"
                :value="scheduleMetadata.endHour"
                @change="updateScheduleMetadata((draft) => { draft.endHour = Math.max(0, Math.min(23, Number(($event.target as HTMLInputElement).value) || draft.endHour)) })"
              />
            </div>
          </div>

          <p class="text-xs text-gray-500">Tip: keep end hour greater than start hour for visible time slots.</p>
        </div>
      </template>

      <!-- Checklist Properties -->
      <template v-if="checklistMetadata">
        <div class="space-y-4 border border-gray-200 dark:border-gray-700 rounded-2xl p-4">
          <div>
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-widest">Checklist</p>
            <p class="text-sm text-gray-700 dark:text-gray-100">To-do List</p>
          </div>

          <div>
            <label class="block text-xs text-gray-500 mb-1">Header Style</label>
            <select
              class="select"
              :value="checklistMetadata.headerStyle ?? 'tint'"
              @change="updateChecklistMetadata((draft) => { draft.headerStyle = ($event.target as HTMLSelectElement).value as PlannerHeaderStyle })"
            >
              <option v-for="opt in headerStyleOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
          </div>

          <div>
            <label class="block text-xs text-gray-500 mb-1">Title</label>
            <input
              type="text"
              class="input"
              :value="checklistMetadata.title"
              @input="updateChecklistMetadata((draft) => { draft.title = ($event.target as HTMLInputElement).value })"
            />
          </div>

          <div>
            <label class="block text-xs text-gray-500 mb-1">Accent Color</label>
            <ColorPicker
              :model-value="checklistMetadata.accentColor"
              @update:model-value="(color) => updateChecklistMetadata((draft) => { draft.accentColor = color })"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs text-gray-500 mb-1">Background</label>
              <ColorPicker
                :model-value="checklistMetadata.backgroundColor ?? '#ffffff'"
                @update:model-value="(color) => updateChecklistMetadata((draft) => { draft.backgroundColor = color })"
              />
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Border</label>
              <ColorPicker
                :model-value="checklistMetadata.borderColor ?? '#e2e8f0'"
                @update:model-value="(color) => updateChecklistMetadata((draft) => { draft.borderColor = color })"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs text-gray-500 mb-1">Radius</label>
              <input
                type="number"
                min="0"
                max="80"
                class="input"
                :value="checklistMetadata.cornerRadius ?? 22"
                @change="updateChecklistMetadata((draft) => { draft.cornerRadius = Math.max(0, Math.min(80, Number(($event.target as HTMLInputElement).value) || 0)) })"
              />
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Border Width</label>
              <input
                type="number"
                min="0"
                max="10"
                class="input"
                :value="checklistMetadata.borderWidth ?? 1"
                @change="updateChecklistMetadata((draft) => { draft.borderWidth = Math.max(0, Math.min(10, Number(($event.target as HTMLInputElement).value) || 0)) })"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs text-gray-500 mb-1">Lines</label>
              <ColorPicker
                :model-value="checklistMetadata.lineColor ?? '#e2e8f0'"
                @update:model-value="(color) => updateChecklistMetadata((draft) => { draft.lineColor = color })"
              />
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Checkbox</label>
              <ColorPicker
                :model-value="checklistMetadata.checkboxColor ?? checklistMetadata.accentColor"
                @update:model-value="(color) => updateChecklistMetadata((draft) => { draft.checkboxColor = color })"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs text-gray-500 mb-1">Rows</label>
              <input
                type="number"
                min="1"
                max="30"
                class="input"
                :value="checklistMetadata.rows"
                @change="updateChecklistMetadata((draft) => { draft.rows = Math.max(1, Math.min(30, Number(($event.target as HTMLInputElement).value) || draft.rows)) })"
              />
            </div>
            <div class="flex items-end">
              <label class="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  class="accent-primary-500"
                  :checked="checklistMetadata.showCheckboxes"
                  @change="updateChecklistMetadata((draft) => { draft.showCheckboxes = ($event.target as HTMLInputElement).checked })"
                >
                <span>Checkboxes</span>
              </label>
            </div>
          </div>
        </div>
      </template>

      <!-- Shape Properties -->
      <template v-if="objectType === 'rect' || objectType === 'circle'">
        <div class="space-y-4">
          <div>
            <label class="block text-gray-500 dark:text-gray-400 mb-1 font-medium text-xs leading-4">Fill Color</label>
            <ColorPicker v-model="fillColor" />
          </div>

          <div>
            <label class="block text-gray-500 dark:text-gray-400 mb-1 font-medium text-xs leading-4">Stroke Color</label>
            <ColorPicker v-model="strokeColor" />
          </div>

          <div>
            <label class="block text-gray-500 dark:text-gray-400 mb-1 font-medium text-xs leading-4">Stroke Width</label>
            <input
              v-model.number="strokeWidth"
              type="range"
              min="0"
              max="20"
              class="w-full"
            />
            <span class="text-xs text-gray-500">{{ strokeWidth }}px</span>
          </div>
        </div>
      </template>

      <!-- Calendar Grid Properties -->
      <template v-if="calendarMetadata">
        <div class="space-y-4 border border-gray-200 dark:border-gray-700 rounded-2xl p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-widest">Calendar</p>
              <p class="text-sm text-gray-700 dark:text-gray-100">Month Grid</p>
            </div>
            <select
              class="select-sm w-auto"
              :value="calendarMetadata.mode"
              @change="updateCalendarMetadata((draft) => { draft.mode = ($event.target as HTMLSelectElement).value as CalendarGridMetadata['mode'] })"
            >
              <option value="month">Actual Month</option>
              <option value="blank">Blank Grid</option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs text-gray-500 mb-1">Year</label>
              <input
                type="number"
                min="1900"
                max="2100"
                class="input"
                :value="calendarMetadata.year"
                @change="updateCalendarMetadata((draft) => { draft.year = Number(($event.target as HTMLInputElement).value) || draft.year })"
              />
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Month</label>
              <select
                class="select"
                :value="calendarMetadata.month"
                @change="updateCalendarMetadata((draft) => { draft.month = Number(($event.target as HTMLSelectElement).value) || draft.month })"
              >
                <option v-for="month in monthOptions" :key="month.value" :value="month.value">
                  {{ month.label }}
                </option>
              </select>
            </div>
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">Week Starts On</label>
            <select
              class="select"
              :value="calendarMetadata.startDay"
              @change="updateCalendarMetadata((draft) => { draft.startDay = Number(($event.target as HTMLSelectElement).value) as CalendarGridMetadata['startDay'] })"
            >
              <option v-for="day in weekStartOptions" :key="day.value" :value="day.value">
                {{ day.label }}
              </option>
            </select>
          </div>
          <div class="flex items-center justify-between text-sm">
            <label class="flex items-center gap-2">
              <input
                type="checkbox"
                class="accent-primary-500"
                :checked="calendarMetadata.showHeader"
                @change="updateCalendarMetadata((draft) => { draft.showHeader = ($event.target as HTMLInputElement).checked })"
              >
              <span>Show header</span>
            </label>
            <label class="flex items-center gap-2">
              <input
                type="checkbox"
                class="accent-primary-500"
                :checked="calendarMetadata.showWeekdays"
                @change="updateCalendarMetadata((draft) => { draft.showWeekdays = ($event.target as HTMLInputElement).checked })"
              >
              <span>Show weekdays</span>
            </label>
          </div>

          <div class="pt-3 border-t border-gray-100 dark:border-gray-700 space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs font-semibold text-gray-500 uppercase tracking-widest">Holidays</p>
                <p class="text-sm text-gray-600 dark:text-gray-300">Markers & List</p>
              </div>
              <label class="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                <input
                  type="checkbox"
                  class="accent-primary-500"
                  :checked="calendarMetadata.showHolidayMarkers ?? true"
                  @change="updateCalendarMetadata((draft) => { draft.showHolidayMarkers = ($event.target as HTMLInputElement).checked })"
                >
                <span>Show</span>
              </label>
            </div>

            <div v-if="calendarMetadata.showHolidayMarkers !== false" class="space-y-3">
              <div>
                <label class="block text-xs text-gray-500 mb-1">Marker Style</label>
                <select
                  class="select"
                  :value="calendarMetadata.holidayMarkerStyle ?? 'text'"
                  @change="updateCalendarMetadata((draft) => { draft.holidayMarkerStyle = ($event.target as HTMLSelectElement).value as any })"
                >
                  <option value="bar">Bar (Bottom)</option>
                  <option value="dot">Dot (Circle)</option>
                  <option value="square">Square (Solid)</option>
                  <option value="border">Border (Ring)</option>
                  <option value="triangle">Corner (Triangle)</option>
                  <option value="background">Background (Fill)</option>
                  <option value="text">Text (Highlight)</option>
                </select>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs text-gray-500 mb-1">Color</label>
                  <ColorPicker
                    :model-value="calendarMetadata.holidayMarkerColor ?? '#ef4444'"
                    @update:model-value="(color) => updateCalendarMetadata((draft) => { draft.holidayMarkerColor = color })"
                  />
                </div>
                <div v-if="!['background', 'text'].includes(calendarMetadata.holidayMarkerStyle ?? 'text')">
                  <label class="block text-xs text-gray-500 mb-1">{{ (calendarMetadata.holidayMarkerStyle === 'dot' || calendarMetadata.holidayMarkerStyle === 'square' || calendarMetadata.holidayMarkerStyle === 'triangle') ? 'Size' : (calendarMetadata.holidayMarkerStyle === 'border' ? 'Width' : 'Height') }}</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    class="input"
                    :value="calendarMetadata.holidayMarkerHeight ?? 4"
                    @change="updateCalendarMetadata((draft) => { draft.holidayMarkerHeight = Math.max(1, Math.min(20, Number(($event.target as HTMLInputElement).value) || 4)) })"
                  />
                </div>
              </div>

              <!-- Holiday List Sub-section -->
              <div class="pt-3 border-t border-gray-100 dark:border-gray-700 space-y-3">
                <div class="flex items-center justify-between">
                  <label class="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                    <input
                      type="checkbox"
                      class="accent-primary-500"
                      :checked="calendarMetadata.showHolidayList !== false"
                      @change="updateCalendarMetadata((draft) => { draft.showHolidayList = ($event.target as HTMLInputElement).checked })"
                    >
                    <span>Show List</span>
                  </label>
                  <span class="text-[11px] text-gray-500">Below grid</span>
                </div>

                <template v-if="calendarMetadata.showHolidayList !== false">
                  <div>
                    <label class="block text-xs text-gray-500 mb-1">List Title</label>
                    <input
                      type="text"
                      class="input"
                      :value="calendarMetadata.holidayListTitle ?? 'Holidays'"
                      @input="updateCalendarMetadata((draft) => { draft.holidayListTitle = ($event.target as HTMLInputElement).value })"
                    />
                  </div>

                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="block text-xs text-gray-500 mb-1">Max Items</label>
                      <input
                        type="number"
                        min="1"
                        max="8"
                        class="input"
                        :value="calendarMetadata.holidayListMaxItems ?? 4"
                        @change="updateCalendarMetadata((draft) => { draft.holidayListMaxItems = Math.max(1, Math.min(8, Number(($event.target as HTMLInputElement).value) || 4)) })"
                      />
                    </div>
                    <div>
                      <label class="block text-xs text-gray-500 mb-1">List Height</label>
                      <input
                        type="number"
                        min="40"
                        max="220"
                        class="input"
                        :value="calendarMetadata.holidayListHeight ?? 96"
                        @change="updateCalendarMetadata((draft) => { draft.holidayListHeight = Math.max(40, Math.min(220, Number(($event.target as HTMLInputElement).value) || 96)) })"
                      />
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="block text-xs text-gray-500 mb-1">Text Color</label>
                      <ColorPicker
                        :model-value="calendarMetadata.holidayListTextColor ?? '#4b5563'"
                        @update:model-value="(color) => updateCalendarMetadata((draft) => { draft.holidayListTextColor = color })"
                      />
                    </div>
                    <div>
                      <label class="block text-xs text-gray-500 mb-1">Date Color</label>
                      <ColorPicker
                        :model-value="calendarMetadata.holidayListAccentColor ?? calendarMetadata.holidayMarkerColor ?? '#ef4444'"
                        @update:model-value="(color) => updateCalendarMetadata((draft) => { draft.holidayListAccentColor = color })"
                      />
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Week Strip Properties -->
      <template v-if="weekStripMetadata">
        <div class="space-y-4 border border-gray-200 dark:border-gray-700 rounded-2xl p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-widest">Week Strip</p>
              <p class="text-sm text-gray-700 dark:text-gray-100">Planner Bar</p>
            </div>
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">Label</label>
            <input
              type="text"
              class="input"
              :value="weekStripMetadata.label"
              @input="updateWeekStripMetadata((draft) => { draft.label = ($event.target as HTMLInputElement).value })"
            />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs text-gray-500 mb-1">Start Date</label>
              <input
                type="date"
                class="input"
                :value="weekStripDateValue"
                @change="handleDateInput(($event.target as HTMLInputElement).value, (iso) => updateWeekStripMetadata((draft) => { draft.startDate = iso }))"
              />
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Week Starts On</label>
              <select
                class="select"
                :value="weekStripMetadata.startDay"
                @change="updateWeekStripMetadata((draft) => { draft.startDay = Number(($event.target as HTMLSelectElement).value) as WeekStripMetadata['startDay'] })"
              >
                <option v-for="day in weekStartOptions" :key="day.value" :value="day.value">
                  {{ day.label }}
                </option>
              </select>
            </div>
          </div>
        </div>
      </template>

      <!-- Date Card Properties -->
      <template v-if="dateCellMetadata">
        <div class="space-y-4 border border-gray-200 dark:border-gray-700 rounded-2xl p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-widest">Day Card</p>
              <p class="text-sm text-gray-700 dark:text-gray-100">Highlight Tile</p>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs text-gray-500 mb-1">Date</label>
              <input
                type="date"
                class="input"
                :value="dateCellDateValue"
                @change="handleDateInput(($event.target as HTMLInputElement).value, (iso) => updateDateCellMetadata((draft) => { draft.date = iso }))"
              />
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Accent</label>
              <ColorPicker
                :model-value="dateCellMetadata.highlightAccent"
                @update:model-value="(color) => updateDateCellMetadata((draft) => { draft.highlightAccent = color })"
              />
            </div>
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">Note Placeholder</label>
            <input
              type="text"
              class="input"
              :value="dateCellMetadata.notePlaceholder"
              @input="updateDateCellMetadata((draft) => { draft.notePlaceholder = ($event.target as HTMLInputElement).value })"
            />
          </div>
        </div>
      </template>

      <!-- Planner Panel Properties -->
      <template v-if="plannerNoteMetadata">
        <div class="space-y-4 border border-gray-200 dark:border-gray-700 rounded-2xl p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-widest">Planner Block</p>
              <p class="text-sm text-gray-700 dark:text-gray-100">Patterned Notes</p>
            </div>
            <select
              class="select-sm w-auto"
              :value="plannerNoteMetadata.pattern"
              @change="updatePlannerMetadata((draft) => { draft.pattern = ($event.target as HTMLSelectElement).value as PlannerPatternVariant })"
            >
              <option v-for="pattern in plannerPatternOptions" :key="pattern.value" :value="pattern.value">
                {{ pattern.label }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-xs text-gray-500 mb-1">Header Style</label>
            <select
              class="select"
              :value="plannerNoteMetadata.headerStyle ?? (plannerNoteMetadata.pattern === 'hero' ? 'filled' : 'minimal')"
              @change="updatePlannerMetadata((draft) => { draft.headerStyle = ($event.target as HTMLSelectElement).value as PlannerHeaderStyle })"
            >
              <option v-for="opt in headerStyleOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">Title</label>
            <input
              type="text"
              class="input"
              :value="plannerNoteMetadata.title"
              @input="updatePlannerMetadata((draft) => { draft.title = ($event.target as HTMLInputElement).value })"
            />
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">Accent Color</label>
            <ColorPicker
              :model-value="plannerNoteMetadata.accentColor"
              @update:model-value="(color) => updatePlannerMetadata((draft) => { draft.accentColor = color })"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs text-gray-500 mb-1">Background</label>
              <ColorPicker
                :model-value="plannerNoteMetadata.backgroundColor ?? '#ffffff'"
                @update:model-value="(color) => updatePlannerMetadata((draft) => { draft.backgroundColor = color })"
              />
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Border</label>
              <ColorPicker
                :model-value="plannerNoteMetadata.borderColor ?? '#e2e8f0'"
                @update:model-value="(color) => updatePlannerMetadata((draft) => { draft.borderColor = color })"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs text-gray-500 mb-1">Radius</label>
              <input
                type="number"
                min="0"
                max="80"
                class="input"
                :value="plannerNoteMetadata.cornerRadius ?? 22"
                @change="updatePlannerMetadata((draft) => { draft.cornerRadius = Math.max(0, Math.min(80, Number(($event.target as HTMLInputElement).value) || 0)) })"
              />
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Border Width</label>
              <input
                type="number"
                min="0"
                max="10"
                class="input"
                :value="plannerNoteMetadata.borderWidth ?? 1"
                @change="updatePlannerMetadata((draft) => { draft.borderWidth = Math.max(0, Math.min(10, Number(($event.target as HTMLInputElement).value) || 0)) })"
              />
            </div>
          </div>

          <div v-if="plannerNoteMetadata.pattern === 'ruled' || plannerNoteMetadata.pattern === 'grid'" class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs text-gray-500 mb-1">Guide Color</label>
              <ColorPicker
                :model-value="plannerNoteMetadata.guideColor ?? (plannerNoteMetadata.pattern === 'grid' ? '#eff6ff' : '#e2e8f0')"
                @update:model-value="(color) => updatePlannerMetadata((draft) => { draft.guideColor = color })"
              />
            </div>
          </div>

          <div v-if="plannerNoteMetadata.pattern === 'dot'" class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs text-gray-500 mb-1">Dot Color</label>
              <ColorPicker
                :model-value="plannerNoteMetadata.dotColor ?? '#cbd5f5'"
                @update:model-value="(color) => updatePlannerMetadata((draft) => { draft.dotColor = color })"
              />
            </div>
          </div>
        </div>
      </template>

      <!-- Common Properties -->
      <div class="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div>
          <label class="block text-gray-500 dark:text-gray-400 mb-1 font-medium text-xs leading-4">Opacity</label>
          <input
            v-model.number="opacity"
            type="range"
            min="0"
            max="100"
            class="w-full"
          />
          <span class="text-xs text-gray-500">{{ Math.round(opacity) }}%</span>
        </div>

        <div>
          <label class="block text-gray-500 dark:text-gray-400 mb-1 font-medium text-xs leading-4">Rotation</label>
          <div class="flex items-center gap-2">
            <input
              v-model.number="rotation"
              type="number"
              min="-360"
              max="360"
              class="input flex-1"
            />
            <span class="text-sm text-gray-500">°</span>
          </div>
        </div>
      </div>

      <!-- Arrange / Align -->
      <div v-if="hasSelection" class="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between">
          <label class="block text-gray-500 dark:text-gray-400 font-medium text-xs leading-4">Align & Distribute</label>
          <select v-model="alignTarget" class="select-sm w-auto">
            <option value="canvas">Align to Page</option>
            <option value="selection">Align to Selection</option>
          </select>
        </div>

        <div class="grid grid-cols-3 gap-2">
          <button class="btn-secondary-sm w-full" type="button" @click="handleAlign('left')">Left</button>
          <button class="btn-secondary-sm w-full" type="button" @click="handleAlign('center')">Center</button>
          <button class="btn-secondary-sm w-full" type="button" @click="handleAlign('right')">Right</button>
          <button class="btn-secondary-sm w-full" type="button" @click="handleAlign('top')">Top</button>
          <button class="btn-secondary-sm w-full" type="button" @click="handleAlign('middle')">Middle</button>
          <button class="btn-secondary-sm w-full" type="button" @click="handleAlign('bottom')">Bottom</button>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <button
            class="btn-secondary-sm w-full"
            type="button"
            :disabled="selectedObjects.length < 3"
            @click="handleDistribute('horizontal')"
          >
            Distribute H
          </button>
          <button
            class="btn-secondary-sm w-full"
            type="button"
            :disabled="selectedObjects.length < 3"
            @click="handleDistribute('vertical')"
          >
            Distribute V
          </button>
        </div>
        <p class="text-[11px] text-gray-500 dark:text-gray-400">
          Tip: Use “Align to Page” for a single object. Use “Align to Selection” when you have multiple selected.
        </p>
      </div>

      <!-- Layer Controls -->
      <div class="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
        <label class="block text-gray-500 dark:text-gray-400 mb-1 font-medium text-xs leading-4">Layer Order</label>
        <div class="grid grid-cols-2 gap-2">
          <button
            class="btn-secondary-sm w-full"
            @click="editorStore.bringToFront()"
          >
            Bring to Front
          </button>
          <button
            class="btn-secondary-sm w-full"
            @click="editorStore.sendToBack()"
          >
            Send to Back
          </button>
          <button
            class="btn-secondary-sm w-full"
            @click="editorStore.bringForward()"
          >
            Bring Forward
          </button>
          <button
            class="btn-secondary-sm w-full"
            @click="editorStore.sendBackward()"
          >
            Send Backward
          </button>
        </div>
      </div>
    </div>
  </aside>
</template>


