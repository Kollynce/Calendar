<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores'

const authStore = useAuthStore()
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
    <!-- Hero Section -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
      <div class="text-center">
        <h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white">
          Create Beautiful
          <span class="text-blue-600 dark:text-blue-400">Calendars</span>
        </h1>
        <p class="mt-6 text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          Design professional calendars for your business, clients, or personal use. 
          Perfect for printing shops and creators across Africa.
        </p>
        
        <div class="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <RouterLink
            v-if="authStore.isAuthenticated"
            to="/dashboard"
            class="btn btn-primary text-lg px-8 py-3"
          >
            Go to Dashboard
          </RouterLink>
          <template v-else>
            <RouterLink
              to="/register"
              class="btn btn-primary text-lg px-8 py-3"
            >
              Get Started Free
            </RouterLink>
            <RouterLink
              to="/login"
              class="btn btn-secondary text-lg px-8 py-3"
            >
              Sign In
            </RouterLink>
          </template>
        </div>
      </div>
    </div>

    <!-- Features Section -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h2 class="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
        Everything You Need
      </h2>
      
      <div class="grid md:grid-cols-3 gap-8">
        <div class="card p-6">
          <div class="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4">
            <svg class="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            African Holidays
          </h3>
          <p class="text-gray-600 dark:text-gray-400">
            Built-in holiday data for all 54 African countries with local language support.
          </p>
        </div>

        <div class="card p-6">
          <div class="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-4">
            <svg class="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Design Studio
          </h3>
          <p class="text-gray-600 dark:text-gray-400">
            Powerful canvas editor with drag-and-drop, layers, and professional design tools.
          </p>
        </div>

        <div class="card p-6">
          <div class="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mb-4">
            <svg class="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
          </div>
          <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Print-Ready Export
          </h3>
          <p class="text-gray-600 dark:text-gray-400">
            Export in PDF, PNG, or SVG with bleed marks and crop marks for professional printing.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
