<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useEditorStore } from '@/stores/editor.store'
import ExportModal from '@/components/export/ExportModal.vue'
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
} from '@heroicons/vue/24/outline'

const editorStore = useEditorStore()
const { 
  canUndo, 
  canRedo, 
  hasSelection, 
  isDirty, 
  saving 
} = storeToRefs(editorStore)

const tools = [
  { id: 'select', icon: 'cursor', label: 'Select' },
  { id: 'text', icon: 'text', label: 'Text' },
  { id: 'shape', icon: 'shape', label: 'Shape' },
  { id: 'image', icon: 'image', label: 'Image' },
  { id: 'calendar', icon: 'calendar', label: 'Calendar' },
]

const activeTool = ref('select')
const showExportModal = ref(false)

function selectTool(toolId: string): void {
  activeTool.value = toolId
  
  if (toolId === 'text') {
    editorStore.addObject('text')
  } else if (toolId === 'shape') {
    editorStore.addObject('shape')
  } else if (toolId === 'calendar') {
    editorStore.addObject('calendar-grid')
  } else if (toolId === 'image') {
      handleImageUpload()
  }
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
      <button
        v-for="tool in tools"
        :key="tool.id"
        class="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        :class="{ 'bg-primary-100 text-primary-600 dark:bg-primary-900/50 dark:text-primary-400': activeTool === tool.id }"
        @click="selectTool(tool.id)"
        :title="tool.label"
      >
        <span class="capitalize text-xs font-medium">{{ tool.label }}</span>
      </button>
      
      <button
        class="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        @click="handleImageUpload"
        title="Upload Image"
      >
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
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
    <ExportModal v-model:open="showExportModal" />
  </header>
</template>


