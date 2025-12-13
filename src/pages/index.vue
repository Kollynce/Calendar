<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores'
import AppNavbar from '@/components/layout/AppNavbar.vue'
import { 
  CalendarDaysIcon, 
  SwatchIcon, 
  ArrowDownTrayIcon, 
  GlobeAltIcon,
  SparklesIcon,
  DevicePhoneMobileIcon
} from '@heroicons/vue/24/outline'

const authStore = useAuthStore()

const features = [
  {
    name: 'African Holidays',
    description: 'Built-in holiday data for all 54 African countries with local language support.',
    icon: GlobeAltIcon,
    color: 'bg-blue-100 text-blue-600'
  },
  {
    name: 'Design Studio',
    description: 'Powerful canvas editor with drag-and-drop, layers, and professional design tools.',
    icon: SwatchIcon,
    color: 'bg-purple-100 text-purple-600'
  },
  {
    name: 'Print-Ready Export',
    description: 'Export in PDF, PNG, or SVG with bleed marks and crop marks (CMYK available).',
    icon: ArrowDownTrayIcon,
    color: 'bg-green-100 text-green-600'
  },
  {
    name: 'Smart Templates',
    description: 'Start with professionally designed templates for Business, Family, or Schools.',
    icon: SparklesIcon,
    color: 'bg-pink-100 text-pink-600'
  },
  {
    name: 'Device Friendly',
    description: 'Design on the go with our fully responsive interface for tablets and desktops.',
    icon: DevicePhoneMobileIcon,
    color: 'bg-orange-100 text-orange-600'
  },
  {
    name: 'Batch Processing',
    description: 'Generate hundreds of personalized calendars in seconds (Business Plan).',
    icon: CalendarDaysIcon,
    color: 'bg-indigo-100 text-indigo-600'
  }
]
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950">
    <AppNavbar />

    <!-- Hero Section -->
    <div class="relative pt-32 pb-20 sm:pt-40 sm:pb-24 overflow-hidden">
      <!-- Background Mesh -->
      <div class="absolute inset-0 -z-10 bg-[radial-gradient(45rem_50rem_at_top,theme(colors.indigo.100),white)] dark:bg-[radial-gradient(45rem_50rem_at_top,theme(colors.indigo.900),theme(colors.gray.950))] opacity-50"></div>
      
      <div class="mx-auto max-w-7xl px-6 lg:px-8 relative">
        <div class="mx-auto max-w-2xl text-center">
          <div class="mb-8 flex justify-center animate-fade-in-up" style="animation-delay: 0.1s">
            <span class="rounded-full bg-primary-50 px-3 py-1 text-sm font-semibold text-primary-600 ring-1 ring-inset ring-primary-500/20 dark:bg-primary-900/10 dark:text-primary-400">
              New: 2025 Templates Available
            </span>
          </div>
          <h1 class="text-4xl font-display font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl animate-fade-in-up" style="animation-delay: 0.2s">
            Create Beautiful
            <span class="text-transparent bg-clip-text bg-linear-to-r from-primary-500 to-accent-500">Calendars</span>
            in Minutes
          </h1>
          <p class="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300 animate-fade-in-up" style="animation-delay: 0.3s">
            The professional design platform for creators and print shops. 
            Customize layouts, manage holidays, and export print-ready files with ease.
          </p>
          <div class="mt-10 flex items-center justify-center gap-x-6 animate-fade-in-up" style="animation-delay: 0.4s">
            <RouterLink
              v-if="authStore.isAuthenticated"
              to="/dashboard"
              class="btn-primary"
            >
              Go to Dashboard
            </RouterLink>
            <template v-else>
              <RouterLink
                to="/auth/register"
                class="btn-primary"
              >
                Get Started Free
              </RouterLink>
              <RouterLink
                to="/auth/login"
                class="text-sm font-semibold leading-6 text-gray-900 dark:text-white hover:text-primary-500 transition-colors"
              >
                Sign In <span aria-hidden="true">→</span>
              </RouterLink>
            </template>
          </div>
        </div>
        
        <!-- Hero Image Mockup -->
        <div class="mt-16 flow-root sm:mt-24 animate-fade-in-up" style="animation-delay: 0.6s">
          <div class="-m-2 rounded-xl bg-gray-900/5 p-2 ring-1 ring-inset ring-gray-900/10 dark:bg-white/5 dark:ring-white/10 lg:-m-4 lg:rounded-2xl lg:p-4">
            <div class="aspect-video rounded-md bg-gray-200 dark:bg-gray-800 shadow-2xl flex items-center justify-center text-gray-400">
              <!-- Placeholder for App Screenshot -->
              <span class="text-lg font-medium">App Screenshot Playground</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Features Grid -->
    <div class="py-24 sm:py-32 bg-white dark:bg-gray-900" id="features">
      <div class="mx-auto max-w-7xl px-6 lg:px-8">
        <div class="mx-auto max-w-2xl text-center">
          <h2 class="text-base font-semibold leading-7 text-primary-600">Everything you need</h2>
          <p class="mt-2 text-3xl font-display font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            Professional tools for everyone
          </p>
          <p class="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-400">
            Whether you're a hobbyist or a print shop owner, we have the features to streamline your workflow.
          </p>
        </div>
        <div class="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <dl class="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
            <div v-for="feature in features" :key="feature.name" class="flex flex-col">
              <dt class="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900 dark:text-white">
                <div :class="['h-10 w-10 flex items-center justify-center rounded-lg', feature.color.replace('text-', 'bg-').replace('100', '500/10')]">
                  <component :is="feature.icon" class="h-6 w-6" :class="feature.color" aria-hidden="true" />
                </div>
                {{ feature.name }}
              </dt>
              <dd class="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600 dark:text-gray-400">
                <p class="flex-auto">{{ feature.description }}</p>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>

    <!-- CTA Section -->
    <div class="relative isolate mt-32 px-6 py-32 sm:mt-56 sm:py-40 lg:px-8 bg-gray-900 text-center overflow-hidden">
      <!-- Gradient effects -->
      <div class="absolute inset-0 -z-10 transform-gpu bg-[radial-gradient(45rem_50rem_at_top,theme(colors.indigo.800),theme(colors.gray.900))] opacity-20 filter blur-3xl"></div>
      
      <div class="mx-auto max-w-2xl text-center z-10 relative">
        <h2 class="text-3xl font-display font-bold tracking-tight text-white sm:text-4xl">
          Ready to start designing?
        </h2>
        <p class="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-300">
          Join thousands of creators and print shops using Calendar Creator today.
        </p>
        <div class="mt-10 flex items-center justify-center gap-x-6">
          <RouterLink
            to="/auth/register"
            class="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Get started for free
          </RouterLink>
          <RouterLink to="/features" class="text-sm font-semibold leading-6 text-white">
            Learn more <span aria-hidden="true">→</span>
          </RouterLink>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <footer class="bg-gray-50 dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800" aria-labelledby="footer-heading">
      <h2 id="footer-heading" class="sr-only">Footer</h2>
      <div class="mx-auto max-w-7xl px-6 py-12 lg:px-8 lg:py-16">
        <div class="grid grid-cols-2 gap-8 md:grid-cols-4">
            <div>
              <h3 class="text-sm font-semibold leading-6 text-gray-900 dark:text-white">Product</h3>
              <ul role="list" class="mt-6 space-y-4">
                <li><a href="#" class="text-sm leading-6 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">Features</a></li>
                <li><a href="#" class="text-sm leading-6 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">Templates</a></li>
                <li><a href="#" class="text-sm leading-6 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h3 class="text-sm font-semibold leading-6 text-gray-900 dark:text-white">Company</h3>
              <ul role="list" class="mt-6 space-y-4">
                <li><a href="#" class="text-sm leading-6 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">About</a></li>
                <li><a href="#" class="text-sm leading-6 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">Blog</a></li>
                <li><a href="#" class="text-sm leading-6 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">Careers</a></li>
              </ul>
            </div>
             <div>
              <h3 class="text-sm font-semibold leading-6 text-gray-900 dark:text-white">Legal</h3>
              <ul role="list" class="mt-6 space-y-4">
                <li><a href="#" class="text-sm leading-6 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">Privacy</a></li>
                <li><a href="#" class="text-sm leading-6 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">Terms</a></li>
              </ul>
            </div>
        </div>
        <div class="mt-16 border-t border-gray-900/10 dark:border-gray-700 pt-8 sm:mt-20 lg:mt-24">
          <p class="text-xs leading-5 text-gray-500 dark:text-gray-400">&copy; 2024 Calendar Creator. All rights reserved.</p>
        </div>
      </div>
    </footer>
  </div>
</template>
