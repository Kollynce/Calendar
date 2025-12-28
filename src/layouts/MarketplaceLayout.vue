<script setup lang="ts">
import AppNavbar from '@/components/layout/AppNavbar.vue'
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
    <!-- Top Navigation -->
    <AppNavbar />

    <!-- Main Content Area -->
    <main class="flex-1 pt-16">
      <slot></slot>
    </main>

    <!-- Footer for Public Section -->
    <footer class="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 py-12">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div class="col-span-2">
            <div class="flex items-center gap-2 mb-4">
              <div class="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white font-black">C</div>
              <span class="text-xl font-display font-black text-gray-900 dark:text-white uppercase tracking-tighter">CalendarCreator</span>
            </div>
            <p class="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
              The professional way to design, customize, and print your perfect calendar.
            </p>
          </div>
          <div>
            <h4 class="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white mb-4">Product</h4>
            <ul class="space-y-2 text-sm text-gray-500 dark:text-gray-400">
              <li><a href="/#features" class="hover:text-primary-600 transition-colors">Features</a></li>
              <li><router-link to="/marketplace" class="hover:text-primary-600 transition-colors text-primary-600 font-bold">Marketplace</router-link></li>
              <li><a href="/#pricing" class="hover:text-primary-600 transition-colors">Pricing</a></li>
            </ul>
          </div>
          <div>
            <h4 class="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white mb-4">Support</h4>
            <ul class="space-y-2 text-sm text-gray-500 dark:text-gray-400">
              <li><router-link to="/help" class="hover:text-primary-600 transition-colors">Help Center</router-link></li>
              <li><router-link to="/terms" class="hover:text-primary-600 transition-colors">Terms of Service</router-link></li>
              <li><router-link to="/privacy" class="hover:text-primary-600 transition-colors">Privacy Policy</router-link></li>
            </ul>
          </div>
        </div>
        <div class="mt-12 pt-8 border-t border-gray-100 dark:border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p class="text-xs text-gray-400">&copy; 2025 CalendarCreator. All rights reserved.</p>
          <div class="flex gap-6">
            <!-- Social links placeholder -->
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap');

.font-display {
  font-family: 'Outfit', sans-serif;
}
</style>
