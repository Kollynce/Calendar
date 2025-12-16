<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import { RouterLink } from 'vue-router'

type Variant = 'primary' | 'primary-sm' | 'secondary' | 'secondary-sm' | 'ghost' | 'glass' | 'glass-sm'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    to?: string | Record<string, any>
    type?: 'button' | 'submit' | 'reset'
    variant?: Variant
    disabled?: boolean
  }>(),
  {
    type: 'button',
    variant: 'primary',
    disabled: false,
  },
)

const attrs = useAttrs()

const variantClass = computed(() => {
  switch (props.variant) {
    case 'primary':
      return 'btn btn-primary'
    case 'primary-sm':
      return 'btn-primary-sm'
    case 'secondary':
      return 'btn btn-secondary'
    case 'secondary-sm':
      return 'btn-secondary-sm'
    case 'ghost':
      return 'btn btn-ghost'
    case 'glass':
      return 'btn-glass'
    case 'glass-sm':
      return 'btn-glass-sm'
    default:
      return 'btn btn-primary'
  }
})

const mergedClass = computed(() => {
  const cls = attrs.class
  const base = cls ? [variantClass.value, cls].join(' ') : variantClass.value
  if (!props.disabled) return base
  return [base, 'opacity-50 cursor-not-allowed pointer-events-none'].join(' ')
})

const passthroughAttrs = computed(() => {
  const out: Record<string, unknown> = {}
  for (const key in attrs) {
    if (key === 'class') continue
    out[key] = attrs[key]
  }
  return out
})
</script>

<template>
  <component
    :is="to ? RouterLink : 'button'"
    v-bind="passthroughAttrs"
    :to="to"
    :type="to ? undefined : type"
    :disabled="disabled"
    :aria-disabled="disabled || undefined"
    :tabindex="disabled && to ? -1 : undefined"
    :class="mergedClass"
  >
    <slot />
  </component>
</template>
