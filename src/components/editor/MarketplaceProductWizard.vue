<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionChild,
  TransitionRoot,
} from '@headlessui/vue'
import { 
  XMarkIcon, 
  SparklesIcon,
  TagIcon,
  CurrencyDollarIcon,
  QueueListIcon,
  CheckCircleIcon
} from '@heroicons/vue/24/outline'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppTierBadge from '@/components/ui/AppTierBadge.vue'
import type { CalendarTemplate, TemplateCategory } from '@/data/templates/calendar-templates'
import { templateCategories } from '@/data/templates/calendar-templates'

const props = defineProps<{
  isOpen: boolean
  template: Partial<CalendarTemplate>
  thumbnail?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'publish', productData: any): void
}>()

const step = ref(1)
const totalSteps = 3
const nameInputRef = ref<InstanceType<typeof AppInput> | null>(null)
const nameInputElement = computed(() => nameInputRef.value?.input || null)

const formData = ref({
  name: props.template.name || '',
  description: props.template.description || '',
  category: (props.template.category || 'monthly') as TemplateCategory,
  price: 0,
  requiredTier: 'free' as 'free' | 'pro' | 'business',
  features: [] as string[],
  isPopular: false,
  isNew: true
})

const featureInput = ref('')

function addFeature() {
  const f = featureInput.value.trim()
  if (f && !formData.value.features.includes(f)) {
    formData.value.features.push(f)
    featureInput.value = ''
  }
}

function removeFeature(index: number) {
  formData.value.features.splice(index, 1)
}

const categories = templateCategories.filter(c => c.id !== 'all')

const isStepValid = computed(() => {
  if (step.value === 1) return formData.value.name.length > 3 && formData.value.description.length > 10
  if (step.value === 2) return true
  return true
})

function nextStep() {
  if (step.value < totalSteps) step.value++
  else publish()
}

function prevStep() {
  if (step.value > 1) step.value--
}

function publish() {
  emit('publish', { ...formData.value })
}

function closeModal() {
  emit('close')
  // Reset after transition
  setTimeout(() => step.value = 1, 300)
}

const tiers = [
  { id: 'free', label: 'Free (All Users)' },
  { id: 'pro', label: 'Pro Tier' },
  { id: 'business', label: 'Business Tier' }
]
</script>

<template>
  <TransitionRoot as="template" :show="isOpen">
    <Dialog as="div" class="relative z-modal" @close="closeModal" :initial-focus="nameInputElement">
      <TransitionChild
        as="template"
        enter="ease-out duration-300"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="ease-in duration-200"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-gray-900/70 backdrop-blur-sm" />
      </TransitionChild>

      <div class="fixed inset-0 z-10 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
          <TransitionChild
            as="template"
            enter="ease-out duration-300"
            enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enter-to="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-200"
            leave-from="opacity-100 translate-y-0 sm:scale-100"
            leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <DialogPanel class="relative transform overflow-hidden rounded-4xl bg-white dark:bg-gray-950 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-2xl border border-gray-200 dark:border-gray-800">
              <!-- Header -->
              <div class="px-8 py-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-white/5">
                <div>
                  <DialogTitle class="text-xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                    <SparklesIcon class="w-6 h-6 text-primary-500" />
                    Marketplace Wizard
                  </DialogTitle>
                  <p class="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">
                    Step {{ step }} of {{ totalSteps }}: {{ 
                      step === 1 ? 'Product Details' : 
                      step === 2 ? 'Pricing & Access' : 
                      'Review & Publish' 
                    }}
                  </p>
                </div>
                <button
                  @click="closeModal"
                  class="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-400 transition-colors"
                >
                  <XMarkIcon class="w-6 h-6" />
                </button>
              </div>

              <!-- Content -->
              <div class="px-8 py-10">
                <!-- Progress Bar -->
                <div class="flex items-center gap-2 mb-10">
                  <div 
                    v-for="n in totalSteps" 
                    :key="n"
                    class="h-1.5 flex-1 rounded-full transition-all duration-500"
                    :class="n <= step ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-800'"
                  ></div>
                </div>

                <!-- Step 1: Basic Info -->
                <div v-if="step === 1" class="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                  <div class="space-y-2">
                    <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <TagIcon class="w-3.5 h-3.5" />
                      Product Name
                    </label>
                    <AppInput 
                      ref="nameInputRef"
                      v-model="formData.name" 
                      placeholder="e.g. Minimalist Productivity 2026"
                      class="w-full"
                    />
                  </div>

                  <div class="space-y-2">
                    <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <QueueListIcon class="w-3.5 h-3.5" />
                      Description
                    </label>
                    <textarea 
                      v-model="formData.description"
                      rows="4"
                      class="w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none text-gray-900 dark:text-white"
                      placeholder="Describe what makes this template special..."
                    ></textarea>
                  </div>

                  <div class="space-y-2">
                    <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</label>
                    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <button
                        v-for="cat in categories"
                        :key="cat.id"
                        @click="formData.category = cat.id as TemplateCategory"
                        type="button"
                        :class="[
                          'px-4 py-2.5 rounded-xl text-xs font-bold transition-all border text-center',
                          formData.category === cat.id 
                            ? 'bg-primary-50 border-primary-500 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400' 
                            : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-500 hover:border-gray-200'
                        ]"
                      >
                        {{ cat.name }}
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Step 2: Pricing & Access -->
                <div v-if="step === 2" class="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                  <div class="space-y-4">
                    <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <SparklesIcon class="w-3.5 h-3.5" />
                      Required Subscription Tier
                    </label>
                    <div class="grid grid-cols-1 gap-2">
                      <button
                        v-for="tier in tiers"
                        :key="tier.id"
                        @click="formData.requiredTier = tier.id as 'free' | 'pro' | 'business'"
                        type="button"
                        :class="[
                          'flex items-center justify-between px-6 py-4 rounded-2xl border transition-all text-left',
                          formData.requiredTier === tier.id 
                            ? 'bg-primary-50 border-primary-500 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400' 
                            : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-500'
                        ]"
                      >
                        <span class="text-sm font-bold">{{ tier.label }}</span>
                        <div 
                          class="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                          :class="formData.requiredTier === tier.id ? 'border-primary-500 bg-primary-500' : 'border-gray-200 dark:border-gray-700'"
                        >
                          <CheckCircleIcon v-if="formData.requiredTier === tier.id" class="w-4 h-4 text-white" />
                        </div>
                      </button>
                    </div>
                  </div>

                  <div class="space-y-2">
                    <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <CurrencyDollarIcon class="w-3.5 h-3.5" />
                      One-time Price (Cents)
                    </label>
                    <AppInput 
                      v-model.number="formData.price" 
                      type="number"
                      placeholder="0 for free"
                      class="w-full"
                    />
                    <p class="text-[10px] text-gray-400">Set to 0 if the template should be free for the required tier.</p>
                  </div>
                  <div class="space-y-4">
                    <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <QueueListIcon class="w-3.5 h-3.5" />
                      Key Features
                    </label>
                    <div class="flex gap-2">
                      <AppInput 
                        v-model="featureInput" 
                        placeholder="e.g. 12 Months High-Res"
                        class="flex-1"
                        @keydown.enter.prevent="addFeature"
                      />
                      <AppButton variant="secondary" @click="addFeature" type="button">Add</AppButton>
                    </div>
                    <div class="flex flex-wrap gap-2 mt-2">
                      <span 
                        v-for="(feature, idx) in formData.features" 
                        :key="idx"
                        class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-bold border border-primary-100 dark:border-primary-800"
                      >
                        {{ feature }}
                        <button @click="removeFeature(idx)" class="hover:text-primary-900 dark:hover:text-white">
                          <XMarkIcon class="w-3 h-3" />
                        </button>
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Step 3: Review -->
                <div v-if="step === 3" class="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                  <div class="bg-gray-50 dark:bg-white/5 rounded-4xl p-8 border border-gray-100 dark:border-gray-800">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <!-- Left: Preview -->
                      <div class="aspect-3/4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-inner flex items-center justify-center relative">
                        <img v-if="thumbnail" :src="thumbnail" class="w-full h-full object-cover" />
                        <div v-else class="text-gray-400 flex flex-col items-center gap-2">
                          <SparklesIcon class="w-8 h-8 opacity-20" />
                          <span class="text-[10px] font-bold uppercase tracking-widest">No Preview</span>
                        </div>
                        <div class="absolute top-3 left-3">
                          <AppTierBadge :tier="formData.requiredTier" size="sm" />
                        </div>
                      </div>

                      <!-- Right: Details -->
                      <div class="flex flex-col justify-center">
                        <p class="text-[10px] font-black text-primary-600 uppercase tracking-widest">{{ formData.category }}</p>
                        <h3 class="text-2xl font-black text-gray-900 dark:text-white mt-1">{{ formData.name }}</h3>
                        
                        <div class="mt-4 flex items-baseline gap-2">
                          <p class="text-2xl font-black text-gray-900 dark:text-white">
                            {{ formData.price === 0 ? 'Free' : `$${(formData.price / 100).toFixed(2)}` }}
                          </p>
                          <p class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">one-time</p>
                        </div>

                        <p class="mt-6 text-sm text-gray-600 dark:text-gray-400 leading-relaxed italic line-clamp-3">
                          "{{ formData.description }}"
                        </p>

                        <div class="mt-6 flex flex-wrap gap-1.5">
                          <span v-for="feature in formData.features" :key="feature" class="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-[10px] font-bold text-gray-500 uppercase">
                            {{ feature }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="flex items-center gap-4 px-2">
                    <label class="flex items-center gap-3 cursor-pointer group">
                      <input 
                        v-model="formData.isPopular" 
                        type="checkbox" 
                        class="w-5 h-5 rounded-lg border-gray-200 dark:border-gray-800 text-primary-500 focus:ring-primary-500/20 transition-all"
                      />
                      <span class="text-sm font-bold text-gray-700 dark:text-gray-300 group-hover:text-primary-500 transition-colors">Mark as Popular</span>
                    </label>
                    <label class="flex items-center gap-3 cursor-pointer group">
                      <input 
                        v-model="formData.isNew" 
                        type="checkbox" 
                        class="w-5 h-5 rounded-lg border-gray-200 dark:border-gray-800 text-primary-500 focus:ring-primary-500/20 transition-all"
                      />
                      <span class="text-sm font-bold text-gray-700 dark:text-gray-300 group-hover:text-primary-500 transition-colors">Mark as New</span>
                    </label>
                  </div>
                </div>
              </div>

              <!-- Footer -->
              <div class="px-8 py-6 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-white/5">
                <AppButton 
                  variant="secondary" 
                  @click="step === 1 ? closeModal() : prevStep()"
                >
                  {{ step === 1 ? 'Cancel' : 'Back' }}
                </AppButton>
                
                <AppButton 
                  variant="primary" 
                  :disabled="!isStepValid"
                  @click="nextStep"
                >
                  {{ step === totalSteps ? 'Publish to Marketplace' : 'Next Step' }}
                </AppButton>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<style scoped>
.animate-in {
  animation-duration: 0.3s;
  animation-fill-mode: both;
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slide-in-from-bottom-2 {
  from { transform: translateY(0.5rem); }
  to { transform: translateY(0); }
}

.animate-in.fade-in {
  animation-name: fade-in;
}

.animate-in.slide-in-from-bottom-2 {
  animation-name: slide-in-from-bottom-2;
}
</style>
