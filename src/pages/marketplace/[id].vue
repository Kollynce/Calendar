<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores'
import MarketplaceLayout from '@/layouts/MarketplaceLayout.vue'
import AppTierBadge from '@/components/ui/AppTierBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { 
  CheckIcon, 
  ShoppingBagIcon,
  SparklesIcon,
  StarIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  HeartIcon
} from '@heroicons/vue/24/outline'
import { StarIcon as StarSolidIcon } from '@heroicons/vue/24/solid'
import type { SubscriptionTier } from '@/types'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// Mock data fetching based on ID
const templates = [
  { 
    id: '1', 
    name: 'Modern Wall Calendar', 
    creator: 'Design Studio', 
    price: 0, 
    downloads: 1250, 
    requiredTier: 'free' as const,
    description: 'A clean, contemporary wall calendar design with ample space for notes and photos. Perfect for home or office use.',
    features: ['12 Months', 'A4 & Letter Size', 'High Resolution', 'Customizable Colors', 'Holiday Support']
  },
  { 
    id: '2', 
    name: 'Corporate Desk Calendar', 
    creator: 'Pro Templates', 
    price: 999, 
    downloads: 450, 
    requiredTier: 'business' as const,
    description: 'Professional desk calendar tailored for corporate environments. Includes project tracking zones and quarterly overviews.',
    features: ['Professional Layout', 'Quarterly Views', 'Project Zones', 'Brand Kit Ready', 'Print-ready PDF']
  },
  { 
    id: '3', 
    name: 'Minimalist Monthly', 
    creator: 'Clean Designs', 
    price: 499, 
    downloads: 890, 
    requiredTier: 'pro' as const,
    description: 'Strip away the noise with this minimalist monthly planner. Focus on what matters most with an elegant, white-space driven design.',
    features: ['Minimalist Aesthetic', 'Monthly Focus', 'Portrait Layout', 'Typographic Polish', 'Dark Mode Optimized']
  }
]

const template = computed(() => {
  return templates.find(t => t.id === route.params.id) || templates[0]
})

const isIncluded = computed(() => {
  if (!template.value) return false
  if (authStore.isBusiness) return true
  if (authStore.isPro && template.value.requiredTier === 'pro') return true
  return template.value.price === 0
})

const buttonText = computed(() => {
  if (!template.value) return 'Loading...'
  if (isIncluded.value) return 'Get Template'
  return `Purchase for $${(template.value.price / 100).toFixed(2)}`
})

function handleAction() {
  if (!template.value) return
  if (isIncluded.value) {
    // Logic to add to user's templates
    router.push('/dashboard/projects')
  } else {
    // Logic for payment flow
    alert('Redirecting to payment...')
  }
}
</script>

<template>
  <MarketplaceLayout>
    <div v-if="template" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
      <!-- Breadcrumbs / Back -->
      <nav class="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 mb-8">
        <button @click="router.push('/marketplace')" class="hover:text-primary-600 transition-colors">Marketplace</button>
        <span class="text-gray-200 dark:text-gray-800">/</span>
        <span class="text-gray-900 dark:text-white">{{ template.name }}</span>
      </nav>

      <div class="grid lg:grid-cols-12 gap-16">
        <!-- Left: Preview Gallery -->
        <div class="lg:col-span-7 space-y-8">
          <div class="relative aspect-4/3 bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-200 dark:border-gray-800 shadow-2xl shadow-gray-200/50 dark:shadow-none overflow-hidden group">
            <div class="absolute inset-0 bg-linear-to-br from-primary-500/5 to-transparent"></div>
            <div class="absolute inset-0 flex items-center justify-center">
              <svg class="w-48 h-48 text-gray-100 dark:text-gray-800 group-hover:scale-110 transition-transform duration-1000" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="0.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            
            <!-- Floating Badges -->
            <div class="absolute top-8 left-8 flex flex-col gap-3">
              <AppTierBadge :tier="template.requiredTier" size="md" class="shadow-xl" />
            </div>

            <div class="absolute bottom-8 right-8 flex gap-3">
              <button class="p-3 rounded-full bg-white dark:bg-gray-800 text-gray-400 hover:text-red-500 shadow-xl border border-gray-100 dark:border-gray-700 transition-all">
                <HeartIcon class="w-5 h-5" />
              </button>
              <button class="p-3 rounded-full bg-white dark:bg-gray-800 text-gray-400 hover:text-primary-500 shadow-xl border border-gray-100 dark:border-gray-700 transition-all">
                <ShareIcon class="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            <div v-for="i in 4" :key="i" class="aspect-square bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 cursor-pointer hover:border-primary-500 transition-all hover:scale-[1.02]"></div>
          </div>
        </div>

        <!-- Right: Purchase Sidebar -->
        <div class="lg:col-span-5 flex flex-col gap-10">
          <div class="space-y-6">
            <div class="space-y-2">
              <div class="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary-600 dark:text-primary-400">
                <StarSolidIcon class="w-3 h-3 text-amber-400" />
                4.9 Rating • Premium Asset
              </div>
              <h1 class="text-4xl lg:text-5xl font-display font-black text-gray-900 dark:text-white leading-[1.1] tracking-tight">
                {{ template.name }}
              </h1>
              <p class="text-lg text-gray-500 dark:text-gray-400 leading-relaxed pt-2">
                Created by <span class="font-bold text-gray-900 dark:text-white">{{ template.creator }}</span>
              </p>
            </div>

            <!-- Pricing Box -->
            <div class="rounded-4xl bg-gray-900 dark:bg-black p-8 text-white relative overflow-hidden shadow-2xl shadow-primary-500/10">
              <div class="absolute -top-[20%] -right-[10%] w-[60%] h-full bg-primary-500/20 blur-[80px] rounded-full"></div>
              
              <div class="relative z-10">
                <div class="flex items-end justify-between">
                  <div class="space-y-1">
                    <p class="text-[10px] font-black uppercase tracking-widest text-gray-400">Your Subscription Price</p>
                    <div class="flex items-center gap-3">
                      <span class="text-4xl font-black">{{ isIncluded ? 'Included' : `$${(template.price / 100).toFixed(2)}` }}</span>
                      <AppTierBadge :tier="authStore.subscriptionTier as SubscriptionTier" size="sm" class="bg-white/10! text-white! border border-white/10" />
                    </div>
                  </div>
                  <div v-if="!isIncluded && template.price > 0" class="text-right">
                    <p class="text-[10px] font-black uppercase tracking-widest text-gray-500">Regular Price</p>
                    <p class="text-lg font-bold text-gray-400 line-through">${{ (template.price / 100).toFixed(2) }}</p>
                  </div>
                </div>

                <div class="mt-8 space-y-4">
                  <AppButton 
                    variant="primary" 
                    class="w-full py-5 text-sm font-black uppercase tracking-[0.2em]"
                    @click="handleAction"
                  >
                    <template #icon>
                      <ShoppingBagIcon v-if="!isIncluded" class="w-4 h-4" />
                      <ArrowDownTrayIcon v-else class="w-4 h-4" />
                    </template>
                    {{ buttonText }}
                  </AppButton>
                  
                  <AppButton 
                    v-if="!authStore.isBusiness"
                    to="/settings/billing" 
                    variant="secondary"
                    class="w-full py-5 text-sm font-black uppercase tracking-[0.2em] bg-white/5! border-white/10! hover:bg-white/10!"
                  >
                    <template #icon>
                      <SparklesIcon class="w-4 h-4" />
                    </template>
                    Get free with Business
                  </AppButton>
                </div>

                <p class="mt-6 text-[10px] text-center text-gray-500 font-bold uppercase tracking-widest">
                  Secure Checkout • One-time Purchase • Commercial License
                </p>
              </div>
            </div>

            <!-- Features -->
            <div class="pt-4 space-y-6">
              <div class="space-y-4">
                <h3 class="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Key Features</h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div v-for="feature in template.features" :key="feature" class="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                    <div class="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                      <CheckIcon class="w-3 h-3 text-green-500" />
                    </div>
                    {{ feature }}
                  </div>
                </div>
              </div>

              <div class="space-y-4">
                <h3 class="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Description</h3>
                <p class="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
                  {{ template.description }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- More from creator -->
      <section class="mt-32 border-t border-gray-100 dark:border-gray-800 pt-20">
        <div class="flex items-center justify-between mb-12">
          <div class="space-y-1">
            <h2 class="text-3xl font-display font-black text-gray-900 dark:text-white leading-tight">More from {{ template.creator }}</h2>
            <p class="text-sm text-gray-500">Discover other premium designs by this creator.</p>
          </div>
          <AppButton variant="secondary" class="text-[10px] font-black uppercase tracking-widest px-6">View Profile</AppButton>
        </div>
        
        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div v-for="i in 4" :key="i" class="group cursor-pointer">
            <div class="aspect-4/3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden relative group-hover:ring-2 group-hover:ring-primary-500/50 transition-all duration-300">
               <div class="absolute inset-0 flex items-center justify-center opacity-10">
                 <StarIcon class="w-12 h-12" />
               </div>
            </div>
            <div class="mt-4 space-y-1">
              <p class="text-[10px] font-black text-primary-600 uppercase tracking-widest">Wall Calendars</p>
              <h4 class="font-bold text-gray-900 dark:text-white group-hover:text-primary-600 transition-colors">Alternative Layout {{ i }}</h4>
            </div>
          </div>
        </div>
      </section>
    </div>
  </MarketplaceLayout>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap');

.font-display {
  font-family: 'Outfit', sans-serif;
}
</style>
