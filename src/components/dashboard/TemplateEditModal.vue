<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { 
  Dialog, 
  DialogPanel, 
  DialogTitle, 
  TransitionChild, 
  TransitionRoot 
} from '@headlessui/vue'
import { 
  XMarkIcon, 
  PhotoIcon,
  CloudArrowUpIcon,
  TrashIcon
} from '@heroicons/vue/24/outline'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import type { MarketplaceProduct } from '@/services/marketplace.service'

const props = defineProps<{
  isOpen: boolean
  template: MarketplaceProduct | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', data: Partial<MarketplaceProduct>, thumbnailFile?: File): void
}>()

const categories = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'photo', label: 'Photo Calendar' },
  { value: 'planner', label: 'Planner' },
  { value: 'year-grid', label: 'Year Grid' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'decorative', label: 'Decorative' },
]

const tiers = [
  { value: 'free', label: 'Free' },
  { value: 'pro', label: 'Pro' },
  { value: 'business', label: 'Business' },
]

const form = ref({
  name: '',
  description: '',
  category: 'monthly',
  price: 0,
  requiredTier: 'free' as 'free' | 'pro' | 'business',
  features: [] as string[],
  isPopular: false,
  isNew: false,
  isPublished: true,
})

const thumbnailFile = ref<File | null>(null)
const thumbnailPreview = ref<string | null>(null)
const newFeature = ref('')
const saving = ref(false)

const isValid = computed(() => {
  return (
    form.value.name.length >= 3 &&
    form.value.name.length <= 200 &&
    form.value.description.length >= 10 &&
    form.value.description.length <= 2000 &&
    form.value.price >= 0 &&
    form.value.features.length <= 20
  )
})

watch(
  () => props.isOpen,
  (open) => {
    if (open && props.template) {
      form.value = {
        name: props.template.name || '',
        description: props.template.description || '',
        category: props.template.category || 'monthly',
        price: props.template.price || 0,
        requiredTier: props.template.requiredTier || 'free',
        features: [...(props.template.features || [])],
        isPopular: props.template.isPopular || false,
        isNew: props.template.isNew || false,
        isPublished: props.template.isPublished !== false,
      }
      thumbnailPreview.value = props.template.thumbnail || null
      thumbnailFile.value = null
      newFeature.value = ''
    }
  },
)

function handleThumbnailChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    alert('Please select an image file')
    return
  }

  if (file.size > 2 * 1024 * 1024) {
    alert('Image must be less than 2MB')
    return
  }

  thumbnailFile.value = file
  const reader = new FileReader()
  reader.onload = (e) => {
    thumbnailPreview.value = e.target?.result as string
  }
  reader.readAsDataURL(file)
}

function removeThumbnail() {
  thumbnailFile.value = null
  thumbnailPreview.value = null
}

function addFeature() {
  const feature = newFeature.value.trim()
  if (!feature) return
  if (form.value.features.length >= 20) {
    alert('Maximum 20 features allowed')
    return
  }
  if (!form.value.features.includes(feature)) {
    form.value.features.push(feature)
  }
  newFeature.value = ''
}

function removeFeature(index: number) {
  form.value.features.splice(index, 1)
}

function handleSave() {
  if (!isValid.value) return
  saving.value = true
  
  const data: Partial<MarketplaceProduct> = {
    name: form.value.name,
    description: form.value.description,
    category: form.value.category,
    price: form.value.price,
    requiredTier: form.value.requiredTier,
    features: form.value.features,
    isPopular: form.value.isPopular,
    isNew: form.value.isNew,
    isPublished: form.value.isPublished,
  }

  emit('save', data, thumbnailFile.value || undefined)
  saving.value = false
}
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
            <DialogPanel class="relative transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl border border-gray-200 dark:border-gray-700">
              
              <!-- Modal Header -->
              <div class="px-4 py-4 sm:px-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <DialogTitle as="h3" class="text-lg font-display font-semibold leading-6 text-gray-900 dark:text-white">
                  Edit Template
                </DialogTitle>
                <button @click="emit('close')" class="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none">
                  <XMarkIcon class="h-6 w-6" />
                </button>
              </div>

              <div class="px-4 py-6 sm:px-6 space-y-6 max-h-[70vh] overflow-y-auto">
                <!-- Thumbnail Upload -->
                <div>
                  <label class="block text-sm font-medium text-gray-900 dark:text-white mb-2">Thumbnail</label>
                  <div class="flex items-start gap-4">
                    <div 
                      class="w-32 h-24 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-900"
                    >
                      <img 
                        v-if="thumbnailPreview" 
                        :src="thumbnailPreview" 
                        class="w-full h-full object-cover"
                        alt="Thumbnail preview"
                      />
                      <PhotoIcon v-else class="w-8 h-8 text-gray-400" />
                    </div>
                    <div class="flex-1 space-y-2">
                      <label class="cursor-pointer">
                        <input 
                          type="file" 
                          accept="image/*" 
                          class="hidden" 
                          @change="handleThumbnailChange"
                        />
                        <span class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary-600 bg-primary-50 dark:bg-primary-900/20 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors">
                          <CloudArrowUpIcon class="w-4 h-4" />
                          Upload Image
                        </span>
                      </label>
                      <button 
                        v-if="thumbnailPreview"
                        @click="removeThumbnail"
                        class="flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
                      >
                        <TrashIcon class="w-4 h-4" />
                        Remove
                      </button>
                      <p class="text-xs text-gray-500">PNG, JPG, WebP. Max 2MB.</p>
                    </div>
                  </div>
                </div>

                <!-- Name -->
                <div>
                  <label class="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Name <span class="text-red-500">*</span>
                  </label>
                  <AppInput 
                    v-model="form.name" 
                    placeholder="Template name (3-200 characters)"
                    :class="{ 'ring-red-500': form.name.length > 0 && (form.name.length < 3 || form.name.length > 200) }"
                  />
                  <p class="mt-1 text-xs text-gray-500">{{ form.name.length }}/200 characters</p>
                </div>

                <!-- Description -->
                <div>
                  <label class="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Description <span class="text-red-500">*</span>
                  </label>
                  <textarea 
                    v-model="form.description"
                    rows="3"
                    placeholder="Template description (10-2000 characters)"
                    class="input resize-none"
                    :class="{ 'ring-red-500': form.description.length > 0 && (form.description.length < 10 || form.description.length > 2000) }"
                  ></textarea>
                  <p class="mt-1 text-xs text-gray-500">{{ form.description.length }}/2000 characters</p>
                </div>

                <!-- Category & Tier -->
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-900 dark:text-white mb-2">Category</label>
                    <AppSelect v-model="form.category">
                      <option v-for="cat in categories" :key="cat.value" :value="cat.value">
                        {{ cat.label }}
                      </option>
                    </AppSelect>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-900 dark:text-white mb-2">Required Tier</label>
                    <AppSelect v-model="form.requiredTier">
                      <option v-for="tier in tiers" :key="tier.value" :value="tier.value">
                        {{ tier.label }}
                      </option>
                    </AppSelect>
                  </div>
                </div>

                <!-- Price -->
                <div>
                  <label class="block text-sm font-medium text-gray-900 dark:text-white mb-2">Price (cents)</label>
                  <AppInput 
                    v-model.number="form.price" 
                    type="number"
                    min="0"
                    placeholder="0 for free"
                  />
                  <p class="mt-1 text-xs text-gray-500">
                    Enter price in cents. 0 = Free, 999 = $9.99
                  </p>
                </div>

                <!-- Features -->
                <div>
                  <label class="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Features ({{ form.features.length }}/20)
                  </label>
                  <div class="flex gap-2 mb-2">
                    <AppInput 
                      v-model="newFeature"
                      placeholder="Add a feature"
                      @keyup.enter="addFeature"
                      class="flex-1"
                    />
                    <AppButton 
                      variant="secondary" 
                      @click="addFeature"
                      :disabled="!newFeature.trim() || form.features.length >= 20"
                    >
                      Add
                    </AppButton>
                  </div>
                  <div v-if="form.features.length" class="flex flex-wrap gap-2">
                    <span 
                      v-for="(feature, index) in form.features" 
                      :key="index"
                      class="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md text-sm"
                    >
                      {{ feature }}
                      <button 
                        @click="removeFeature(index)"
                        class="text-gray-400 hover:text-red-500"
                      >
                        <XMarkIcon class="w-4 h-4" />
                      </button>
                    </span>
                  </div>
                </div>

                <!-- Flags -->
                <div class="flex flex-wrap gap-4">
                  <label class="flex items-center gap-2 text-sm text-gray-900 dark:text-white cursor-pointer">
                    <input 
                      type="checkbox" 
                      v-model="form.isPopular"
                      class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    Mark as Popular
                  </label>
                  <label class="flex items-center gap-2 text-sm text-gray-900 dark:text-white cursor-pointer">
                    <input 
                      type="checkbox" 
                      v-model="form.isNew"
                      class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    Mark as New
                  </label>
                </div>

                <!-- Publish Status -->
                <div class="p-4 rounded-lg border" :class="form.isPublished ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'">
                  <label class="flex items-center justify-between cursor-pointer">
                    <div>
                      <p class="font-medium text-gray-900 dark:text-white">
                        {{ form.isPublished ? 'Published' : 'Unpublished' }}
                      </p>
                      <p class="text-xs text-gray-500 dark:text-gray-400">
                        {{ form.isPublished ? 'Template is visible in the marketplace and editor' : 'Template is hidden from users' }}
                      </p>
                    </div>
                    <button
                      type="button"
                      @click="form.isPublished = !form.isPublished"
                      :class="[
                        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                        form.isPublished ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                      ]"
                    >
                      <span
                        :class="[
                          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                          form.isPublished ? 'translate-x-5' : 'translate-x-0'
                        ]"
                      />
                    </button>
                  </label>
                </div>
              </div>

              <!-- Modal Footer -->
              <div class="px-4 py-4 sm:px-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <AppButton variant="secondary" @click="emit('close')">
                  Cancel
                </AppButton>
                <AppButton 
                  variant="primary" 
                  @click="handleSave"
                  :disabled="!isValid || saving"
                >
                  {{ saving ? 'Saving...' : 'Save Changes' }}
                </AppButton>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
