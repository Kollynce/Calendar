<script setup lang="ts">
import type { ExportQuality } from '@/types'

import AppTierBadge from '@/components/ui/AppTierBadge.vue'

const props = defineProps<{
  modelValue: ExportQuality
  canExportHighRes: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: ExportQuality): void
}>()

const qualities: { value: ExportQuality; label: string; dpi: number; description: string; requiredTier?: 'pro' | 'business' }[] = [
  { value: 'screen', label: 'Screen', dpi: 72, description: 'Web & social media' },
  { value: 'print', label: 'Print', dpi: 300, description: 'Standard printing', requiredTier: 'pro' },
  { value: 'press', label: 'Press', dpi: 300, description: 'Professional printing', requiredTier: 'pro' },
]

function selectQuality(quality: ExportQuality): void {
  if (isLocked(quality)) return
  emit('update:modelValue', quality)
}

function isLocked(quality: ExportQuality): boolean {
  if (quality === 'screen') return false
  return !props.canExportHighRes
}
</script>

<template>
  <div class="quality-selector space-y-2">
    <button
      v-for="quality in qualities"
      :key="quality.value"
      type="button"
      class="w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer text-left"
      :class="{
        'border-primary-500 bg-primary-50 dark:bg-primary-900/20': modelValue === quality.value,
        'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600': modelValue !== quality.value,
        'opacity-60 grayscale-[0.5]': isLocked(quality.value)
      }"
      @click="selectQuality(quality.value)"
    >
      <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
           :class="modelValue === quality.value ? 'border-primary-500' : 'border-gray-300 dark:border-gray-600'">
        <div class="w-2.5 h-2.5 rounded-full bg-primary-500" v-if="modelValue === quality.value" />
      </div>
      <div class="flex flex-col flex-1">
        <div class="flex items-center gap-2">
          <span class="font-medium text-gray-900 dark:text-white">{{ quality.label }}</span>
          <span class="text-xs font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">{{ quality.dpi }} DPI</span>
        </div>
        <span class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{{ quality.description }}</span>
      </div>
      <div v-if="isLocked(quality.value)" class="">
        <AppTierBadge :tier="quality.requiredTier" size="sm" />
      </div>
    </button>
  </div>
</template>


