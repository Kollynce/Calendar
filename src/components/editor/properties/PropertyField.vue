<script setup lang="ts">
defineProps<{
  label?: string
  isPro?: boolean
}>()
</script>

<template>
  <div class="property-field space-y-1">
    <div v-if="label" class="flex items-center justify-between gap-2 mb-1">
      <label class="text-[10px] font-medium text-white/40 uppercase tracking-tight block">
        {{ label }}
      </label>
      <span v-if="isPro" class="text-[8px] font-bold bg-primary-500/20 text-primary-300 px-1 rounded uppercase tracking-tighter">PRO</span>
    </div>
    <div class="property-input">
      <slot />
    </div>
  </div>
</template>
