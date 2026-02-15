<script setup lang="ts">
import AppNavbar from '@/components/layout/AppNavbar.vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
    <!-- Top Navigation -->
    <AppNavbar />

    <div class="flex flex-1 pt-16">
      <!-- Sidebar Navigation (Hidden on mobile, handled by Navbar menu in future or separate drawer) -->
      <AppSidebar />

      <!-- Main Content Area -->
      <main class="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-950 p-4 sm:p-6 lg:p-8">
        <slot></slot>
      </main>
    </div>

    <AppFooter />
  </div>
</template>
