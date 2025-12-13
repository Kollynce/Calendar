<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores'
import AppLayout from '@/layouts/AppLayout.vue'
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

const authStore = useAuthStore()

const recentProjects = ref<Project[]>([])
const recentProjectsLoading = ref(false)

const stats = computed(() => [
  {
    name: 'Total Projects',
    value: String(recentProjects.value.length),
    icon: CalendarDaysIcon,
    color: 'text-blue-500',
    bg: 'bg-blue-100 dark:bg-blue-900/20',
  },
  {
    name: 'Storage Used',
    value: '—',
    icon: ChartPieIcon,
    color: 'text-purple-500',
    bg: 'bg-purple-100 dark:bg-purple-900/20',
  },
  {
    name: 'Days Active',
    value: '—',
    icon: ClockIcon,
    color: 'text-green-500',
    bg: 'bg-green-100 dark:bg-green-900/20',
  },
])

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
          <div class="flex gap-3">
            <button class="btn-secondary flex items-center gap-2 text-sm">
              <ArrowUpTrayIcon class="w-4 h-4" /> Import
            </button>
            <RouterLink to="/editor" class="btn-primary flex items-center gap-2">
              <PlusIcon class="w-5 h-5" /> New Project
            </RouterLink>
          </div>
        </div>

        <!-- Stats Grid -->
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
      </div>

      <!-- Quick Actions -->
      <div class="grid md:grid-cols-2 gap-6">
        <div class="glass-card p-6 bg-linear-to-br from-primary-500 to-indigo-600 text-white relative overflow-hidden group cursor-pointer">
          <div class="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
          <h3 class="text-xl font-bold mb-2 relative z-10">Start from Scratch</h3>
          <p class="text-primary-100 mb-6 relative z-10 max-w-sm">
            Create a custom calendar with our powerful design editor. Choose size, layout, and holidays.
          </p>
          <RouterLink to="/editor" class="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md hover:bg-white/30 text-white px-4 py-2 rounded-lg font-medium transition-colors relative z-10">
            Open Editor <PlusIcon class="w-4 h-4" />
          </RouterLink>
        </div>

        <div class="glass-card p-6 border-l-4 border-l-accent-500 relative overflow-hidden group cursor-pointer">
          <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2">Browse Templates</h3>
          <p class="text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
            Jump start your design with professionlly crafted templates for every industry.
          </p>
          <RouterLink to="/marketplace" class="inline-flex items-center gap-2 text-accent-500 font-medium hover:text-accent-600 transition-colors">
            Visit Marketplace <SparklesIcon class="w-4 h-4" />
          </RouterLink>
        </div>
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
          <RouterLink
            v-for="project in recentProjects"
            :key="project.id"
            :to="`/editor/${project.id}`"
            class="glass-card group overflow-hidden"
          >
            <!-- Preview Area -->
            <div class="aspect-4/3 bg-gray-100 dark:bg-gray-800 relative flex items-center justify-center overflow-hidden">
              <div class="absolute inset-0 bg-linear-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                <span class="text-white text-sm font-medium">Click to edit</span>
              </div>
              <img
                v-if="project.thumbnail"
                :src="project.thumbnail"
                class="absolute inset-0 w-full h-full object-cover"
                alt=""
              />
              <CalendarDaysIcon
                v-else
                class="w-12 h-12 text-gray-300 dark:text-gray-600 group-hover:scale-110 transition-transform duration-300"
              />
            </div>
            
            <!-- Card Footer -->
            <div class="p-4">
              <div class="flex justify-between items-start mb-1">
                <h3 class="font-medium text-gray-900 dark:text-white truncate pr-2">{{ project.name }}</h3>
                <span class="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  {{ project.status }}
                </span>
              </div>
              <p class="text-xs text-gray-500 dark:text-gray-400">Edited {{ formatUpdatedAt(project.updatedAt) }}</p>
            </div>
          </RouterLink>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

