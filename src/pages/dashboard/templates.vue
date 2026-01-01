<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores'
import AppLayout from '@/layouts/AppLayout.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppTierBadge from '@/components/ui/AppTierBadge.vue'
import TemplateEditModal from '@/components/dashboard/TemplateEditModal.vue'
import { marketplaceService, type MarketplaceProduct } from '@/services/marketplace.service'
import { projectsService } from '@/services/projects/projects.service'
import { 
  MagnifyingGlassIcon,
  PencilSquareIcon,
  TrashIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
  PlusIcon,
  Squares2X2Icon,
  FireIcon,
  XMarkIcon
} from '@heroicons/vue/24/outline'

const router = useRouter()
const authStore = useAuthStore()

const templates = ref<MarketplaceProduct[]>([])
const loading = ref(true)
const loadError = ref<string | null>(null)
const searchQuery = ref('')
const selectedCategory = ref('all')
const selectedTier = ref('all')
const sortBy = ref('latest')

const editModalOpen = ref(false)
const selectedTemplate = ref<MarketplaceProduct | null>(null)
const deleteConfirmId = ref<string | null>(null)
const actionLoading = ref<string | null>(null)

const categories = [
  { value: 'all', label: 'All Categories' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'photo', label: 'Photo Calendar' },
  { value: 'planner', label: 'Planner' },
  { value: 'year-grid', label: 'Year Grid' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'decorative', label: 'Decorative' },
]

const tiers = [
  { value: 'all', label: 'All Tiers' },
  { value: 'free', label: 'Free' },
  { value: 'pro', label: 'Pro' },
  { value: 'business', label: 'Business' },
]

const isAdmin = computed(() => authStore.isAdmin)

const filteredTemplates = computed(() => {
  let result = templates.value

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(t => 
      t.name.toLowerCase().includes(query) ||
      t.creatorName.toLowerCase().includes(query) ||
      t.description.toLowerCase().includes(query)
    )
  }

  if (selectedCategory.value !== 'all') {
    result = result.filter(t => t.category === selectedCategory.value)
  }

  if (selectedTier.value !== 'all') {
    result = result.filter(t => t.requiredTier === selectedTier.value)
  }

  if (sortBy.value === 'latest') {
    result = [...result].sort((a, b) => {
      const dateA = a.publishedAt?.toDate?.() || new Date(0)
      const dateB = b.publishedAt?.toDate?.() || new Date(0)
      return dateB.getTime() - dateA.getTime()
    })
  } else if (sortBy.value === 'popular') {
    result = [...result].sort((a, b) => (b.downloads || 0) - (a.downloads || 0))
  } else if (sortBy.value === 'name') {
    result = [...result].sort((a, b) => a.name.localeCompare(b.name))
  }

  return result
})

async function loadTemplates() {
  loading.value = true
  loadError.value = null
  try {
    templates.value = await marketplaceService.listTemplates(undefined, 100)
  } catch (error) {
    console.error('[DashboardTemplates] Failed to load templates:', error)
    loadError.value = 'Failed to load templates. Please try again.'
  } finally {
    loading.value = false
  }
}

function openEditModal(template: MarketplaceProduct) {
  selectedTemplate.value = template
  editModalOpen.value = true
}

function closeEditModal() {
  editModalOpen.value = false
  selectedTemplate.value = null
}

async function handleSaveTemplate(data: Partial<MarketplaceProduct>, thumbnailFile?: File) {
  if (!selectedTemplate.value?.id) return
  
  actionLoading.value = selectedTemplate.value.id
  try {
    let thumbnailUrl = selectedTemplate.value.thumbnail

    if (thumbnailFile) {
      thumbnailUrl = await marketplaceService.uploadThumbnailFile(
        thumbnailFile,
        selectedTemplate.value.creatorId,
        selectedTemplate.value.id
      )
      data.thumbnail = thumbnailUrl
    }

    await marketplaceService.updateTemplate(selectedTemplate.value.id, data)
    
    const index = templates.value.findIndex(t => t.id === selectedTemplate.value?.id)
    if (index !== -1) {
      templates.value[index] = { ...templates.value[index], ...data } as MarketplaceProduct
    }
    
    closeEditModal()
  } catch (error) {
    console.error('[DashboardTemplates] Failed to update template:', error)
    alert('Failed to update template. Please try again.')
  } finally {
    actionLoading.value = null
  }
}

function confirmDelete(id: string) {
  deleteConfirmId.value = id
}

function cancelDelete() {
  deleteConfirmId.value = null
}

async function handleDelete() {
  if (!deleteConfirmId.value) return
  
  actionLoading.value = deleteConfirmId.value
  try {
    await marketplaceService.deleteTemplate(deleteConfirmId.value)
    templates.value = templates.value.filter(t => t.id !== deleteConfirmId.value)
    deleteConfirmId.value = null
  } catch (error) {
    console.error('[DashboardTemplates] Failed to delete template:', error)
    alert('Failed to delete template. Please try again.')
  } finally {
    actionLoading.value = null
  }
}

function viewInMarketplace(id: string) {
  router.push(`/marketplace/${id}`)
}

async function useTemplate(template: MarketplaceProduct) {
  if (!authStore.user?.id) {
    router.push('/login')
    return
  }

  actionLoading.value = template.id || null
  try {
    await marketplaceService.incrementDownloads(template.id!)
    
    const projectId = crypto.randomUUID()
    const now = new Date().toISOString()
    
    await projectsService.save({
      id: projectId,
      name: `${template.name} - Copy`,
      userId: authStore.user.id,
      templateId: template.id,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
      config: {
        year: new Date().getFullYear(),
        country: 'KE',
        language: 'en',
        layout: 'monthly',
        startDay: 0,
        showHolidays: true,
        showCustomHolidays: true,
        showWeekNumbers: false,
      },
      canvas: {
        width: 816,
        height: 1056,
        unit: 'px',
        dpi: 72,
        backgroundColor: '#ffffff',
        objects: [],
      },
    })

    router.push(`/editor/${projectId}`)
  } catch (error) {
    console.error('[DashboardTemplates] Failed to create project from template:', error)
    alert('Failed to use template. Please try again.')
  } finally {
    actionLoading.value = null
  }
}

function canManage(template: MarketplaceProduct): boolean {
  if (isAdmin.value) return true
  return template.creatorId === authStore.user?.id
}

onMounted(loadTemplates)
</script>

<template>
  <AppLayout>
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-display font-bold text-gray-900 dark:text-white">
            Marketplace Templates
          </h1>
          <p class="text-gray-500 dark:text-gray-400 mt-1">
            Manage and use templates from the marketplace
          </p>
        </div>
        <AppButton 
          to="/marketplace" 
          variant="primary" 
          class="flex items-center gap-2"
        >
          <PlusIcon class="w-5 h-5" /> Browse Marketplace
        </AppButton>
      </div>

      <!-- Filters -->
      <div class="flex flex-col sm:flex-row gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div class="flex-1 relative">
          <MagnifyingGlassIcon class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <AppInput 
            v-model="searchQuery"
            placeholder="Search templates..."
            class="pl-10 w-full"
          />
        </div>
        <div class="flex gap-3">
          <AppSelect v-model="selectedCategory" class="w-40">
            <option v-for="cat in categories" :key="cat.value" :value="cat.value">
              {{ cat.label }}
            </option>
          </AppSelect>
          <AppSelect v-model="selectedTier" class="w-32">
            <option v-for="tier in tiers" :key="tier.value" :value="tier.value">
              {{ tier.label }}
            </option>
          </AppSelect>
          <AppSelect v-model="sortBy" class="w-32">
            <option value="latest">Latest</option>
            <option value="popular">Popular</option>
            <option value="name">Name</option>
          </AppSelect>
        </div>
      </div>

      <!-- Stats -->
      <div class="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
        <span>{{ filteredTemplates.length }} templates</span>
        <span v-if="searchQuery || selectedCategory !== 'all' || selectedTier !== 'all'" class="flex items-center gap-1">
          <FunnelIcon class="w-4 h-4" />
          Filtered
          <button 
            @click="searchQuery = ''; selectedCategory = 'all'; selectedTier = 'all'"
            class="text-primary-600 hover:underline ml-1"
          >
            Clear
          </button>
        </span>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <div 
          v-for="i in 8" 
          :key="i"
          class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 animate-pulse"
        >
          <div class="aspect-4/3 rounded-lg bg-gray-100 dark:bg-gray-700 mb-4"></div>
          <div class="h-4 w-3/4 bg-gray-100 dark:bg-gray-700 rounded mb-2"></div>
          <div class="h-3 w-1/2 bg-gray-100 dark:bg-gray-700 rounded"></div>
        </div>
      </div>

      <!-- Error State -->
      <div 
        v-else-if="loadError" 
        class="flex flex-col items-center justify-center py-16 text-center bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800"
      >
        <XMarkIcon class="w-12 h-12 text-red-500 mb-4" />
        <h3 class="text-lg font-semibold text-red-600 dark:text-red-400">{{ loadError }}</h3>
        <AppButton variant="primary" class="mt-4" @click="loadTemplates">
          Try Again
        </AppButton>
      </div>

      <!-- Empty State -->
      <div 
        v-else-if="filteredTemplates.length === 0" 
        class="flex flex-col items-center justify-center py-16 text-center bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700"
      >
        <Squares2X2Icon class="w-12 h-12 text-gray-400 mb-4" />
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">No templates found</h3>
        <p class="text-gray-500 dark:text-gray-400 mt-1">
          {{ searchQuery || selectedCategory !== 'all' || selectedTier !== 'all' 
            ? 'Try adjusting your filters' 
            : 'No templates have been published yet' }}
        </p>
      </div>

      <!-- Template Grid -->
      <div v-else class="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AppCard
          v-for="template in filteredTemplates"
          :key="template.id"
          variant="flat"
          class="group relative"
        >
          <template #image>
            <div class="relative aspect-4/3 bg-gray-100 dark:bg-gray-700 rounded-t-xl overflow-hidden">
              <img 
                v-if="template.thumbnail" 
                :src="template.thumbnail" 
                :alt="template.name"
                class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              <div 
                v-else 
                class="w-full h-full flex items-center justify-center"
              >
                <Squares2X2Icon class="w-12 h-12 text-gray-300 dark:text-gray-600" />
              </div>

              <!-- Badges -->
              <div class="absolute top-2 left-2 flex gap-1">
                <span 
                  v-if="template.isPublished === false" 
                  class="bg-yellow-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded"
                >
                  Draft
                </span>
                <span 
                  v-if="template.isPopular" 
                  class="bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5"
                >
                  <FireIcon class="w-3 h-3" /> Popular
                </span>
                <span 
                  v-if="template.isNew" 
                  class="bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded"
                >
                  New
                </span>
              </div>

              <div class="absolute top-2 right-2">
                <AppTierBadge :tier="template.requiredTier" size="sm" />
              </div>

              <!-- Action Overlay -->
              <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button 
                  @click="useTemplate(template)"
                  :disabled="actionLoading === template.id"
                  class="p-2 bg-white rounded-lg text-gray-900 hover:bg-primary-500 hover:text-white transition-colors"
                  title="Use Template"
                >
                  <ArrowDownTrayIcon class="w-5 h-5" />
                </button>
                <button 
                  @click="viewInMarketplace(template.id!)"
                  class="p-2 bg-white rounded-lg text-gray-900 hover:bg-primary-500 hover:text-white transition-colors"
                  title="View in Marketplace"
                >
                  <EyeIcon class="w-5 h-5" />
                </button>
                <button 
                  v-if="canManage(template)"
                  @click="openEditModal(template)"
                  class="p-2 bg-white rounded-lg text-gray-900 hover:bg-primary-500 hover:text-white transition-colors"
                  title="Edit"
                >
                  <PencilSquareIcon class="w-5 h-5" />
                </button>
                <button 
                  v-if="canManage(template)"
                  @click="confirmDelete(template.id!)"
                  class="p-2 bg-white rounded-lg text-gray-900 hover:bg-red-500 hover:text-white transition-colors"
                  title="Delete"
                >
                  <TrashIcon class="w-5 h-5" />
                </button>
              </div>
            </div>
          </template>

          <div class="p-4">
            <div class="flex items-start justify-between gap-2 mb-1">
              <h3 class="font-semibold text-gray-900 dark:text-white truncate">
                {{ template.name }}
              </h3>
              <div class="flex items-center gap-1 text-xs text-gray-500 shrink-0">
                <ArrowDownTrayIcon class="w-3.5 h-3.5" />
                {{ template.downloads || 0 }}
              </div>
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">
              {{ template.description }}
            </p>
            <div class="flex items-center justify-between text-xs">
              <span class="text-primary-600 dark:text-primary-400 font-medium capitalize">
                {{ template.category }}
              </span>
              <span class="text-gray-400">
                by {{ template.creatorName }}
              </span>
            </div>
          </div>
        </AppCard>
      </div>

      <!-- Delete Confirmation Modal -->
      <Teleport to="body">
        <div 
          v-if="deleteConfirmId" 
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div class="fixed inset-0 bg-black/50" @click="cancelDelete"></div>
          <div class="relative bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Delete Template?
            </h3>
            <p class="text-gray-500 dark:text-gray-400 mb-6">
              This action cannot be undone. The template and its thumbnail will be permanently deleted.
            </p>
            <div class="flex justify-end gap-3">
              <AppButton variant="secondary" @click="cancelDelete">
                Cancel
              </AppButton>
              <AppButton 
                variant="primary" 
                class="bg-red-600 hover:bg-red-700"
                :disabled="actionLoading === deleteConfirmId"
                @click="handleDelete"
              >
                {{ actionLoading === deleteConfirmId ? 'Deleting...' : 'Delete' }}
              </AppButton>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- Edit Modal -->
      <TemplateEditModal
        :is-open="editModalOpen"
        :template="selectedTemplate"
        @close="closeEditModal"
        @save="handleSaveTemplate"
      />
    </div>
  </AppLayout>
</template>
