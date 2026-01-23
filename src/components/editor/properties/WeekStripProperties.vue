<script setup lang="ts">
import { computed, ref } from 'vue'
import ColorPicker from '../ColorPicker.vue'
import AppSearchableSelect from '@/components/ui/AppSearchableSelect.vue'
import PropertySection from './PropertySection.vue'
import PropertyField from './PropertyField.vue'
import PropertyRow from './PropertyRow.vue'
import { localizationService } from '@/services/calendar/localization.service'
import { countries } from '@/data/countries'
import type { WeekStripMetadata } from '@/types'

import AppTierBadge from '@/components/ui/AppTierBadge.vue'
import { useAuthStore } from '@/stores'

interface Props {
  weekStripMetadata: WeekStripMetadata
  updateWeekStripMetadata: (updater: (draft: WeekStripMetadata) => void) => void
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

const weekStartOptions: { value: 0 | 1 | 2 | 3 | 4 | 5 | 6; label: string }[] = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

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

const weekStripDateValue = computed(() =>
  normalizeDateInput(props.weekStripMetadata.startDate)
)
</script>

<template>
  <div class="space-y-0">
    <!-- Week Data (Content) -->
    <PropertySection 
      title="Week Data" 
      :is-open="isSectionOpen('content')"
      @toggle="toggleSection('content')"
    >
      <PropertyField label="Mode">
        <select
          class="control-glass-sm text-[10px] w-full"
          :value="weekStripMetadata.mode ?? 'month'"
          @change="updateWeekStripMetadata((draft) => { draft.mode = ($event.target as HTMLSelectElement).value as WeekStripMetadata['mode'] })"
        >
          <option value="month">Actual Week</option>
          <option value="blank">Blank Grid</option>
        </select>
      </PropertyField>

      <PropertyField label="Label Override">
         <input
           type="text"
           placeholder="(Optional)"
           class="control-glass text-xs"
           :value="weekStripMetadata.label ?? ''"
           @input="updateWeekStripMetadata((draft) => { draft.label = ($event.target as HTMLInputElement).value || undefined })"
         />
      </PropertyField>

      <PropertyRow>
        <PropertyField label="Start Date">
          <input
            type="date"
            class="control-glass text-xs"
            :value="weekStripDateValue"
            @change="updateWeekStripMetadata((draft) => { const v = ($event.target as HTMLInputElement).value; if (v) draft.startDate = v })"
          />
        </PropertyField>
        <PropertyField label="Week Starts">
          <select
            class="control-glass text-xs"
            :value="weekStripMetadata.startDay"
            @change="updateWeekStripMetadata((draft) => { draft.startDay = Number(($event.target as HTMLSelectElement).value) as WeekStripMetadata['startDay'] })"
          >
            <option v-for="d in weekStartOptions" :key="d.value" :value="d.value">{{ d.label }}</option>
          </select>
        </PropertyField>
      </PropertyRow>

      <PropertyField label="Country">
        <AppSearchableSelect
          :model-value="weekStripMetadata.country ?? 'US'"
          :options="countryOptions"
          placeholder="Select country..."
          @update:model-value="(val: string | number | null) => updateWeekStripMetadata((draft) => { draft.country = val as any })"
        />
      </PropertyField>

      <PropertyField label="Language">
        <AppSearchableSelect
          :model-value="weekStripMetadata.language ?? 'en'"
          :options="languageOptions"
          placeholder="Select language..."
          @update:model-value="(val: string | number | null) => updateWeekStripMetadata((draft) => { draft.language = val as any })"
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
            :checked="weekStripMetadata.showBackground"
            @change="updateWeekStripMetadata((draft) => { draft.showBackground = ($event.target as HTMLInputElement).checked })"
          >
          <span>Show Background</span>
        </label>
        <label class="flex items-center gap-2 text-[11px] text-white/60 cursor-pointer">
          <input
            type="checkbox"
            class="accent-primary-400"
            :checked="weekStripMetadata.showBorder"
            @change="updateWeekStripMetadata((draft) => { draft.showBorder = ($event.target as HTMLInputElement).checked })"
          >
          <span>Show Border</span>
        </label>
      </PropertyRow>

      <PropertyRow>
        <PropertyField label="Background">
          <ColorPicker
            :model-value="weekStripMetadata.backgroundColor ?? '#ffffff'"
            @update:modelValue="(c) => updateWeekStripMetadata((draft) => { draft.backgroundColor = c })"
          />
        </PropertyField>
        <PropertyField label="Border">
          <ColorPicker
            :model-value="weekStripMetadata.borderColor ?? '#e5e7eb'"
            @update:modelValue="(c) => updateWeekStripMetadata((draft) => { draft.borderColor = c })"
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
            :value="weekStripMetadata.cornerRadius ?? 24"
            @change="updateWeekStripMetadata((draft) => { draft.cornerRadius = Math.max(0, Math.min(80, Number(($event.target as HTMLInputElement).value) || 0)) })"
          />
        </PropertyField>
        <PropertyField label="Cell Lines">
          <ColorPicker
            :model-value="weekStripMetadata.cellBorderColor ?? '#f1f5f9'"
            @update:modelValue="(c) => updateWeekStripMetadata((draft) => { draft.cellBorderColor = c })"
          />
        </PropertyField>
      </PropertyRow>

      <div class="pt-4 border-t border-white/5 space-y-3">
        <span class="text-[10px] font-medium text-white/40 uppercase">Element Colors</span>
        <PropertyRow cols="3" gap="2">
          <PropertyField label="Label">
            <ColorPicker
              :model-value="weekStripMetadata.labelColor ?? '#0f172a'"
              @update:modelValue="(c) => updateWeekStripMetadata((draft) => { draft.labelColor = c })"
            />
          </PropertyField>
          <PropertyField label="Week">
            <ColorPicker
              :model-value="weekStripMetadata.weekdayColor ?? '#64748b'"
              @update:modelValue="(c) => updateWeekStripMetadata((draft) => { draft.weekdayColor = c })"
            />
          </PropertyField>
          <PropertyField label="Day">
            <ColorPicker
              :model-value="weekStripMetadata.dayNumberColor ?? '#0f172a'"
              @update:modelValue="(c) => updateWeekStripMetadata((draft) => { draft.dayNumberColor = c })"
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
            :checked="weekStripMetadata.showHolidayMarkers ?? true"
            @change="updateWeekStripMetadata((draft) => { draft.showHolidayMarkers = ($event.target as HTMLInputElement).checked })"
          >
          <span>Enabled</span>
        </label>
      </div>

      <div v-if="weekStripMetadata.showHolidayMarkers !== false" class="space-y-4 pt-4 border-t border-white/5">
        <PropertyField label="Marker Style" :is-pro="isMarkerLocked(holidayMarkerOptions.find(o => o.value === weekStripMetadata.holidayMarkerStyle))">
          <select
            class="control-glass text-xs"
            :value="weekStripMetadata.holidayMarkerStyle ?? 'text'"
            @change="updateWeekStripMetadata((draft) => { 
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
              :model-value="weekStripMetadata.holidayMarkerColor ?? '#ef4444'"
              @update:modelValue="(c) => updateWeekStripMetadata((draft) => { draft.holidayMarkerColor = c })"
            />
          </PropertyField>
          <PropertyField 
            v-if="!['background', 'text'].includes(weekStripMetadata.holidayMarkerStyle ?? 'text')"
            label="Size"
          >
            <input
              type="number"
              min="1"
              max="20"
              class="control-glass text-xs"
              :value="weekStripMetadata.holidayMarkerHeight ?? 4"
              @change="updateWeekStripMetadata((draft) => { draft.holidayMarkerHeight = Math.max(1, Math.min(20, Number(($event.target as HTMLInputElement).value) || 4)) })"
            />
          </PropertyField>
        </PropertyRow>
      </div>

      <div class="pt-4 border-t border-white/5 space-y-4">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-medium text-white/40 uppercase">Holiday List</span>
          <label class="flex items-center gap-2 text-[11px] text-white/60 cursor-pointer">
            <input
              type="checkbox"
              class="accent-primary-400"
              :checked="weekStripMetadata.showHolidayList !== false"
              @change="updateWeekStripMetadata((draft) => { draft.showHolidayList = ($event.target as HTMLInputElement).checked })"
            >
            <span>Show</span>
          </label>
        </div>

        <div v-if="weekStripMetadata.showHolidayList !== false" class="space-y-4">
          <PropertyField label="List Title">
            <input
              type="text"
              class="control-glass text-xs"
              :value="weekStripMetadata.holidayListTitle ?? 'Holidays'"
              @input="updateWeekStripMetadata((draft) => { draft.holidayListTitle = ($event.target as HTMLInputElement).value })"
            />
          </PropertyField>

          <PropertyRow>
            <PropertyField label="Max Items">
              <input
                type="number"
                min="1"
                max="8"
                class="control-glass text-xs"
                :value="weekStripMetadata.holidayListMaxItems ?? 4"
                @change="updateWeekStripMetadata((draft) => { draft.holidayListMaxItems = Math.max(1, Math.min(8, Number(($event.target as HTMLInputElement).value) || 4)) })"
              />
            </PropertyField>
            <PropertyField label="Height">
              <input
                type="number"
                min="40"
                max="220"
                class="control-glass text-xs"
                :value="weekStripMetadata.holidayListHeight ?? 96"
                @change="updateWeekStripMetadata((draft) => { draft.holidayListHeight = Math.max(40, Math.min(220, Number(($event.target as HTMLInputElement).value) || 96)) })"
              />
            </PropertyField>
          </PropertyRow>
        </div>
      </div>
    </PropertySection>
  </div>
</template>
