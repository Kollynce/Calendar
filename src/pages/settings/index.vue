<script setup lang="ts">
import { computed } from 'vue'
import AppLayout from '@/layouts/AppLayout.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { useAuthStore, useThemeStore } from '@/stores'

const authStore = useAuthStore()
const themeStore = useThemeStore()

const currentThemeName = computed(() => {
  const theme = themeStore.availableThemes.find((t) => t.id === themeStore.currentThemeId)
  return theme?.name ?? 'Theme'
})
</script>

<template>
  <AppLayout>
    <div class="space-y-8">
      <div>
        <h1 class="text-2xl sm:text-3xl font-display font-bold text-gray-900 dark:text-white">Account</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your profile and preferences.</p>
      </div>

      <div class="grid lg:grid-cols-3 gap-6">
        <div class="glass-card p-6 lg:col-span-2">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Profile</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Your public account details.</p>

          <div class="mt-6 grid sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Display name</label>
              <input type="text" :value="authStore.user?.displayName" class="input" disabled />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Email</label>
              <input type="email" :value="authStore.user?.email" class="input opacity-50" disabled />
            </div>
          </div>
        </div>

        <div class="glass-card p-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Subscription</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Your current plan and limits.</p>

          <div class="mt-6 rounded-xl border border-white/10 bg-white/10 dark:bg-black/10 p-4">
            <div class="text-sm font-medium text-gray-900 dark:text-white capitalize">{{ authStore.subscriptionTier }} plan</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {{ authStore.isPro ? 'Full access to pro features.' : 'Upgrade to unlock more features.' }}
            </div>
          </div>

          <div class="mt-4">
            <AppButton to="/settings/billing" variant="secondary" class="w-full">Manage subscription</AppButton>
          </div>
        </div>
      </div>

      <div class="grid lg:grid-cols-3 gap-6">
        <div class="glass-card p-6 lg:col-span-2">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Appearance</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Theme and color preferences.</p>

          <div class="mt-6 grid sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Theme preset</label>
              <select v-model="themeStore.currentThemeId" class="select">
                <option v-for="t in themeStore.availableThemes" :key="t.id" :value="t.id">{{ t.name }}</option>
              </select>
              <div class="text-xs text-gray-500 dark:text-gray-400 mt-2">Current: {{ currentThemeName }}</div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Dark mode</label>
              <div class="flex items-center justify-between rounded-xl border border-white/10 bg-white/10 dark:bg-black/10 p-4">
                <div>
                  <div class="text-sm font-medium text-gray-900 dark:text-white">{{ themeStore.darkMode ? 'Enabled' : 'Disabled' }}</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">Toggle dark mode for the app.</div>
                </div>
                <AppButton variant="secondary" class="shrink-0" @click="themeStore.toggleDarkMode()">Toggle</AppButton>
              </div>
            </div>
          </div>
        </div>

        <div class="glass-card p-6 border border-red-500/20">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Sign out</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">End your current session.</p>
          <div class="mt-6">
            <AppButton variant="secondary" class="w-full" @click="authStore.logout()">Sign out</AppButton>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
