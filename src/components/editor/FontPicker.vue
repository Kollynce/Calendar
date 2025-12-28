<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores'

defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const authStore = useAuthStore()
const isPro = computed(() => authStore.isPro)

const fonts = [
  { label: 'Inter', value: 'Inter' },
  { label: 'Roboto', value: 'Roboto' },
  { label: 'Open Sans', value: 'Open Sans' },
  { label: 'Lato', value: 'Lato' },
  { label: 'Montserrat', value: 'Montserrat', premium: true },
  { label: 'Playfair Display', value: 'Playfair Display', premium: true },
  { label: 'Merriweather', value: 'Merriweather', premium: true },
  { label: 'Oswald', value: 'Oswald', premium: true },
  { label: 'Poppins', value: 'Poppins', premium: true },
]
</script>

<template>
  <select
    :value="modelValue"
    @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    class="select font-picker"
  >
    <option 
      v-for="font in fonts" 
      :key="font.value" 
      :value="font.value"
      :style="{ fontFamily: font.value }"
      :disabled="font.premium && !isPro"
    >
      {{ font.label }}{{ font.premium && !isPro ? ' (Pro)' : '' }}
    </option>
  </select>
</template>
