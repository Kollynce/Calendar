<script setup lang="ts">
import { useAuthStore, useThemeStore } from '@/stores'

const authStore = useAuthStore()
const themeStore = useThemeStore()
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <header class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          Settings
        </h1>
      </div>
    </header>

    <main class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <!-- Profile Section -->
      <section class="card p-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Profile
        </h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Display Name
            </label>
            <input
              type="text"
              :value="authStore.user?.displayName"
              class="input"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              :value="authStore.user?.email"
              disabled
              class="input opacity-50"
            />
          </div>
        </div>
      </section>

      <!-- Appearance Section -->
      <section class="card p-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Appearance
        </h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Theme
            </label>
            <div class="flex gap-2">
              <button
                class="btn"
                :class="themeStore.theme === 'light' ? 'btn-primary' : 'btn-secondary'"
                @click="themeStore.setTheme('light')"
              >
                Light
              </button>
              <button
                class="btn"
                :class="themeStore.theme === 'dark' ? 'btn-primary' : 'btn-secondary'"
                @click="themeStore.setTheme('dark')"
              >
                Dark
              </button>
              <button
                class="btn"
                :class="themeStore.theme === 'system' ? 'btn-primary' : 'btn-secondary'"
                @click="themeStore.setTheme('system')"
              >
                System
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Subscription Section -->
      <section class="card p-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Subscription
        </h2>
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium text-gray-900 dark:text-white capitalize">
              {{ authStore.subscriptionTier }} Plan
            </p>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{ authStore.isPro ? 'Full access to all features' : 'Upgrade to unlock more features' }}
            </p>
          </div>
          <button class="btn btn-primary">
            {{ authStore.isPro ? 'Manage' : 'Upgrade' }}
          </button>
        </div>
      </section>

      <!-- Danger Zone -->
      <section class="card p-6 border-red-200 dark:border-red-800">
        <h2 class="text-lg font-semibold text-red-600 dark:text-red-400 mb-4">
          Danger Zone
        </h2>
        <button
          class="btn bg-red-600 text-white hover:bg-red-700"
          @click="authStore.logout()"
        >
          Sign Out
        </button>
      </section>
    </main>
  </div>
</template>
