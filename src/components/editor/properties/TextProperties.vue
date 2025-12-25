<script setup lang="ts">
import { computed } from 'vue'
import ColorPicker from '../ColorPicker.vue'
import FontPicker from '../FontPicker.vue'

interface Props {
  selectedObject: any
  updateObjectProperty: (property: string, value: any) => void
}

const props = defineProps<Props>()

const textContent = computed({
  get: () => props.selectedObject?.text || '',
  set: (value) => props.updateObjectProperty('text', value),
})

const fontSize = computed({
  get: () => props.selectedObject?.fontSize || 16,
  set: (value) => props.updateObjectProperty('fontSize', value),
})

const fontFamily = computed({
  get: () => props.selectedObject?.fontFamily || 'Inter',
  set: (value) => props.updateObjectProperty('fontFamily', value),
})

const textColor = computed({
  get: () => props.selectedObject?.fill || '#000000',
  set: (value) => props.updateObjectProperty('fill', value),
})

const textAlign = computed({
  get: () => props.selectedObject?.textAlign || 'left',
  set: (value) => props.updateObjectProperty('textAlign', value),
})
</script>

<template>
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
