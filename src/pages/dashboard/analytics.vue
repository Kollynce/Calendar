<script setup lang="ts">
import { computed } from 'vue'
import AppLayout from '@/layouts/AppLayout.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppTierBadge from '@/components/ui/AppTierBadge.vue'
import { useAuthStore } from '@/stores'
import { ChartBarIcon, CalendarDaysIcon, ArrowTrendingUpIcon, LockClosedIcon } from '@heroicons/vue/24/outline'

const authStore = useAuthStore()
const hasAccess = computed(() => authStore.isBusiness)

const stats = computed(() => [
  {
    name: 'Projects Created',
    value: authStore.user?.stats?.projectCount || '0',
    icon: CalendarDaysIcon,
    color: 'text-blue-500',
    bg: 'bg-blue-100 dark:bg-blue-900/20',
  },
  {
    name: 'Template Sales',
    value: '—',
    icon: ChartBarIcon,
    color: 'text-purple-500',
    bg: 'bg-purple-100 dark:bg-purple-900/20',
  },
  {
    name: 'Revenue',
    value: '—',
    icon: ArrowTrendingUpIcon,
    color: 'text-green-500',
    bg: 'bg-green-100 dark:bg-green-900/20',
  },
])
</script>

<template>
  <AppLayout>
    <div class="space-y-8">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl sm:text-3xl font-display font-bold text-gray-900 dark:text-white">Analytics</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Track your growth, performance, and sales.</p>
        </div>
        <div v-if="!hasAccess" class="flex items-center gap-2">
          <AppTierBadge tier="business" />
        </div>
      </div>

      <!-- Locked State Overlay for Free/Pro Users -->
      <AppCard v-if="!hasAccess" class="p-12 text-center space-y-4" variant="glass">
        <div class="mx-auto w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400">
          <LockClosedIcon class="w-8 h-8" />
        </div>
        <div class="max-w-md mx-auto">
          <h2 class="text-xl font-bold text-gray-900 dark:text-white">Unlock Advanced Analytics</h2>
          <p class="text-gray-500 dark:text-gray-400 mt-2">
            Get detailed insights into your calendar performance, marketplace sales, and audience engagement with our Business plan.
          </p>
          <div class="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <AppButton to="/settings/billing" variant="primary">Upgrade to Business</AppButton>
            <AppButton to="/settings/billing" variant="secondary">View Pricing</AppButton>
          </div>
        </div>
      </AppCard>

      <template v-else>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AppCard v-for="stat in stats" :key="stat.name" class="p-5 flex items-center gap-4" variant="glass">
            <div :class="[stat.bg, 'p-3 rounded-xl']">
              <component :is="stat.icon" :class="[stat.color, 'w-6 h-6']" />
            </div>
            <div>
              <p class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ stat.name }}</p>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ stat.value }}</p>
            </div>
          </AppCard>
        </div>

        <div class="grid lg:grid-cols-3 gap-6">
          <AppCard class="lg:col-span-2" variant="glass">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Overview</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Analytics charts will appear here once marketplace sales and events are connected.
            </p>
            <div class="mt-6 aspect-16/7 rounded-xl bg-gray-100 dark:bg-gray-800"></div>
          </AppCard>

          <AppCard variant="glass">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Top Templates</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Coming soon.</p>
            <div class="mt-6 space-y-3">
              <div class="h-10 rounded-lg bg-gray-100 dark:bg-gray-800"></div>
              <div class="h-10 rounded-lg bg-gray-100 dark:bg-gray-800"></div>
              <div class="h-10 rounded-lg bg-gray-100 dark:bg-gray-800"></div>
            </div>
          </AppCard>
        </div>
      </template>
    </div>
  </AppLayout>
</template>
