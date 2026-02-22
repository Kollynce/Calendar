<script setup lang="ts">
import PropertyField from './PropertyField.vue'

const props = defineProps<{
  modelValue: number
  label?: string
  min?: number
  max?: number
  step?: number
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void
}>()

function clampValue(value: number): number {
  const min = props.min ?? 0
  const max = props.max ?? 80
  return Math.min(max, Math.max(min, value))
}

function handleChange(event: Event): void {
  const value = Number((event.target as HTMLInputElement).value)
  if (!Number.isFinite(value)) return
  emit('update:modelValue', clampValue(value))
}
</script>

<template>
  <PropertyField :label="props.label ?? 'Corner Radius'">
    <input
      type="number"
      :min="props.min ?? 0"
      :max="props.max ?? 80"
      :step="props.step ?? 1"
      class="control-glass text-xs"
      :value="props.modelValue"
      @change="handleChange"
    />
  </PropertyField>
</template>
