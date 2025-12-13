<script setup lang="ts">
import { ref } from 'vue'
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

const selectedFormat = ref('pdf')
const isExporting = ref(false)

const handleExport = () => {
  isExporting.value = true
  // Simulate export delay
  setTimeout(() => {
    isExporting.value = false
    emit('close')
    alert('Export started! (Simulation)')
  }, 2000)
}
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
                   <div class="aspect-[1/1.4] w-48 sm:w-56 bg-white shadow-2xl rotate-1 transition-transform hover:rotate-0 duration-500 relative ring-1 ring-gray-900/5">
                     <!-- Mock Content -->
                     <div class="h-32 bg-primary-500"></div>
                     <div class="p-4 space-y-2">
                       <div class="h-4 w-3/4 bg-gray-200 rounded"></div>
                       <div class="h-4 w-1/2 bg-gray-100 rounded"></div>
                       <div class="grid grid-cols-7 gap-1 mt-4">
                         <div v-for="i in 35" :key="i" class="h-4 bg-gray-50 rounded-sm"></div>
                       </div>
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
                        @click="selectedFormat = 'pdf'"
                        :class="[
                          selectedFormat === 'pdf' ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'ring-1 ring-gray-200 dark:ring-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50',
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
                        @click="selectedFormat = 'png'"
                        :class="[
                          selectedFormat === 'png' ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'ring-1 ring-gray-200 dark:ring-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50',
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

                  <div class="pt-4">
                    <button 
                      type="button"
                      class="w-full btn-primary flex justify-center items-center gap-2"
                      :disabled="isExporting"
                      @click="handleExport"
                    >
                      <template v-if="isExporting">
                        <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Exporting...
                      </template>
                      <template v-else>
                        <DocumentArrowDownIcon class="w-5 h-5" /> Download {{ selectedFormat.toUpperCase() }}
                      </template>
                    </button>
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
