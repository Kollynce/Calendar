<script setup lang="ts">
defineProps<{
  modelValue: string
}>()

defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const fonts = [
  { label: 'Inter', value: 'Inter' },
  { label: 'Roboto', value: 'Roboto' },
  { label: 'Open Sans', value: 'Open Sans' },
  { label: 'Lato', value: 'Lato' },
  { label: 'Montserrat', value: 'Montserrat' },
  { label: 'Playfair Display', value: 'Playfair Display' },
  { label: 'Merriweather', value: 'Merriweather' },
  { label: 'Oswald', value: 'Oswald' },
  { label: 'Poppins', value: 'Poppins' },
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
    >
      {{ font.label }}
    </option>
  </select>
</template>
