<script setup lang="ts">
import PropertyRow from './PropertyRow.vue'
import PropertyField from './PropertyField.vue'
import ColorPicker from '../ColorPicker.vue'

const props = defineProps<{
  showBackground: boolean
  showBorder: boolean
  backgroundColor: string
  borderColor: string
  backgroundLabel?: string
  borderLabel?: string
}>()

const emit = defineEmits<{
  (e: 'update:showBackground', value: boolean): void
  (e: 'update:showBorder', value: boolean): void
  (e: 'update:backgroundColor', value: string): void
  (e: 'update:borderColor', value: string): void
}>()
</script>

<template>
  <PropertyRow>
    <label class="flex items-center gap-2 text-[11px] text-white/60 cursor-pointer">
      <input
        type="checkbox"
        class="accent-primary-400"
        :checked="props.showBackground"
        @change="emit('update:showBackground', ($event.target as HTMLInputElement).checked)"
      >
      <span>{{ props.backgroundLabel ?? 'Show Background' }}</span>
    </label>
    <label class="flex items-center gap-2 text-[11px] text-white/60 cursor-pointer">
      <input
        type="checkbox"
        class="accent-primary-400"
        :checked="props.showBorder"
        @change="emit('update:showBorder', ($event.target as HTMLInputElement).checked)"
      >
      <span>{{ props.borderLabel ?? 'Show Border' }}</span>
    </label>
  </PropertyRow>

  <PropertyRow>
    <PropertyField :label="props.backgroundLabel ?? 'Background'">
      <ColorPicker
        :model-value="props.backgroundColor"
        @update:modelValue="(value: string) => emit('update:backgroundColor', value)"
      />
    </PropertyField>
    <PropertyField :label="props.borderLabel ?? 'Border'">
      <ColorPicker
        :model-value="props.borderColor"
        @update:modelValue="(value: string) => emit('update:borderColor', value)"
      />
    </PropertyField>
  </PropertyRow>
</template>
