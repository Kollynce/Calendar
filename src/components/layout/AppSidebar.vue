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
  UsersIcon
} from '@heroicons/vue/24/outline'

const route = useRoute()
const authStore = useAuthStore()

const navigation = computed(() => {
  const items = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'My Projects', href: '/dashboard/projects', icon: FolderIcon },
  ]

  if (authStore.isPro) {
    items.push({ name: 'Brand Kits', href: '/settings/brand-kit', icon: SwatchIcon })
  }

  if (authStore.isCreator) {
    items.push({ name: 'Analytics', href: '/dashboard/analytics', icon: ChartBarIcon })
  }

  return items
})

const secondaryNavigation = computed(() => [
  { name: 'Account', href: '/settings', icon: Cog6ToothIcon },
  { name: 'Subscription', href: '/settings/billing', icon: CreditCardIcon },
  { name: 'Settings', href: '/settings/preferences', icon: Cog6ToothIcon },
  { name: 'Help & Support', href: '/help', icon: QuestionMarkCircleIcon },
])

const adminNavigation = [
  { name: 'Users', href: '/admin/users', icon: UsersIcon },
]

const isActive = (path: string) => {
  if (path === '/dashboard' || path === '/settings') return route.path === path
  return route.path === path || route.path.startsWith(path + '/')
}
</script>

<template>
  <aside class="w-64 flex-shrink-0 hidden md:flex flex-col border-r border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm h-[calc(100vh-4rem)] sticky top-16">
    <div class="flex-1 overflow-y-auto px-4 py-6 space-y-8">
      <!-- Main Nav -->
      <div>
        <h3 class="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Overview
        </h3>
        <nav class="space-y-1">
          <RouterLink
            v-for="item in navigation"
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
              class="mr-3 h-5 w-5 flex-shrink-0" 
              :class="isActive(item.href) ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'" 
              aria-hidden="true" 
            />
            {{ item.name }}
          </RouterLink>
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
              class="mr-3 h-5 w-5 flex-shrink-0" 
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
              class="mr-3 h-5 w-5 flex-shrink-0" 
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
        <div class="mt-2 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>75% used</span>
          <span>1.5GB / 2GB</span>
        </div>
        <div class="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
          <div class="bg-primary-500 h-1.5 rounded-full" style="width: 75%"></div>
        </div>
        <RouterLink to="/pricing" class="mt-3 block text-xs text-center text-primary-600 hover:text-primary-700 font-medium">
          Upgrade Plan
        </RouterLink>
      </div>
    </div>
  </aside>
</template>
