<script setup lang="ts">
import { CheckIcon, SparklesIcon } from '@heroicons/vue/24/outline'

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for trying out CalendarCreator',
    features: [
      '3 calendar projects',
      'Basic templates',
      'PNG export only',
      'Standard support',
      'Watermark on exports',
    ],
    cta: 'Get Started',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$9.99',
    period: '/month',
    description: 'For professionals and small businesses',
    features: [
      'Unlimited projects',
      'All premium templates',
      'PDF & PNG export',
      'No watermarks',
      'Priority support',
      'Brand kit (1)',
      'Custom holidays',
    ],
    cta: 'Upgrade to Pro',
    highlighted: true,
  },
  {
    name: 'Business',
    price: '$29.99',
    period: '/month',
    description: 'For teams and agencies',
    features: [
      'Everything in Pro',
      'Team collaboration',
      'Unlimited brand kits',
      'API access',
      'White-label exports',
      'Dedicated support',
      'Analytics dashboard',
    ],
    cta: 'Contact Sales',
    highlighted: false,
  },
]
</script>

<template>
  <div class="py-24 sm:py-32 relative overflow-hidden" id="pricing">
    <!-- High-End Background Architecture -->
    <div class="absolute inset-0 pointer-events-none overflow-hidden">
      <!-- Modern Grid Pattern -->
      <div class="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 dark:opacity-40 mix-blend-overlay"></div>
      <div class="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-size-[40px_40px] mask-[radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20"></div>
      
      <!-- Mesh Glows -->
      <div class="absolute -top-[10%] left-1/2 -translate-x-1/2 w-[1200px] h-[800px] bg-linear-to-b from-primary-500/20 to-transparent blur-[140px] rounded-full opacity-40"></div>
      <div class="absolute top-[40%] -left-[15%] w-[600px] h-[600px] bg-blue-500/10 blur-[120px] rounded-full animate-pulse"></div>
      <div class="absolute bottom-[5%] -right-[15%] w-[700px] h-[700px] bg-primary-500/10 blur-[120px] rounded-full"></div>
    </div>

    <div class="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
      <!-- Header -->
      <div class="mx-auto max-w-3xl text-center mb-20 lg:mb-32">
        <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border border-gray-200 dark:border-gray-800 shadow-xl text-[10px] font-black uppercase tracking-[0.3em] text-primary-600 dark:text-primary-400 mb-10 animate-fade-in-up">
          <SparklesIcon class="w-3.5 h-3.5" />
          Subscription Plans
        </div>
        <h2 class="text-7xl font-display font-black tracking-tighter text-gray-900 dark:text-white leading-[0.95] mb-10 animate-fade-in-up" style="animation-delay: 0.1s">
          Simple, Transparent <br/>
          <span class="text-transparent bg-clip-text bg-linear-to-r from-primary-500 via-blue-500 to-indigo-600">Enterprise Pricing.</span>
        </h2>
        <p class="text-xl lg:text-2xl leading-relaxed text-gray-500 dark:text-gray-400 max-w-2xl mx-auto animate-fade-in-up font-medium" style="animation-delay: 0.2s">
          Choose the plan that's right for your creative scale. Start for free, upgrade as you grow.
        </p>
      </div>

      <!-- Pricing Cards -->
      <div class="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        <div
          v-for="(plan, index) in plans"
          :key="plan.name"
          :class="[
            'relative rounded-[3rem] p-12 flex flex-col bg-white/40 dark:bg-gray-900/40 backdrop-blur-2xl border border-white/20 dark:border-white/5 animate-fade-in-up transition-all duration-700',
            plan.highlighted
              ? 'ring-2 ring-primary-500 shadow-[0_0_50px_-12px_rgba(59,130,246,0.5)] scale-105 z-10 hover:shadow-primary-500/40 hover:-translate-y-4'
              : 'shadow-2xl hover:shadow-primary-500/20 hover:-translate-y-3'
          ]"
          :style="{ animationDelay: `${0.4 + index * 0.1}s` }"
        >
          <!-- Premium Decorative Element -->
          <div v-if="plan.highlighted" class="absolute -top-[20%] -right-[10%] w-40 h-40 bg-primary-500/20 blur-[60px] rounded-full"></div>
          
          <!-- Popular Badge -->
          <div
            v-if="plan.highlighted"
            class="absolute -top-6 left-1/2 -translate-x-1/2 bg-linear-to-r from-primary-600 to-indigo-600 text-white text-[10px] font-black uppercase tracking-[0.3em] px-8 py-2 rounded-full shadow-2xl z-20"
          >
            Recommended
          </div>

          <!-- Plan Header -->
          <div class="mb-12">
            <div class="flex items-center justify-between mb-6">
              <h3
                :class="[
                  'text-lg font-display font-black uppercase tracking-[0.2em]',
                  plan.highlighted ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'
                ]"
              >
                {{ plan.name }}
              </h3>
              <div v-if="plan.highlighted" class="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></div>
            </div>
            
            <div class="flex items-baseline gap-2">
              <span class="text-6xl font-display font-black tracking-tighter text-gray-900 dark:text-white">
                {{ plan.price }}
              </span>
              <span class="text-xs font-black uppercase tracking-widest text-gray-400">
                {{ plan.period }}
              </span>
            </div>
            <p class="mt-8 text-base leading-relaxed text-gray-500 dark:text-gray-400 font-medium">
              {{ plan.description }}
            </p>
          </div>

          <!-- Features Architecture -->
          <div class="space-y-6 mb-16 flex-1">
            <div v-for="feature in plan.features" :key="feature" class="flex items-center gap-4 group/item">
              <div :class="['shrink-0 w-6 h-6 rounded-lg flex items-center justify-center transition-colors duration-500', plan.highlighted ? 'bg-primary-500/10 text-primary-500 group-hover/item:bg-primary-500 group-hover/item:text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400']">
                <CheckIcon class="w-3.5 h-3.5" />
              </div>
              <span :class="['text-sm font-semibold transition-colors duration-500', plan.highlighted ? 'text-gray-700 dark:text-gray-200 group-hover/item:text-primary-600' : 'text-gray-500 dark:text-gray-400']">
                {{ feature }}
              </span>
            </div>
          </div>

          <!-- Enterprise CTA -->
          <button
            :class="[
              'group/btn relative w-full py-6 rounded-2xl font-black uppercase tracking-[0.3em] text-[11px] transition-all duration-500 overflow-hidden',
              plan.highlighted
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-2xl hover:shadow-primary-500/40'
                : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-100 dark:border-gray-700 hover:border-primary-500/50'
            ]"
          >
            <span class="relative z-10">{{ plan.cta }}</span>
            <div :class="['absolute inset-0 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500 bg-linear-to-r', plan.highlighted ? 'from-primary-600 to-indigo-600' : 'from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600']"></div>
          </button>
        </div>
      </div>

      <!-- FAQ or Additional Info -->
      <div class="mt-20 text-center">
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Have questions? 
          <a href="/help" class="text-primary-600 hover:underline font-bold">
            Contact our support team
          </a>
        </p>
      </div>
    </div>
  </div>
</template>
