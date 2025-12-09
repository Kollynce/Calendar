<script setup lang="ts">
import type { PaperSize } from '@/types'

const props = defineProps<{
  paperSize: PaperSize
  orientation: 'portrait' | 'landscape'
  bleed: number
  cropMarks: boolean
  safeZone: boolean
}>()

const emit = defineEmits<{
  (e: 'update:paperSize', value: PaperSize): void
  (e: 'update:orientation', value: 'portrait' | 'landscape'): void
  (e: 'update:bleed', value: number): void
  (e: 'update:cropMarks', value: boolean): void
  (e: 'update:safeZone', value: boolean): void
}>()

const paperSizes: { value: PaperSize; label: string; dimensions: string }[] = [
  { value: 'A4', label: 'A4', dimensions: '210 × 297 mm' },
  { value: 'A3', label: 'A3', dimensions: '297 × 420 mm' },
  { value: 'A2', label: 'A2', dimensions: '420 × 594 mm' },
  { value: 'A1', label: 'A1', dimensions: '594 × 841 mm' },
  { value: 'A0', label: 'A0', dimensions: '841 × 1189 mm' },
  { value: 'Letter', label: 'Letter', dimensions: '8.5 × 11 in' },
  { value: 'Legal', label: 'Legal', dimensions: '8.5 × 14 in' },
  { value: 'Tabloid', label: 'Tabloid', dimensions: '11 × 17 in' },
]

const bleedOptions = [
  { value: 0, label: 'None' },
  { value: 3, label: '3mm (Standard)' },
  { value: 5, label: '5mm' },
  { value: 6, label: '6mm (0.25in)' },
]
</script>

<template>
  <div class="print-settings space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
    <h3 class="font-medium text-gray-900 dark:text-white flex items-center gap-2">
      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
      </svg>
      Print Settings
    </h3>

    <!-- Paper Size -->
    <div class="space-y-2">
      <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
        Paper Size
      </label>
      <select
        :value="paperSize"
        class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        @change="emit('update:paperSize', ($event.target as HTMLSelectElement).value as PaperSize)"
      >
        <option 
          v-for="size in paperSizes" 
          :key="size.value" 
          :value="size.value"
        >
          {{ size.label }} ({{ size.dimensions }})
        </option>
      </select>
    </div>

    <!-- Orientation -->
    <div class="space-y-2">
      <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
        Orientation
      </label>
      <div class="flex gap-2">
        <button
          type="button"
          class="flex-1 flex flex-col items-center gap-2 p-3 rounded-lg border-2 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500 transition-colors"
          :class="{ 'border-primary-500 text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20': orientation === 'portrait' }"
          @click="emit('update:orientation', 'portrait')"
        >
          <svg class="w-6 h-8" viewBox="0 0 24 32" fill="currentColor">
            <rect x="2" y="2" width="20" height="28" rx="2" fill="none" stroke="currentColor" stroke-width="2" />
          </svg>
          <span class="text-xs font-medium">Portrait</span>
        </button>
        <button
          type="button"
          class="flex-1 flex flex-col items-center gap-2 p-3 rounded-lg border-2 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500 transition-colors"
          :class="{ 'border-primary-500 text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20': orientation === 'landscape' }"
          @click="emit('update:orientation', 'landscape')"
        >
          <svg class="w-8 h-6" viewBox="0 0 32 24" fill="currentColor">
            <rect x="2" y="2" width="28" height="20" rx="2" fill="none" stroke="currentColor" stroke-width="2" />
          </svg>
          <span class="text-xs font-medium">Landscape</span>
        </button>
      </div>
    </div>

    <!-- Bleed -->
    <div class="space-y-2">
      <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
        Bleed Area
      </label>
      <select
        :value="bleed"
        class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        @change="emit('update:bleed', Number(($event.target as HTMLSelectElement).value))"
      >
        <option 
          v-for="option in bleedOptions" 
          :key="option.value" 
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
      <p class="text-xs text-gray-500">
        Extra area around the design for trimming tolerance
      </p>
    </div>

    <!-- Crop Marks -->
    <div class="flex items-center justify-between">
      <div>
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
          Crop Marks
        </label>
        <p class="text-xs text-gray-500">
          Show trim lines for cutting
        </p>
      </div>
      <button
        type="button"
        role="switch"
        :aria-checked="cropMarks"
        class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
        :class="cropMarks ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'"
        @click="emit('update:cropMarks', !cropMarks)"
      >
        <span 
          class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
          :class="cropMarks ? 'translate-x-6' : 'translate-x-1'"
        />
      </button>
    </div>

    <!-- Safe Zone -->
    <div class="flex items-center justify-between">
      <div>
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
          Safe Zone Guide
        </label>
        <p class="text-xs text-gray-500">
          Show margin for important content
        </p>
      </div>
      <button
        type="button"
        role="switch"
        :aria-checked="safeZone"
        class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
        :class="safeZone ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'"
        @click="emit('update:safeZone', !safeZone)"
      >
        <span 
          class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
          :class="safeZone ? 'translate-x-6' : 'translate-x-1'"
        />
      </button>
    </div>

    <!-- Visual Preview -->
    <div class="mt-4 p-4 bg-white dark:bg-gray-900 rounded-lg">
      <div 
        class="relative mx-auto border-2 border-dashed border-gray-300 dark:border-gray-600"
        :class="orientation === 'portrait' ? 'w-20 h-28' : 'w-28 h-20'"
      >
        <!-- Bleed area -->
        <div 
          v-if="bleed > 0"
          class="absolute inset-0 bg-red-100 dark:bg-red-900/30"
          :style="{ margin: `-${Math.min(bleed, 8)}px` }"
        />
        
        <!-- Content area -->
        <div class="absolute inset-0 bg-white dark:bg-gray-800" />
        
        <!-- Safe zone -->
        <div 
          v-if="safeZone"
          class="absolute inset-2 border border-dashed border-blue-400"
        />

        <!-- Crop marks -->
        <template v-if="cropMarks">
          <div class="absolute -top-3 left-0 w-px h-2 bg-black dark:bg-white" />
          <div class="absolute -top-3 right-0 w-px h-2 bg-black dark:bg-white" />
          <div class="absolute -bottom-3 left-0 w-px h-2 bg-black dark:bg-white" />
          <div class="absolute -bottom-3 right-0 w-px h-2 bg-black dark:bg-white" />
          <div class="absolute top-0 -left-3 w-2 h-px bg-black dark:bg-white" />
          <div class="absolute top-0 -right-3 w-2 h-px bg-black dark:bg-white" />
          <div class="absolute bottom-0 -left-3 w-2 h-px bg-black dark:bg-white" />
          <div class="absolute bottom-0 -right-3 w-2 h-px bg-black dark:bg-white" />
        </template>

        <!-- Content area label -->
        <div class="absolute inset-0 flex items-center justify-center">
          <span class="text-2xs text-gray-400">Content</span>
        </div>
      </div>
      
      <div class="mt-3 flex justify-center gap-4 text-2xs text-gray-500">
        <span v-if="bleed > 0" class="flex items-center gap-1">
          <span class="w-2 h-2 bg-red-200 rounded" /> Bleed
        </span>
        <span v-if="safeZone" class="flex items-center gap-1">
          <span class="w-2 h-2 border border-blue-400 rounded" /> Safe
        </span>
        <span v-if="cropMarks" class="flex items-center gap-1">
          <span class="w-2 h-0.5 bg-black dark:bg-white" /> Crop
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>


.text-2xs {
  font-size: 0.625rem;
  line-height: 0.875rem;
}
</style>
