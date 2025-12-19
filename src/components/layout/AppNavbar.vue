<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores'
import { MenuItem } from '@headlessui/vue'
import AppDropdownMenu from '@/components/ui/AppDropdownMenu.vue'
import { 
  Bars3Icon, 
  XMarkIcon, 
  BellIcon, 
  UserCircleIcon,
  ChevronDownIcon 
} from '@heroicons/vue/24/outline'

const authStore = useAuthStore()
const isMobileMenuOpen = ref(false)

const navigation = [
  { name: 'Features', href: '/#features' },
  { name: 'Marketplace', href: '/marketplace' },
  { name: 'Pricing', href: '/pricing' },
]

const userNavigation = [
  { name: 'Your Profile', href: '/settings' },
  { name: 'Settings', href: '/settings' },
  { name: 'Sign out', href: '#', action: () => authStore.logout() },
]
</script>

<template>
  <nav class="fixed top-0 z-navbar w-full glass border-b border-gray-200/50 dark:border-gray-700/50">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="flex h-16 justify-between">
        <!-- Logo & Desktop Nav -->
        <div class="flex">
          <div class="flex flex-shrink-0 items-center">
            <RouterLink to="/" class="flex items-center gap-2">
              <div class="h-8 w-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-lg">
                C
              </div>
              <span class="font-display font-bold text-xl tracking-tight text-gray-900 dark:text-white">
                Calendar<span class="text-primary-500">Creator</span>
              </span>
            </RouterLink>
          </div>
          <div class="hidden sm:ml-10 sm:flex sm:space-x-8">
            <RouterLink
              v-for="item in navigation"
              :key="item.name"
              :to="item.href"
              class="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors border-b-2 border-transparent hover:border-primary-500"
            >
              {{ item.name }}
            </RouterLink>
          </div>
        </div>

        <!-- Right Side Icons & Profile -->
        <div class="hidden sm:ml-6 sm:flex sm:items-center gap-4">
          <button type="button" class="rounded-full p-1 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
            <span class="sr-only">View notifications</span>
            <BellIcon class="h-6 w-6" aria-hidden="true" />
          </button>

          <!-- Profile Dropdown -->
          <div class="relative ml-3" v-if="authStore.isAuthenticated">
            <AppDropdownMenu
              :button-class="'flex items-center gap-2 rounded-full bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2'"
              align="right"
              width="md"
            >
              <template #button>
                <span class="sr-only">Open user menu</span>
                <img v-if="authStore.user?.photoURL" :src="authStore.user.photoURL" class="h-8 w-8 rounded-full object-cover" alt="" />
                <UserCircleIcon v-else class="h-8 w-8 text-gray-400" />
                <span class="hidden md:block font-medium text-gray-700 dark:text-gray-200">
                  {{ authStore.user?.displayName || 'Creator' }}
                </span>
                <ChevronDownIcon class="h-4 w-4 text-gray-400" />
              </template>

              <template #items>
                <MenuItem v-if="authStore.isAdmin" v-slot="{ active }">
                  <a
                    href="/admin/users"
                    :class="[active ? 'bg-gray-50 dark:bg-gray-700' : '', 'block px-4 py-2 text-sm text-gray-700 dark:text-gray-200']"
                  >
                    Admin: Users
                  </a>
                </MenuItem>
                <MenuItem v-for="item in userNavigation" :key="item.name" v-slot="{ active }">
                  <a
                    :href="item.href"
                    @click="item.action && item.action()"
                    :class="[active ? 'bg-gray-50 dark:bg-gray-700' : '', 'block px-4 py-2 text-sm text-gray-700 dark:text-gray-200']"
                  >
                    {{ item.name }}
                  </a>
                </MenuItem>
              </template>
            </AppDropdownMenu>
          </div>

          <div v-else class="flex gap-2">
            <RouterLink to="/auth/login" class="text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-primary-500 px-3 py-2">
              Sign In
            </RouterLink>
            <RouterLink to="/auth/register" class="btn-primary text-sm px-4 py-2 my-auto">
              Get Started
            </RouterLink>
          </div>
        </div>

        <!-- Mobile menu button -->
        <div class="-mr-2 flex items-center sm:hidden">
          <button
            @click="isMobileMenuOpen = !isMobileMenuOpen"
            class="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
          >
            <span class="sr-only">Open main menu</span>
            <Bars3Icon v-if="!isMobileMenuOpen" class="block h-6 w-6" aria-hidden="true" />
            <XMarkIcon v-else class="block h-6 w-6" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile Menu -->
    <div v-show="isMobileMenuOpen" class="sm:hidden glass border-b border-gray-200/50 dark:border-gray-700/50">
      <div class="space-y-1 pb-3 pt-2">
        <RouterLink
          v-for="item in navigation"
          :key="item.name"
          :to="item.href"
          class="block border-l-4 border-transparent py-2 pl-3 pr-4 text-base font-medium text-gray-500 hover:border-primary-500 hover:bg-gray-50 hover:text-primary-700 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          {{ item.name }}
        </RouterLink>
      </div>
      <div class="border-t border-gray-200 dark:border-gray-700 pb-3 pt-4" v-if="authStore.isAuthenticated">
        <div class="flex items-center px-4">
          <div class="flex-shrink-0">
            <img v-if="authStore.user?.photoURL" :src="authStore.user.photoURL" class="h-10 w-10 rounded-full" alt="" />
            <UserCircleIcon v-else class="h-10 w-10 text-gray-400" />
          </div>
          <div class="ml-3">
            <div class="text-base font-medium text-gray-800 dark:text-gray-200">{{ authStore.user?.displayName }}</div>
            <div class="text-sm font-medium text-gray-500">{{ authStore.user?.email }}</div>
          </div>
        </div>
        <div class="mt-3 space-y-1">
          <a
            v-if="authStore.isAdmin"
            href="/admin/users"
            class="block px-4 py-2 text-base font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            Admin: Users
          </a>
          <a
            v-for="item in userNavigation"
            :key="item.name"
            :href="item.href"
            @click="item.action && item.action()"
            class="block px-4 py-2 text-base font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            {{ item.name }}
          </a>
        </div>
      </div>
    </div>
  </nav>
</template>
