<script setup lang="ts">
import type { ExportFormat } from '@/types'
import AppTierBadge from '@/components/ui/AppTierBadge.vue'
import {
  DocumentIcon,
  PhotoIcon,
  CodeBracketIcon,
} from '@heroicons/vue/24/outline'

const props = defineProps<{
  modelValue: ExportFormat
  availableFormats: ExportFormat[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: ExportFormat): void
}>()

const formats: { value: ExportFormat; label: string; description: string; icon: string; requiredTier?: 'pro' | 'business' }[] = [
  { value: 'pdf', label: 'PDF', description: 'Best for printing', icon: 'document', requiredTier: 'pro' },
  { value: 'png', label: 'PNG', description: 'Lossless with transparency', icon: 'photo' },
  { value: 'jpg', label: 'JPG', description: 'Smaller file size', icon: 'photo' },
  { value: 'svg', label: 'SVG', description: 'Vector graphics', icon: 'code', requiredTier: 'pro' },
  { value: 'tiff', label: 'TIFF', description: 'Print production', icon: 'document', requiredTier: 'business' },
]

// Filter available formats based on subscription tier
const isAvailable = (format: ExportFormat): boolean => props.availableFormats.includes(format)

function selectFormat(format: ExportFormat): void {
  if (isLocked(format)) return
  emit('update:modelValue', format)
}

function isLocked(format: ExportFormat): boolean {
  return !isAvailable(format)
}
</script>

<template>
  <div class="format-selector grid grid-cols-2 gap-2">
    <button
      v-for="format in formats"
      :key="format.value"
      type="button"
      class="relative flex items-start gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer text-left"
      :class="{
        'border-primary-500 bg-primary-50 dark:bg-primary-900/20': modelValue === format.value,
        'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600': modelValue !== format.value,
        'opacity-60 grayscale-[0.5]': isLocked(format.value)
      }"
      @click="selectFormat(format.value)"
    >
      <div class="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-colors"
           :class="modelValue === format.value 
             ? 'bg-primary-100 dark:bg-primary-800 text-primary-600 dark:text-primary-400' 
             : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'">
        <DocumentIcon v-if="format.icon === 'document'" class="w-5 h-5" />
        <PhotoIcon v-else-if="format.icon === 'photo'" class="w-5 h-5" />
        <CodeBracketIcon v-else-if="format.icon === 'code'" class="w-5 h-5" />
      </div>
      <div class="flex flex-col">
        <span class="font-semibold text-gray-900 dark:text-white text-sm">{{ format.label }}</span>
        <span class="text-xs text-gray-500 dark:text-gray-400">{{ format.description }}</span>
      </div>
      <div v-if="isLocked(format.value)" class="absolute top-2 right-2">
        <AppTierBadge :tier="format.requiredTier" size="sm" />
      </div>
    </button>
  </div>
</template>


