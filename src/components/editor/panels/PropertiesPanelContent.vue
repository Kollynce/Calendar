<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEditorStore } from '@/stores/editor.store'
import { storeToRefs } from 'pinia'
import PropertySection from '@/components/editor/properties/PropertySection.vue'
import PropertyField from '@/components/editor/properties/PropertyField.vue'
import PropertyRow from '@/components/editor/properties/PropertyRow.vue'
import ColorPicker from '@/components/editor/ColorPicker.vue'
import TypographyProperties from '@/components/editor/properties/TypographyProperties.vue'
import MonthGridProperties from '@/components/editor/properties/MonthGridProperties.vue'
import WeekStripProperties from '@/components/editor/properties/WeekStripProperties.vue'
import DateCellProperties from '@/components/editor/properties/DateCellProperties.vue'
import CollageProperties from '@/components/editor/properties/CollageProperties.vue'
import CanvasProperties from '@/components/editor/properties/CanvasProperties.vue'
import TableProperties from '@/components/editor/properties/TableProperties.vue'
import { useAuthStore } from '@/stores/auth.store'
import type {
  CanvasElementMetadata,
  CalendarGridMetadata,
  WeekStripMetadata,
  DateCellMetadata,
  ScheduleMetadata,
  ChecklistMetadata,
  PlannerNoteMetadata,
  CollageMetadata,
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

const selectedObject = computed(() => {
  void editorStore.selectionVersion
  return selectedObjects.value[0]
})

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

// Section management
const activeSections = ref<Set<string>>(new Set(['layout', 'content', 'appearance']))

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
</script>

<template>
  <!-- Canvas Properties (Visible when no selection) -->
  <CanvasProperties v-if="!selectedObject" />

  <section v-else class="space-y-0">
    <!-- Object Type Header -->
    <div class="flex items-center justify-between px-4 pb-4 border-b border-white/5 mb-4">
      <span class="text-xs font-semibold uppercase tracking-widest text-white/60">{{ objectType }}</span>
      <button @click="editorStore.deleteSelected()" class="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors group" title="Delete">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 text-white/50 group-hover:text-red-200">
          <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
        </svg>
      </button>
    </div>

    <!-- Layout Section -->
    <PropertySection 
      title="Layout" 
      :is-open="isSectionOpen('layout')"
      @toggle="toggleSection('layout')"
    >
      <PropertyRow>
        <PropertyField label="Position X">
          <input v-model.number="positionX" type="number" class="control-glass text-xs" />
        </PropertyField>
        <PropertyField label="Position Y">
          <input v-model.number="positionY" type="number" class="control-glass text-xs" />
        </PropertyField>
      </PropertyRow>

      <PropertyRow v-if="elementSize">
        <PropertyField label="Width">
          <input type="number" min="10" class="control-glass" :value="Math.round(elementSize.width)" @change="updateElementSize({ width: Number(($event.target as HTMLInputElement).value), height: elementSize.height })" />
        </PropertyField>
        <PropertyField label="Height">
          <input type="number" min="10" class="control-glass" :value="Math.round(elementSize.height)" @change="updateElementSize({ width: elementSize.width, height: Number(($event.target as HTMLInputElement).value) })" />
        </PropertyField>
      </PropertyRow>
      <PropertyRow v-else>
        <PropertyField label="Width">
          <input v-model.number="objectWidth" type="number" min="1" class="control-glass text-xs" />
        </PropertyField>
        <PropertyField label="Height">
          <input v-model.number="objectHeight" type="number" min="1" class="control-glass text-xs" />
        </PropertyField>
      </PropertyRow>

      <div class="pt-4 border-t border-white/5 space-y-4">
        <div class="flex items-center justify-between gap-3">
          <span class="text-[10px] font-medium text-white/40 uppercase">Align</span>
          <select v-model="localAlignTarget" class="control-glass-sm w-auto text-[10px]">
            <option value="canvas">To Page</option>
            <option value="selection">To Selection</option>
          </select>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <button type="button" class="btn-glass-sm w-full py-1.5 text-[10px]" @click="$emit('align', 'left')">Left</button>
          <button type="button" class="btn-glass-sm w-full py-1.5 text-[10px]" @click="$emit('align', 'center')">Center</button>
          <button type="button" class="btn-glass-sm w-full py-1.5 text-[10px]" @click="$emit('align', 'right')">Right</button>
          <button type="button" class="btn-glass-sm w-full py-1.5 text-[10px]" @click="$emit('align', 'top')">Top</button>
          <button type="button" class="btn-glass-sm w-full py-1.5 text-[10px]" @click="$emit('align', 'middle')">Mid</button>
          <button type="button" class="btn-glass-sm w-full py-1.5 text-[10px]" @click="$emit('align', 'bottom')">Bot</button>
        </div>
        <PropertyRow>
          <button type="button" class="btn-glass-sm w-full py-1.5 text-[10px]" :disabled="selectedObjects.length < 3" :class="selectedObjects.length < 3 ? 'opacity-30 cursor-not-allowed' : ''" @click="$emit('distribute', 'horizontal')">Distribute H</button>
          <button type="button" class="btn-glass-sm w-full py-1.5 text-[10px]" :disabled="selectedObjects.length < 3" :class="selectedObjects.length < 3 ? 'opacity-30 cursor-not-allowed' : ''" @click="$emit('distribute', 'vertical')">Distribute V</button>
        </PropertyRow>
      </div>

      <div class="pt-4 border-t border-white/5">
        <span class="text-[10px] font-medium text-white/40 uppercase mb-2 block">Layer Order</span>
        <PropertyRow>
          <button @click="editorStore.bringToFront()" class="btn-glass-sm w-full py-1.5 text-[10px]">Bring Front</button>
          <button @click="editorStore.sendToBack()" class="btn-glass-sm w-full py-1.5 text-[10px]">Send Back</button>
        </PropertyRow>
      </div>
    </PropertySection>

    <!-- Content Section -->
    <PropertySection 
      title="Content" 
      :is-open="isSectionOpen('content')"
      @toggle="toggleSection('content')"
    >
      <!-- Calendar Grid Properties -->
      <MonthGridProperties v-if="calendarMetadata" :calendar-metadata="calendarMetadata" :update-calendar-metadata="updateCalendarMetadata" />

      <!-- Week Strip Properties -->
      <WeekStripProperties v-if="weekStripMetadata" :week-strip-metadata="weekStripMetadata" :update-week-strip-metadata="updateWeekStripMetadata" />

      <!-- Date Cell Properties -->
      <DateCellProperties v-if="dateCellMetadata" :date-cell-metadata="dateCellMetadata" :update-date-cell-metadata="updateDateCellMetadata" />

      <!-- Table Properties -->
      <TableProperties v-if="tableMetadata" :table-metadata="tableMetadata" :update-table-metadata="updateTableMetadata" />

      <!-- Text Box Content -->
      <PropertyField v-if="objectType === 'textbox'" label="Text Content">
        <textarea v-model="textContent" rows="3" class="control-glass resize-none text-sm"></textarea>
      </PropertyField>

      <!-- Schedule Mode (Content Settings) -->
      <div v-if="scheduleMetadata" :class="{ 'opacity-60 pointer-events-none': !isPro }" class="space-y-4">
        <PropertyField label="Title">
          <input 
            type="text" 
            class="control-glass" 
            :value="scheduleMetadata.title" 
            :disabled="!isPro"
            @input="updateScheduleMetadata((draft) => { draft.title = ($event.target as HTMLInputElement).value })" 
          />
        </PropertyField>
        
        <PropertyRow>
          <PropertyField label="Interval">
            <select 
              class="control-glass-sm text-[10px] w-full" 
              :value="scheduleMetadata.intervalMinutes" 
              :disabled="!isPro"
              @change="updateScheduleMetadata((draft) => { draft.intervalMinutes = Number(($event.target as HTMLSelectElement).value) as ScheduleMetadata['intervalMinutes'] })"
            >
              <option v-for="opt in scheduleIntervalOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
          </PropertyField>
          <div /> <!-- Spacer -->
        </PropertyRow>

        <PropertyRow>
          <PropertyField label="Start Hour">
            <input 
              type="number" 
              min="0" 
              max="23" 
              class="control-glass" 
              :value="scheduleMetadata.startHour" 
              :disabled="!isPro"
              @change="updateScheduleMetadata((draft) => { draft.startHour = Math.max(0, Math.min(23, Number(($event.target as HTMLInputElement).value) || draft.startHour)) })" 
            />
          </PropertyField>
          <PropertyField label="End Hour">
            <input 
              type="number" 
              min="0" 
              max="23" 
              class="control-glass" 
              :value="scheduleMetadata.endHour" 
              :disabled="!isPro"
              @change="updateScheduleMetadata((draft) => { draft.endHour = Math.max(0, Math.min(23, Number(($event.target as HTMLInputElement).value) || draft.endHour)) })" 
            />
          </PropertyField>
        </PropertyRow>
      </div>

      <!-- Checklist Mode (Content Settings) -->
      <div v-if="checklistMetadata" :class="{ 'opacity-60 pointer-events-none': !isPro }" class="space-y-4">
        <PropertyField label="Title">
          <input 
            type="text" 
            class="control-glass" 
            :value="checklistMetadata.title" 
            :disabled="!isPro"
            @input="updateChecklistMetadata((draft) => { draft.title = ($event.target as HTMLInputElement).value })" 
          />
        </PropertyField>
        <PropertyRow class="items-end">
          <PropertyField label="Rows">
            <input 
              type="number" 
              min="1" 
              max="30" 
              class="control-glass" 
              :value="checklistMetadata.rows" 
              :disabled="!isPro"
              @change="updateChecklistMetadata((draft) => { draft.rows = Math.max(1, Math.min(30, Number(($event.target as HTMLInputElement).value) || draft.rows)) })" 
            />
          </PropertyField>
          <label class="flex items-center gap-2 text-[11px] text-white/60 cursor-pointer h-9">
            <input 
              type="checkbox" 
              class="accent-primary-400" 
              :checked="checklistMetadata.showCheckboxes" 
              :disabled="!isPro"
              @change="updateChecklistMetadata((draft) => { draft.showCheckboxes = ($event.target as HTMLInputElement).checked })" 
            />
            <span>Show Checkboxes</span>
          </label>
        </PropertyRow>
      </div>

      <!-- Notes Mode (Content Settings) -->
      <div v-if="notesPanelMetadata" :class="{ 'opacity-60 pointer-events-none': !isPro }" class="space-y-4">
        <PropertyField label="Title">
          <input 
            type="text" 
            class="control-glass" 
            :value="notesPanelMetadata.title" 
            :disabled="!isPro"
            @input="updateNotesPanelMetadata((draft) => { draft.title = ($event.target as HTMLInputElement).value })" 
          />
        </PropertyField>
        <PropertyField label="Pattern">
          <select 
            class="control-glass text-[10px] w-full" 
            :value="notesPanelMetadata.pattern" 
            :disabled="!isPro"
            @change="updateNotesPanelMetadata((draft) => { draft.pattern = ($event.target as HTMLSelectElement).value as any })"
          >
            <option v-for="opt in patternVariantOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </PropertyField>
      </div>
    </PropertySection>

    <!-- Appearance Section -->
    <PropertySection 
      title="Appearance" 
      :is-open="isSectionOpen('appearance')"
      @toggle="toggleSection('appearance')"
    >
      <PropertyField label="Opacity">
        <div class="flex items-center gap-3">
          <input v-model.number="opacity" type="range" min="0" max="100" class="flex-1 accent-primary-400" />
          <span class="text-[10px] text-white/40 w-8 text-right">{{ Math.round(opacity) }}%</span>
        </div>
      </PropertyField>

      <!-- Shape Appearance -->
      <div v-if="objectType === 'rect' || objectType === 'circle' || objectType === 'ellipse' || objectType === 'triangle'" class="space-y-4 pt-4 border-t border-white/5">
        <PropertyRow>
          <PropertyField label="Fill">
            <ColorPicker v-model="fillColor" />
          </PropertyField>
          <PropertyField label="Stroke">
            <ColorPicker v-model="strokeColor" />
          </PropertyField>
        </PropertyRow>
        <PropertyField label="Stroke Width">
          <div class="flex items-center gap-3">
            <input v-model.number="strokeWidth" type="range" min="0" max="20" class="flex-1 accent-primary-400" />
            <span class="text-[10px] text-white/40 w-8 text-right">{{ strokeWidth }}px</span>
          </div>
        </PropertyField>
        <PropertyField v-if="objectType === 'rect'" label="Corner Radius">
          <div class="flex items-center gap-3">
            <input v-model.number="cornerRadius" type="range" min="0" max="50" class="flex-1 accent-primary-400" />
            <span class="text-[10px] text-white/40 w-8 text-right">{{ cornerRadius }}px</span>
          </div>
        </PropertyField>
      </div>

      <!-- Lines & Arrows Appearance -->
      <div v-if="isLineOrArrow" class="space-y-4 pt-4 border-t border-white/5">
        <PropertyField label="Line Stroke">
          <ColorPicker v-model="lineStrokeColor" />
        </PropertyField>
        <PropertyRow>
          <PropertyField label="Width">
            <input v-model.number="lineStrokeWidth" type="number" class="control-glass" />
          </PropertyField>
          <PropertyField label="Dash">
            <select class="control-glass text-[10px]" :value="dashStyle" @change="dashStyle = ($event.target as HTMLSelectElement).value as any">
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
              <option value="dotted">Dotted</option>
              <option value="dash-dot">Dash-dot</option>
            </select>
          </PropertyField>
        </PropertyRow>
        <PropertyRow>
          <PropertyField label="Cap">
            <select class="control-glass text-[10px]" :value="lineCap" @change="lineCap = ($event.target as HTMLSelectElement).value">
              <option value="butt">Butt</option>
              <option value="round">Round</option>
              <option value="square">Square</option>
            </select>
          </PropertyField>
          <PropertyField label="Join">
            <select class="control-glass text-[10px]" :value="lineJoin" @change="lineJoin = ($event.target as HTMLSelectElement).value">
              <option value="miter">Miter</option>
              <option value="round">Round</option>
              <option value="bevel">Bevel</option>
            </select>
          </PropertyField>
        </PropertyRow>

        <!-- Arrowhead Settings -->
        <div v-if="isArrow" class="space-y-4 pt-4 border-t border-white/5">
          <span class="text-[10px] font-medium text-white/40 uppercase mb-2 block">Arrowhead</span>
          <PropertyRow>
            <PropertyField label="Ends">
              <select class="control-glass text-[10px]" :value="arrowEnds" @change="arrowEnds = ($event.target as HTMLSelectElement).value">
                <option value="end">End</option>
                <option value="start">Start</option>
                <option value="both">Both</option>
                <option value="none">None</option>
              </select>
            </PropertyField>
            <PropertyField label="Style">
              <select class="control-glass text-[10px]" :value="arrowHeadStyle" @change="arrowHeadStyle = ($event.target as HTMLSelectElement).value">
                <option value="filled">Filled</option>
                <option value="open">Open</option>
              </select>
            </PropertyField>
          </PropertyRow>
          <PropertyRow>
            <PropertyField label="Length">
              <input v-model.number="arrowHeadLength" type="number" min="4" max="80" class="control-glass" />
            </PropertyField>
            <PropertyField label="Width">
              <input v-model.number="arrowHeadWidth" type="number" min="4" max="80" class="control-glass" />
            </PropertyField>
          </PropertyRow>
        </div>
      </div>

      <!-- Planner Blocks Appearance -->
      <div v-if="scheduleMetadata || checklistMetadata || notesPanelMetadata" :class="{ 'opacity-60 pointer-events-none': !isPro }" class="space-y-4 pt-4 border-t border-white/5">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-medium text-white/40 uppercase">Header</span>
          <label class="flex items-center gap-2 text-[11px] text-white/60 cursor-pointer">
            <input 
              type="checkbox" 
              class="accent-primary-400" 
              :checked="(scheduleMetadata || checklistMetadata || notesPanelMetadata)?.showHeader !== false" 
              :disabled="!isPro"
              @change="v => {
                const checked = (v.target as HTMLInputElement).checked;
                if (scheduleMetadata) updateScheduleMetadata(d => d.showHeader = checked);
                else if (checklistMetadata) updateChecklistMetadata(d => d.showHeader = checked);
                else if (notesPanelMetadata) updateNotesPanelMetadata(d => d.showHeader = checked);
              }" 
            />
            <span>Show</span>
          </label>
        </div>

        <div v-if="(scheduleMetadata || checklistMetadata || notesPanelMetadata)?.showHeader !== false" class="space-y-4 pt-4 border-t border-white/5">
          <PropertyRow>
            <PropertyField label="Style">
              <select 
                class="control-glass text-[10px]" 
                :value="(scheduleMetadata || checklistMetadata || notesPanelMetadata)?.headerStyle ?? 'minimal'" 
                :disabled="!isPro"
                @change="v => {
                  const val = (v.target as HTMLSelectElement).value as any;
                  if (scheduleMetadata) updateScheduleMetadata(d => d.headerStyle = val);
                  else if (checklistMetadata) updateChecklistMetadata(d => d.headerStyle = val);
                  else if (notesPanelMetadata) updateNotesPanelMetadata(d => d.headerStyle = val);
                }"
              >
                <option v-for="opt in headerStyleOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </PropertyField>
            <PropertyField label="Align">
              <select
                class="control-glass text-[10px]"
                :value="(scheduleMetadata || checklistMetadata || notesPanelMetadata)?.titleAlign ?? 'left'"
                :disabled="!isPro"
                @change="v => {
                  const val = (v.target as HTMLSelectElement).value as any;
                  if (scheduleMetadata) updateScheduleMetadata(d => d.titleAlign = val);
                  else if (checklistMetadata) updateChecklistMetadata(d => d.titleAlign = val);
                  else if (notesPanelMetadata) updateNotesPanelMetadata(d => d.titleAlign = val);
                }"
              >
                <option v-for="opt in titleAlignOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </PropertyField>
          </PropertyRow>

          <PropertyField label="Height">
            <div class="flex items-center gap-3">
              <input
                type="range"
                min="30"
                max="100"
                step="5"
                class="flex-1 accent-primary-400"
                :value="(scheduleMetadata || checklistMetadata || notesPanelMetadata)?.headerHeight ?? 50"
                :disabled="!isPro"
                @input="v => {
                  const val = Number((v.target as HTMLInputElement).value);
                  if (scheduleMetadata) updateScheduleMetadata(d => d.headerHeight = val);
                  else if (checklistMetadata) updateChecklistMetadata(d => d.headerHeight = val);
                  else if (notesPanelMetadata) updateNotesPanelMetadata(d => d.headerHeight = val);
                }"
              />
              <span class="text-[10px] text-white/40 w-8 text-right">{{ (scheduleMetadata || checklistMetadata || notesPanelMetadata)?.headerHeight ?? 50 }}px</span>
            </div>
          </PropertyField>
        </div>

        <div class="space-y-4 pt-4 border-t border-white/5">
          <PropertyRow>
            <PropertyField label="Accent">
              <ColorPicker 
                :model-value="(scheduleMetadata || checklistMetadata || notesPanelMetadata)?.accentColor ?? '#3b82f6'" 
                :disabled="!isPro"
                @update:modelValue="(c: string) => { 
                  if (scheduleMetadata) updateScheduleMetadata(d => d.accentColor = c);
                  else if (checklistMetadata) updateChecklistMetadata(d => d.accentColor = c);
                  else if (notesPanelMetadata) updateNotesPanelMetadata(d => d.accentColor = c);
                }" 
              />
            </PropertyField>
            <PropertyField v-if="scheduleMetadata" label="Line Color">
              <ColorPicker 
                :model-value="scheduleMetadata.lineColor ?? '#e2e8f0'" 
                :disabled="!isPro"
                @update:modelValue="(c: string) => updateScheduleMetadata(d => d.lineColor = c)" 
              />
            </PropertyField>
            <PropertyField v-else-if="checklistMetadata" label="Lines">
              <ColorPicker 
                :model-value="checklistMetadata.lineColor ?? '#e2e8f0'" 
                :disabled="!isPro"
                @update:modelValue="(c: string) => updateChecklistMetadata(d => d.lineColor = c)" 
              />
            </PropertyField>
            <PropertyField v-else-if="notesPanelMetadata && notesPanelMetadata.pattern !== 'hero'" label="Lines/Dots">
              <ColorPicker 
                :model-value="(notesPanelMetadata.pattern === 'dot' ? notesPanelMetadata.dotColor : notesPanelMetadata.guideColor) ?? '#e2e8f0'" 
                :disabled="!isPro"
                @update:modelValue="(c: string) => {
                  if (notesPanelMetadata?.pattern === 'dot') updateNotesPanelMetadata(d => { d.dotColor = c; d.guideColor = c });
                  else updateNotesPanelMetadata(d => d.guideColor = c);
                }" 
              />
            </PropertyField>
            <div v-else />
          </PropertyRow>

          <PropertyRow v-if="checklistMetadata">
            <PropertyField label="Checkbox">
              <ColorPicker 
                :model-value="checklistMetadata.checkboxColor ?? checklistMetadata.accentColor" 
                :disabled="!isPro"
                @update:modelValue="(c: string) => updateChecklistMetadata(d => d.checkboxColor = c)" 
              />
            </PropertyField>
            <div />
          </PropertyRow>

          <PropertyRow>
            <PropertyField label="Background">
              <ColorPicker 
                :model-value="(scheduleMetadata || checklistMetadata || notesPanelMetadata)?.backgroundColor ?? '#ffffff'" 
                :disabled="!isPro"
                @update:modelValue="(c: string) => { 
                  if (scheduleMetadata) updateScheduleMetadata(d => d.backgroundColor = c);
                  else if (checklistMetadata) updateChecklistMetadata(d => d.backgroundColor = c);
                  else if (notesPanelMetadata) updateNotesPanelMetadata(d => d.backgroundColor = c);
                }" 
              />
            </PropertyField>
            <PropertyField label="Border Color">
              <ColorPicker 
                :model-value="(scheduleMetadata || checklistMetadata || notesPanelMetadata)?.borderColor ?? '#e2e8f0'" 
                :disabled="!isPro"
                @update:modelValue="(c: string) => { 
                  if (scheduleMetadata) updateScheduleMetadata(d => d.borderColor = c);
                  else if (checklistMetadata) updateChecklistMetadata(d => d.borderColor = c);
                  else if (notesPanelMetadata) updateNotesPanelMetadata(d => d.borderColor = c);
                }" 
              />
            </PropertyField>
          </PropertyRow>

          <!-- Toggles for Background and Border -->
          <PropertyRow>
            <label class="flex items-center gap-2 text-[11px] text-white/60 cursor-pointer h-9">
              <input 
                type="checkbox" 
                class="accent-primary-400" 
                :checked="(scheduleMetadata || checklistMetadata || notesPanelMetadata)?.showBackground !== false" 
                :disabled="!isPro"
                @change="v => {
                  const checked = (v.target as HTMLInputElement).checked;
                  if (scheduleMetadata) updateScheduleMetadata(d => d.showBackground = checked);
                  else if (checklistMetadata) updateChecklistMetadata(d => d.showBackground = checked);
                  else if (notesPanelMetadata) updateNotesPanelMetadata(d => d.showBackground = checked);
                }" 
              />
              <span>Show Background</span>
            </label>
            <label class="flex items-center gap-2 text-[11px] text-white/60 cursor-pointer h-9">
              <input 
                type="checkbox" 
                class="accent-primary-400" 
                :checked="(scheduleMetadata || checklistMetadata || notesPanelMetadata)?.showBorder !== false" 
                :disabled="!isPro"
                @change="v => {
                  const checked = (v.target as HTMLInputElement).checked;
                  if (scheduleMetadata) updateScheduleMetadata(d => d.showBorder = checked);
                  else if (checklistMetadata) updateChecklistMetadata(d => d.showBorder = checked);
                  else if (notesPanelMetadata) updateNotesPanelMetadata(d => d.showBorder = checked);
                }" 
              />
              <span>Show Border</span>
            </label>
          </PropertyRow>

          <PropertyRow>
            <PropertyField label="Corner Radius">
              <input 
                type="number" 
                class="control-glass" 
                :value="(scheduleMetadata || checklistMetadata || notesPanelMetadata)?.cornerRadius ?? 22" 
                :disabled="!isPro"
                @change="v => {
                  const val = Math.max(0, Math.min(80, Number((v.target as HTMLInputElement).value) || 0));
                  if (scheduleMetadata) updateScheduleMetadata(d => d.cornerRadius = val);
                  else if (checklistMetadata) updateChecklistMetadata(d => d.cornerRadius = val);
                  else if (notesPanelMetadata) updateNotesPanelMetadata(d => d.cornerRadius = val);
                }" 
              />
            </PropertyField>
            <PropertyField label="Border Width">
              <input 
                type="number" 
                class="control-glass" 
                :value="(scheduleMetadata || checklistMetadata || notesPanelMetadata)?.borderWidth ?? 1" 
                :disabled="!isPro"
                @change="v => {
                  const val = Math.max(0, Math.min(10, Number((v.target as HTMLInputElement).value) || 0));
                  if (scheduleMetadata) updateScheduleMetadata(d => d.borderWidth = val);
                  else if (checklistMetadata) updateChecklistMetadata(d => d.borderWidth = val);
                  else if (notesPanelMetadata) updateNotesPanelMetadata(d => d.borderWidth = val);
                }" 
              />
            </PropertyField>
          </PropertyRow>
        </div>
      </div>
    </PropertySection>

    <!-- Typography Section (Text objects only for now) -->
    <PropertySection 
      v-if="objectType === 'textbox'"
      title="Typography" 
      :is-open="isSectionOpen('typography')"
      @toggle="toggleSection('typography')"
    >
      <TypographyProperties />
    </PropertySection>

    <!-- Collage Settings (Moved to Content if active) -->
    <PropertySection 
      v-if="collageMetadata"
      title="Collage Settings" 
      :is-open="isSectionOpen('collage_settings')"
      @toggle="toggleSection('collage_settings')"
      is-last
    >
      <CollageProperties 
        :collage-metadata="collageMetadata" 
        :update-collage-metadata="updateCollageMetadata" 
        :disabled="!isPro"
      />
    </PropertySection>
  </section>
</template>
