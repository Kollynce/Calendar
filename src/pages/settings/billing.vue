<script setup lang="ts">
import AppLayout from '@/layouts/AppLayout.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { useAuthStore } from '@/stores'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { initPayPal, PAYPAL_PLANS } from '@/config/paypal'
import { paypalSubscriptionsService } from '@/services/billing/paypal-subscriptions.service'

const authStore = useAuthStore()

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / Math.pow(1024, exponent)
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`
}

const projectStats = computed(() => {
  const used = authStore.user?.stats?.projectCount || 0
  const limit = authStore.tierLimits?.projects || 0
  const percentage = limit > 0 && Number.isFinite(limit) 
    ? Math.min(Math.round((used / limit) * 100), 100) 
    : used > 0 ? 100 : 0
  
  return {
    used,
    limit: Number.isFinite(limit) ? limit : '∞',
    percentage
  }
})

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

const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true'

const proContainer = ref<HTMLDivElement | null>(null)
const businessContainer = ref<HTMLDivElement | null>(null)

let proButtons: any = null
let businessButtons: any = null

const proPlanId = computed(() => String(PAYPAL_PLANS.pro_monthly || '').trim())
const businessPlanId = computed(() => String(PAYPAL_PLANS.business_monthly || '').trim())

const canShowPayPal = computed(() => {
  if (isDemoMode) return false
  if (!authStore.isAuthenticated) return false
  if (!import.meta.env.VITE_PAYPAL_CLIENT_ID) return false
  return Boolean(proPlanId.value || businessPlanId.value)
})

async function renderSubscriptionButtons(): Promise<void> {
  if (!canShowPayPal.value) return

  const paypal = await initPayPal()
  if (!paypal || typeof (paypal as any).Buttons !== 'function') return

  const Buttons = (paypal as any).Buttons

  if (proContainer.value && proPlanId.value) {
    proContainer.value.innerHTML = ''
    proButtons = Buttons({
      createSubscription: (_data: any, actions: any) => {
        return actions.subscription.create({ plan_id: proPlanId.value })
      },
      onApprove: async (data: any) => {
        const subId = String(data?.subscriptionID || '').trim()
        if (!subId) return
        await paypalSubscriptionsService.registerPayPalSubscription(subId)
      },
      onError: (err: any) => {
        console.error('PayPal Pro subscription error', err)
      },
    })
    proButtons.render(proContainer.value)
  }

  if (businessContainer.value && businessPlanId.value) {
    businessContainer.value.innerHTML = ''
    businessButtons = Buttons({
      createSubscription: (_data: any, actions: any) => {
        return actions.subscription.create({ plan_id: businessPlanId.value })
      },
      onApprove: async (data: any) => {
        const subId = String(data?.subscriptionID || '').trim()
        if (!subId) return
        await paypalSubscriptionsService.registerPayPalSubscription(subId)
      },
      onError: (err: any) => {
        console.error('PayPal Business subscription error', err)
      },
    })
    businessButtons.render(businessContainer.value)
  }
}

onMounted(() => {
  void renderSubscriptionButtons()
})

onBeforeUnmount(() => {
  try {
    if (proButtons && typeof proButtons.close === 'function') proButtons.close()
  } catch {
    // ignore
  }
  try {
    if (businessButtons && typeof businessButtons.close === 'function') businessButtons.close()
  } catch {
    // ignore
  }
})
</script>

<template>
  <AppLayout>
    <div class="space-y-8">
      <div>
        <h1 class="text-2xl sm:text-3xl font-display font-bold text-gray-900 dark:text-white">Billing &amp; Subscription</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your plan and billing details.</p>
      </div>

      <div class="grid lg:grid-cols-3 gap-6">
        <div class="glass-card p-6 lg:col-span-2">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Current plan</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Your subscription tier and included features.</p>

          <div class="mt-6 rounded-xl border border-white/10 bg-white/10 dark:bg-black/10 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div class="text-sm font-medium text-gray-900 dark:text-white capitalize">{{ authStore.subscriptionTier }} plan</div>
              <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {{ authStore.isPro ? 'You have access to premium features.' : 'Upgrade to unlock premium features.' }}
              </div>
            </div>
            <AppButton to="/#pricing" variant="primary" class="shrink-0">View plans</AppButton>
          </div>

          <div v-if="canShowPayPal" class="mt-6 grid sm:grid-cols-2 gap-4">
            <div class="rounded-xl border border-white/10 bg-white/10 dark:bg-black/10 p-5">
              <div class="text-sm font-medium text-gray-900 dark:text-white">Upgrade to Pro</div>
              <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">Monthly subscription</div>
              <div class="mt-4" ref="proContainer"></div>
            </div>
            <div class="rounded-xl border border-white/10 bg-white/10 dark:bg-black/10 p-5">
              <div class="text-sm font-medium text-gray-900 dark:text-white">Upgrade to Business</div>
              <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">Monthly subscription</div>
              <div class="mt-4" ref="businessContainer"></div>
            </div>
          </div>

          <div class="mt-6 grid sm:grid-cols-2 gap-4">
            <div class="rounded-xl bg-gray-100 dark:bg-gray-800 p-4">
              <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Invoices</div>
              <div class="text-sm text-gray-600 dark:text-gray-300 mt-2">Coming soon.</div>
            </div>
            <div class="rounded-xl bg-gray-100 dark:bg-gray-800 p-4">
              <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment method</div>
              <div class="text-sm text-gray-600 dark:text-gray-300 mt-2">Coming soon.</div>
            </div>
          </div>
        </div>

        <div class="glass-card p-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Usage</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Storage and project limits.</p>
          <div class="mt-6 space-y-4">
            <div>
              <div class="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
                <span>Projects</span>
                <span>{{ projectStats.used }} / {{ projectStats.limit }}</span>
              </div>
              <div class="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  class="h-2 bg-primary-500 rounded-full transition-all duration-500" 
                  :style="{ width: `${projectStats.percentage}%` }"
                ></div>
              </div>
            </div>
            <div>
              <div class="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
                <span>Storage</span>
                <span>{{ storageStats.usedFormatted }} / {{ storageStats.limitFormatted }}</span>
              </div>
              <div class="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  class="h-2 bg-primary-500 rounded-full transition-all duration-500" 
                  :style="{ width: `${storageStats.percentage}%` }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
