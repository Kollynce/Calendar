<script setup lang="ts">
import { ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores'
import { projectsService } from '@/services/projects/projects.service'
import type { Project } from '@/types'

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
  <div class="container mx-auto px-4 py-8">
    <div class="flex items-center justify-between gap-4 mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">My Projects</h1>
      <RouterLink to="/editor" class="btn-primary">New Project</RouterLink>
    </div>

    <div v-if="loading" class="text-sm text-gray-500 dark:text-gray-400">Loading...</div>
    <div v-else-if="projects.length === 0" class="text-sm text-gray-500 dark:text-gray-400">
      No projects yet.
    </div>

    <div v-else class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <RouterLink
        v-for="project in projects"
        :key="project.id"
        :to="`/editor/${project.id}`"
        class="glass-card overflow-hidden hover:shadow-md transition-shadow"
      >
        <div class="aspect-4/3 bg-gray-100 dark:bg-gray-800 relative">
          <img
            v-if="project.thumbnail"
            :src="project.thumbnail"
            class="absolute inset-0 w-full h-full object-cover"
            alt=""
          />
        </div>
        <div class="p-4">
          <div class="flex justify-between items-start gap-2">
            <h2 class="font-medium text-gray-900 dark:text-white truncate">{{ project.name }}</h2>
            <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-200">
              {{ project.status }}
            </span>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Edited {{ formatUpdatedAt(project.updatedAt) }}</p>
        </div>
      </RouterLink>
    </div>
  </div>
</template>
