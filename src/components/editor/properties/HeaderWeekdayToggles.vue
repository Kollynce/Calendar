<script setup lang="ts">
import PropertyRow from './PropertyRow.vue'

const props = defineProps<{
  showHeader: boolean
  showWeekdays: boolean
  headerLabel?: string
  weekdayLabel?: string
}>()

const emit = defineEmits<{
  (e: 'update:showHeader', value: boolean): void
  (e: 'update:showWeekdays', value: boolean): void
}>()
</script>

<template>
  <PropertyRow>
    <label class="flex items-center gap-2 text-[11px] text-white/60 cursor-pointer">
      <input
        type="checkbox"
        class="accent-primary-400"
        :checked="props.showHeader"
        @change="emit('update:showHeader', ($event.target as HTMLInputElement).checked)"
      >
      <span>{{ props.headerLabel ?? 'Show Header' }}</span>
    </label>
    <label class="flex items-center gap-2 text-[11px] text-white/60 cursor-pointer">
      <input
        type="checkbox"
        class="accent-primary-400"
        :checked="props.showWeekdays"
        @change="emit('update:showWeekdays', ($event.target as HTMLInputElement).checked)"
      >
      <span>{{ props.weekdayLabel ?? 'Show Weekdays' }}</span>
    </label>
  </PropertyRow>
</template>
