<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useExportStore } from '@/stores/export.store'
import { useAuthStore } from '@/stores'
import FormatSelector from './FormatSelector.vue'
import QualitySelector from './QualitySelector.vue'
import PrintSettings from './PrintSettings.vue'
import AppTierBadge from '@/components/ui/AppTierBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { 
  DocumentArrowDownIcon,
  LockClosedIcon,
  SparklesIcon,
} from '@heroicons/vue/24/outline'

const exportStore = useExportStore()
const authStore = useAuthStore()

const { 
  config, 
  exporting, 
  progress, 
  error,
  availableFormats,
  canExportHighRes,
  needsWatermark,
} = storeToRefs(exportStore)

const isPDF = computed(() => config.value.format === 'pdf')
const estimatedSize = computed(() => exportStore.getEstimatedSize())

function handleExport(): void {
  exportStore.exportProject()
}

const emit = defineEmits<{
  (e: 'close'): void
}>()
</script>

<template>
  <div class="export-panel p-6 space-y-6 overflow-y-auto max-h-full">
    <header class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
          Export Calendar
        </h2>
        <p class="mt-1 text-sm text-gray-500">
          Download your calendar in various formats
        </p>
      </div>
      <button 
        class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
        @click="emit('close')"
      >
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </header>

    <!-- Upgrade Banner (for free users) -->
    <div 
      v-if="!authStore.isPro"
      class="bg-linear-to-r from-primary-500 to-indigo-600 rounded-xl p-4 text-white shadow-lg shadow-primary-500/20"
    >
      <div class="flex items-start gap-3">
        <SparklesIcon class="w-6 h-6 shrink-0" />
        <div>
          <div class="flex items-center gap-2">
            <h3 class="font-semibold">Upgrade to Pro</h3>
            <AppTierBadge tier="pro" size="sm" class="bg-white/20" />
          </div>
          <p class="text-sm opacity-90 mt-1">
            Remove watermarks, export in high resolution, and unlock PDF/SVG exports.
          </p>
          <router-link 
            to="/settings/billing"
            class="inline-block mt-3 px-4 py-1.5 bg-white text-primary-600 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
          >
            Upgrade Now
          </router-link>
        </div>
      </div>
    </div>

    <!-- Format Selection -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Format
        </label>
      </div>
      <FormatSelector
        v-model="config.format"
        :available-formats="availableFormats"
      />
    </div>

    <!-- Quality Selection -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Quality
        </label>
        <AppTierBadge v-if="!canExportHighRes" tier="pro" size="sm" />
      </div>
      <QualitySelector
        v-model="config.quality"
        :can-export-high-res="canExportHighRes"
      />
    </div>

    <!-- PDF-specific Settings -->
    <PrintSettings 
      v-if="isPDF"
      v-model:paper-size="config.paperSize"
      v-model:orientation="config.orientation"
      v-model:bleed="config.bleed"
      v-model:crop-marks="config.cropMarks"
      v-model:safe-zone="config.safeZone"
    />

    <!-- Transparency (PNG only) -->
    <div 
      v-if="config.format === 'png'"
      class="flex items-center justify-between"
    >
      <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
        Transparent Background
      </label>
      <button
        type="button"
        role="switch"
        :aria-checked="config.transparent"
        class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
        :class="config.transparent ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'"
        @click="config.transparent = !config.transparent"
      >
        <span 
          class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
          :class="config.transparent ? 'translate-x-6' : 'translate-x-1'"
        />
      </button>
    </div>

    <!-- Estimated Size -->
    <div class="flex items-center justify-between py-3 border-t border-gray-200 dark:border-gray-700">
      <span class="text-sm text-gray-500">Estimated file size</span>
      <span class="text-sm font-medium text-gray-900 dark:text-white">
        {{ estimatedSize }}
      </span>
    </div>

    <!-- Watermark Warning -->
    <div 
      v-if="needsWatermark"
      class="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30"
    >
      <LockClosedIcon class="w-5 h-5 shrink-0" />
      <span class="text-sm">
        Free exports include a watermark. 
        <router-link to="/settings/billing" class="underline font-medium">Upgrade</router-link> 
        to remove.
      </span>
    </div>

    <!-- Error Message -->
    <div 
      v-if="error"
      class="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-700 dark:text-red-400 text-sm border border-red-100 dark:border-red-900/30"
    >
      {{ error }}
    </div>

    <!-- Export Button -->
    <AppButton
      variant="primary"
      class="w-full text-base shadow-lg shadow-primary-500/25"
      :disabled="exporting"
      @click="handleExport"
    >
      <template v-if="exporting">
        <svg class="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span>Exporting... {{ progress }}%</span>
      </template>
      <template v-else>
        <DocumentArrowDownIcon class="w-5 h-5 mr-2" />
        <span>Export {{ config.format.toUpperCase() }}</span>
      </template>
    </AppButton>

    <!-- Progress Bar -->
    <div 
      v-if="exporting"
      class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden"
    >
      <div 
        class="bg-primary-600 h-full transition-all duration-300"
        :style="{ width: `${progress}%` }"
      />
    </div>
  </div>
</template>


