<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import AppLayout from '@/layouts/AppLayout.vue'
import { projectsService } from '@/services/projects/projects.service'
import { updateProjectCount } from '@/services/storage/storage-usage.service'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppTierBadge from '@/components/ui/AppTierBadge.vue'
import { useAuthStore } from '@/stores'
import type { Project } from '@/types'
import { CalendarDaysIcon, PlusIcon, TrashIcon } from '@heroicons/vue/24/outline'

const authStore = useAuthStore()
const loading = ref(false)
const projects = ref<Project[]>([])
const deleteConfirmId = ref<string | null>(null)
const actionLoadingId = ref<string | null>(null)

const canCreateMore = computed(() => authStore.canCreateMoreProjects)
const projectLimit = computed(() => authStore.tierLimits.projects)
const currentCount = computed(() => authStore.user?.stats?.projectCount || 0)
const projectToDelete = computed(() =>
  projects.value.find((project) => project.id === deleteConfirmId.value) || null,
)

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

function confirmDelete(projectId: string) {
  deleteConfirmId.value = projectId
}

function cancelDelete() {
  deleteConfirmId.value = null
}

async function handleDelete() {
  const projectId = deleteConfirmId.value
  const userId = authStore.user?.id
  if (!projectId) return

  actionLoadingId.value = projectId

  try {
    await projectsService.delete(projectId)
    projects.value = projects.value.filter((project) => project.id !== projectId)

    if (userId) {
      await updateProjectCount(userId, -1).catch((error) => {
        console.error('[DashboardProjects] Failed to decrement project count:', error)
      })
    }
  } catch (error) {
    console.error('[DashboardProjects] Failed to delete project:', error)
    alert('Failed to delete the project. Please try again.')
  } finally {
    actionLoadingId.value = null
    deleteConfirmId.value = null
  }
}
</script>

<template>
  <AppLayout>
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl sm:text-3xl font-display font-bold text-gray-900 dark:text-white">My Projects</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage and continue your recent designs.</p>
        </div>
        <div class="flex flex-col items-end gap-2">
          <AppButton 
            to="/editor" 
            variant="primary" 
            class="shrink-0"
            :disabled="!canCreateMore"
          >
            <template #icon>
              <PlusIcon class="w-4 h-4" />
            </template>
            New Project
          </AppButton>
          <div v-if="!canCreateMore" class="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 font-medium">
            <span>Project limit reached ({{ currentCount }}/{{ projectLimit }})</span>
            <AppTierBadge tier="pro" size="sm" />
          </div>
        </div>
      </div>

      <div v-if="loading" class="text-sm text-gray-500 dark:text-gray-400">Loading projects...</div>
      <div v-else-if="projects.length === 0" class="glass-card p-6">
        <div class="text-sm text-gray-500 dark:text-gray-400">No projects yet.</div>
        <div class="mt-4">
          <AppButton to="/editor" variant="secondary">Create your first project</AppButton>
        </div>
      </div>

      <div v-else class="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <div
          v-for="project in projects"
          :key="project.id"
          class="relative group"
        >
          <AppCard :to="`/editor/${project.id}`" variant="glass" hover="scale" interactive>
            <template #image>
              <div class="aspect-4/3 bg-gray-100 dark:bg-gray-800 relative flex items-center justify-center overflow-hidden">
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

            <div class="flex justify-between items-start gap-2 mb-2">
              <h2 class="font-medium text-gray-900 dark:text-white truncate">{{ project.name }}</h2>
              <span class="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                {{ project.status }}
              </span>
            </div>
            <div class="flex items-center justify-between gap-3">
              <p class="text-xs text-gray-500 dark:text-gray-400">Edited {{ formatUpdatedAt(project.updatedAt) }}</p>
              <button
                type="button"
                class="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:text-red-300 dark:bg-red-500/10 dark:hover:bg-red-500/20"
                :class="{ 'opacity-50 cursor-not-allowed': actionLoadingId === project.id }"
                :disabled="actionLoadingId === project.id"
                @click.stop.prevent="confirmDelete(project.id)"
              >
                <TrashIcon class="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
          </AppCard>
        </div>
      </div>

      <Teleport to="body">
        <div
          v-if="projectToDelete"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div class="fixed inset-0 bg-black/50" @click="cancelDelete"></div>
          <div class="relative bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Delete project?</h3>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                “{{ projectToDelete.name }}” and all of its design data will be permanently removed. This action cannot be undone.
              </p>
            </div>
            <div class="flex flex-col sm:flex-row justify-end gap-3">
              <AppButton variant="secondary" class="sm:flex-1" @click="cancelDelete">Cancel</AppButton>
              <AppButton
                class="sm:flex-1 bg-red-600 hover:bg-red-700 focus-visible:ring-red-500"
                :disabled="actionLoadingId === projectToDelete.id"
                @click="handleDelete"
              >
                {{ actionLoadingId === projectToDelete.id ? 'Deleting…' : 'Delete' }}
              </AppButton>
            </div>
          </div>
        </div>
      </Teleport>
    </div>
  </AppLayout>
</template>
