<script setup lang="ts">
import { CheckIcon } from '@heroicons/vue/24/outline'

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
    cta: 'Start Free Trial',
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
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 py-16 px-4">
    <div class="max-w-6xl mx-auto">
      <!-- Header -->
      <div class="text-center mb-16">
        <h1 class="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Simple, Transparent Pricing
        </h1>
        <p class="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Choose the plan that's right for you. All plans include a 14-day free trial.
        </p>
      </div>

      <!-- Pricing Cards -->
      <div class="grid md:grid-cols-3 gap-8">
        <div
          v-for="plan in plans"
          :key="plan.name"
          :class="[
            'relative rounded-2xl p-8 transition-all duration-300',
            plan.highlighted
              ? 'bg-primary-600 text-white shadow-2xl shadow-primary-500/30 scale-105 z-10'
              : 'bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl'
          ]"
        >
          <!-- Popular Badge -->
          <div
            v-if="plan.highlighted"
            class="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-xs font-bold px-4 py-1 rounded-full"
          >
            Most Popular
          </div>

          <!-- Plan Header -->
          <div class="mb-6">
            <h3
              :class="[
                'text-xl font-semibold mb-2',
                plan.highlighted ? 'text-white' : 'text-gray-900 dark:text-white'
              ]"
            >
              {{ plan.name }}
            </h3>
            <div class="flex items-baseline gap-1">
              <span
                :class="[
                  'text-4xl font-bold',
                  plan.highlighted ? 'text-white' : 'text-gray-900 dark:text-white'
                ]"
              >
                {{ plan.price }}
              </span>
              <span
                :class="[
                  'text-sm',
                  plan.highlighted ? 'text-primary-200' : 'text-gray-500 dark:text-gray-400'
                ]"
              >
                {{ plan.period }}
              </span>
            </div>
            <p
              :class="[
                'mt-2 text-sm',
                plan.highlighted ? 'text-primary-100' : 'text-gray-600 dark:text-gray-400'
              ]"
            >
              {{ plan.description }}
            </p>
          </div>

          <!-- Features -->
          <ul class="space-y-3 mb-8">
            <li
              v-for="feature in plan.features"
              :key="feature"
              class="flex items-center gap-3"
            >
              <CheckIcon
                :class="[
                  'w-5 h-5 shrink-0',
                  plan.highlighted ? 'text-primary-200' : 'text-primary-500'
                ]"
              />
              <span
                :class="[
                  'text-sm',
                  plan.highlighted ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                ]"
              >
                {{ feature }}
              </span>
            </li>
          </ul>

          <!-- CTA Button -->
          <button
            :class="[
              'w-full py-3 px-6 rounded-xl font-semibold transition-all duration-200',
              plan.highlighted
                ? 'bg-white text-primary-600 hover:bg-gray-100'
                : 'bg-primary-600 text-white hover:bg-primary-700'
            ]"
          >
            {{ plan.cta }}
          </button>
        </div>
      </div>

      <!-- FAQ or Additional Info -->
      <div class="mt-16 text-center">
        <p class="text-gray-600 dark:text-gray-400">
          Have questions? 
          <a href="/help" class="text-primary-600 hover:underline font-medium">
            Contact our support team
          </a>
        </p>
      </div>
    </div>
  </div>
</template>
