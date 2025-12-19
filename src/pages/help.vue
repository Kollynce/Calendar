<script setup lang="ts">
import AppLayout from '@/layouts/AppLayout.vue'
import { EnvelopeIcon, QuestionMarkCircleIcon } from '@heroicons/vue/24/outline'
</script>

<template>
  <AppLayout>
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl sm:text-3xl font-display font-bold text-gray-900 dark:text-white">Help &amp; Support</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Find answers, learn best practices, and contact support.
        </p>
      </div>

      <div class="grid lg:grid-cols-3 gap-6">
        <div class="glass-card p-6 lg:col-span-2">
          <div class="flex items-center gap-2 mb-4">
            <QuestionMarkCircleIcon class="h-5 w-5 text-primary-500" />
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Frequently Asked Questions</h2>
          </div>

          <div class="space-y-4">
            <div class="rounded-xl border border-white/10 bg-white/10 dark:bg-black/10 p-4">
              <div class="text-sm font-medium text-gray-900 dark:text-white">Why do my project thumbnails look blurry?</div>
              <div class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Thumbnails are generated when you save a project. Open the project in the editor and save again to refresh the preview.
              </div>
            </div>
            <div class="rounded-xl border border-white/10 bg-white/10 dark:bg-black/10 p-4">
              <div class="text-sm font-medium text-gray-900 dark:text-white">How do I export print-ready files?</div>
              <div class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Use the Export panel in the editor to select format and quality (DPI), and enable bleed/crop marks if needed.
              </div>
            </div>
          </div>
        </div>

        <div class="glass-card p-6">
          <div class="flex items-center gap-2 mb-4">
            <EnvelopeIcon class="h-5 w-5 text-primary-500" />
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Contact</h2>
          </div>

          <div class="space-y-3 text-sm text-gray-500 dark:text-gray-400">
            <div>
              For support, email:
              <span class="text-gray-900 dark:text-white font-medium">support@calendarcreator.app</span>
            </div>
            <div>
              Include:
              <span class="text-gray-900 dark:text-white font-medium">project name</span>,
              <span class="text-gray-900 dark:text-white font-medium">browser</span>, and
              <span class="text-gray-900 dark:text-white font-medium">steps to reproduce</span>.
            </div>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
