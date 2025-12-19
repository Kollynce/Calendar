<script setup lang="ts">
import AppLayout from '@/layouts/AppLayout.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { useAuthStore } from '@/stores'

const authStore = useAuthStore()
</script>

<template>
  <AppLayout>
    <div class="space-y-8">
      <div>
        <h1 class="text-2xl sm:text-3xl font-display font-bold text-gray-900 dark:text-white">Preferences</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Control defaults for new projects and the app.</p>
      </div>

      <div class="grid lg:grid-cols-3 gap-6">
        <div class="glass-card p-6 lg:col-span-2">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Defaults</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Used when creating new projects.</p>

          <div class="mt-6 grid sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Language</label>
              <input type="text" class="input" :value="authStore.user?.preferences?.language" disabled />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Default country</label>
              <input type="text" class="input" :value="authStore.user?.preferences?.defaultCountry" disabled />
            </div>
          </div>

          <div class="mt-6">
            <AppButton variant="secondary">Edit defaults</AppButton>
          </div>
        </div>

        <div class="glass-card p-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Email updates and marketing.</p>

          <div class="mt-6 space-y-3">
            <div class="rounded-xl border border-white/10 bg-white/10 dark:bg-black/10 p-4">
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-sm font-medium text-gray-900 dark:text-white">Product updates</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">Feature announcements and improvements.</div>
                </div>
                <div class="text-xs font-semibold text-gray-500">—</div>
              </div>
            </div>
            <div class="rounded-xl border border-white/10 bg-white/10 dark:bg-black/10 p-4">
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-sm font-medium text-gray-900 dark:text-white">Marketing emails</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">Occasional offers and tips.</div>
                </div>
                <div class="text-xs font-semibold text-gray-500">—</div>
              </div>
            </div>
          </div>

          <div class="mt-4">
            <AppButton variant="secondary" class="w-full">Manage notifications</AppButton>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
