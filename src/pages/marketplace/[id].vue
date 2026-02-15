<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores'
import MarketplaceLayout from '@/layouts/MarketplaceLayout.vue'
import AppTierBadge from '@/components/ui/AppTierBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { loadScript } from '@paypal/paypal-js'
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
import {
  marketplaceService,
  type MarketplaceProduct,
  type MarketplaceRating,
} from '@/services/marketplace.service'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const template = ref<MarketplaceProduct | null>(null)
const relatedTemplates = ref<MarketplaceProduct[]>([])
const ratings = ref<MarketplaceRating[]>([])
const selectedRating = ref(0)
const savingRating = ref(false)
const hasPurchased = ref(false)
const loading = ref(true)
const loadError = ref<string | null>(null)
const purchaseError = ref<string | null>(null)
const selectedProvider = ref<'paypal' | 'paystack'>('paypal')

const lightboxOpen = ref(false)
const activeImageIndex = ref(0)

const defaultFeatures = ['12 Months', 'A4 & Letter Size', 'High Resolution', 'Customizable Colors', 'Holiday Support']
const paypalButtonsContainer = ref<HTMLDivElement | null>(null)
let paystackScript: HTMLScriptElement | null = null

async function loadTemplate(id?: string | string[]) {
  if (!id || typeof id !== 'string') {
    loadError.value = 'Template not found'
    template.value = null
    relatedTemplates.value = []
    loading.value = false
    return
  }

  loading.value = true
  loadError.value = null
  try {
    const fetched = await marketplaceService.getTemplateById(id)
    if (!fetched) {
      loadError.value = 'Template not found'
      template.value = null
      relatedTemplates.value = []
      return
    }

    template.value = fetched

    const entitlement = await marketplaceService.getTemplateEntitlement({
      templateId: fetched.id || id,
      userId: authStore.user?.id,
      subscriptionTier: authStore.subscriptionTier as 'free' | 'pro' | 'business' | 'enterprise',
    })
    hasPurchased.value = entitlement.purchased

    const related = await marketplaceService.listTemplatesByCreator(fetched.creatorId, 4)
    relatedTemplates.value = related.filter(r => r.id !== fetched.id)

    ratings.value = await marketplaceService.listTemplateRatings(fetched.id || '', 20)
    if (authStore.user?.id) {
      const mine = await marketplaceService.getUserTemplateRating(fetched.id || '', authStore.user.id)
      selectedRating.value = mine?.rating || 0
    }
  } catch (error) {
    console.error('[MarketplaceDetail] Failed to load template', error)
    loadError.value = 'Unable to load template details right now. Please try again shortly.'
  } finally {
    loading.value = false
  }
}

watch(() => route.params.id, (id) => {
  loadTemplate(id)
}, { immediate: true })

const templateTier = computed(() => (template.value?.requiredTier || 'free') as SubscriptionTier)
const featureList = computed(() => template.value?.features?.length ? template.value.features : defaultFeatures)
const galleryImages = computed(() => {
  if (template.value?.thumbnail) {
    return [template.value.thumbnail]
  }
  return []
})

const ratingAverage = computed(() => Number(template.value?.ratingAverage || 0))
const ratingCount = computed(() => Number(template.value?.ratingCount || 0))
const canRate = computed(() => Boolean(authStore.user?.id && template.value?.id))

const isIncluded = computed(() => {
  if (!template.value) return false
  if (template.value.price === 0) return true
  if (authStore.isBusiness) return true
  if (authStore.isPro && template.value.requiredTier === 'pro') return true
  return hasPurchased.value
})

const buttonText = computed(() => {
  if (!template.value) return 'Loading...'
  if (isIncluded.value) return 'Get Template'
  return `Purchase for $${(template.value.price / 100).toFixed(2)}`
})

async function handleAction() {
  if (!template.value) return
  if (isIncluded.value) {
    if (template.value.id) {
      await marketplaceService.incrementDownloads(template.value.id)
    }
    await router.push('/dashboard/projects')
    return
  }

  purchaseError.value = null

  if (selectedProvider.value === 'paypal') {
    void mountPayPalButtons()
    return
  }

  void payWithPaystack()
}

function viewRelatedTemplate(id: string) {
  router.push(`/marketplace/${id}`)
}

function viewCreatorProfile() {
  if (!template.value?.creatorId) return
  router.push(`/creator/${template.value.creatorId}`)
}

function openImage(index = 0) {
  if (!galleryImages.value.length) return
  activeImageIndex.value = Math.max(0, Math.min(index, galleryImages.value.length - 1))
  lightboxOpen.value = true
}

function closeImage() {
  lightboxOpen.value = false
}

function moveImage(direction: -1 | 1) {
  if (!galleryImages.value.length) return
  const next = activeImageIndex.value + direction
  if (next < 0) {
    activeImageIndex.value = galleryImages.value.length - 1
    return
  }
  if (next >= galleryImages.value.length) {
    activeImageIndex.value = 0
    return
  }
  activeImageIndex.value = next
}

async function submitRating(stars: number) {
  if (!template.value?.id || !authStore.user?.id || stars < 1 || stars > 5) return
  savingRating.value = true
  try {
    await marketplaceService.upsertTemplateRating(template.value.id, {
      userId: authStore.user.id,
      displayName: authStore.user.displayName || 'Anonymous',
      rating: stars,
    })
    selectedRating.value = stars
    await loadTemplate(route.params.id)
  } finally {
    savingRating.value = false
  }
}

async function mountPayPalButtons() {
  if (!paypalButtonsContainer.value || !template.value?.id || !authStore.user?.id || isIncluded.value) return
  paypalButtonsContainer.value.innerHTML = ''

  const paypal = await loadScript({
    clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID || '',
    currency: 'USD',
    intent: 'capture',
    components: 'buttons',
  })
  if (!paypal) {
    purchaseError.value = 'Unable to load PayPal checkout right now.'
    return
  }

  if (typeof paypal.Buttons !== 'function') {
    purchaseError.value = 'PayPal checkout is unavailable right now.'
    return
  }

  paypal.Buttons({
    style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay' },
    createOrder: async () => {
      const order = await marketplaceService.createMarketplacePayPalOrder(template.value!.id!)
      return order.orderId
    },
    onApprove: async (data) => {
      await marketplaceService.captureMarketplacePayPalOrder(template.value!.id!, String(data.orderID || ''))
      await marketplaceService.incrementDownloads(template.value!.id!)
      router.push('/dashboard/projects')
    },
    onError: (error) => {
      console.error('[MarketplaceDetail] PayPal checkout failed', error)
      purchaseError.value = 'PayPal checkout failed. Please try again.'
    },
  }).render(paypalButtonsContainer.value)
}

async function ensurePaystackScript(): Promise<void> {
  if (window.PaystackPop?.setup) return
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    paystackScript = script
    script.src = 'https://js.paystack.co/v1/inline.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Paystack script'))
    document.head.appendChild(script)
  })
}

async function payWithPaystack() {
  if (!template.value?.id || !authStore.user?.email || isIncluded.value) return
  try {
    await ensurePaystackScript()
    const initialized = await marketplaceService.initializeMarketplacePaystackTransaction(template.value.id)

    const handler = window.PaystackPop?.setup({
      key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '',
      email: authStore.user.email,
      amount: template.value.price,
      currency: 'USD',
      ref: initialized.reference,
      callback: async (response: { reference: string }) => {
        await marketplaceService.verifyMarketplacePaystackTransaction(template.value!.id!, response.reference)
        await marketplaceService.incrementDownloads(template.value!.id!)
        router.push('/dashboard/projects')
      },
      onClose: () => {
        // noop
      },
    })

    handler?.openIframe()
  } catch (error) {
    console.error('[MarketplaceDetail] Paystack checkout failed', error)
    purchaseError.value = 'Paystack checkout failed. Please try again.'
  }
}

function onWindowKeydown(event: KeyboardEvent) {
  if (!lightboxOpen.value) return
  if (event.key === 'Escape') closeImage()
  if (event.key === 'ArrowLeft') moveImage(-1)
  if (event.key === 'ArrowRight') moveImage(1)
}

onMounted(() => {
  window.addEventListener('keydown', onWindowKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onWindowKeydown)
  if (paystackScript?.parentNode) {
    paystackScript.parentNode.removeChild(paystackScript)
  }
})
</script>

<template>
  <MarketplaceLayout>
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
      <div v-if="loading" class="space-y-12">
        <div class="animate-pulse h-[400px] rounded-[2.5rem] bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800"></div>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div class="lg:col-span-2 space-y-4">
            <div class="h-6 bg-gray-100 dark:bg-gray-800 rounded"></div>
            <div class="h-4 bg-gray-100 dark:bg-gray-800 rounded w-1/2"></div>
            <div class="h-32 bg-gray-100 dark:bg-gray-800 rounded"></div>
          </div>
          <div class="space-y-4">
            <div class="h-12 bg-gray-100 dark:bg-gray-800 rounded"></div>
            <div class="h-12 bg-gray-100 dark:bg-gray-800 rounded"></div>
          </div>
        </div>
      </div>

      <div
        v-else-if="loadError"
        class="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900 rounded-3xl p-10 text-center"
      >
        <h3 class="text-2xl font-display font-bold text-red-600 dark:text-red-200">Unable to load template</h3>
        <p class="mt-4 text-red-500 dark:text-red-300">{{ loadError }}</p>
        <AppButton class="mt-6" variant="primary" @click="loadTemplate(route.params.id)">Try again</AppButton>
      </div>

      <div v-else-if="template" class="space-y-20">
        <div class="max-w-7xl">
      <!-- Breadcrumbs / Back -->
      <nav class="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 mb-8">
        <button @click="router.push('/marketplace')" class="hover:text-primary-600 transition-colors">Marketplace</button>
        <span class="text-gray-200 dark:text-gray-800">/</span>
        <span class="text-gray-900 dark:text-white">{{ template.name }}</span>
      </nav>

      <div class="grid lg:grid-cols-12 gap-16">
        <!-- Left: Preview Gallery -->
        <div class="lg:col-span-7 space-y-8">
          <div class="relative aspect-4/3 bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-200 dark:border-gray-800 shadow-2xl shadow-gray-200/50 dark:shadow-none overflow-hidden group cursor-zoom-in" @click="openImage(0)">
            <div v-if="galleryImages.length" class="absolute inset-0">
              <img 
                :src="galleryImages[0]"
                :alt="template.name"
                class="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div v-else class="absolute inset-0 flex items-center justify-center">
              <svg class="w-48 h-48 text-gray-100 dark:text-gray-800 group-hover:scale-110 transition-transform duration-1000" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="0.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            
            <!-- Floating Badges -->
            <div class="absolute top-8 left-8 flex flex-col gap-3">
              <AppTierBadge :tier="templateTier" size="md" class="shadow-xl" />
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
            <template v-if="galleryImages.length">
              <div
                v-for="(image, index) in galleryImages"
                :key="`thumb-${index}`"
                class="aspect-square bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden cursor-pointer hover:border-primary-500 transition-all hover:scale-[1.02]"
                @click="openImage(index)"
              >
                <img :src="image" :alt="`${template.name} preview ${index + 1}`" class="w-full h-full object-cover" loading="lazy" />
              </div>
            </template>
            <div
              v-else
              v-for="i in 4"
              :key="`placeholder-${i}`"
              class="aspect-square bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 cursor-pointer hover:border-primary-500 transition-all hover:scale-[1.02]"
            ></div>
          </div>
        </div>

        <!-- Right: Purchase Sidebar -->
        <div class="lg:col-span-5 flex flex-col gap-10">
          <div class="space-y-6">
              <div class="space-y-3">
                <div class="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary-600 dark:text-primary-400">
                  <StarSolidIcon class="w-3 h-3 text-amber-400" />
                  {{ ratingAverage > 0 ? `${ratingAverage.toFixed(1)} Rating` : 'No ratings yet' }} • Premium Asset
                </div>
                <h1 class="text-4xl lg:text-5xl font-display font-black text-gray-900 dark:text-white leading-[1.1] tracking-tight">
                  {{ template.name }}
                </h1>
                <p class="text-lg text-gray-500 dark:text-gray-400 leading-relaxed pt-2">
                  Created by <span class="font-bold text-gray-900 dark:text-white">{{ template.creatorName }}</span>
                </p>
                <p class="text-sm text-gray-400">
                  {{ template.downloads.toLocaleString() }} downloads
                </p>
                <p class="text-xs text-gray-400">
                  {{ ratingCount }} ratings
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
                  <div v-if="!isIncluded" class="flex items-center gap-2">
                    <button
                      type="button"
                      class="px-3 py-1.5 rounded-full text-xs font-bold border transition-colors"
                      :class="selectedProvider === 'paypal' ? 'border-primary-500 text-primary-600 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 text-gray-500'"
                      @click="selectedProvider = 'paypal'"
                    >
                      PayPal
                    </button>
                    <button
                      type="button"
                      class="px-3 py-1.5 rounded-full text-xs font-bold border transition-colors"
                      :class="selectedProvider === 'paystack' ? 'border-primary-500 text-primary-600 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 text-gray-500'"
                      @click="selectedProvider = 'paystack'"
                    >
                      Paystack
                    </button>
                  </div>

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

                  <div v-if="!isIncluded && selectedProvider === 'paypal'" ref="paypalButtonsContainer"></div>
                  <p v-if="purchaseError" class="text-xs text-red-300">{{ purchaseError }}</p>
                  
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
                  <div
                    v-for="feature in featureList"
                    :key="feature"
                    class="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800"
                  >
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

              <div class="space-y-4">
                <h3 class="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Rate this template</h3>
                <div class="flex items-center gap-2">
                  <button
                    v-for="star in 5"
                    :key="`rating-star-${star}`"
                    class="p-1"
                    :disabled="!canRate || savingRating"
                    @click="submitRating(star)"
                  >
                    <StarSolidIcon
                      class="w-6 h-6"
                      :class="star <= selectedRating ? 'text-amber-400' : 'text-gray-300 dark:text-gray-700'"
                    />
                  </button>
                </div>
                <p class="text-xs text-gray-400" v-if="!authStore.isAuthenticated">Sign in to leave a rating.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

        <!-- More from creator -->
        <section class="border-t border-gray-100 dark:border-gray-800 pt-20">
          <div class="flex items-center justify-between mb-12">
            <div class="space-y-1">
              <h2 class="text-3xl font-display font-black text-gray-900 dark:text-white leading-tight">
                More from {{ template.creatorName }}
              </h2>
              <p class="text-sm text-gray-500">Discover other premium designs by this creator.</p>
            </div>
            <AppButton variant="secondary" class="text-[10px] font-black uppercase tracking-widest px-6" @click="viewCreatorProfile">View Profile</AppButton>
          </div>

          <div v-if="relatedTemplates.length" class="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div
              v-for="related in relatedTemplates"
              :key="related.id"
              class="group cursor-pointer"
              @click="viewRelatedTemplate(related.id!)"
            >
              <div class="aspect-4/3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden relative group-hover:ring-2 group-hover:ring-primary-500/50 transition-all duration-300">
                <img
                  v-if="related.thumbnail"
                  :src="related.thumbnail"
                  :alt="related.name"
                  class="w-full h-full object-cover"
                  loading="lazy"
                />
                <div v-else class="absolute inset-0 flex items-center justify-center opacity-10">
                  <StarIcon class="w-12 h-12" />
                </div>
              </div>
              <div class="mt-4 space-y-1">
                <p class="text-[10px] font-black text-primary-600 uppercase tracking-widest">{{ related.category }}</p>
                <h4 class="font-bold text-gray-900 dark:text-white group-hover:text-primary-600 transition-colors">
                  {{ related.name }}
                </h4>
              </div>
            </div>
          </div>
          <div v-else class="rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 p-10 text-center text-sm text-gray-500 dark:text-gray-400">
            No other templates from this creator yet.
          </div>
        </section>
        </div>
      </div>
    </div>

    <div v-if="lightboxOpen && galleryImages.length" class="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center px-4" @click.self="closeImage">
      <button class="absolute top-6 right-6 text-white/80 hover:text-white" @click="closeImage">Close</button>
      <button class="absolute left-4 sm:left-8 text-white/80 hover:text-white text-2xl" @click="moveImage(-1)">‹</button>
      <img :src="galleryImages[activeImageIndex]" :alt="`${template?.name} full preview`" class="max-h-[85vh] max-w-[90vw] object-contain rounded-xl shadow-2xl" />
      <button class="absolute right-4 sm:right-8 text-white/80 hover:text-white text-2xl" @click="moveImage(1)">›</button>
    </div>
  </MarketplaceLayout>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap');

.font-display {
  font-family: 'Outfit', sans-serif;
}
</style>
