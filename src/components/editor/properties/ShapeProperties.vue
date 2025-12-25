<script setup lang="ts">
import { computed } from 'vue'
import ColorPicker from '../ColorPicker.vue'

interface Props {
  selectedObject: any
  updateObjectProperty: (property: string, value: any) => void
}

const props = defineProps<Props>()

const fillColor = computed({
  get: () => props.selectedObject?.fill || '#3b82f6',
  set: (value) => props.updateObjectProperty('fill', value),
})

const strokeColor = computed({
  get: () => props.selectedObject?.stroke || '',
  set: (value) => props.updateObjectProperty('stroke', value),
})

const strokeWidth = computed({
  get: () => props.selectedObject?.strokeWidth || 0,
  set: (value) => props.updateObjectProperty('strokeWidth', value),
})
</script>

<template>
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
