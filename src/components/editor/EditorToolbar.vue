<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useEditorStore } from '@/stores/editor.store'
import { useCalendarStore } from '@/stores/calendar.store'
import ExportModal from '@/components/export/ExportModal.vue'
import { MenuItem } from '@headlessui/vue'
import AppDropdownMenu from '@/components/ui/AppDropdownMenu.vue'
import { 
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  ClipboardDocumentIcon,
  Bars3BottomLeftIcon,
  Bars3Icon,
  Bars3BottomRightIcon,
  ArrowDownTrayIcon,
  CursorArrowRaysIcon, // For Select
  PencilSquareIcon, // For Text
  Square2StackIcon, // For Shape
  PhotoIcon, // For Image
  CalendarIcon, // For Calendar
  StopIcon, // For Rect
  ViewColumnsIcon // For Line (approx)
} from '@heroicons/vue/24/outline'

const editorStore = useEditorStore()
const calendarStore = useCalendarStore()
const { 
  canUndo, 
  canRedo, 
  hasSelection, 
  isDirty, 
  saving 
} = storeToRefs(editorStore)

const activeTool = ref('select')
const showExportModal = ref(false)

function selectTool(toolId: string): void {
  activeTool.value = toolId
  
  if (toolId === 'text') {
    editorStore.addObject('text')
  } else if (toolId === 'calendar') {
    editorStore.addObject('calendar-grid', { language: calendarStore.config.language })
  } else if (toolId === 'image') {
      handleImageUpload()
  } else if (toolId === 'select') {
    // Just select mode
  }
}

function addShape(shapeType: string): void {
  editorStore.addObject('shape', { shapeType })
  activeTool.value = 'shape'
}

function handleImageUpload(): void {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      await editorStore.addImage(url)
    }
  }
  input.click()
}

function openExportModal(): void {
  showExportModal.value = true
}
</script>

<template>
  <header class="editor-toolbar h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 gap-2">
    <!-- Logo / Back -->
    <div class="flex items-center gap-3 pr-4 border-r border-gray-200 dark:border-gray-700">
      <router-link 
        to="/dashboard" 
        class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
      >
        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
      </router-link>
      <span class="font-semibold text-gray-900 dark:text-white">Calendar Creator</span>
    </div>

    <!-- Undo / Redo -->
    <div class="flex items-center gap-1 px-2 border-r border-gray-200 dark:border-gray-700">
      <button
        class="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        :disabled="!canUndo"
        @click="editorStore.undo()"
        title="Undo (Ctrl+Z)"
      >
        <ArrowUturnLeftIcon class="w-5 h-5" />
      </button>
      <button
        class="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        :disabled="!canRedo"
        @click="editorStore.redo()"
        title="Redo (Ctrl+Shift+Z)"
      >
        <ArrowUturnRightIcon class="w-5 h-5" />
      </button>
    </div>

    <!-- Tools -->
    <div class="flex items-center gap-1 px-2 border-r border-gray-200 dark:border-gray-700">
      <!-- Select -->
      <button
        class="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        :class="{ 'bg-primary-100 text-primary-600 dark:bg-primary-900/50 dark:text-primary-400': activeTool === 'select' }"
        @click="selectTool('select')"
        title="Select"
      >
        <CursorArrowRaysIcon class="w-5 h-5" />
      </button>

      <!-- Text -->
      <button
        class="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        :class="{ 'bg-primary-100 text-primary-600 dark:bg-primary-900/50 dark:text-primary-400': activeTool === 'text' }"
        @click="selectTool('text')"
        title="Text"
      >
        <PencilSquareIcon class="w-5 h-5" />
      </button>

      <!-- Shape Dropdown -->
      <AppDropdownMenu
        align="left"
        width="sm"
        :button-class="[
          'p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-1',
          activeTool === 'shape' ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/50 dark:text-primary-400' : '',
        ].join(' ')"
      >
        <template #button>
          <Square2StackIcon class="w-5 h-5" />
        </template>

        <template #items>
          <div class="px-1 py-1">
            <MenuItem v-slot="{ active }">
              <button
                :class="[
                  active ? 'bg-primary-500 text-white' : 'text-gray-900 dark:text-gray-200',
                  'group flex w-full items-center rounded-md px-2 py-2 text-sm',
                ]"
                @click="addShape('rect')"
              >
                <StopIcon class="mr-2 h-4 w-4" />
                Rectangle
              </button>
            </MenuItem>
            <MenuItem v-slot="{ active }">
              <button
                :class="[
                  active ? 'bg-primary-500 text-white' : 'text-gray-900 dark:text-gray-200',
                  'group flex w-full items-center rounded-md px-2 py-2 text-sm',
                ]"
                @click="addShape('circle')"
              >
                <div class="mr-2 h-4 w-4 border-2 border-current rounded-full"></div>
                Circle
              </button>
            </MenuItem>
            <MenuItem v-slot="{ active }">
              <button
                :class="[
                  active ? 'bg-primary-500 text-white' : 'text-gray-900 dark:text-gray-200',
                  'group flex w-full items-center rounded-md px-2 py-2 text-sm',
                ]"
                @click="addShape('line')"
              >
                <ViewColumnsIcon class="mr-2 h-4 w-4 transform rotate-90" />
                Line
              </button>
            </MenuItem>
          </div>
        </template>
      </AppDropdownMenu>

      <!-- Calendar -->
      <button
        class="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        :class="{ 'bg-primary-100 text-primary-600 dark:bg-primary-900/50 dark:text-primary-400': activeTool === 'calendar' }"
        @click="selectTool('calendar')"
        title="Calendar"
      >
        <CalendarIcon class="w-5 h-5" />
      </button>

      <!-- Image -->
      <button
        class="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        :class="{ 'bg-primary-100 text-primary-600 dark:bg-primary-900/50 dark:text-primary-400': activeTool === 'image' }"
        @click="handleImageUpload"
        title="Upload Image"
      >
        <PhotoIcon class="w-5 h-5" />
      </button>
    </div>

    <!-- Selection Actions -->
    <div 
      v-if="hasSelection"
      class="flex items-center gap-1 px-2 border-r border-gray-200 dark:border-gray-700"
    >
      <button
        class="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        @click="editorStore.copySelected()"
        title="Copy (Ctrl+C)"
      >
        <ClipboardDocumentIcon class="w-5 h-5" />
      </button>
      <button
        class="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        @click="editorStore.duplicateSelected()"
        title="Duplicate (Ctrl+D)"
      >
        <DocumentDuplicateIcon class="w-5 h-5" />
      </button>
      <button
        class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-red-500 hover:text-red-600"
        @click="editorStore.deleteSelected()"
        title="Delete"
      >
        <TrashIcon class="w-5 h-5" />
      </button>
    </div>

    <!-- Alignment (when selected) -->
    <div 
      v-if="hasSelection"
      class="flex items-center gap-1 px-2 border-r border-gray-200 dark:border-gray-700"
    >
      <button
        class="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        @click="editorStore.alignObjects('left')"
        title="Align Left"
      >
        <Bars3BottomLeftIcon class="w-5 h-5" />
      </button>
      <button
        class="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        @click="editorStore.alignObjects('center')"
        title="Align Center"
      >
        <Bars3Icon class="w-5 h-5" />
      </button>
      <button
        class="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        @click="editorStore.alignObjects('right')"
        title="Align Right"
      >
        <Bars3BottomRightIcon class="w-5 h-5" />
      </button>
    </div>

    <!-- Spacer -->
    <div class="flex-1" />

    <!-- Save Status -->
    <div class="flex items-center gap-2 text-sm mr-4">
      <span 
        v-if="isDirty" 
        class="text-amber-500"
      >
        Unsaved changes
      </span>
      <span 
        v-else 
        class="text-green-500"
      >
        All changes saved
      </span>
    </div>

    <!-- Save Button -->
    <button
      class="px-4 py-2 rounded-lg font-medium transition-colors text-sm bg-primary-600 text-white hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed dark:disabled:bg-gray-700 mr-2"
      :disabled="saving || !isDirty"
      @click="editorStore.saveProject()"
    >
      <span v-if="saving">Saving...</span>
      <span v-else>Save</span>
    </button>

    <!-- Export Button -->
    <button 
      class="px-4 py-2 rounded-lg font-medium transition-colors text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 flex items-center gap-2"
      @click="openExportModal"
    >
      <ArrowDownTrayIcon class="w-4 h-4" />
      Export
    </button>

    <!-- Export Modal -->
    <ExportModal :isOpen="showExportModal" @close="showExportModal = false" />
  </header>
</template>


