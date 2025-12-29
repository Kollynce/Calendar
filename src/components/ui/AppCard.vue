<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  as?: string | object
  to?: string | object
  variant?: 'glass' | 'outline' | 'flat'
  hover?: 'scale' | 'shadow' | 'ring' | 'none'
  interactive?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  as: 'div',
  variant: 'glass',
  hover: 'shadow',
  interactive: false
})

const componentType = computed(() => {
  if (props.to) return 'router-link'
  return props.as
})

const cardClasses = computed(() => {
  const base = 'overflow-hidden transition-all duration-300'
  const variants = {
    glass: 'glass-card',
    outline: 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl',
    flat: 'bg-gray-50 dark:bg-gray-800/50 rounded-2xl'
  }
  const hovers = {
    scale: 'hover:scale-[1.02] active:scale-[0.98]',
    shadow: 'hover:shadow-xl hover:shadow-primary-500/10',
    ring: 'hover:ring-2 hover:ring-primary-500/50',
    none: ''
  }
  
  return [
    base,
    variants[props.variant],
    props.hover !== 'none' ? hovers[props.hover] : '',
    props.interactive ? 'cursor-pointer' : ''
  ]
})
</script>

<template>
  <component 
    :is="componentType" 
    :to="to"
    :class="cardClasses"
  >
    <div v-if="$slots.image" class="relative overflow-hidden">
      <slot name="image" />
      <div v-if="$slots.overlay" class="absolute inset-0 z-10">
        <slot name="overlay" />
      </div>
    </div>
    
    <div v-if="$slots.default" :class="[ $slots.image ? 'p-4' : 'p-6' ]">
      <slot />
    </div>
    
    <div v-if="$slots.footer" class="px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-white/5">
      <slot name="footer" />
    </div>
  </component>
</template>
