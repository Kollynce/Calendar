<script setup lang="ts">
import PropertyField from './PropertyField.vue'
import PropertyRow from './PropertyRow.vue'

const props = defineProps<{
  showList: boolean
  listTitle: string
  maxItems: number
  listHeight: number
}>()

const emit = defineEmits<{
  (e: 'update:showList', value: boolean): void
  (e: 'update:listTitle', value: string): void
  (e: 'update:maxItems', value: number): void
  (e: 'update:listHeight', value: number): void
}>()

function handleMaxItemsChange(event: Event): void {
  const value = Number((event.target as HTMLInputElement).value)
  if (!Number.isFinite(value)) return
  emit('update:maxItems', Math.max(1, Math.min(8, value || 4)))
}

function handleListHeightChange(event: Event): void {
  const value = Number((event.target as HTMLInputElement).value)
  if (!Number.isFinite(value)) return
  emit('update:listHeight', Math.max(40, Math.min(220, value || 96)))
}
</script>

<template>
  <div class="pt-4 border-t border-white/5 space-y-4">
    <div class="flex items-center justify-between">
      <span class="text-[10px] font-medium text-white/40 uppercase">Holiday List</span>
      <label class="flex items-center gap-2 text-[11px] text-white/60 cursor-pointer">
        <input
          type="checkbox"
          class="accent-primary-400"
          :checked="props.showList"
          @change="emit('update:showList', ($event.target as HTMLInputElement).checked)"
        >
        <span>Show</span>
      </label>
    </div>

    <div v-if="props.showList" class="space-y-4">
      <PropertyField label="List Title">
        <input
          type="text"
          class="control-glass text-xs"
          :value="props.listTitle"
          @input="emit('update:listTitle', ($event.target as HTMLInputElement).value)"
        />
      </PropertyField>

      <PropertyRow>
        <PropertyField label="Max Items">
          <input
            type="number"
            min="1"
            max="8"
            class="control-glass text-xs"
            :value="props.maxItems"
            @change="handleMaxItemsChange"
          />
        </PropertyField>
        <PropertyField label="Height">
          <input
            type="number"
            min="40"
            max="220"
            class="control-glass text-xs"
            :value="props.listHeight"
            @change="handleListHeightChange"
          />
        </PropertyField>
      </PropertyRow>
    </div>
  </div>
</template>
