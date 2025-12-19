<script setup lang="ts">
import { computed } from 'vue'
import AppLayout from '@/layouts/AppLayout.vue'
import { ChartBarIcon, CalendarDaysIcon, ArrowTrendingUpIcon } from '@heroicons/vue/24/outline'

const stats = computed(() => [
  {
    name: 'Projects Created',
    value: '—',
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
      <div>
        <h1 class="text-2xl sm:text-3xl font-display font-bold text-gray-900 dark:text-white">Analytics</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Track your growth, performance, and sales.</p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div v-for="stat in stats" :key="stat.name" class="glass-card p-5 flex items-center gap-4">
          <div :class="[stat.bg, 'p-3 rounded-xl']">
            <component :is="stat.icon" :class="[stat.color, 'w-6 h-6']" />
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ stat.name }}</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ stat.value }}</p>
          </div>
        </div>
      </div>

      <div class="grid lg:grid-cols-3 gap-6">
        <div class="glass-card p-6 lg:col-span-2">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Overview</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Analytics charts will appear here once marketplace sales and events are connected.
          </p>
          <div class="mt-6 aspect-16/7 rounded-xl bg-gray-100 dark:bg-gray-800"></div>
        </div>

        <div class="glass-card p-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Top Templates</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Coming soon.</p>
          <div class="mt-6 space-y-3">
            <div class="h-10 rounded-lg bg-gray-100 dark:bg-gray-800"></div>
            <div class="h-10 rounded-lg bg-gray-100 dark:bg-gray-800"></div>
            <div class="h-10 rounded-lg bg-gray-100 dark:bg-gray-800"></div>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
