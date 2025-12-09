<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useEditorStore } from '@/stores/editor.store'
import ColorPicker from './ColorPicker.vue'
import FontPicker from './FontPicker.vue'

const editorStore = useEditorStore()
const { selectedObjects, hasSelection } = storeToRefs(editorStore)

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

// Common properties
const opacity = computed({
  get: () => ((selectedObject.value as any)?.opacity || 1) * 100,
  set: (value) => editorStore.updateObjectProperty('opacity', value / 100),
})

const rotation = computed({
  get: () => (selectedObject.value as any)?.angle || 0,
  set: (value) => editorStore.updateObjectProperty('angle', value),
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

      <!-- Text Properties -->
      <template v-if="objectType === 'textbox'">
        <div class="space-y-4">
          <div>
              <label class="block text-gray-500 dark:text-gray-400 mb-1 font-medium text-xs leading-4">Content</label>
              <textarea 
                  v-model="textContent" 
                  class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-transparent min-h-[60px]"
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
                class="property-input w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
              class="flex-1 w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <span class="text-sm text-gray-500">°</span>
          </div>
        </div>
      </div>

      <!-- Layer Controls -->
      <div class="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
        <label class="block text-gray-500 dark:text-gray-400 mb-1 font-medium text-xs leading-4">Layer Order</label>
        <div class="grid grid-cols-2 gap-2">
          <button
            class="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium text-xs leading-4"
            @click="editorStore.bringToFront()"
          >
            Bring to Front
          </button>
          <button
            class="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium text-xs leading-4"
            @click="editorStore.sendToBack()"
          >
            Send to Back
          </button>
          <button
            class="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium text-xs leading-4"
            @click="editorStore.bringForward()"
          >
            Bring Forward
          </button>
          <button
            class="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium text-xs leading-4"
            @click="editorStore.sendBackward()"
          >
            Send Backward
          </button>
        </div>
      </div>
    </div>
  </aside>
</template>


