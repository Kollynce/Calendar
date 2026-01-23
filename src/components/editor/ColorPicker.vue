<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const safeColorInputValue = computed(() => {
  const value = (props.modelValue ?? '').trim()
  // Handle 3-digit hex: #f00 -> #ff0000
  if (/^#([0-9a-fA-F]{3})$/.test(value)) {
    const r = value[1]
    const g = value[2]
    const b = value[3]
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  // Handle 6-digit hex
  if (/^#([0-9a-fA-F]{6})$/.test(value)) {
    return value.toLowerCase()
  }
  return '#000000'
})

let colorDebounceTimeout: ReturnType<typeof setTimeout> | null = null

function emitColorDebounced(value: string) {
  if (colorDebounceTimeout) {
    clearTimeout(colorDebounceTimeout)
  }
  colorDebounceTimeout = setTimeout(() => {
    colorDebounceTimeout = null
    emit('update:modelValue', value)
  }, 75)
}
</script>

<template>
  <div class="color-picker-wrapper flex w-full items-center gap-2">
    <input
      type="color"
      :value="safeColorInputValue"
      @input="emitColorDebounced(($event.target as HTMLInputElement).value)"
      class="color-input block h-9 w-9 shrink-0 cursor-pointer rounded-xl border border-gray-300 bg-white p-0.5 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-white/10 dark:bg-white/10"
    />
    <input
      type="text"
      :value="modelValue"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      class="text-input w-full min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-2 py-2 text-xs text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-white/10 dark:bg-white/10 dark:text-white"
      placeholder="#000000"
    />
  </div>
</template>

<style scoped>
.color-input::-webkit-color-swatch-wrapper {
  padding: 0;
}
.color-input::-webkit-color-swatch {
  border: none;
  border-radius: 4px;
}
</style>
