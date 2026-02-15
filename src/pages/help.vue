<script setup lang="ts">
import { computed, ref } from 'vue'
import AppLayout from '@/layouts/AppLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import { useAuthStore } from '@/stores'
import { supportService } from '@/services/support.service'
import { 
  QuestionMarkCircleIcon, 
  EnvelopeIcon, 
  BoltIcon,
  InformationCircleIcon,
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

const authStore = useAuthStore()
const subject = ref('')
const message = ref('')
const submitting = ref(false)
const submitError = ref<string | null>(null)
const submitSuccess = ref(false)

const isPriority = computed(() => authStore.hasPrioritySupport)
const priorityLabel = computed(() =>
  isPriority.value ? 'Priority lane • Pro' : 'Standard queue',
)
const canSubmit = computed(() => subject.value.trim().length > 3 && message.value.trim().length > 9 && !submitting.value)

async function submitTicket() {
  if (!canSubmit.value) return
  submitting.value = true
  submitError.value = null
  submitSuccess.value = false
  try {
    await supportService.submitTicket({
      subject: subject.value.trim(),
      message: message.value.trim(),
      priority: isPriority.value ? 'priority' : 'standard',
      userId: authStore.user?.id ?? null,
      email: authStore.user?.email ?? null,
      tier: authStore.subscriptionTier,
    })
    subject.value = ''
    message.value = ''
    submitSuccess.value = true
  } catch (error) {
    console.error('[Help] Failed to submit ticket', error)
    submitError.value = 'Could not send your request. Please try again.'
  } finally {
    submitting.value = false
  }
}
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
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-6 flex items-center gap-2">
            Need more help? Submit a ticket and we’ll reply within 1 business day
            <span v-if="isPriority" class="inline-flex items-center text-xs font-semibold text-primary-600 gap-1">
              <BoltIcon class="w-4 h-4" /> Priority lane
            </span>
          </p>
          <form class="space-y-4" @submit.prevent="submitTicket">
            <div class="space-y-2">
              <label class="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Subject</label>
              <AppInput v-model="subject" autocomplete="off" placeholder="Brief summary" :disabled="submitting" />
            </div>
            <div class="space-y-2">
              <label class="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Details</label>
              <textarea
                v-model="message"
                rows="5"
                class="textarea w-full"
                placeholder="Describe the issue, steps to reproduce, or what you need help with."
                :disabled="submitting"
              ></textarea>
            </div>
            <div class="rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/20 p-3 text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <InformationCircleIcon class="w-4 h-4 text-primary-500" />
              <div>
                <span class="font-semibold text-gray-900 dark:text-white">{{ priorityLabel }}</span>
                · Include project name, browser, and screenshots for faster resolution.
              </div>
            </div>
            <AppButton
              type="submit"
              variant="primary"
              class="w-full justify-center"
              :disabled="!canSubmit"
            >
              {{ submitting ? 'Sending…' : isPriority ? 'Send Priority Ticket' : 'Send Support Ticket' }}
            </AppButton>
            <p v-if="submitSuccess" class="text-xs text-emerald-600 text-center">Thanks! Your ticket is with our team.</p>
            <p v-if="submitError" class="text-xs text-red-600 text-center">{{ submitError }}</p>
          </form>
          <div class="mt-6 text-xs text-gray-500 dark:text-gray-400">
            Prefer email? Write to <span class="font-semibold text-gray-900 dark:text-white">support@planorapress.com</span>
          </div>
        </AppCard>
      </div>
    </div>
  </AppLayout>
</template>
