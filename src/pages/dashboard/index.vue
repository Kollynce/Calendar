<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useAuthStore } from '@/stores'
import AppLayout from '@/layouts/AppLayout.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppTierBadge from '@/components/ui/AppTierBadge.vue'
import { projectsService } from '@/services/projects/projects.service'
import type { Project } from '@/types'
import { 
  PlusIcon, 
  ArrowUpTrayIcon, 
  ClockIcon, 
  CalendarDaysIcon,
  ChartPieIcon,
  SparklesIcon
} from '@heroicons/vue/24/outline'

import { recalculateUserStats } from '@/services/storage/storage-usage.service'

const authStore = useAuthStore()

const canCreateMore = computed(() => authStore.canCreateMoreProjects)
const projectLimit = computed(() => authStore.tierLimits.projects)
const currentCount = computed(() => authStore.user?.stats?.projectCount || 0)

const recentProjects = ref<Project[]>([])
const recentProjectsLoading = ref(false)

onMounted(async () => {
  if (authStore.user?.id) {
    // Initial sync to fix any 0B or missing stats issues
    await recalculateUserStats(authStore.user.id).catch(console.error)
  }
})

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / Math.pow(1024, exponent)
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`
}

const stats = computed(() => {
  const userStats = authStore.user?.stats
  const storageLimit = authStore.tierLimits?.storageLimit || 0
  
  return [
    {
      name: 'Total Projects',
      value: String(userStats?.projectCount ?? recentProjects.value.length),
      icon: CalendarDaysIcon,
      color: 'text-blue-500',
      bg: 'bg-blue-100 dark:bg-blue-900/20',
    },
    {
      name: 'Storage Used',
      value: userStats ? `${formatBytes(userStats.storageUsed)} / ${formatBytes(storageLimit)}` : '—',
      icon: ChartPieIcon,
      color: 'text-purple-500',
      bg: 'bg-purple-100 dark:bg-purple-900/20',
    },
    {
      name: 'Days Active',
      value: String(userStats?.activeDays?.length ?? 0),
      icon: ClockIcon,
      color: 'text-green-500',
      bg: 'bg-green-100 dark:bg-green-900/20',
    },
  ]
})

function formatUpdatedAt(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

watch(
  () => authStore.user?.id,
  async (userId) => {
    if (!userId) return
    recentProjectsLoading.value = true
    try {
      recentProjects.value = await projectsService.listForUser(userId, 8)
    } finally {
      recentProjectsLoading.value = false
    }
  },
  { immediate: true },
)
</script>

<template>
  <AppLayout>
    <div class="space-y-8">
      <!-- Welcome & Stats Section -->
      <div class="space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 class="text-3xl font-display font-bold text-gray-900 dark:text-white">
              Dashboard
            </h1>
            <p class="text-gray-500 dark:text-gray-400 mt-1">
              Welcome back, {{ authStore.user?.displayName || 'Creator' }}. Here's what's happening.
            </p>
          </div>
          <div class="flex flex-col items-end gap-2">
            <div class="flex gap-3">
              <AppButton variant="secondary" class="flex items-center gap-2 text-sm">
                <ArrowUpTrayIcon class="w-4 h-4" /> Import
              </AppButton>
              <AppButton 
                to="/editor" 
                variant="primary" 
                class="flex items-center gap-2"
                :disabled="!canCreateMore"
              >
                <PlusIcon class="w-5 h-5" /> New Project
              </AppButton>
            </div>
            <div v-if="!canCreateMore" class="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 font-medium">
              <span>Project limit reached ({{ currentCount }}/{{ projectLimit }})</span>
              <AppTierBadge tier="pro" size="sm" />
            </div>
          </div>
        </div>

        <!-- Stats Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AppCard v-for="stat in stats" :key="stat.name" variant="glass" class="p-5 flex items-center gap-4">
            <div :class="[stat.bg, 'p-3 rounded-xl']">
              <component :is="stat.icon" :class="[stat.color, 'w-6 h-6']" />
            </div>
            <div>
              <p class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ stat.name }}</p>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ stat.value }}</p>
            </div>
          </AppCard>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="grid md:grid-cols-2 gap-6">
        <AppCard 
          @click="canCreateMore ? $router.push('/editor') : null"
          variant="glass"
          class="p-6 bg-linear-to-br from-primary-500 to-indigo-600 text-white relative overflow-hidden group transition-all"
          :class="{ 'opacity-75 grayscale-[0.5] cursor-not-allowed!': !canCreateMore, 'cursor-pointer': canCreateMore }"
          hover="scale"
        >
          <div class="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
          <h3 class="text-xl font-bold mb-2 relative z-10 flex items-center gap-2">
            Start from Scratch
            <AppTierBadge v-if="!canCreateMore" tier="pro" size="sm" class="bg-white/20" />
          </h3>
          <p class="text-primary-100 mb-6 relative z-10 max-w-sm">
            Create a custom calendar with our powerful design editor. Choose size, layout, and holidays.
          </p>
          <AppButton 
            :to="canCreateMore ? '/editor' : undefined" 
            variant="glass" 
            class="relative z-10 flex items-center gap-2"
            :disabled="!canCreateMore"
          >
            Open Editor <PlusIcon class="w-4 h-4" />
          </AppButton>
        </AppCard>

        <AppCard 
          :to="'/marketplace'"
          variant="glass"
          class="p-6 border-l-4 border-l-accent-500 relative overflow-hidden group"
          interactive
          hover="scale"
        >
          <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2">Browse Templates</h3>
          <p class="text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
            Jump start your design with professionally crafted templates for every industry.
          </p>
          <div class="inline-flex items-center gap-2 text-accent-500 font-medium hover:text-accent-600 transition-colors">
            Visit Marketplace <SparklesIcon class="w-4 h-4" />
          </div>
        </AppCard>
      </div>

      <!-- Recent Projects -->
      <div>
        <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4">Recent Projects</h2>
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <div
            v-if="recentProjectsLoading"
            class="col-span-full text-sm text-gray-500 dark:text-gray-400"
          >
            Loading projects...
          </div>
          <div
            v-else-if="recentProjects.length === 0"
            class="col-span-full text-sm text-gray-500 dark:text-gray-400"
          >
            No projects yet. Create your first one in the editor.
          </div>
          <AppCard
            v-for="project in recentProjects"
            :key="project.id"
            :to="`/editor/${project.id}`"
            variant="glass"
            hover="scale"
            interactive
          >
            <template #image>
              <div class="aspect-4/3 bg-gray-100 dark:bg-gray-800 relative flex items-center justify-center overflow-hidden">
                <div class="absolute inset-0 bg-linear-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4 z-10">
                  <span class="text-white text-sm font-medium">Click to edit</span>
                </div>
                <img
                  v-if="project.thumbnail"
                  :src="project.thumbnail"
                  class="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  alt=""
                />
                <CalendarDaysIcon
                  v-else
                  class="w-12 h-12 text-gray-300 dark:text-gray-600 group-hover:scale-110 transition-transform duration-300"
                />
              </div>
            </template>
            
            <div class="flex justify-between items-start mb-1">
              <h3 class="font-medium text-gray-900 dark:text-white truncate pr-2">{{ project.name }}</h3>
              <span class="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                {{ project.status }}
              </span>
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400">Edited {{ formatUpdatedAt(project.updatedAt) }}</p>
          </AppCard>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

