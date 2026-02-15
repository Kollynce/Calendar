<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MarketplaceLayout from '@/layouts/MarketplaceLayout.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppTierBadge from '@/components/ui/AppTierBadge.vue'
import { marketplaceService, type MarketplaceCreatorProfile } from '@/services/marketplace.service'
import { StarIcon as StarSolidIcon } from '@heroicons/vue/24/solid'
import { ArrowDownTrayIcon } from '@heroicons/vue/24/outline'

const route = useRoute()
const router = useRouter()

const profile = ref<MarketplaceCreatorProfile | null>(null)
const loading = ref(true)
const errorMessage = ref<string | null>(null)

const creatorId = computed(() => String(route.params.creatorId || '').trim())

async function loadCreatorProfile() {
  if (!creatorId.value) {
    errorMessage.value = 'Creator not found'
    profile.value = null
    loading.value = false
    return
  }

  loading.value = true
  errorMessage.value = null

  try {
    const data = await marketplaceService.getCreatorProfile(creatorId.value)
    if (!data) {
      errorMessage.value = 'Creator profile not found'
      profile.value = null
      return
    }

    profile.value = data
  } catch (error) {
    console.error('[CreatorProfile] Failed to load profile', error)
    errorMessage.value = 'Unable to load creator profile right now. Please try again shortly.'
  } finally {
    loading.value = false
  }
}

function openTemplate(templateId?: string) {
  if (!templateId) return
  router.push(`/marketplace/${templateId}`)
}

watch(creatorId, () => {
  void loadCreatorProfile()
}, { immediate: true })
</script>

<template>
  <MarketplaceLayout>
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
      <div v-if="loading" class="space-y-8">
        <div class="h-28 rounded-3xl bg-gray-100 dark:bg-gray-900 animate-pulse"></div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div v-for="idx in 4" :key="idx" class="h-24 rounded-2xl bg-gray-100 dark:bg-gray-900 animate-pulse"></div>
        </div>
      </div>

      <div v-else-if="errorMessage" class="rounded-3xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 p-8 text-center">
        <p class="text-red-600 dark:text-red-300 font-semibold">{{ errorMessage }}</p>
        <AppButton class="mt-6" variant="primary" @click="loadCreatorProfile">Try again</AppButton>
      </div>

      <div v-else-if="profile" class="space-y-10">
        <section class="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 lg:p-10">
          <p class="text-xs font-black tracking-widest uppercase text-primary-600">Creator profile</p>
          <h1 class="mt-3 text-4xl font-display font-black text-gray-900 dark:text-white">{{ profile.displayName }}</h1>

          <div class="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4">
              <p class="text-xs uppercase tracking-widest text-gray-500">Templates</p>
              <p class="mt-2 text-2xl font-black text-gray-900 dark:text-white">{{ profile.templateCount }}</p>
            </div>
            <div class="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4">
              <p class="text-xs uppercase tracking-widest text-gray-500">Total downloads</p>
              <p class="mt-2 text-2xl font-black text-gray-900 dark:text-white">{{ profile.totalDownloads.toLocaleString() }}</p>
            </div>
            <div class="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4">
              <p class="text-xs uppercase tracking-widest text-gray-500">Average rating</p>
              <p class="mt-2 text-2xl font-black text-gray-900 dark:text-white inline-flex items-center gap-2">
                <StarSolidIcon class="w-5 h-5 text-amber-400" />
                {{ profile.averageRating.toFixed(1) }}
              </p>
            </div>
          </div>
        </section>

        <section>
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-display font-black text-gray-900 dark:text-white">Templates by {{ profile.displayName }}</h2>
            <AppButton variant="secondary" @click="router.push('/marketplace')">Back to marketplace</AppButton>
          </div>

          <div v-if="profile.templates.length" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            <article
              v-for="template in profile.templates"
              :key="template.id"
              class="group rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 cursor-pointer hover:border-primary-500/60 transition-colors"
              @click="openTemplate(template.id)"
            >
              <div class="aspect-4/3 rounded-2xl bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <img v-if="template.thumbnail" :src="template.thumbnail" :alt="template.name" class="w-full h-full object-cover" loading="lazy" />
              </div>

              <div class="mt-4 space-y-2">
                <div class="flex items-center justify-between text-xs text-gray-500">
                  <AppTierBadge :tier="template.requiredTier" size="sm" />
                  <span class="inline-flex items-center gap-1">
                    <ArrowDownTrayIcon class="w-3 h-3" />
                    {{ template.downloads.toLocaleString() }}
                  </span>
                </div>
                <h3 class="font-bold text-gray-900 dark:text-white">{{ template.name }}</h3>
                <p class="text-sm text-gray-500 line-clamp-2">{{ template.description }}</p>
              </div>
            </article>
          </div>
          <div v-else class="rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 p-10 text-center text-sm text-gray-500">
            No templates published yet.
          </div>
        </section>
      </div>
    </div>
  </MarketplaceLayout>
</template>
