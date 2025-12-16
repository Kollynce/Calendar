<script setup lang="ts">
import { computed, useAttrs } from 'vue'

type Variant = 'default' | 'sm' | 'glass' | 'glass-sm'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    modelValue?: string | number | null
    variant?: Variant
    disabled?: boolean
  }>(),
  {
    modelValue: '',
    variant: 'default',
    disabled: false,
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const attrs = useAttrs()

const variantClass = computed(() => {
  switch (props.variant) {
    case 'sm':
      return 'input-sm'
    case 'glass':
      return 'control-glass'
    case 'glass-sm':
      return 'control-glass-sm'
    case 'default':
    default:
      return 'input'
  }
})

const mergedClass = computed(() => {
  const cls = attrs.class
  const base = cls ? [variantClass.value, cls].join(' ') : variantClass.value
  if (!props.disabled) return base
  return [base, 'opacity-50 cursor-not-allowed'].join(' ')
})

const passthroughAttrs = computed(() => {
  const out: Record<string, unknown> = {}
  for (const key in attrs) {
    if (key === 'class') continue
    out[key] = attrs[key]
  }
  return out
})

function onInput(e: Event) {
  emit('update:modelValue', (e.target as HTMLInputElement).value)
}
</script>

<template>
  <input
    v-bind="passthroughAttrs"
    :value="modelValue ?? ''"
    :disabled="disabled"
    :class="mergedClass"
    @input="onInput"
  />
</template>
