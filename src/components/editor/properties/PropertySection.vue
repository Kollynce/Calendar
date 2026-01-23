<script setup lang="ts">
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/vue/24/outline'

const props = defineProps<{
  title: string
  isOpen: boolean
  isLast?: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle'): void
}>()
</script>

<template>
  <div class="border-b border-white/5 last:border-0 pb-4" :class="{ 'pb-0 border-0': isLast }">
    <button 
      @click="emit('toggle')" 
      class="flex items-center justify-between w-full py-2 group cursor-pointer"
    >
      <p class="text-[11px] font-bold uppercase tracking-widest text-white/40 group-hover:text-white/60 transition-colors">
        {{ title }}
      </p>
      <component 
        :is="isOpen ? ChevronUpIcon : ChevronDownIcon" 
        class="w-3.5 h-3.5 text-white/40 group-hover:text-white/60 transition-colors" 
      />
    </button>

    <div v-show="isOpen" class="space-y-4 pt-2">
      <slot />
    </div>
  </div>
</template>
