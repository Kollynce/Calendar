<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores'
import MarketplaceLayout from '@/layouts/MarketplaceLayout.vue'
import AppTierBadge from '@/components/ui/AppTierBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { 
  MagnifyingGlassIcon,
  Squares2X2Icon,
  SparklesIcon,
  FireIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
  ArrowsUpDownIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/vue/24/outline'
import { StarIcon as StarSolidIcon } from '@heroicons/vue/24/solid'

const authStore = useAuthStore()
const router = useRouter()

const isMobileFilterOpen = ref(false)
const searchQuery = ref('')
const selectedCategory = ref('All')
const selectedTier = ref('All')
const sortBy = ref('popular')

const categories = [
  { name: 'All', count: 250 },
  { name: 'Wall Calendars', count: 42 },
  { name: 'Desk Calendars', count: 38 },
  { name: 'Planners', count: 65 },
  { name: 'Minimalist', count: 24 },
  { name: 'Corporate', count: 45 },
  { name: 'Artistic', count: 36 }
]
const tiers = [
  { name: 'All', label: 'All Access' },
  { name: 'Free', label: 'Free Templates' },
  { name: 'Pro', label: 'Pro Templates' },
  { name: 'Business', label: 'Business Tier' }
]

const templates = ref([
  { id: '1', name: 'Modern Wall Calendar', creator: 'Design Studio', price: 0, downloads: 1250, requiredTier: 'free' as const, category: 'Wall Calendars', isPopular: true, isNew: false, rating: 4.8 },
  { id: '2', name: 'Corporate Desk Calendar', creator: 'Pro Templates', price: 999, downloads: 450, requiredTier: 'business' as const, category: 'Corporate', isPopular: false, isNew: true, rating: 4.5 },
  { id: '3', name: 'Minimalist Monthly', creator: 'Clean Designs', price: 499, downloads: 890, requiredTier: 'pro' as const, category: 'Minimalist', isPopular: true, isNew: false, rating: 4.9 },
  { id: '4', name: 'Photo Calendar', creator: 'Creative Hub', price: 0, downloads: 2100, requiredTier: 'free' as const, category: 'Artistic', isPopular: true, isNew: false, rating: 4.7 },
  { id: '5', name: 'Artistic Yearly', creator: 'Studio Archi', price: 1499, downloads: 320, requiredTier: 'business' as const, category: 'Artistic', isPopular: false, isNew: true, rating: 4.6 },
  { id: '6', name: 'Education Planner', creator: 'Teachly', price: 299, downloads: 1100, requiredTier: 'pro' as const, category: 'Planners', isPopular: true, isNew: false, rating: 4.4 },
])

const filteredTemplates = computed(() => {
  let result = templates.value.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.value.toLowerCase()) || 
                         t.creator.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchesCategory = selectedCategory.value === 'All' || t.category === selectedCategory.value
    const matchesTier = selectedTier.value === 'All' || t.requiredTier === selectedTier.value.toLowerCase()
    return matchesSearch && matchesCategory && matchesTier
  })

  if (sortBy.value === 'popular') {
    return result.sort((a, b) => b.downloads - a.downloads)
  } else if (sortBy.value === 'latest') {
    // In a real app, we'd use a date field. Here we use isNew or ID as fallback
    return result.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0))
  }
  
  return result
})

function getDisplayPrice(template: any) {
  if (authStore.isBusiness) return 'Included'
  if (authStore.isPro && template.requiredTier === 'pro') return 'Included'
  if (template.price === 0) return 'Free'
  return `$${(template.price / 100).toFixed(2)}`
}

function isIncluded(template: any) {
  if (authStore.isBusiness) return true
  if (authStore.isPro && template.requiredTier === 'pro') return true
  return template.price === 0
}

function viewDetails(id: string) {
  router.push(`/marketplace/${id}`)
}
</script>

<template>
  <MarketplaceLayout>
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
      <!-- Mobile Filter Toggle -->
      <div class="lg:hidden flex items-center justify-between mb-6 px-4 py-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div class="flex items-center gap-3">
          <FunnelIcon class="w-5 h-5 text-gray-400" />
          <span class="text-sm font-bold text-gray-900 dark:text-white">Filters</span>
          <span v-if="selectedCategory !== 'All' || selectedTier !== 'All'" class="w-2 h-2 rounded-full bg-primary-500"></span>
        </div>
        <button 
          @click="isMobileFilterOpen = true"
          class="text-xs font-black text-primary-600 uppercase tracking-widest"
        >
          Adjust
        </button>
      </div>

      <div class="flex flex-col lg:flex-row gap-12">
        <!-- Professional Sidebar (Desktop) -->
        <aside class="hidden lg:block w-64 shrink-0">
          <div class="sticky top-24 space-y-10">
            <!-- Search Section -->
            <div class="space-y-4">
              <h2 class="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <MagnifyingGlassIcon class="w-3.5 h-3.5" />
                Search
              </h2>
              <div class="relative group">
                <input 
                  v-model="searchQuery"
                  type="text" 
                  placeholder="Find a template..." 
                  class="w-full h-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-4 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none"
                />
              </div>
            </div>

            <!-- Categories Section -->
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <h2 class="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <FunnelIcon class="w-3.5 h-3.5" />
                  Categories
                </h2>
                <button 
                  v-if="selectedCategory !== 'All'"
                  @click="selectedCategory = 'All'"
                  class="text-[10px] text-primary-600 font-bold uppercase hover:underline"
                >
                  Reset
                </button>
              </div>
              <nav class="flex flex-col gap-1">
                <button
                  v-for="cat in categories"
                  :key="cat.name"
                  @click="selectedCategory = cat.name"
                  :class="[
                    'flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group',
                    selectedCategory === cat.name 
                      ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 font-bold shadow-sm ring-1 ring-primary-500/10' 
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'
                  ]"
                >
                  <span class="flex items-center gap-3">
                    <span 
                      class="w-1.5 h-1.5 rounded-full transition-all duration-300"
                      :class="selectedCategory === cat.name ? 'bg-primary-500 scale-125' : 'bg-gray-200 dark:bg-gray-700 group-hover:bg-gray-400'"
                    ></span>
                    {{ cat.name }}
                  </span>
                  <span 
                    class="text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors"
                    :class="selectedCategory === cat.name ? 'bg-primary-100 text-primary-700 dark:bg-primary-800 dark:text-primary-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500 group-hover:bg-gray-200 dark:group-hover:bg-gray-700'"
                  >
                    {{ cat.count }}
                  </span>
                </button>
              </nav>
            </div>

            <!-- Tier Selection -->
            <div class="space-y-4">
              <h2 class="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <SparklesIcon class="w-3.5 h-3.5" />
                Access Level
              </h2>
              <div class="grid grid-cols-1 gap-2">
                <button
                  v-for="tier in tiers"
                  :key="tier.name"
                  @click="selectedTier = tier.name"
                  :class="[
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all border',
                    selectedTier === tier.name 
                      ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400 font-bold shadow-sm' 
                      : 'border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-200 dark:hover:border-gray-700 hover:bg-white dark:hover:bg-gray-800/50'
                  ]"
                >
                  <div 
                    class="w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all"
                    :class="[
                      selectedTier === tier.name ? 'border-primary-500 bg-primary-500' : 'border-gray-200 dark:border-gray-700'
                    ]"
                  >
                    <CheckIcon v-if="selectedTier === tier.name" class="w-2.5 h-2.5 text-white" />
                  </div>
                  {{ tier.label }}
                </button>
              </div>
            </div>

            <!-- Professional CTA -->
            <div v-if="!authStore.isBusiness" class="pt-6 border-t border-gray-100 dark:border-gray-800">
              <div class="bg-gray-900 dark:bg-black rounded-2xl p-5 text-white overflow-hidden relative group">
                <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <SparklesIcon class="w-12 h-12" />
                </div>
                <p class="text-[10px] font-black uppercase tracking-widest text-primary-400">Pro Feature</p>
                <h3 class="mt-2 text-sm font-bold leading-tight">Unlock all 200+ templates</h3>
                <p class="mt-2 text-[11px] text-gray-400 leading-relaxed">Unlimited access to every marketplace design with a Business subscription.</p>
                <AppButton to="/settings/billing" variant="primary" class="w-full mt-5 py-2 text-[10px] font-black uppercase tracking-widest">Explore Plans</AppButton>
              </div>
            </div>
          </div>
        </aside>

        <!-- Mobile Filter Drawer Overlay -->
        <div 
          v-if="isMobileFilterOpen" 
          class="fixed inset-0 z-50 lg:hidden"
          role="dialog" 
          aria-modal="true"
        >
          <!-- Backdrop -->
          <div 
            class="fixed inset-0 bg-gray-950/60 backdrop-blur-sm transition-opacity"
            @click="isMobileFilterOpen = false"
          ></div>

          <!-- Drawer -->
          <div class="fixed inset-y-0 right-0 w-full max-w-xs bg-white dark:bg-gray-950 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out">
            <div class="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
              <h2 class="text-lg font-display font-black text-gray-900 dark:text-white">Filters</h2>
              <button 
                @click="isMobileFilterOpen = false"
                class="p-2 -mr-2 text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon class="w-6 h-6" />
              </button>
            </div>

            <div class="flex-1 overflow-y-auto p-6 space-y-10">
              <!-- Search (Mobile) -->
              <div class="space-y-4">
                <h3 class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Search</h3>
                <input 
                  v-model="searchQuery"
                  type="text" 
                  placeholder="Find a template..." 
                  class="w-full h-12 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 text-sm"
                />
              </div>

              <!-- Categories (Mobile) -->
              <div class="space-y-4">
                <h3 class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Categories</h3>
                <div class="grid grid-cols-1 gap-2">
                  <button
                    v-for="cat in categories"
                    :key="cat.name"
                    @click="selectedCategory = cat.name"
                    :class="[
                      'flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all',
                      selectedCategory === cat.name 
                        ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 font-bold' 
                        : 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900'
                    ]"
                  >
                    {{ cat.name }}
                    <span class="text-[10px] opacity-60">{{ cat.count }}</span>
                  </button>
                </div>
              </div>

              <!-- Access (Mobile) -->
              <div class="space-y-4">
                <h3 class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Access</h3>
                <div class="grid grid-cols-1 gap-2">
                  <button
                    v-for="tier in tiers"
                    :key="tier.name"
                    @click="selectedTier = tier.name"
                    :class="[
                      'flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all',
                      selectedTier === tier.name 
                        ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 font-bold ring-2 ring-primary-500/20' 
                        : 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900'
                    ]"
                  >
                    <CheckIcon v-if="selectedTier === tier.name" class="w-4 h-4 text-primary-500" />
                    {{ tier.label }}
                  </button>
                </div>
              </div>
            </div>

            <div class="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
              <AppButton 
                variant="primary" 
                class="w-full py-4 uppercase tracking-widest text-xs font-black"
                @click="isMobileFilterOpen = false"
              >
                Show {{ filteredTemplates.length }} Results
              </AppButton>
              <button 
                @click="searchQuery = ''; selectedCategory = 'All'; selectedTier = 'All'; isMobileFilterOpen = false"
                class="w-full mt-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center"
              >
                Reset All Filters
              </button>
            </div>
          </div>
        </div>

        <!-- Main Content -->
        <div class="flex-1 min-w-0 space-y-12">
          <!-- Refined Hero Section -->
          <div class="relative rounded-[2.5rem] bg-gray-900 dark:bg-black p-10 lg:p-16 overflow-hidden shadow-2xl shadow-primary-500/10">
            <div class="absolute inset-0 overflow-hidden">
              <div class="absolute -top-[40%] -right-[10%] w-[70%] h-[150%] bg-primary-500/20 blur-[120px] rounded-full rotate-12 animate-pulse"></div>
              <div class="absolute top-[20%] -left-[10%] w-[50%] h-full bg-blue-500/10 blur-[100px] rounded-full -rotate-12"></div>
            </div>
            
            <div class="relative z-10 max-w-2xl">
              <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[10px] font-black uppercase tracking-widest text-primary-400 mb-8 backdrop-blur-md">
                <SparklesIcon class="w-3 h-3" />
                Featured Collection
              </div>
              <h1 class="text-4xl lg:text-6xl font-display font-black text-white leading-[1.05] tracking-tight">
                Design <span class="text-transparent bg-clip-text bg-linear-to-r from-primary-400 to-blue-400">Masterpieces</span> <br/>
                In Minutes.
              </h1>
              <p class="mt-8 text-gray-400 text-lg lg:text-xl leading-relaxed max-w-lg">
                Stop starting from zero. Access 250+ professionally engineered templates designed for clarity, conversion, and class.
              </p>
              
              <div class="mt-12 flex items-center gap-12">
                <div class="flex flex-col gap-1.5">
                  <span class="text-3xl font-black text-white">250+</span>
                  <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Premium Assets</span>
                </div>
                <div class="w-px h-12 bg-white/10"></div>
                <div class="flex flex-col gap-1.5">
                  <span class="text-3xl font-black text-white">10k+</span>
                  <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Global Users</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Grid Controls -->
          <div class="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-6">
            <div class="flex items-center gap-8">
              <button 
                @click="sortBy = 'popular'"
                :class="[
                  'text-sm font-bold transition-all relative py-2 tracking-tight',
                  sortBy === 'popular' ? 'text-gray-900 dark:text-white' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                ]"
              >
                Most Popular
                <div v-if="sortBy === 'popular'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 rounded-full"></div>
              </button>
              <button 
                @click="sortBy = 'latest'"
                :class="[
                  'text-sm font-bold transition-all relative py-2 tracking-tight',
                  sortBy === 'latest' ? 'text-gray-900 dark:text-white' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                ]"
              >
                New Arrivals
                <div v-if="sortBy === 'latest'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 rounded-full"></div>
              </button>
            </div>
            
            <div class="flex items-center gap-4">
              <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest">{{ filteredTemplates.length }} Items</span>
              <div class="h-4 w-px bg-gray-200 dark:bg-gray-800"></div>
              <button class="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors">
                <ArrowsUpDownIcon class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- Professional Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-12">
            <div
              v-for="template in filteredTemplates"
              :key="template.id"
              @click="viewDetails(template.id)"
              class="group flex flex-col cursor-pointer"
            >
              <!-- Refined Card -->
              <div class="relative aspect-4/3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl overflow-hidden ring-1 ring-gray-200 dark:ring-gray-800 transition-all duration-500 group-hover:ring-primary-500/50 group-hover:shadow-2xl group-hover:shadow-primary-500/10">
                <div class="absolute inset-0 flex items-center justify-center opacity-10 dark:opacity-20 group-hover:scale-110 transition-transform duration-700">
                  <Squares2X2Icon class="w-24 h-24 text-gray-400" />
                </div>
                
                <!-- Pricing Badge -->
                <div class="absolute bottom-4 left-4 z-20">
                  <div class="bg-white dark:bg-gray-900 px-3 py-1.5 rounded-lg shadow-xl border border-gray-100 dark:border-gray-800 flex flex-col">
                    <span 
                      class="text-xs font-black tracking-tight leading-none"
                      :class="isIncluded(template) ? 'text-primary-600 dark:text-primary-400' : 'text-gray-900 dark:text-white'"
                    >
                      {{ getDisplayPrice(template) }}
                    </span>
                    <span v-if="isIncluded(template) && template.price > 0" class="text-[8px] text-gray-400 line-through font-medium mt-0.5">
                      ${{ (template.price / 100).toFixed(2) }}
                    </span>
                  </div>
                </div>

                <!-- Tier Badge -->
                <div class="absolute top-4 right-4 z-20">
                  <AppTierBadge :tier="template.requiredTier" size="sm" class="shadow-lg" />
                </div>

                <!-- Featured Badge -->
                <div class="absolute top-4 left-4 z-20 flex flex-col gap-2">
                  <span v-if="template.isPopular" class="bg-amber-500 text-white text-[8px] font-black px-2 py-1 rounded shadow-lg uppercase tracking-widest flex items-center gap-1">
                    <FireIcon class="w-3 h-3" /> Popular
                  </span>
                  <span v-if="template.isNew" class="bg-green-500 text-white text-[8px] font-black px-2 py-1 rounded shadow-lg uppercase tracking-widest">New</span>
                </div>

                <!-- Action Hover Overlay -->
                <div class="absolute inset-0 bg-gray-950/0 group-hover:bg-gray-950/20 transition-all duration-500 z-10 flex items-center justify-center">
                  <div class="scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-500">
                    <div class="bg-white text-gray-900 px-6 py-2.5 rounded-full font-black uppercase tracking-widest text-[9px] shadow-2xl">View Layout</div>
                  </div>
                </div>
              </div>

              <!-- Content Area -->
              <div class="mt-5 space-y-1 px-1">
                <div class="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.15em] text-primary-600 dark:text-primary-400">
                  {{ template.category }}
                  <div class="flex items-center gap-1">
                    <StarSolidIcon class="w-3 h-3 text-amber-400" />
                    <span class="text-gray-900 dark:text-white font-bold">{{ template.rating }}</span>
                  </div>
                </div>
                <h3 class="text-lg font-display font-bold text-gray-900 dark:text-white group-hover:text-primary-600 transition-colors duration-300">
                  {{ template.name }}
                </h3>
                <div class="flex items-center justify-between pt-2">
                  <p class="text-xs text-gray-500">by <span class="font-bold text-gray-700 dark:text-gray-300">{{ template.creator }}</span></p>
                  <div class="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <ArrowDownTrayIcon class="w-3 h-3" />
                    {{ template.downloads.toLocaleString() }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-if="filteredTemplates.length === 0" class="flex flex-col items-center justify-center py-32 text-center bg-gray-50 dark:bg-gray-900/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800">
            <div class="w-20 h-20 rounded-full bg-white dark:bg-gray-800 shadow-xl flex items-center justify-center mb-8">
              <MagnifyingGlassIcon class="w-8 h-8 text-gray-300 dark:text-gray-600" />
            </div>
            <h3 class="text-xl font-display font-bold text-gray-900 dark:text-white">No results found</h3>
            <p class="text-gray-500 dark:text-gray-400 mt-3 max-w-xs mx-auto text-sm">
              We couldn't find any templates matching your current criteria.
            </p>
            <button @click="searchQuery = ''; selectedCategory = 'All'; selectedTier = 'All'" class="mt-8 text-sm font-black text-primary-600 uppercase tracking-widest hover:underline">Clear all filters</button>
          </div>
        </div>
      </div>
    </div>
  </MarketplaceLayout>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap');

.font-display {
  font-family: 'Outfit', sans-serif;
}

aside {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
aside::-webkit-scrollbar {
  display: none;
}
</style>
