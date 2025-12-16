<script setup lang="ts">
import { computed, useAttrs } from 'vue'

type Variant = 'info' | 'success' | 'warning' | 'danger'

const props = withDefaults(
  defineProps<{
    variant?: Variant
  }>(),
  {
    variant: 'info',
  },
)

const attrs = useAttrs()

const variantClass = computed(() => {
  switch (props.variant) {
    case 'success':
      return 'alert-success'
    case 'warning':
      return 'alert-warning'
    case 'danger':
      return 'alert-danger'
    case 'info':
    default:
      return 'alert-info'
  }
})

const mergedClass = computed(() => {
  const cls = attrs.class
  const base = ['alert', variantClass.value]
  return cls ? [...base, cls].join(' ') : base.join(' ')
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
  <div v-bind="passthroughAttrs" :class="mergedClass">
    <slot />
  </div>
</template>
