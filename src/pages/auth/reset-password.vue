<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppAlert from '@/components/ui/AppAlert.vue'

const authStore = useAuthStore()

const email = ref('')
const loading = ref(false)
const successMessage = ref<string | null>(null)

async function handleSubmit() {
  loading.value = true
  successMessage.value = null
  try {
    await authStore.resetPassword(email.value)
    successMessage.value = 'If an account exists for this email, a password reset link has been sent.'
  } catch {
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
    <div class="w-full max-w-md">
      <div class="card p-8">
        <div class="text-center mb-8">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
            Reset Password
          </h1>
          <p class="mt-2 text-gray-600 dark:text-gray-400">
            Enter your email and we’ll send you a reset link.
          </p>
        </div>

        <AppAlert v-if="authStore.error" variant="danger" class="mb-4">
          {{ authStore.error }}
        </AppAlert>

        <AppAlert v-if="successMessage" variant="success" class="mb-4">
          {{ successMessage }}
        </AppAlert>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <AppInput
              id="email"
              v-model="email"
              type="email"
              required
              placeholder="you@example.com"
            />
          </div>

          <AppButton type="submit" :disabled="loading" class="w-full">
            <span v-if="loading">Sending...</span>
            <span v-else>Send Reset Link</span>
          </AppButton>

          <AppButton to="/login" variant="secondary" class="w-full">
            Back to Sign In
          </AppButton>
        </form>
      </div>
    </div>
  </div>
</template>
