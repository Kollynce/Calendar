<script setup lang="ts">
defineProps<{
  cols?: number | string
  gap?: number | string
}>()
</script>

<template>
  <div 
    class="grid gap-3" 
    :class="[
      cols === '3' ? 'grid-cols-3' : 'grid-cols-2',
      gap ? `gap-${gap}` : 'gap-3'
    ]"
  >
    <slot />
  </div>
</template>
