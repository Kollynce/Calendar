<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores'

const authStore = useAuthStore()

// Placeholder projects
const projects = ref([
  { id: '1', name: 'My 2025 Calendar', updatedAt: '2024-12-08', thumbnail: null },
  { id: '2', name: 'Business Calendar', updatedAt: '2024-12-07', thumbnail: null },
])
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <header class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <RouterLink
            to="/editor"
            class="btn btn-primary"
          >
            + New Calendar
          </RouterLink>
        </div>
      </div>
    </header>

    <!-- Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Welcome -->
      <div class="mb-8">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
          Welcome back, {{ authStore.user?.displayName || 'Creator' }}!
        </h2>
        <p class="text-gray-600 dark:text-gray-400">
          Subscription: <span class="font-medium capitalize">{{ authStore.subscriptionTier }}</span>
        </p>
      </div>

      <!-- Projects Grid -->
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <!-- New Project Card -->
        <RouterLink
          to="/editor"
          class="card p-6 flex flex-col items-center justify-center min-h-[200px] border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 transition-colors group"
        >
          <div class="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900 transition-colors">
            <svg class="w-6 h-6 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <span class="mt-4 text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400">
            Create New Calendar
          </span>
        </RouterLink>

        <!-- Project Cards -->
        <RouterLink
          v-for="project in projects"
          :key="project.id"
          :to="`/editor/${project.id}`"
          class="card overflow-hidden hover:shadow-lg transition-shadow"
        >
          <div class="aspect-[4/3] bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <svg class="w-12 h-12 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div class="p-4">
            <h3 class="font-medium text-gray-900 dark:text-white truncate">
              {{ project.name }}
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Updated {{ project.updatedAt }}
            </p>
          </div>
        </RouterLink>
      </div>
    </main>
  </div>
</template>
