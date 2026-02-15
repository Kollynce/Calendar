<script setup lang="ts">
import AppNavbar from '@/components/layout/AppNavbar.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
    <!-- Top Navigation -->
    <AppNavbar />

    <!-- Main Content Area -->
    <main class="flex-1 pt-16">
      <slot></slot>
    </main>

    <AppFooter />
  </div>
</template>
