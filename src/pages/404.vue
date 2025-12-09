<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
    <div class="text-center">
      <h1 class="text-9xl font-bold text-gray-200 dark:text-gray-700">404</h1>
      <h2 class="mt-4 text-2xl font-semibold text-gray-900 dark:text-white">
        Page Not Found
      </h2>
      <p class="mt-2 text-gray-600 dark:text-gray-400">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <RouterLink to="/" class="mt-6 btn btn-primary inline-block">
        Go Home
      </RouterLink>
    </div>
  </div>
</template>
