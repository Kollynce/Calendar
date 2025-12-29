<script setup lang="ts">
import { computed } from 'vue'
import AppLayout from '@/layouts/AppLayout.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppTierBadge from '@/components/ui/AppTierBadge.vue'
import { useAuthStore, useThemeStore } from '@/stores'
import { 
  ArrowLeftOnRectangleIcon,
  CommandLineIcon,
  ShieldCheckIcon,
  UsersIcon,
  LockClosedIcon
} from '@heroicons/vue/24/outline'

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
        <AppCard class="lg:col-span-2" variant="glass">
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
        </AppCard>

        <AppCard variant="glass">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Subscription</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Your current plan and limits.</p>

          <div class="mt-6 rounded-xl border border-white/10 bg-white/10 dark:bg-black/10 p-4">
            <div class="text-sm font-medium text-gray-900 dark:text-white capitalize">{{ authStore.subscriptionTier }} plan</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {{ authStore.isPro ? 'Full access to pro features.' : 'Upgrade to unlock more features.' }}
            </div>
          </div>

          <template #footer>
            <AppButton to="/settings/billing" variant="secondary" class="w-full">Manage subscription</AppButton>
          </template>
        </AppCard>
      </div>

      <div class="grid lg:grid-cols-3 gap-6">
        <AppCard class="lg:col-span-2" variant="glass">
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
        </AppCard>

        <AppCard variant="glass" class="border-red-500/20">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Sign out</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">End your current session.</p>
          <template #footer>
            <AppButton variant="secondary" class="w-full" @click="authStore.logout()">
              <template #icon>
                <ArrowLeftOnRectangleIcon class="w-4 h-4" />
              </template>
              Sign out
            </AppButton>
          </template>
        </AppCard>
      </div>

      <!-- Business Features Section -->
      <div class="space-y-6 pt-8 border-t border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-bold text-gray-900 dark:text-white">Business Features</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Scale your productivity with advanced tools.</p>
          </div>
          <AppTierBadge v-if="!authStore.isBusiness" tier="business" />
        </div>

        <div class="grid lg:grid-cols-3 gap-6">
          <!-- API Access -->
          <AppCard variant="glass" class="relative" :class="{ 'opacity-75 grayscale-[0.5]': !authStore.canUseAPI }">
            <div class="flex items-center justify-between mb-4">
              <div class="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                <CommandLineIcon class="w-6 h-6" />
              </div>
              <LockClosedIcon v-if="!authStore.canUseAPI" class="w-5 h-5 text-gray-400" />
            </div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">API Access</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Automate your calendar generation and integrate with your existing workflow via our REST API.
            </p>
            <template #footer>
              <AppButton :disabled="!authStore.canUseAPI" variant="secondary" class="w-full">Manage API Keys</AppButton>
            </template>
          </AppCard>

          <!-- White Label -->
          <AppCard variant="glass" class="relative" :class="{ 'opacity-75 grayscale-[0.5]': !authStore.canUseWhiteLabel }">
            <div class="flex items-center justify-between mb-4">
              <div class="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                <ShieldCheckIcon class="w-6 h-6" />
              </div>
              <LockClosedIcon v-if="!authStore.canUseWhiteLabel" class="w-5 h-5 text-gray-400" />
            </div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">White Labeling</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Remove all branding and use your own custom domain and assets for a seamless brand experience.
            </p>
            <template #footer>
              <AppButton :disabled="!authStore.canUseWhiteLabel" variant="secondary" class="w-full">Configure Branding</AppButton>
            </template>
          </AppCard>

          <!-- Team Collaboration -->
          <AppCard variant="glass" class="relative" :class="{ 'opacity-75 grayscale-[0.5]': !authStore.canUseTeamCollaboration }">
            <div class="flex items-center justify-between mb-4">
              <div class="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                <UsersIcon class="w-6 h-6" />
              </div>
              <LockClosedIcon v-if="!authStore.canUseTeamCollaboration" class="w-5 h-5 text-gray-400" />
            </div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Team Management</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Invite team members, share projects, and manage roles and permissions across your organization.
            </p>
            <template #footer>
              <AppButton :disabled="!authStore.canUseTeamCollaboration" variant="secondary" class="w-full">Manage Team</AppButton>
            </template>
          </AppCard>
        </div>

        <div v-if="!authStore.isBusiness" class="p-6 bg-primary-50 dark:bg-primary-900/10 rounded-2xl border border-primary-100 dark:border-primary-900/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <h4 class="font-bold text-gray-900 dark:text-white">Need Business Features?</h4>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1 text-balance">
              Unlock API access, white-labeling, and team collaboration by upgrading to our Business plan.
            </p>
          </div>
          <AppButton to="/settings/billing" variant="primary" class="shrink-0">Upgrade Now</AppButton>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
