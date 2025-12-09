<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  zoom: number
}>()

// Generate ruler markers
const horizontalMarkers = computed(() => {
  const markers = []
  const step = 100 * props.zoom
  // Assume a default width, in real usage might need to be dynamic or infinite
  for (let i = 0; i < 20; i++) {
    markers.push({ 
      value: i * 100, 
      pos: i * step 
    })
  }
  return markers
})

const verticalMarkers = computed(() => {
  const markers = []
  const step = 100 * props.zoom
  for (let i = 0; i < 20; i++) {
    markers.push({ 
      value: i * 100, 
      pos: i * step 
    })
  }
  return markers
})
</script>

<template>
  <div class="editor-rulers absolute inset-0 pointer-events-none overflow-hidden">
    <!-- Top Ruler -->
    <div class="absolute top-0 left-8 right-0 h-6 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex overflow-hidden">
      <div 
        v-for="marker in horizontalMarkers" 
        :key="`h-${marker.value}`"
        class="absolute top-0 h-full border-l border-gray-300 dark:border-gray-600 text-[10px] pl-1 text-gray-500"
        :style="{ left: `${marker.pos}px` }"
      >
        {{ marker.value }}
      </div>
    </div>

    <!-- Left Ruler -->
    <div class="absolute top-8 left-0 bottom-0 w-8 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
      <div 
        v-for="marker in verticalMarkers" 
        :key="`v-${marker.value}`"
        class="absolute left-0 w-full border-t border-gray-300 dark:border-gray-600 text-[10px] pt-0.5 text-center text-gray-500"
        :style="{ top: `${marker.pos}px` }"
      >
        <span class="block -rotate-90 origin-center translate-y-2">{{ marker.value }}</span>
      </div>
    </div>
    
    <!-- Corner Box -->
    <div class="absolute top-0 left-0 w-8 h-8 bg-gray-100 dark:bg-gray-900 border-r border-b border-gray-200 dark:border-gray-700 z-10"></div>
  </div>
</template>
