<script setup lang="ts">
import { ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores'
import AppLayout from '@/layouts/AppLayout.vue'
import { projectsService } from '@/services/projects/projects.service'
import AppButton from '@/components/ui/AppButton.vue'
import type { Project } from '@/types'
import { CalendarDaysIcon } from '@heroicons/vue/24/outline'

const authStore = useAuthStore()
const loading = ref(false)
const projects = ref<Project[]>([])

function formatUpdatedAt(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

watch(
  () => authStore.user?.id,
  async (userId) => {
    if (!userId) return
    loading.value = true
    try {
      projects.value = await projectsService.listForUser(userId, 50)
    } finally {
      loading.value = false
    }
  },
  { immediate: true },
)
</script>

<template>
  <AppLayout>
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl sm:text-3xl font-display font-bold text-gray-900 dark:text-white">My Projects</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage and continue your recent designs.</p>
        </div>
        <AppButton to="/editor" variant="primary" class="shrink-0">New Project</AppButton>
      </div>

      <div v-if="loading" class="text-sm text-gray-500 dark:text-gray-400">Loading projects...</div>
      <div v-else-if="projects.length === 0" class="glass-card p-6">
        <div class="text-sm text-gray-500 dark:text-gray-400">No projects yet.</div>
        <div class="mt-4">
          <AppButton to="/editor" variant="secondary">Create your first project</AppButton>
        </div>
      </div>

      <div v-else class="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <RouterLink
          v-for="project in projects"
          :key="project.id"
          :to="`/editor/${project.id}`"
          class="glass-card group overflow-hidden"
        >
          <div class="aspect-4/3 bg-gray-100 dark:bg-gray-800 relative flex items-center justify-center overflow-hidden">
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

          <div class="p-4">
            <div class="flex justify-between items-start gap-2 mb-1">
              <h2 class="font-medium text-gray-900 dark:text-white truncate">{{ project.name }}</h2>
              <span class="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                {{ project.status }}
              </span>
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400">Edited {{ formatUpdatedAt(project.updatedAt) }}</p>
          </div>
        </RouterLink>
      </div>
    </div>
  </AppLayout>
</template>
