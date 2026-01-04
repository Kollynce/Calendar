<script setup lang="ts">
import { ref } from 'vue'
import type { CalendarTemplate } from '@/data/templates/calendar-templates'
import type { MarketplaceProduct } from '@/services/marketplace.service'
import { marketplaceService } from '@/services/marketplace.service'
import { PhotoIcon, DocumentTextIcon, LockClosedIcon, ArrowDownTrayIcon } from '@heroicons/vue/24/outline'
import { StarIcon as StarSolidIcon, FireIcon } from '@heroicons/vue/24/solid'
import AppTierBadge from '@/components/ui/AppTierBadge.vue'
import AppCard from '@/components/ui/AppCard.vue'
import { useAuthStore } from '@/stores'
import { useRouter } from 'vue-router'

const props = defineProps<{
  categories: { id: string; name: string; icon: string }[]
  selectedCategory: string
  templates: CalendarTemplate[]
  thumbnails: Record<string, string>
  loading: boolean
}>()

const authStore = useAuthStore()
const router = useRouter()

const emit = defineEmits<{
  (e: 'update:selectedCategory', value: string): void
  (e: 'apply', template: CalendarTemplate): void
  (e: 'refresh'): void
}>()

const actionLoadingId = ref<string | null>(null)

function selectCategory(id: string) {
  emit('update:selectedCategory', id)
}

function getMarketplaceProduct(template: CalendarTemplate): MarketplaceProduct | undefined {
  return (template as any)._marketplaceProduct
}

function getMarketplaceId(template: CalendarTemplate): string | undefined {
  return getMarketplaceProduct(template)?.id
}

function getTier(template: CalendarTemplate): 'free' | 'pro' | 'business' {
  const product = getMarketplaceProduct(template)
  if (product) return product.requiredTier
  return template.requiredTier || 'free'
}

function isLocked(template: CalendarTemplate): boolean {
  const tier = getTier(template)
  if (tier === 'free') return false
  if (tier === 'pro') return !authStore.isPro
  if (tier === 'business') return !authStore.isBusiness
  return false
}

function apply(template: CalendarTemplate) {
  if (isLocked(template)) {
    // Redirect to pricing/upgrade page
    router.push('/settings/billing')
    return
  }
  emit('apply', template)
}

function renderStars(rating: number) {
  return Math.round(rating)
}

function getDownloads(template: CalendarTemplate): number {
  const product = getMarketplaceProduct(template)
  return product?.downloads || 0
}

function isPopular(template: CalendarTemplate): boolean {
  const product = getMarketplaceProduct(template)
  return product?.isPopular || template.popular || false
}

function isNew(template: CalendarTemplate): boolean {
  const product = getMarketplaceProduct(template)
  return product?.isNew || false
}

function isUnpublished(template: CalendarTemplate): boolean {
  const product = getMarketplaceProduct(template)
  return product?.isPublished === false
}

async function togglePublish(template: CalendarTemplate): Promise<void> {
  if (!authStore.isAdmin) return
  const product = getMarketplaceProduct(template)
  if (!product?.id) return

  const nextPublished = product.isPublished === false
  const prompt = nextPublished
    ? `Publish "${template.name}" to the marketplace?`
    : `Unpublish "${template.name}" from the marketplace?`
  if (!confirm(prompt)) return

  actionLoadingId.value = product.id
  try {
    await marketplaceService.updateTemplate(product.id, { isPublished: nextPublished })
    emit('refresh')
  } catch (error) {
    console.error('[TemplatePanel] Failed to toggle publish status:', error)
    alert('Failed to update template. Please try again.')
  } finally {
    actionLoadingId.value = null
  }
}

async function deleteMarketplaceTemplate(template: CalendarTemplate): Promise<void> {
  if (!authStore.isAdmin) return
  const product = getMarketplaceProduct(template)
  if (!product?.id) return
  if (!confirm(`Delete "${template.name}"? This cannot be undone.`)) return

  actionLoadingId.value = product.id
  try {
    await marketplaceService.deleteTemplate(product.id)
    emit('refresh')
  } catch (error) {
    console.error('[TemplatePanel] Failed to delete template:', error)
    alert('Failed to delete template. Please try again.')
  } finally {
    actionLoadingId.value = null
  }
}
</script>

<template>
  <div class="space-y-3">
    <!-- Category Tabs -->
    <div class="flex flex-wrap gap-1">
      <button
        v-for="cat in categories"
        :key="cat.id"
        @click="selectCategory(cat.id)"
        :class="[
          'px-2 py-1 text-[10px] font-medium rounded-md transition-all',
          selectedCategory === cat.id
            ? 'bg-primary-500 text-white shadow-sm'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
        ]"
      >
        {{ cat.name }}
      </button>
    </div>

    <!-- Template Grid -->
    <div v-if="loading" class="grid gap-2 grid-cols-2">
      <div
        v-for="n in 4"
        :key="n"
        class="rounded-lg border border-dashed border-gray-200 dark:border-gray-700 aspect-3/4 bg-gray-100 dark:bg-gray-700 animate-pulse"
      ></div>
    </div>

    <div v-else class="grid gap-2 grid-cols-2">
      <AppCard
        v-for="template in templates"
        :key="template.id"
        @click="apply(template)"
        variant="flat"
        hover="shadow"
        interactive
        :class="['group', { 'opacity-80 grayscale-[0.3]': isLocked(template) }]"
      >
        <template #image>
          <!-- Template Preview -->
          <div class="relative aspect-3/4 bg-gray-50 dark:bg-gray-900 overflow-hidden">
            <img
              v-if="thumbnails[template.id]"
              :src="thumbnails[template.id]"
              :alt="`${template.name} preview`"
              class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div
              v-else
              class="w-full h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 gap-0.5"
            >
              <PhotoIcon class="w-5 h-5" />
              <span class="text-[8px] uppercase">No preview</span>
            </div>

            <!-- Compact badges -->
            <div class="absolute top-1 left-1 flex gap-0.5 z-20">
              <span
                v-if="authStore.isAdmin && isUnpublished(template)"
                class="px-1 py-0.5 rounded bg-yellow-500 text-[7px] text-white font-bold"
                title="Unpublished"
              >
                Draft
              </span>
              <span
                v-if="isPopular(template)"
                class="px-1 py-0.5 rounded bg-amber-500 flex items-center justify-center text-[7px] text-white font-bold"
                title="Popular"
              >
                <FireIcon class="w-2.5 h-2.5 mr-0.5" />
              </span>
              <span
                v-if="isNew(template)"
                class="px-1 py-0.5 rounded bg-green-500 text-[7px] text-white font-bold"
                title="New"
              >
                NEW
              </span>
              <span
                v-if="template.preview.hasPhotoArea"
                class="w-4 h-4 rounded bg-black/50 flex items-center justify-center backdrop-blur"
                title="Has photo area"
              >
                <PhotoIcon class="w-2.5 h-2.5 text-white" />
              </span>
              <span
                v-if="template.preview.hasNotesArea"
                class="w-4 h-4 rounded bg-black/50 flex items-center justify-center backdrop-blur"
                title="Has notes area"
              >
                <DocumentTextIcon class="w-2.5 h-2.5 text-white" />
              </span>
            </div>

            <!-- Tier Badge / Lock -->
            <div class="absolute top-1 right-1 z-20">
              <div v-if="isLocked(template)" class="flex items-center gap-0.5">
                <LockClosedIcon class="w-3 h-3 text-white drop-shadow" />
                <AppTierBadge :tier="getTier(template)" size="sm" />
              </div>
              <AppTierBadge v-else-if="getTier(template) !== 'free'" :tier="getTier(template)" size="sm" />
            </div>

            <!-- Hover overlay -->
            <div
              class="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2 z-10"
            >
              <div class="flex-1 min-w-0">
                <p class="text-[10px] font-semibold text-white truncate">{{ template.name }}</p>
                <p class="text-[8px] text-white/70 uppercase">{{ template.category }}</p>
              </div>

              <div v-if="authStore.isAdmin" class="flex items-center gap-1 ml-2">
                <button
                  type="button"
                  class="text-[9px] font-semibold px-1.5 py-1 rounded bg-white/10 text-white hover:bg-white/20"
                  :disabled="actionLoadingId === getMarketplaceId(template)"
                  @click.stop="togglePublish(template)"
                >
                  {{ isUnpublished(template) ? 'Publish' : 'Unpublish' }}
                </button>
                <button
                  type="button"
                  class="text-[9px] font-semibold px-1.5 py-1 rounded bg-red-500/80 text-white hover:bg-red-500"
                  :disabled="actionLoadingId === getMarketplaceId(template)"
                  @click.stop="deleteMarketplaceTemplate(template)"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </template>

        <!-- Compact Info -->
        <div class="p-0">
          <p class="text-[10px] font-medium text-gray-900 dark:text-white truncate">{{ template.name }}</p>
          <div class="flex items-center gap-1 mt-0.5">
            <span class="text-[8px] text-gray-500 dark:text-gray-400 uppercase">
              {{ template.config.layout === 'portrait' ? 'P' : 'L' }}
            </span>
            <div class="flex">
              <StarSolidIcon
                v-for="s in Math.min(renderStars(template.rating || 0), 3)"
                :key="s"
                class="w-2.5 h-2.5 text-amber-400"
              />
            </div>
            <div v-if="getDownloads(template) > 0" class="flex items-center gap-0.5 ml-auto text-[8px] text-gray-400">
              <ArrowDownTrayIcon class="w-2.5 h-2.5" />
              {{ getDownloads(template) }}
            </div>
          </div>
        </div>
      </AppCard>
    </div>
  </div>
</template>
