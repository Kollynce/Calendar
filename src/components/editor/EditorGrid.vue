<script setup lang="ts">
defineProps<{
  zoom: number
  width: number
  height: number
  gridSize?: number
}>()
</script>

<template>
  <div class="editor-grid absolute inset-0 pointer-events-none overflow-hidden">
    <svg 
      width="100%" 
      height="100%" 
      xmlns="http://www.w3.org/2000/svg"
      class="opacity-20"
    >
      <defs>
        <pattern 
          id="smallGrid" 
          width="10" 
          height="10" 
          patternUnits="userSpaceOnUse"
          :patternTransform="`scale(${zoom})`"
        >
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" stroke-width="0.5"/>
        </pattern>
        <pattern 
          id="grid" 
          width="100" 
          height="100" 
          patternUnits="userSpaceOnUse"
          :patternTransform="`scale(${zoom})`"
        >
          <rect width="100" height="100" fill="url(#smallGrid)"/>
          <path d="M 100 0 L 0 0 0 100" fill="none" stroke="currentColor" stroke-width="1"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" class="text-gray-400 dark:text-gray-600" />
    </svg>
  </div>
</template>
