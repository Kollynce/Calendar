<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores'
import { 
  HomeIcon, 
  FolderIcon, 
  SwatchIcon, 
  Cog6ToothIcon, 
  QuestionMarkCircleIcon,
  CreditCardIcon,
  ChartBarIcon,
  UsersIcon,
  SparklesIcon
} from '@heroicons/vue/24/outline'

import AppTierBadge from '@/components/ui/AppTierBadge.vue'
import { LockClosedIcon } from '@heroicons/vue/24/outline'

const route = useRoute()
const authStore = useAuthStore()

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / Math.pow(1024, exponent)
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`
}

const storageStats = computed(() => {
  const used = authStore.user?.stats?.storageUsed || 0
  const limit = authStore.tierLimits?.storageLimit || 0
  const percentage = limit > 0 ? Math.min(Math.round((used / limit) * 100), 100) : 0
  
  return {
    usedFormatted: formatBytes(used),
    limitFormatted: formatBytes(limit),
    percentage
  }
})

const navigation = computed(() => [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'My Projects', href: '/dashboard/projects', icon: FolderIcon },
  { 
    name: 'Brand Kits', 
    href: '/settings/brand-kit', 
    icon: SwatchIcon,
    requiredTier: 'pro' as const,
    locked: !authStore.isPro
  },
  { 
    name: 'Analytics', 
    href: '/dashboard/analytics', 
    icon: ChartBarIcon,
    requiredTier: 'business' as const,
    locked: !authStore.isBusiness
  },
])

const secondaryNavigation = computed(() => [
  { name: 'Account', href: '/settings', icon: Cog6ToothIcon },
  { name: 'Subscription', href: '/settings/billing', icon: CreditCardIcon },
  { name: 'Settings', href: '/settings/preferences', icon: Cog6ToothIcon },
  { name: 'Help & Support', href: '/help', icon: QuestionMarkCircleIcon },
])

const adminNavigation = [
  { name: 'Users', href: '/admin/users', icon: UsersIcon },
  { name: 'Marketplace', href: '/marketplace', icon: SparklesIcon },
]

const isActive = (path: string) => {
  if (path === '/dashboard' || path === '/settings') return route.path === path
  return route.path === path || route.path.startsWith(path + '/')
}
</script>

<template>
  <aside class="w-64 shrink-0 hidden md:flex flex-col border-r border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm h-[calc(100vh-4rem)] sticky top-16">
    <div class="flex-1 overflow-y-auto px-4 py-6 space-y-8">
      <!-- Main Nav -->
      <div>
        <h3 class="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Overview
        </h3>
        <nav class="space-y-1">
          <template v-for="item in navigation" :key="item.name">
            <component
              :is="item.locked ? 'div' : RouterLink"
              :to="!item.locked ? item.href : undefined"
              :class="[
                isActive(item.href)
                  ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400'
                  : item.locked 
                    ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                    : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800',
                'group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors relative'
              ]"
            >
              <component 
                :is="item.icon" 
                class="mr-3 h-5 w-5 shrink-0" 
                :class="[
                  isActive(item.href) ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500',
                  item.locked ? 'opacity-50' : ''
                ]" 
                aria-hidden="true" 
              />
              <span class="flex-1 truncate">{{ item.name }}</span>
              
              <!-- Lock/Tier Badge -->
              <div v-if="item.locked" class="flex items-center gap-1.5 ml-2">
                <LockClosedIcon class="w-3.5 h-3.5 text-gray-400" />
                <AppTierBadge :tier="item.requiredTier" size="sm" />
              </div>
            </component>
          </template>
        </nav>
      </div>

      <!-- Secondary Nav -->
      <div>
        <h3 class="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Account
        </h3>
        <nav class="space-y-1">
          <RouterLink
            v-for="item in secondaryNavigation"
            :key="item.name"
            :to="item.href"
            :class="[
              isActive(item.href)
                ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400'
                : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800',
              'group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors'
            ]"
          >
            <component 
              :is="item.icon" 
              class="mr-3 h-5 w-5 shrink-0" 
              :class="isActive(item.href) ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'" 
              aria-hidden="true" 
            />
            {{ item.name }}
          </RouterLink>
        </nav>
      </div>

      <div v-if="authStore.isAdmin">
        <h3 class="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Admin
        </h3>
        <nav class="space-y-1">
          <RouterLink
            v-for="item in adminNavigation"
            :key="item.name"
            :to="item.href"
            :class="[
              isActive(item.href)
                ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400'
                : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800',
              'group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors'
            ]"
          >
            <component 
              :is="item.icon" 
              class="mr-3 h-5 w-5 shrink-0" 
              :class="isActive(item.href) ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'" 
              aria-hidden="true" 
            />
            {{ item.name }}
          </RouterLink>
        </nav>
      </div>
    </div>

    <!-- Storage Usage Widget -->
    <div class="md:p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-black/20">
      <div class="px-2">
        <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Storage</h4>
        <div class="mt-2 shrink-0 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>{{ storageStats.percentage }}% used</span>
          <span>{{ storageStats.usedFormatted }} / {{ storageStats.limitFormatted }}</span>
        </div>
        <div class="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
          <div 
            class="bg-primary-500 h-1.5 rounded-full transition-all duration-500" 
            :style="{ width: `${storageStats.percentage}%` }"
          ></div>
        </div>
        <RouterLink to="/settings/billing" class="mt-3 block text-xs text-center text-primary-600 hover:text-primary-700 font-medium">
          Upgrade Plan
        </RouterLink>
      </div>
    </div>
  </aside>
</template>
