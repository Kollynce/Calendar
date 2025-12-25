<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useEditorStore } from '@/stores/editor.store'
import TextProperties from './properties/TextProperties.vue'
import ShapeProperties from './properties/ShapeProperties.vue'
import LineProperties from './properties/LineProperties.vue'
import CalendarProperties from './properties/CalendarProperties.vue'
import CommonProperties from './properties/CommonProperties.vue'
import ArrangementControls from './properties/ArrangementControls.vue'
import ColorPicker from './ColorPicker.vue'
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

const selectedObject = computed(() => selectedObjects.value[0])

const objectType = computed(() => {
  if (!selectedObject.value) return null
  return selectedObject.value.type
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

// Metadata update functions
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

// Date handling functions
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

// Options for various selects
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

      <!-- Common Properties (Position, Size, Opacity, Rotation) -->
      <CommonProperties 
        :selected-object="selectedObject"
        :element-metadata="elementMetadata"
        :update-object-property="editorStore.updateObjectProperty"
        :update-selected-element-metadata="editorStore.updateSelectedElementMetadata"
      />

      <!-- Text Properties -->
      <TextProperties 
        v-if="objectType === 'textbox'"
        :selected-object="selectedObject"
        :update-object-property="editorStore.updateObjectProperty"
      />

      <!-- Shape Properties -->
      <ShapeProperties 
        v-if="objectType === 'rect' || objectType === 'circle'"
        :selected-object="selectedObject"
        :update-object-property="editorStore.updateObjectProperty"
      />

      <!-- Line/Arrow Properties -->
      <LineProperties 
        v-if="objectType === 'line' || (objectType === 'group' && selectedObject?.data?.shapeKind === 'arrow')"
        :selected-object="selectedObject"
        :update-object-property="editorStore.updateObjectProperty"
      />

      <!-- Calendar Grid Properties -->
      <CalendarProperties 
        v-if="calendarMetadata"
        :calendar-metadata="calendarMetadata"
        :update-calendar-metadata="updateCalendarMetadata"
      />

      <!-- Week Strip Properties -->
      <div v-if="weekStripMetadata" class="space-y-4 border border-gray-200 dark:border-gray-700 rounded-2xl p-4">
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

      <!-- Date Cell Properties -->
      <div v-if="dateCellMetadata" class="space-y-4 border border-gray-200 dark:border-gray-700 rounded-2xl p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-widest">Day Card</p>
            <p class="text-sm text-gray-700 dark:text-gray-100">Highlight Tile</p>
          </div>
        </div>
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

      <!-- Arrangement Controls (Align, Distribute, Layer) -->
      <ArrangementControls 
        :selected-objects="selectedObjects"
        :has-selection="hasSelection"
      />
    </div>
  </aside>
</template>
