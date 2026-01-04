<script setup lang="ts">
import { computed, ref, watch, type Component } from 'vue'
import { storeToRefs } from 'pinia'
import { useExportStore } from '@/stores/export.store'
import { useEditorStore } from '@/stores/editor.store'
import { 
  Dialog, 
  DialogPanel, 
  DialogTitle, 
  TransitionChild, 
  TransitionRoot 
} from '@headlessui/vue'
import { useAuthStore } from '@/stores'
import AppTierBadge from '@/components/ui/AppTierBadge.vue'
import { 
  XMarkIcon, 
  DocumentArrowDownIcon, 
  PhotoIcon,
  PrinterIcon,
  ArrowPathIcon,
  CodeBracketIcon,
  LockClosedIcon,
  ScissorsIcon,
  ShieldCheckIcon,
  CalendarDaysIcon,
  Squares2X2Icon,
  ArrowsRightLeftIcon,
} from '@heroicons/vue/24/outline'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits(['close'])

const exportStore = useExportStore()
const editorStore = useEditorStore()
const authStore = useAuthStore()
const { config, exporting, progress, statusText, error, availableFormats, maxDPI, canRetryLastServerExport } = storeToRefs(exportStore)

const previewUrl = ref<string | null>(null)

const previewAspect = computed(() => {
  const canvas: any = editorStore.canvas
  const w = typeof canvas?.getWidth === 'function' ? canvas.getWidth() : canvas?.width
  const h = typeof canvas?.getHeight === 'function' ? canvas.getHeight() : canvas?.height
  if (!w || !h) return '1 / 1.4'
  return `${w} / ${h}`
})

const selectedFormat = computed({
  get: () => config.value.format,
  set: (value: any) => exportStore.setFormat(value),
})

const monthFrom = ref(1)
const monthTo = ref(12)

function buildMonthRange(from: number, to: number): number[] {
  if (!Number.isFinite(from) || !Number.isFinite(to)) return []
  const start = Math.min(from, to)
  const end = Math.max(from, to)
  const months: number[] = []
  for (let m = start; m <= end; m++) months.push(m)
  return months
}

const pageMode = computed({
  get: () => {
    const pages = config.value.pages
    if (Array.isArray(pages)) return 'custom'
    return pages
  },
  set: (value: any) => {
    if (value === 'custom') {
      const months = buildMonthRange(monthFrom.value, monthTo.value)
      if (months.length) exportStore.updateConfig({ pages: months })
      return
    }
    exportStore.updateConfig({ pages: value })
  },
})

const includeUserObjectsAllMonths = computed({
  get: () => config.value.includeUserObjectsAllMonths !== false,
  set: (value: boolean) => exportStore.updateConfig({ includeUserObjectsAllMonths: value }),
})

type PageModeOption = {
  value: 'current' | 'all' | 'custom'
  label: string
  description: string
  icon: Component
  iconBg: string
  iconColor: string
  requiresPdf?: boolean
}

type PageModeOptionDisplay = PageModeOption & { disabled: boolean }

const basePageModeOptions: readonly PageModeOption[] = [
  {
    value: 'current',
    label: 'Current page',
    description: 'Export only what’s on the canvas right now.',
    icon: CalendarDaysIcon,
    iconBg: 'bg-primary-100',
    iconColor: 'text-primary-600',
  },
  {
    value: 'all',
    label: 'All months',
    description: 'Bundle Jan–Dec into one multi-page PDF.',
    icon: Squares2X2Icon,
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    requiresPdf: true,
  },
  {
    value: 'custom',
    label: 'Custom range',
    description: 'Choose the exact months to include.',
    icon: ArrowsRightLeftIcon,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    requiresPdf: true,
  },
]

const pageModeOptions = computed<PageModeOptionDisplay[]>(() =>
  basePageModeOptions.map((option) => ({
    ...option,
    disabled: option.requiresPdf ? !isPdf.value : false,
  })),
)

const isPdf = computed(() => config.value.format === 'pdf')

const isMultiPagePdf = computed(() => {
  if (!isPdf.value) return false
  return config.value.pages === 'all' || Array.isArray(config.value.pages)
})

const canExportPng = computed(() => availableFormats.value.includes('png'))
const canExportSvg = computed(() => availableFormats.value.includes('svg'))

const quality = computed({
  get: () => config.value.quality,
  set: (value: any) => exportStore.updateConfig({ quality: value }),
})

type QualityLevelOption = {
  value: 'screen' | 'print' | 'press'
  label: string
  description: string
  requiresPro?: boolean
}

const qualityLevels: readonly QualityLevelOption[] = [
  { value: 'screen', label: 'Web', description: '72 DPI' },
  { value: 'print', label: 'Print', description: '300 DPI', requiresPro: true },
  { value: 'press', label: 'Press', description: '300 DPI', requiresPro: true },
]

const defaultQualityLevel: QualityLevelOption = qualityLevels[0] ?? {
  value: 'screen',
  label: 'Web',
  description: '72 DPI',
}

const qualitySliderValue = computed({
  get: () => Math.max(0, qualityLevels.findIndex((level) => level.value === quality.value)),
  set: (index: number) => {
    const option = qualityLevels[index]
    if (!option) return
    if (option.requiresPro && !authStore.isPro) return
    quality.value = option.value
  },
})

const currentQualityLevel = computed<QualityLevelOption>(() => qualityLevels[qualitySliderValue.value] ?? defaultQualityLevel)

const canExportPrintQuality = computed(() => maxDPI.value >= 300)

const bleed = computed({
  get: () => config.value.bleed,
  set: (value: number) => exportStore.updateConfig({ bleed: Math.max(0, value || 0) }),
})

const bleedRange = {
  min: 0,
  max: 15,
  step: 0.5,
} as const

const cropMarks = computed({
  get: () => config.value.cropMarks,
  set: (value: boolean) => exportStore.updateConfig({ cropMarks: value }),
})

const safeZone = computed({
  get: () => config.value.safeZone,
  set: (value: boolean) => exportStore.updateConfig({ safeZone: value }),
})

async function handleExport(): Promise<void> {
  await exportStore.exportProject()
  if (!error.value) {
    emit('close')
  }
}

async function handleRetryServerExport(): Promise<void> {
  await exportStore.retryLastServerPdfExport()
  if (!error.value) {
    emit('close')
  }
}

watch(
  () => props.isOpen,
  (open) => {
    if (!open) return
    exportStore.resetState()
    if (!availableFormats.value.includes(config.value.format)) {
      const fallback = availableFormats.value[0]
      if (fallback) exportStore.setFormat(fallback)
    }

    if (!canExportPrintQuality.value && config.value.quality !== 'screen') {
      exportStore.updateConfig({ quality: 'screen' })
    }

    const canvas: any = editorStore.canvas
    const w = typeof canvas?.getWidth === 'function' ? canvas.getWidth() : canvas?.width
    const h = typeof canvas?.getHeight === 'function' ? canvas.getHeight() : canvas?.height

    if (canvas?.toDataURL) {
      try {
        const maxDimension = Math.max(w ?? 0, h ?? 0)
        const targetPreviewSize = 900
        const multiplier = maxDimension
          ? Math.min(1, targetPreviewSize / maxDimension)
          : 0.5
        previewUrl.value = canvas.toDataURL({
          format: 'jpeg',
          quality: 0.85,
          multiplier,
        })
      } catch {
        previewUrl.value = null
      }
    } else {
      previewUrl.value = null
    }

    if (w && h) {
      exportStore.updateConfig({ orientation: w > h ? 'landscape' : 'portrait' })
    }

    const pages = config.value.pages
    if (Array.isArray(pages) && pages.length) {
      const numericPages = pages.filter((p) => Number.isFinite(p))
      if (numericPages.length) {
        monthFrom.value = Math.min(...numericPages)
        monthTo.value = Math.max(...numericPages)
      }
    }
  },
)

watch(
  () => config.value.pages,
  (pages) => {
    if (!Array.isArray(pages) || !pages.length) return
    const numericPages = pages.filter((p) => Number.isFinite(p))
    if (!numericPages.length) return
    monthFrom.value = Math.min(...numericPages)
    monthTo.value = Math.max(...numericPages)
  },
)

watch(
  [monthFrom, monthTo, () => pageMode.value],
  ([from, to, mode]) => {
    if (mode !== 'custom') return
    const months = buildMonthRange(from, to)
    if (!months.length) return
    exportStore.updateConfig({ pages: months })
  },
)
</script>

<template>
  <TransitionRoot as="template" :show="isOpen">
    <Dialog as="div" class="relative z-modal" @close="emit('close')">
      <TransitionChild 
        as="template" 
        enter="ease-out duration-300" 
        enter-from="opacity-0" 
        enter-to="opacity-100" 
        leave="ease-in duration-200" 
        leave-from="opacity-100" 
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-gray-900/75 backdrop-blur-sm transition-opacity" />
      </TransitionChild>

      <div class="fixed inset-0 z-10 overflow-y-auto">
        <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <TransitionChild 
            as="template" 
            enter="ease-out duration-300" 
            enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95" 
            enter-to="opacity-100 translate-y-0 sm:scale-100" 
            leave="ease-in duration-200" 
            leave-from="opacity-100 translate-y-0 sm:scale-100" 
            leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <DialogPanel class="relative transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-6xl max-h-[90vh] border border-gray-200 dark:border-gray-700 flex flex-col">
              
              <!-- Modal Header -->
              <div class="px-4 py-4 sm:px-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <DialogTitle as="h3" class="text-lg font-display font-semibold leading-6 text-gray-900 dark:text-white">
                  Export Calendar
                </DialogTitle>
                <button @click="emit('close')" class="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none">
                  <XMarkIcon class="h-6 w-6" />
                </button>
              </div>

              <div class="px-4 py-6 sm:px-8 flex-1 flex flex-col lg:flex-row gap-10 lg:min-h-0">
                <!-- Preview Column -->
                <div class="lg:w-1/2 flex flex-col items-center lg:items-center lg:min-h-0">
                   <div class="flex-1 flex flex-col items-center justify-center gap-4 lg:w-full">
                     <div
                       class="w-48 sm:w-60 lg:w-full lg:max-w-sm bg-white shadow-2xl rotate-1 transition-transform hover:rotate-0 duration-500 relative ring-1 ring-gray-900/5 rounded-2xl overflow-hidden"
                       :style="{ aspectRatio: previewAspect }"
                     >
                       <img v-if="previewUrl" :src="previewUrl" class="absolute inset-0 w-full h-full object-cover" alt="" />
                       <div v-else class="h-full w-full flex items-center justify-center bg-gray-50">
                         <span class="text-xs text-gray-400">Preview unavailable</span>
                       </div>
                     </div>
                     <p class="text-sm text-gray-500 font-medium">Preview (Cover Page)</p>
                   </div>
                   <div class="hidden lg:flex flex-col items-center gap-1 text-xs text-gray-500">
                     <span>Format: {{ selectedFormat.toUpperCase() }}</span>
                     <span v-if="isPdf">Orientation: {{ config.orientation }}</span>
                   </div>
                </div>

                <!-- Settings Column -->
                <div class="lg:w-1/2 space-y-8 lg:overflow-y-auto lg:pr-2 lg:min_h-0 scrollbar-hide">
                  <div class="space-y-6">
                    <div class="space-y-3">
                      <div class="flex items-center justify-between">
                        <label class="text-sm font-medium text-gray-900 dark:text-white">Image Formats</label>
                        <p class="text-xs text-gray-500">Choose how you’ll share</p>
                      </div>
                      <div class="grid grid-cols-3 gap-3">
                        <!-- PNG Option -->
                        <button
                          type="button"
                          @click="canExportPng && (selectedFormat = 'png')"
                          :disabled="!canExportPng"
                          :class="[
                            'aspect-square rounded-2xl border flex flex-col items-center justify-center text-center p-3 transition-all',
                            canExportPng ? 'hover:border-primary-400 hover:shadow-lg/30 hover:-translate-y-0.5' : 'opacity-60 cursor-not-allowed',
                            selectedFormat === 'png'
                              ? 'border-primary-500 bg-primary-50/80 dark:bg-primary-900/20 shadow-lg shadow-primary-500/30'
                              : 'border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80'
                          ]"
                        >
                          <span class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary-100 text-primary-600 mb-2">
                            <PhotoIcon class="w-6 h-6" />
                          </span>
                          <span class="text-sm font-semibold text-gray-900 dark:text-white">PNG</span>
                          <span class="text-xs text-gray-500 dark:text-gray-400 mt-1">High quality</span>
                        </button>

                        <!-- JPG Option -->
                        <button
                          type="button"
                          @click="selectedFormat = 'jpg'"
                          :class="[
                            'aspect-square rounded-2xl border flex flex-col items-center justify-center text-center p-3 transition-all',
                            selectedFormat === 'jpg'
                              ? 'border-primary-500 bg-primary-50/80 dark:bg-primary-900/20 shadow-lg shadow-primary-500/30'
                              : 'border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 hover:border-primary-400 hover:-translate-y-0.5',
                          ]"
                        >
                          <span class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-100 text-amber-600 mb-2">
                            <PhotoIcon class="w-6 h-6" />
                          </span>
                          <span class="text-sm font-semibold text-gray-900 dark:text-white">JPG</span>
                          <span class="text-xs text-gray-500 dark:text-gray-400 mt-1">Smaller file</span>
                        </button>

                        <!-- SVG Option -->
                        <button
                          type="button"
                          v-if="canExportSvg || !authStore.isPro"
                          @click="authStore.isPro && (selectedFormat = 'svg')"
                          :class="[
                            'aspect-square rounded-2xl border flex flex-col items-center justify-center text-center p-3 transition-all relative',
                            authStore.isPro
                              ? selectedFormat === 'svg'
                                ? 'border-primary-500 bg-primary-50/80 dark:bg-primary-900/20 shadow-lg shadow-primary-500/30'
                                : 'border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 hover:border-primary-400 hover:-translate-y-0.5'
                              : 'opacity-60 cursor-not-allowed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20'
                          ]"
                        >
                          <span class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 mb-2">
                            <CodeBracketIcon class="w-6 h-6" />
                          </span>
                          <span class="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                            SVG
                            <AppTierBadge v-if="!authStore.isPro" tier="pro" size="sm" />
                          </span>
                          <span class="text-xs text-gray-500 dark:text-gray-400 mt-1">Scalable vector</span>
                          <LockClosedIcon
                            v-if="!authStore.isPro"
                            class="w-4 h-4 absolute top-3 right-3 text-gray-400"
                          />
                        </button>
                      </div>
                    </div>

                    <div class="space-y-3">
                      <div class="flex items-center justify-between">
                        <label class="text-sm font-medium text-gray-900 dark:text-white">Print Formats</label>
                        <p class="text-xs text-gray-500">Press-ready files</p>
                      </div>
                      <div class="grid grid-cols-2 gap-3">
                        <!-- PDF Option -->
                        <button 
                          type="button"
                          @click="authStore.isPro && (selectedFormat = 'pdf')"
                          :class="[
                            'rounded-2xl border p-4 flex flex-col gap-2 transition-all text-left',
                            authStore.isPro
                              ? selectedFormat === 'pdf'
                                ? 'border-primary-500 bg-primary-50/80 dark:bg-primary-900/20 shadow-lg shadow-primary-500/30'
                                : 'border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 hover:border-primary-400 hover:-translate-y-0.5'
                              : 'opacity-60 cursor-not-allowed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20'
                          ]"
                        >
                          <div class="flex items-center gap-2">
                            <PrinterIcon class="w-5 h-5" />
                            <span class="font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                              PDF Print
                              <AppTierBadge v-if="!authStore.isPro" tier="pro" size="sm" />
                            </span>
                          </div>
                          <p class="text-xs text-gray-500 dark:text-gray-400">Best for professional printing (CMYK)</p>
                        </button>

                        <!-- TIFF Option -->
                        <button 
                          type="button"
                          @click="authStore.isBusiness && (selectedFormat = 'tiff')"
                          :class="[
                            'rounded-2xl border p-4 flex flex-col gap-2 transition-all text-left',
                            authStore.isBusiness
                              ? selectedFormat === 'tiff'
                                ? 'border-primary-500 bg-primary-50/80 dark:bg-primary-900/20 shadow-lg shadow-primary-500/30'
                                : 'border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 hover:border-primary-400 hover:-translate-y-0.5'
                              : 'opacity-60 cursor-not-allowed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20'
                          ]"
                        >
                          <div class="flex items-center gap-2">
                            <PrinterIcon class="w-5 h-5" />
                            <span class="font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                              TIFF Print
                              <AppTierBadge v-if="!authStore.isBusiness" tier="business" size="sm" />
                            </span>
                          </div>
                          <p class="text-xs text-gray-500 dark:text-gray-400">Professional print production</p>
                          <LockClosedIcon v-if="!authStore.isBusiness" class="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div class="space-y-6">
                    <div>
                      <div class="flex items-center justify-between">
                        <label class="text-sm font-medium text-gray-900 dark:text-white">Pages</label>
                        <span class="text-xs text-gray-500">Choose how many months to export</span>
                      </div>
                      <div class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <button
                          v-for="option in pageModeOptions"
                          :key="option.value"
                          type="button"
                          @click="!option.disabled && (pageMode = option.value)"
                          :disabled="option.disabled"
                          :class="[
                            'rounded-2xl border p-4 text-left flex flex-col gap-3 transition-all',
                            option.value === 'custom' ? 'md:col-span-2' : '',
                            option.disabled
                              ? 'opacity-60 cursor-not-allowed border-dashed'
                              : pageMode === option.value
                                ? 'border-primary-500 bg-primary-50/80 dark:bg-primary-900/10 shadow-lg shadow-primary-500/30'
                                : 'border-gray-200 dark:border-gray-700 hover:border-primary-400 hover:-translate-y-0.5'
                          ]"
                        >
                          <div class="flex items-center gap-3 text-gray-900 dark:text-white">
                            <span class="inline-flex items-center justify-center w-8 h-8 rounded-full" :class="[option.iconBg, option.iconColor]">
                              <component :is="option.icon" class="w-4 h-4" />
                            </span>
                            <span class="font-semibold text-sm">{{ option.label }}</span>
                          </div>
                          <p class="text-xs text-gray-500 dark:text-gray-400 leading-snug">
                            {{ option.description }}
                          </p>
                          <span
                            v-if="option.requiresPdf && !isPdf"
                            class="text-xs font-semibold text-primary-600"
                          >
                            PDF only
                          </span>
                        </button>
                      </div>
                      <p v-if="!isPdf" class="mt-2 text-xs text-gray-500">
                        Multi-page export becomes available when you pick PDF.
                      </p>
                    </div>

                    <div
                      v-if="isPdf && pageMode === 'custom'"
                      class="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 bg-white/70 dark:bg-gray-900/30"
                    >
                      <p class="text-sm font-medium text-gray-900 dark:text-white">Custom month range</p>
                      <p class="text-xs text-gray-500 dark:text-gray-400">Use this to select any span between Jan–Dec.</p>
                      <div class="grid grid-cols-2 gap-3 mt-4">
                        <div>
                          <label class="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">From</label>
                          <select
                            v-model.number="monthFrom"
                            class="mt-1 select"
                          >
                            <option :value="1">Jan</option>
                            <option :value="2">Feb</option>
                            <option :value="3">Mar</option>
                            <option :value="4">Apr</option>
                            <option :value="5">May</option>
                            <option :value="6">Jun</option>
                            <option :value="7">Jul</option>
                            <option :value="8">Aug</option>
                            <option :value="9">Sep</option>
                            <option :value="10">Oct</option>
                            <option :value="11">Nov</option>
                            <option :value="12">Dec</option>
                          </select>
                        </div>
                        <div>
                          <label class="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">To</label>
                          <select
                            v-model.number="monthTo"
                            class="mt-1 select"
                          >
                            <option :value="1">Jan</option>
                            <option :value="2">Feb</option>
                            <option :value="3">Mar</option>
                            <option :value="4">Apr</option>
                            <option :value="5">May</option>
                            <option :value="6">Jun</option>
                            <option :value="7">Jul</option>
                            <option :value="8">Aug</option>
                            <option :value="9">Sep</option>
                            <option :value="10">Oct</option>
                            <option :value="11">Nov</option>
                            <option :value="12">Dec</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <label v-if="isMultiPagePdf" class="flex items-center gap-2 text-sm text-gray-900 dark:text-white">
                      <input
                        type="checkbox"
                        :checked="includeUserObjectsAllMonths"
                        @change="includeUserObjectsAllMonths = ($event.target as HTMLInputElement).checked"
                        class="h-4 w-4 rounded border-gray-300"
                      />
                      Include my added objects on every month
                    </label>
                    <p v-if="isMultiPagePdf" class="-mt-2 text-xs text-gray-500">
                      Turn off to export a clean template-only PDF for each month.
                    </p>

                    <div class="rounded-2xl border border-gray-200 dark:border-gray-700 p-5 bg-gray-50/70 dark:bg-gray-900/30 space-y-6">
                      <div class="space-y-3">
                        <div class="flex items-center justify-between">
                          <div>
                            <p class="text-sm font-medium text-gray-900 dark:text-white">Quality</p>
                            <p class="text-xs text-gray-500 dark:text-gray-400">Pick the DPI level for export</p>
                          </div>
                          <AppTierBadge v-if="!authStore.isPro" tier="pro" size="sm" />
                        </div>
                        <input
                          type="range"
                          class="w-full accent-primary-500"
                          :min="0"
                          :max="qualityLevels.length - 1"
                          step="1"
                          v-model.number="qualitySliderValue"
                        />
                        <div class="flex justify-between text-xs mt-2">
                          <span
                            v-for="(level, index) in qualityLevels"
                            :key="level.value"
                            :class="[
                              'font-semibold',
                              qualitySliderValue === index ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500'
                            ]"
                          >
                            {{ level.label }}
                          </span>
                        </div>
                        <p class="text-xs text-gray-500 dark:text-gray-400">
                          {{ currentQualityLevel.description }}
                          <span v-if="currentQualityLevel.requiresPro && !authStore.isPro" class="text-amber-600 dark:text-amber-400 font-medium">— Pro</span>
                        </p>
                      </div>

                      <div class="pt-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
                        <div class="flex items-center justify-between">
                          <div>
                            <p class="text-sm font-medium text-gray-900 dark:text-white">Bleed</p>
                            <p class="text-xs text-gray-500 dark:text-gray-400">Extend artwork past trim for clean edges</p>
                          </div>
                          <span class="text-sm font-semibold text-primary-600 dark:text-primary-300">{{ Number(bleed).toFixed(1) }} mm</span>
                        </div>
                        <input
                          type="range"
                          class="w-full accent-primary-500"
                          :min="bleedRange.min"
                          :max="bleedRange.max"
                          :step="bleedRange.step"
                          :value="bleed"
                          @input="bleed = Number(($event.target as HTMLInputElement).value)"
                        />
                        <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span>{{ bleedRange.min }}mm</span>
                          <span>{{ bleedRange.max }}mm</span>
                        </div>
                      </div>
                    </div>

                    <div class="space-y-3">
                      <label class="text-sm font-medium text-gray-900 dark:text-white">Print helpers</label>
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <button
                          type="button"
                          @click="cropMarks = !cropMarks"
                          :class="[
                            'rounded-2xl border p-4 text-left flex flex-col gap-2 transition-all',
                            cropMarks
                              ? 'border-primary-500 bg-primary-50/80 dark:bg-primary-900/10 shadow-lg shadow-primary-500/30'
                              : 'border-gray-200 dark:border-gray-700 hover:border-primary-400 hover:-translate-y-0.5'
                          ]"
                        >
                          <div class="flex items-center gap-2 text-gray-900 dark:text-white">
                            <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 text-primary-600">
                              <ScissorsIcon class="w-4 h-4" />
                            </span>
                            <span class="font-semibold">Crop marks</span>
                          </div>
                          <p class="text-xs text-gray-500 dark:text-gray-400">Show trim guides so printers know exactly where to cut.</p>
                        </button>

                        <button
                          type="button"
                          @click="safeZone = !safeZone"
                          :class="[
                            'rounded-2xl border p-4 text-left flex flex-col gap-2 transition-all',
                            safeZone
                              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10 shadow-lg shadow-emerald-500/20'
                              : 'border-gray-200 dark:border-gray-700 hover:border-emerald-400 hover:-translate-y-0.5'
                          ]"
                        >
                          <div class="flex items-center gap-2 text-gray-900 dark:text-white">
                            <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600">
                              <ShieldCheckIcon class="w-4 h-4" />
                            </span>
                            <span class="font-semibold">Safe zone</span>
                          </div>
                          <p class="text-xs text-gray-500 dark:text-gray-400">Overlay a safety margin to keep important content inside.</p>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div class="pt-4">
                    <button 
                      type="button"
                      class="w-full btn-primary flex justify-center items-center gap-2"
                      :disabled="exporting"
                      @click="handleExport"
                    >
                      <template v-if="exporting">
                        <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Exporting... {{ progress }}%
                      </template>
                      <template v-else>
                        <DocumentArrowDownIcon class="w-5 h-5" /> Download {{ selectedFormat.toUpperCase() }}
                      </template>
                    </button>

                    <button
                      v-if="canRetryLastServerExport"
                      type="button"
                      class="mt-3 w-full btn-secondary flex justify-center items-center gap-2"
                      :disabled="exporting"
                      @click="handleRetryServerExport"
                    >
                      <ArrowPathIcon class="w-5 h-5" /> Retry server export
                    </button>

                    <p v-if="exporting && statusText" class="mt-2 text-xs text-center text-gray-600 dark:text-gray-300">{{ statusText }}</p>
                    <p v-if="error" class="mt-2 text-xs text-red-600 text-center">{{ error }}</p>
                    <p class="mt-2 text-xs text-center text-gray-500">
                      Exporting uses 1 credit from your monthly allowance.
                    </p>
                  </div>
                </div>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
