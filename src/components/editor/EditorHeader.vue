<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useEditorStore, useAuthStore } from '@/stores'
import { storeToRefs } from 'pinia'
import { 
  ArrowLeftIcon, 
  ArrowDownTrayIcon, 
  ShareIcon,
} from '@heroicons/vue/24/outline'
import AppButton from '@/components/ui/AppButton.vue'
import { getPresetByCanvasSize } from '@/config/canvas-presets'

import AppTierBadge from '@/components/ui/AppTierBadge.vue'

const emit = defineEmits<{
  (e: 'open-export'): void
  (e: 'open-canvas-setup'): void
  (e: 'save'): void
}>()

const router = useRouter()
const editorStore = useEditorStore()
const authStore = useAuthStore()

const { isDirty, saving, canUndo, canRedo, canvasSize } = storeToRefs(editorStore)

const canShare = computed(() => authStore.isBusiness)

const projectName = computed({
  get: () => editorStore.project?.name || 'Untitled Calendar',
  set: (value: string) => editorStore.setProjectName(value),
})

const canvasOrientation = computed(() => {
  const { width, height } = canvasSize.value
  if (!width || !height) return 'Portrait'
  return width >= height ? 'Landscape' : 'Portrait'
})

const canvasPreset = computed(() => getPresetByCanvasSize(canvasSize.value.width, canvasSize.value.height))

const canvasSizeLabel = computed(() => {
  const presetLabel = canvasPreset.value?.label
  if (presetLabel) {
    return `${presetLabel} ${canvasOrientation.value}`
  }
  const { width, height } = canvasSize.value
  if (!width || !height) return 'Custom size'
  return `${width} × ${height}px ${canvasOrientation.value}`
})
</script>

<template>
  <header class="h-14 bg-white dark:bg-gray-800 z-20 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
    <div class="flex items-center gap-4">
      <button @click="router.push('/dashboard')" class="btn-icon" title="Back to Dashboard">
        <ArrowLeftIcon class="w-5 h-5 text-gray-600 dark:text-gray-300" />
      </button>
      <div class="h-6 w-px bg-gray-200 dark:bg-gray-700"></div>
      <div>
        <input
          v-model="projectName"
          class="input-inline w-64 max-w-[40vw]"
          aria-label="Project name"
        />
        <p class="text-xs text-gray-500">
          <span v-if="isDirty" class="text-amber-500">● Unsaved changes</span>
          <span v-else class="text-green-500">✓ All changes saved</span>
        </p>
      </div>
    </div>
    
    <div class="flex items-center gap-3">
      <!-- Undo/Redo -->
      <div class="flex items-center gap-1 pr-3 border-r border-gray-200 dark:border-gray-700">
        <button 
          @click="editorStore.undo()" 
          :disabled="!canUndo"
          class="btn-icon"
          title="Undo (Ctrl+Z)"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        </button>
        <button 
          @click="editorStore.redo()" 
          :disabled="!canRedo"
          class="btn-icon"
          title="Redo (Ctrl+Shift+Z)"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
          </svg>
        </button>
      </div>

      <button
        type="button"
        class="text-xs font-medium text-gray-600 dark:text-gray-200 hover:text-primary-500 flex items-center gap-1"
        @click="$emit('open-canvas-setup')"
      >
        <span class="inline-flex items-center gap-1">
          {{ canvasSizeLabel }}
          <svg class="w-3 h-3" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 3l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
      </button>
      <div class="h-6 w-px bg-gray-200 dark:bg-gray-700"></div>
      
      <div class="flex items-center gap-1.5">
        <AppButton 
          variant="secondary-sm" 
          class="flex items-center gap-1.5" 
          type="button"
          :disabled="!canShare"
          :title="!canShare ? 'Share is a Business feature' : 'Share project'"
        >
          <ShareIcon class="w-4 h-4" /> Share
        </AppButton>
        <AppTierBadge v-if="!canShare" tier="business" size="sm" />
      </div>

      <AppButton
        variant="secondary-sm"
        class="flex items-center gap-1.5"
        type="button"
        :disabled="!isDirty || saving"
        @click="$emit('save')"
      >
        {{ saving ? 'Saving...' : 'Save' }}
      </AppButton>
      <AppButton
        variant="primary-sm"
        class="flex items-center gap-1.5"
        type="button"
        @click="$emit('open-export')"
      >
        <ArrowDownTrayIcon class="w-4 h-4" /> Export
      </AppButton>
    </div>
  </header>
</template>
