<script setup lang="ts">
import { computed, ref } from 'vue'
import ColorPicker from '../ColorPicker.vue'
import AppSearchableSelect from '@/components/ui/AppSearchableSelect.vue'
import PropertySection from './PropertySection.vue'
import PropertyField from './PropertyField.vue'
import PropertyRow from './PropertyRow.vue'
import { localizationService } from '@/services/calendar/localization.service'
import { countries } from '@/data/countries'
import type { DateCellMetadata } from '@/types'

import AppTierBadge from '@/components/ui/AppTierBadge.vue'
import { useAuthStore } from '@/stores'

interface Props {
  dateCellMetadata: DateCellMetadata
  updateDateCellMetadata: (updater: (draft: DateCellMetadata) => void) => void
}

const props = defineProps<Props>()
const authStore = useAuthStore()

// Section management
const activeSections = ref<Set<string>>(new Set(['content']))

function toggleSection(id: string) {
  if (activeSections.value.has(id)) {
    activeSections.value.delete(id)
  } else {
    activeSections.value.add(id)
  }
}

function isSectionOpen(id: string) {
  return activeSections.value.has(id)
}

const holidayMarkerOptions: { value: string; label: string; requiredTier?: 'pro' | 'business' }[] = [
  { value: 'bar', label: 'Bar (Bottom)' },
  { value: 'dot', label: 'Dot (Circle)' },
  { value: 'square', label: 'Square (Solid)' },
  { value: 'border', label: 'Border (Ring)', requiredTier: 'pro' },
  { value: 'triangle', label: 'Corner (Triangle)', requiredTier: 'pro' },
  { value: 'background', label: 'Background (Fill)', requiredTier: 'pro' },
  { value: 'text', label: 'Text (Highlight)', requiredTier: 'pro' },
]

function isMarkerLocked(option: any): boolean {
  if (!option?.requiredTier) return false
  if (option.requiredTier === 'pro') return !authStore.isPro
  if (option.requiredTier === 'business') return !authStore.isBusiness
  return false
}

const languageOptions = computed(() =>
  localizationService.getAvailableLanguages().map(l => ({
    id: l.code,
    name: l.nativeName ? `${l.name} (${l.nativeName})` : l.name
  }))
)

const countryOptions = computed(() =>
  countries.map(c => ({
    id: c.code,
    name: `${c.flag} ${c.name}`
  }))
)

function normalizeDateInput(value: string | null | undefined): string {
  if (!value) return ''
  if (!value.includes('T')) return value
  const [datePart] = value.split('T')
  return datePart ?? ''
}

const dateCellDateValue = computed(() =>
  normalizeDateInput(props.dateCellMetadata.date)
)
</script>

<template>
  <div class="space-y-0">
    <!-- Date Data (Content) -->
    <PropertySection 
      title="Date Data" 
      :is-open="isSectionOpen('content')"
      @toggle="toggleSection('content')"
    >
      <PropertyField label="Date">
        <input
          type="date"
          class="control-glass text-xs"
          :value="dateCellDateValue"
          @change="updateDateCellMetadata((draft) => { const v = ($event.target as HTMLInputElement).value; if (v) draft.date = v })"
        />
      </PropertyField>

      <PropertyField label="Placeholder">
        <input
          type="text"
          placeholder="No notes..."
          class="control-glass text-xs"
          :value="dateCellMetadata.notePlaceholder"
          @input="updateDateCellMetadata((draft) => { draft.notePlaceholder = ($event.target as HTMLInputElement).value })"
        />
      </PropertyField>

      <PropertyField label="Country">
        <AppSearchableSelect
          :model-value="dateCellMetadata.country ?? 'US'"
          :options="countryOptions"
          placeholder="Select country..."
          @update:model-value="(val: string | number | null) => updateDateCellMetadata((draft) => { draft.country = val as any })"
        />
      </PropertyField>

      <PropertyField label="Language">
        <AppSearchableSelect
          :model-value="dateCellMetadata.language ?? 'en'"
          :options="languageOptions"
          placeholder="Select language..."
          @update:model-value="(val: string | number | null) => updateDateCellMetadata((draft) => { draft.language = val as any })"
        />
      </PropertyField>
    </PropertySection>

    <!-- Appearance Section -->
    <PropertySection 
      title="Appearance" 
      :is-open="isSectionOpen('appearance')"
      @toggle="toggleSection('appearance')"
    >
      <PropertyRow>
        <label class="flex items-center gap-2 text-[11px] text-white/60 cursor-pointer">
          <input
            type="checkbox"
            class="accent-primary-400"
            :checked="dateCellMetadata.showBackground"
            @change="updateDateCellMetadata((draft) => { draft.showBackground = ($event.target as HTMLInputElement).checked })"
          >
          <span>Show Background</span>
        </label>
        <label class="flex items-center gap-2 text-[11px] text-white/60 cursor-pointer">
          <input
            type="checkbox"
            class="accent-primary-400"
            :checked="dateCellMetadata.showBorder"
            @change="updateDateCellMetadata((draft) => { draft.showBorder = ($event.target as HTMLInputElement).checked })"
          >
          <span>Show Border</span>
        </label>
      </PropertyRow>

      <PropertyRow>
        <PropertyField label="Background">
          <ColorPicker
            :model-value="dateCellMetadata.backgroundColor ?? '#ffffff'"
            @update:modelValue="(c) => updateDateCellMetadata((draft) => { draft.backgroundColor = c })"
          />
        </PropertyField>
        <PropertyField label="Border Color">
          <ColorPicker
            :model-value="dateCellMetadata.borderColor ?? '#e2e8f0'"
            @update:modelValue="(c) => updateDateCellMetadata((draft) => { draft.borderColor = c })"
          />
        </PropertyField>
      </PropertyRow>

      <PropertyRow>
        <PropertyField label="Corner Radius">
          <input
            type="number"
            min="0"
            max="80"
            class="control-glass text-xs"
            :value="dateCellMetadata.cornerRadius ?? 24"
            @change="updateDateCellMetadata((draft) => { draft.cornerRadius = Math.max(0, Math.min(80, Number(($event.target as HTMLInputElement).value) || 0)) })"
          />
        </PropertyField>
        <PropertyField label="Border Width">
          <input
            type="number"
            min="0"
            max="10"
            class="control-glass text-xs"
            :value="dateCellMetadata.borderWidth ?? 1"
            @change="updateDateCellMetadata((draft) => { draft.borderWidth = Math.max(0, Math.min(10, Number(($event.target as HTMLInputElement).value) || 0)) })"
          />
        </PropertyField>
      </PropertyRow>

      <div class="pt-4 border-t border-white/5 space-y-3">
        <span class="text-[10px] font-medium text-white/40 uppercase">Accent Highlight</span>
        <div class="flex items-center gap-3">
          <ColorPicker
            :model-value="dateCellMetadata.highlightAccent"
            class="w-10 h-10"
            @update:modelValue="(c) => updateDateCellMetadata((draft) => { draft.highlightAccent = c })"
          />
          <div class="flex-1">
            <label class="text-[9px] font-medium text-white/30 mb-1 block uppercase px-1">Height Ratio</label>
            <div class="flex items-center gap-2">
              <input
                type="range"
                min="0.1"
                max="0.8"
                step="0.01"
                class="flex-1 accent-primary-400"
                :value="dateCellMetadata.accentHeightRatio ?? 0.4"
                @input="updateDateCellMetadata((draft) => { draft.accentHeightRatio = Number(($event.target as HTMLInputElement).value) })"
              />
              <span class="text-[10px] text-white/40 w-8 text-right">{{ Math.round(((dateCellMetadata.accentHeightRatio ?? 0.4) as number) * 100) }}%</span>
            </div>
          </div>
        </div>
      </div>

      <div class="pt-4 border-t border-white/5 space-y-3">
        <span class="text-[10px] font-medium text-white/40 uppercase">Element Colors</span>
        <PropertyRow cols="3" gap="2">
          <PropertyField label="Weekday">
            <ColorPicker
              :model-value="dateCellMetadata.weekdayColor ?? '#78350f'"
              @update:modelValue="(c) => updateDateCellMetadata((draft) => { draft.weekdayColor = c })"
            />
          </PropertyField>
          <PropertyField label="Day">
            <ColorPicker
              :model-value="dateCellMetadata.dayNumberColor ?? '#92400e'"
              @update:modelValue="(c) => updateDateCellMetadata((draft) => { draft.dayNumberColor = c })"
            />
          </PropertyField>
          <PropertyField label="Text">
            <ColorPicker
              :model-value="dateCellMetadata.placeholderColor ?? '#475569'"
              @update:modelValue="(c) => updateDateCellMetadata((draft) => { draft.placeholderColor = c })"
            />
          </PropertyField>
        </PropertyRow>
      </div>
    </PropertySection>

    <!-- Holidays Section -->
    <PropertySection 
      title="Holidays" 
      :is-open="isSectionOpen('holidays')"
      @toggle="toggleSection('holidays')"
      is-last
    >
      <div class="flex items-center justify-between">
        <span class="text-[10px] font-medium text-white/40 uppercase">Markers</span>
        <label class="flex items-center gap-2 text-[11px] text-white/60 cursor-pointer">
          <input
            type="checkbox"
            class="accent-primary-400"
            :checked="dateCellMetadata.showHolidayMarkers ?? true"
            @change="updateDateCellMetadata((draft) => { draft.showHolidayMarkers = ($event.target as HTMLInputElement).checked })"
          >
          <span>Enabled</span>
        </label>
      </div>

      <div v-if="dateCellMetadata.showHolidayMarkers !== false" class="space-y-4 pt-4 border-t border-white/5">
        <PropertyField label="Marker Style" :is-pro="isMarkerLocked(holidayMarkerOptions.find(o => o.value === dateCellMetadata.holidayMarkerStyle))">
          <select
            class="control-glass text-xs"
            :value="dateCellMetadata.holidayMarkerStyle ?? 'text'"
            @change="updateDateCellMetadata((draft) => { 
                const val = ($event.target as HTMLSelectElement).value;
                const option = holidayMarkerOptions.find(o => o.value === val);
                if (option && !isMarkerLocked(option)) draft.holidayMarkerStyle = val as any;
              })"
          >
            <option v-for="option in holidayMarkerOptions" :key="option.value" :value="option.value" :disabled="isMarkerLocked(option)">
              {{ option.label }}{{ isMarkerLocked(option) ? ' (Pro)' : '' }}
            </option>
          </select>
        </PropertyField>

        <PropertyRow>
          <PropertyField label="Color">
            <ColorPicker
              :model-value="dateCellMetadata.holidayMarkerColor ?? '#ef4444'"
              @update:modelValue="(c) => updateDateCellMetadata((draft) => { draft.holidayMarkerColor = c })"
            />
          </PropertyField>
          <PropertyField 
            v-if="!['background', 'text'].includes(dateCellMetadata.holidayMarkerStyle ?? 'text')"
            label="Size"
          >
            <input
              type="number"
              min="1"
              max="20"
              class="control-glass text-xs"
              :value="dateCellMetadata.holidayMarkerHeight ?? 4"
              @change="updateDateCellMetadata((draft) => { draft.holidayMarkerHeight = Math.max(1, Math.min(20, Number(($event.target as HTMLInputElement).value) || 4)) })"
            />
          </PropertyField>
        </PropertyRow>
      </div>

      <div class="pt-4 border-t border-white/5 space-y-4">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-medium text-white/40 uppercase">Holiday Info</span>
          <label class="flex items-center gap-2 text-[11px] text-white/60 cursor-pointer">
            <input
              type="checkbox"
              class="accent-primary-400"
              :checked="dateCellMetadata.showHolidayInfo !== false"
              @change="updateDateCellMetadata((draft) => { draft.showHolidayInfo = ($event.target as HTMLInputElement).checked })"
            >
            <span>Show</span>
          </label>
        </div>

        <div v-if="dateCellMetadata.showHolidayInfo !== false" class="space-y-4">
          <PropertyField label="Position">
            <select
              class="control-glass-sm text-[10px] w-full"
              :value="dateCellMetadata.holidayInfoPosition ?? 'bottom'"
              @change="updateDateCellMetadata((draft) => { draft.holidayInfoPosition = ($event.target as HTMLSelectElement).value as any })"
            >
              <option value="top">Top</option>
              <option value="bottom">Bottom</option>
              <option value="overlay">Overlay</option>
            </select>
          </PropertyField>

          <PropertyRow>
            <PropertyField label="Text Color">
              <ColorPicker
                :model-value="dateCellMetadata.holidayInfoTextColor ?? '#4b5563'"
                @update:modelValue="(c) => updateDateCellMetadata((draft) => { draft.holidayInfoTextColor = c })"
              />
            </PropertyField>
            <PropertyField label="Font Size">
              <input
                type="number"
                min="8"
                max="24"
                class="control-glass text-xs"
                :value="dateCellMetadata.holidayInfoFontSize ?? 12"
                @change="updateDateCellMetadata((draft) => { draft.holidayInfoFontSize = Math.max(8, Math.min(24, Number(($event.target as HTMLInputElement).value) || 12)) })"
              />
            </PropertyField>
          </PropertyRow>
        </div>
      </div>
    </PropertySection>
  </div>
</template>
