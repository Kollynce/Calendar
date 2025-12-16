<script setup lang="ts">
import { ref } from 'vue'

const templates = ref([
  { id: '1', name: 'Modern Wall Calendar', creator: 'Design Studio', price: 0, downloads: 1250 },
  { id: '2', name: 'Corporate Desk Calendar', creator: 'Pro Templates', price: 999, downloads: 450 },
  { id: '3', name: 'Minimalist Monthly', creator: 'Clean Designs', price: 499, downloads: 890 },
  { id: '4', name: 'Photo Calendar', creator: 'Creative Hub', price: 0, downloads: 2100 },
])

function formatPrice(cents: number): string {
  if (cents === 0) return 'Free'
  return `$${(cents / 100).toFixed(2)}`
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <header class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          Template Marketplace
        </h1>
        <p class="mt-2 text-gray-600 dark:text-gray-400">
          Browse professional calendar templates from creators worldwide
        </p>
      </div>
    </header>

    <!-- Filters -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div class="flex flex-wrap gap-4">
        <select class="select w-auto">
          <option>All Categories</option>
          <option>Wall Calendars</option>
          <option>Desk Calendars</option>
          <option>Planners</option>
        </select>
        <select class="select w-auto">
          <option>All Prices</option>
          <option>Free</option>
          <option>Paid</option>
        </select>
        <select class="select w-auto">
          <option>Most Popular</option>
          <option>Newest</option>
          <option>Price: Low to High</option>
          <option>Price: High to Low</option>
        </select>
      </div>
    </div>

    <!-- Templates Grid -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <div
          v-for="template in templates"
          :key="template.id"
          class="card overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
        >
          <div class="aspect-[4/3] bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <svg class="w-16 h-16 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div class="p-4">
            <h3 class="font-medium text-gray-900 dark:text-white">
              {{ template.name }}
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              by {{ template.creator }}
            </p>
            <div class="mt-3 flex items-center justify-between">
              <span 
                class="font-semibold"
                :class="template.price === 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'"
              >
                {{ formatPrice(template.price) }}
              </span>
              <span class="text-sm text-gray-500 dark:text-gray-400">
                {{ template.downloads.toLocaleString() }} downloads
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
