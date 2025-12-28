<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  tier?: 'free' | 'pro' | 'business' | 'enterprise'
  size?: 'sm' | 'md'
}>()

const tierLabel = computed(() => {
  if (props.tier === 'enterprise') return 'ENTERPRISE'
  if (props.tier === 'business') return 'BUSINESS'
  if (props.tier === 'pro') return 'PRO'
  return 'FREE'
})

const tierClass = computed(() => {
  if (props.tier === 'enterprise') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
  if (props.tier === 'business') return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
  if (props.tier === 'pro') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
  return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
})

const sizeClass = computed(() => {
  if (props.size === 'sm') return 'text-[10px] px-1.5 py-0.5'
  return 'text-xs px-2 py-1'
})
</script>

<template>
  <span
    class="inline-flex items-center font-bold rounded-full"
    :class="[tierClass, sizeClass]"
  >
    {{ tierLabel }}
  </span>
</template>
