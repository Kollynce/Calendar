<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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
import { 
  XMarkIcon, 
  DocumentArrowDownIcon, 
  PhotoIcon,
  PrinterIcon
} from '@heroicons/vue/24/outline'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits(['close'])

const exportStore = useExportStore()
const editorStore = useEditorStore()
const { config, exporting, progress, statusText, error, availableFormats, maxDPI } = storeToRefs(exportStore)

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

const isPdf = computed(() => config.value.format === 'pdf')

const isMultiPagePdf = computed(() => {
  if (!isPdf.value) return false
  return config.value.pages === 'all' || Array.isArray(config.value.pages)
})

const canExportPdf = computed(() => availableFormats.value.includes('pdf'))
const canExportPng = computed(() => availableFormats.value.includes('png'))

const quality = computed({
  get: () => config.value.quality,
  set: (value: any) => exportStore.updateConfig({ quality: value }),
})

const canExportPrintQuality = computed(() => maxDPI.value >= 300)

const bleed = computed({
  get: () => config.value.bleed,
  set: (value: number) => exportStore.updateConfig({ bleed: Math.max(0, value || 0) }),
})

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
    if (canvas?.toDataURL) {
      try {
        previewUrl.value = canvas.toDataURL({ format: 'jpeg', quality: 0.6, multiplier: 0.25 })
      } catch {
        previewUrl.value = null
      }
    } else {
      previewUrl.value = null
    }

    const w = typeof canvas?.getWidth === 'function' ? canvas.getWidth() : canvas?.width
    const h = typeof canvas?.getHeight === 'function' ? canvas.getHeight() : canvas?.height
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
    <Dialog as="div" class="relative z-50" @close="emit('close')">
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
            <DialogPanel class="relative transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl border border-gray-200 dark:border-gray-700">
              
              <!-- Modal Header -->
              <div class="px-4 py-4 sm:px-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <DialogTitle as="h3" class="text-lg font-display font-semibold leading-6 text-gray-900 dark:text-white">
                  Export Calendar
                </DialogTitle>
                <button @click="emit('close')" class="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none">
                  <XMarkIcon class="h-6 w-6" />
                </button>
              </div>

              <div class="px-4 py-6 sm:px-6 flex flex-col md:flex-row gap-8">
                <!-- Preview Column -->
                <div class="flex-1 flex flex-col items-center">
                   <div
                     class="w-48 sm:w-56 bg-white shadow-2xl rotate-1 transition-transform hover:rotate-0 duration-500 relative ring-1 ring-gray-900/5"
                     :style="{ aspectRatio: previewAspect }"
                   >
                     <img v-if="previewUrl" :src="previewUrl" class="absolute inset-0 w-full h-full object-cover" alt="" />
                     <div v-else class="h-full w-full flex items-center justify-center bg-gray-50">
                       <span class="text-xs text-gray-400">Preview unavailable</span>
                     </div>
                   </div>
                   <p class="mt-4 text-sm text-gray-500 font-medium">Preview (Cover Page)</p>
                </div>

                <!-- Settings Column -->
                <div class="flex-1 space-y-6">
                  <div>
                    <label class="text-sm font-medium text-gray-900 dark:text-white">Export Format</label>
                    <div class="mt-3 grid grid-cols-1 gap-3">
                      
                      <!-- PDF Option -->
                      <div 
                        @click="canExportPdf && (selectedFormat = 'pdf')"
                        :class="[
                          !canExportPdf
                            ? 'opacity-50 cursor-not-allowed ring-1 ring-gray-200 dark:ring-gray-700'
                            : selectedFormat === 'pdf'
                              ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/20'
                              : 'ring-1 ring-gray-200 dark:ring-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50',
                          'relative flex cursor-pointer rounded-lg px-4 py-3 shadow-sm focus:outline-none'
                        ]"
                      >
                        <div class="flex w-full items-center justify-between">
                          <div class="flex items-center">
                            <div class="text-sm">
                              <p class="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                <PrinterIcon class="w-4 h-4" /> PDF Print
                              </p>
                              <p class="text-gray-500 dark:text-gray-400">Best for professional printing (CMYK)</p>
                            </div>
                          </div>
                          <div v-if="selectedFormat === 'pdf'" class="h-4 w-4 rounded-full border-[5px] border-primary-500"></div>
                          <div v-else class="h-4 w-4 rounded-full border border-gray-300"></div>
                        </div>
                      </div>

                      <!-- PNG Option -->
                      <div 
                        @click="canExportPng && (selectedFormat = 'png')"
                        :class="[
                          !canExportPng
                            ? 'opacity-50 cursor-not-allowed ring-1 ring-gray-200 dark:ring-gray-700'
                            : selectedFormat === 'png'
                              ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/20'
                              : 'ring-1 ring-gray-200 dark:ring-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50',
                          'relative flex cursor-pointer rounded-lg px-4 py-3 shadow-sm focus:outline-none'
                        ]"
                      >
                         <div class="flex w-full items-center justify-between">
                          <div class="flex items-center">
                            <div class="text-sm">
                              <p class="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                <PhotoIcon class="w-4 h-4" /> PNG Image
                              </p>
                              <p class="text-gray-500 dark:text-gray-400">High quality digital sharing</p>
                            </div>
                          </div>
                          <div v-if="selectedFormat === 'png'" class="h-4 w-4 rounded-full border-[5px] border-primary-500"></div>
                           <div v-else class="h-4 w-4 rounded-full border border-gray-300"></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="space-y-4">
                    <div>
                      <label class="text-sm font-medium text-gray-900 dark:text-white">Pages</label>
                      <select
                        v-model="pageMode"
                        class="mt-2 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
                      >
                        <option value="current">Current page (what’s on the canvas)</option>
                        <option value="all" :disabled="!isPdf">All months (Jan–Dec)</option>
                        <option value="custom" :disabled="!isPdf">Custom month range</option>
                      </select>
                      <p v-if="!isPdf" class="mt-1 text-xs text-gray-500">
                        Multi-page export is available for PDF.
                      </p>
                    </div>

                    <div v-if="isPdf && pageMode === 'custom'" class="grid grid-cols-2 gap-3">
                      <div>
                        <label class="text-xs font-medium text-gray-700 dark:text-gray-300">From</label>
                        <select
                          v-model.number="monthFrom"
                          class="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
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
                        <label class="text-xs font-medium text-gray-700 dark:text-gray-300">To</label>
                        <select
                          v-model.number="monthTo"
                          class="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
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

                    <div>
                      <label class="text-sm font-medium text-gray-900 dark:text-white">Quality</label>
                      <select
                        v-model="quality"
                        class="mt-2 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
                      >
                        <option value="screen">Screen (72 DPI)</option>
                        <option value="print" :disabled="!canExportPrintQuality">Print (300 DPI)</option>
                        <option value="press" :disabled="!canExportPrintQuality">Press (300 DPI)</option>
                      </select>
                      <p v-if="!canExportPrintQuality" class="mt-1 text-xs text-gray-500">
                        Upgrade your plan to export at print quality.
                      </p>
                    </div>

                    <div>
                      <label class="text-sm font-medium text-gray-900 dark:text-white">Bleed (mm)</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        :value="bleed"
                        @input="bleed = Number(($event.target as HTMLInputElement).value)"
                        class="mt-2 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
                      />
                    </div>

                    <label class="flex items-center gap-2 text-sm text-gray-900 dark:text-white">
                      <input
                        type="checkbox"
                        :checked="cropMarks"
                        @change="cropMarks = ($event.target as HTMLInputElement).checked"
                        class="h-4 w-4 rounded border-gray-300"
                      />
                      Crop marks
                    </label>

                    <label class="flex items-center gap-2 text-sm text-gray-900 dark:text-white">
                      <input
                        type="checkbox"
                        :checked="safeZone"
                        @change="safeZone = ($event.target as HTMLInputElement).checked"
                        class="h-4 w-4 rounded border-gray-300"
                      />
                      Safe zone overlay
                    </label>
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
