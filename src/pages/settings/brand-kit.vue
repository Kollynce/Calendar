<script setup lang="ts">
import { computed } from 'vue'
import AppLayout from '@/layouts/AppLayout.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppTierBadge from '@/components/ui/AppTierBadge.vue'
import { useAuthStore } from '@/stores'
import { SwatchIcon, PhotoIcon, LanguageIcon, LockClosedIcon } from '@heroicons/vue/24/outline'

const authStore = useAuthStore()

const hasAccess = computed(() => authStore.isPro)
const canCreateMore = computed(() => authStore.canCreateMoreBrandKits)
const limit = computed(() => authStore.tierLimits.brandKits)
</script>

<template>
  <AppLayout>
    <div class="space-y-8">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl sm:text-3xl font-display font-bold text-gray-900 dark:text-white">Brand Kit</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Keep your designs consistent with saved assets.</p>
        </div>
        <div v-if="!hasAccess" class="flex items-center gap-2">
          <AppTierBadge tier="pro" />
        </div>
      </div>

      <!-- Locked State Overlay for Free Users -->
      <AppCard v-if="!hasAccess" class="p-12 text-center space-y-4" variant="glass">
        <div class="mx-auto w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400">
          <LockClosedIcon class="w-8 h-8" />
        </div>
        <div class="max-w-md mx-auto">
          <h2 class="text-xl font-bold text-gray-900 dark:text-white">Unlock Brand Kits</h2>
          <p class="text-gray-500 dark:text-gray-400 mt-2">
            Save your logos, colors, and fonts to maintain a consistent brand identity across all your calendar designs.
          </p>
          <div class="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <AppButton to="/settings/billing" variant="primary">Upgrade to Pro</AppButton>
            <AppButton to="/settings/billing" variant="secondary">View Pricing</AppButton>
          </div>
        </div>
      </AppCard>

      <div v-else :class="{ 'opacity-60 pointer-events-none grayscale-[0.5]': !canCreateMore && limit > 0 }" class="grid lg:grid-cols-3 gap-6">
        <!-- Content remains similar but with disabled states if needed -->
        <AppCard variant="glass">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <PhotoIcon class="h-5 w-5 text-primary-500" />
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Logos</h2>
            </div>
            <AppTierBadge tier="pro" size="sm" />
          </div>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Upload and reuse your brand logo assets.</p>
          <div class="mt-6 h-32 rounded-xl border-2 border-dashed border-gray-300/60 dark:border-gray-700 flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
            Drop logo files here
          </div>
          <template #footer>
            <AppButton variant="secondary" class="w-full">Upload logo</AppButton>
          </template>
        </AppCard>

        <AppCard variant="glass">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <SwatchIcon class="h-5 w-5 text-primary-500" />
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Colors</h2>
            </div>
            <AppTierBadge tier="pro" size="sm" />
          </div>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Save your palette for quick access.</p>

          <div class="mt-6 grid grid-cols-5 gap-2">
            <div class="h-10 rounded-lg bg-primary-500"></div>
            <div class="h-10 rounded-lg bg-accent-500"></div>
            <div class="h-10 rounded-lg bg-gray-900"></div>
            <div class="h-10 rounded-lg bg-gray-500"></div>
            <div class="h-10 rounded-lg bg-white border border-gray-200 dark:border-gray-700"></div>
          </div>

          <template #footer>
            <AppButton variant="secondary" class="w-full">Edit palette</AppButton>
          </template>
        </AppCard>

        <AppCard variant="glass">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <LanguageIcon class="h-5 w-5 text-primary-500" />
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Typography</h2>
            </div>
            <AppTierBadge tier="pro" size="sm" />
          </div>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Define your default font choices.</p>

          <div class="mt-6 space-y-3">
            <div class="rounded-xl bg-gray-100 dark:bg-gray-800 p-4">
              <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Heading font</div>
              <div class="text-sm text-gray-700 dark:text-gray-200 mt-1">Outfit</div>
            </div>
            <div class="rounded-xl bg-gray-100 dark:bg-gray-800 p-4">
              <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Body font</div>
              <div class="text-sm text-gray-700 dark:text-gray-200 mt-1">Inter</div>
            </div>
          </div>

          <template #footer>
            <AppButton variant="secondary" class="w-full">Manage fonts</AppButton>
          </template>
        </AppCard>
      </div>
    </div>
  </AppLayout>
</template>
