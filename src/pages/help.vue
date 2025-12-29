<script setup lang="ts">
import AppLayout from '@/layouts/AppLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { 
  QuestionMarkCircleIcon, 
  EnvelopeIcon, 
} from '@heroicons/vue/24/outline'

const faqs = [
  {
    question: 'How do I change the calendar layout?',
    answer: 'In the editor, click on the "Calendar" tool in the left sidebar. From there, you can choose between Monthly, Year Grid, and other layouts.',
  },
  {
    question: 'Can I add my own holidays?',
    answer: 'Yes! Pro and Business users can add custom holidays. Go to the Calendar configuration panel and look for the "Custom Holidays" section.',
  },
  {
    question: 'What file formats can I export?',
    answer: 'All users can export as PNG. Pro and Business users can also export as high-quality PDF and SVG for professional printing.',
  },
  {
    question: 'How do I use a marketplace template?',
    answer: 'Visit the Marketplace, find a template you like, and click "Get Template". It will be added to your projects for you to customize.',
  },
]
</script>

<template>
  <AppLayout>
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl sm:text-3xl font-display font-bold text-gray-900 dark:text-white">Help &amp; Support</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Find answers, learn best practices, and contact support.
        </p>
      </div>

      <div class="grid lg:grid-cols-3 gap-6">
        <AppCard class="lg:col-span-2" variant="glass">
          <div class="flex items-center gap-2 mb-4">
            <QuestionMarkCircleIcon class="h-5 w-5 text-primary-500" />
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Frequently Asked Questions</h2>
          </div>
          <div class="space-y-6">
            <div v-for="faq in faqs" :key="faq.question" class="border-b border-gray-100 dark:border-gray-800 last:border-0 pb-6 last:pb-0">
              <h3 class="text-base font-bold text-gray-900 dark:text-white mb-2">{{ faq.question }}</h3>
              <p class="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{{ faq.answer }}</p>
            </div>
          </div>
        </AppCard>

        <AppCard variant="glass">
          <div class="flex items-center gap-2 mb-4">
            <EnvelopeIcon class="h-5 w-5 text-primary-500" />
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Contact</h2>
          </div>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Need more help? Our team is available Mon-Fri, 9am-5pm EAT.
          </p>
          <div class="space-y-3">
            <AppButton variant="primary" class="w-full justify-center">Email Support</AppButton>
            <AppButton variant="secondary" class="w-full justify-center">Live Chat</AppButton>
            <div>
              For support, email:
              <span class="text-gray-900 dark:text-white font-medium">support@calendarcreator.app</span>
            </div>
            <div>
              Include:
              <span class="text-gray-900 dark:text-white font-medium">project name</span>,
              <span class="text-gray-900 dark:text-white font-medium">browser</span>, and
              <span class="text-gray-900 dark:text-white font-medium">steps to reproduce</span>.
            </div>
          </div>
        </AppCard>
      </div>
    </div>
  </AppLayout>
</template>
