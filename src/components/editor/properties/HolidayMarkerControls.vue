<script setup lang="ts">
import PropertyField from './PropertyField.vue'
import PropertyRow from './PropertyRow.vue'
import ColorPicker from '../ColorPicker.vue'

type HolidayMarkerOption = { value: string; label: string }

const props = defineProps<{
  showMarkers: boolean
  markerStyle: string
  markerColor: string
  markerHeight: number
  options: HolidayMarkerOption[]
  isMarkerLocked: (option: HolidayMarkerOption | undefined) => boolean
}>()

const emit = defineEmits<{
  (e: 'update:showMarkers', value: boolean): void
  (e: 'update:markerStyle', value: string): void
  (e: 'update:markerColor', value: string): void
  (e: 'update:markerHeight', value: number): void
}>()

function handleMarkerStyleChange(event: Event): void {
  const value = (event.target as HTMLSelectElement).value
  const option = props.options.find((item) => item.value === value)
  if (props.isMarkerLocked(option)) return
  emit('update:markerStyle', value)
}

function handleMarkerHeightChange(event: Event): void {
  const value = Number((event.target as HTMLInputElement).value)
  if (!Number.isFinite(value)) return
  emit('update:markerHeight', Math.max(1, Math.min(20, value || 4)))
}
</script>

<template>
  <div class="flex items-center justify-between">
    <span class="text-[10px] font-medium text-white/40 uppercase">Markers</span>
    <label class="flex items-center gap-2 text-[11px] text-white/60 cursor-pointer">
      <input
        type="checkbox"
        class="accent-primary-400"
        :checked="props.showMarkers"
        @change="emit('update:showMarkers', ($event.target as HTMLInputElement).checked)"
      >
      <span>Enabled</span>
    </label>
  </div>

  <div v-if="props.showMarkers" class="space-y-4 pt-4 border-t border-white/5">
    <PropertyField label="Marker Style" :is-pro="props.isMarkerLocked(props.options.find(o => o.value === props.markerStyle))">
      <select
        class="control-glass text-xs"
        :value="props.markerStyle"
        @change="handleMarkerStyleChange"
      >
        <option
          v-for="option in props.options"
          :key="option.value"
          :value="option.value"
          :disabled="props.isMarkerLocked(option)"
        >
          {{ option.label }}{{ props.isMarkerLocked(option) ? ' (Pro)' : '' }}
        </option>
      </select>
    </PropertyField>

    <PropertyRow>
      <PropertyField label="Color">
        <ColorPicker
          :model-value="props.markerColor"
          @update:modelValue="(value: string) => emit('update:markerColor', value)"
        />
      </PropertyField>
      <PropertyField v-if="!['background', 'text'].includes(props.markerStyle)" label="Size">
        <input
          type="number"
          min="1"
          max="20"
          class="control-glass text-xs"
          :value="props.markerHeight"
          @change="handleMarkerHeightChange"
        />
      </PropertyField>
    </PropertyRow>
  </div>
</template>
