<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useEditorStore } from '@/stores/editor.store'
import TextProperties from './properties/TextProperties.vue'
import ShapeProperties from './properties/ShapeProperties.vue'
import LineProperties from './properties/LineProperties.vue'
import MonthGridProperties from './properties/MonthGridProperties.vue'
import WeekStripProperties from './properties/WeekStripProperties.vue'
import DateCellProperties from './properties/DateCellProperties.vue'
import CommonProperties from './properties/CommonProperties.vue'
import ArrangementControls from './properties/ArrangementControls.vue'
import type {
  CalendarGridMetadata,
  WeekStripMetadata,
  DateCellMetadata,
  CanvasElementMetadata,
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
        v-if="objectType === 'line' || (objectType === 'group' && (selectedObject as any)?.data?.shapeKind === 'arrow')"
        :selected-object="selectedObject"
        :update-object-property="editorStore.updateObjectProperty"
      />

      <!-- Month Grid Properties -->
      <MonthGridProperties 
        v-if="calendarMetadata"
        :calendar-metadata="calendarMetadata"
        :update-calendar-metadata="updateCalendarMetadata"
      />

      <!-- Week Strip Properties -->
      <WeekStripProperties 
        v-if="weekStripMetadata"
        :week-strip-metadata="weekStripMetadata"
        :update-week-strip-metadata="updateWeekStripMetadata"
      />

      <!-- Date Cell Properties -->
      <DateCellProperties 
        v-if="dateCellMetadata"
        :date-cell-metadata="dateCellMetadata"
        :update-date-cell-metadata="updateDateCellMetadata"
      />

      <!-- Arrangement Controls (Align, Distribute, Layer) -->
      <ArrangementControls 
        :selected-objects="selectedObjects"
        :has-selection="hasSelection"
      />
    </div>
  </aside>
</template>
