<script setup lang="ts">
import { computed } from 'vue'
import ColorPicker from '../ColorPicker.vue'
import AppSearchableSelect from '@/components/ui/AppSearchableSelect.vue'
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
  <div class="pt-4 border-t border-white/10 space-y-4">
    <div class="flex items-center justify-between">
      <p class="text-xs font-semibold uppercase tracking-widest text-white/60">Week Strip</p>
      <select
        class="control-glass-sm"
        :value="weekStripMetadata.mode ?? 'month'"
        @change="updateWeekStripMetadata((draft) => { draft.mode = ($event.target as HTMLSelectElement).value as WeekStripMetadata['mode'] })"
      >
        <option value="month">Actual Week</option>
        <option value="blank">Blank Grid</option>
      </select>
    </div>

    <div>
      <label class="text-xs font-medium text-white/60 mb-1.5 block">Label</label>
      <input
        type="text"
        class="control-glass"
        :value="weekStripMetadata.label ?? ''"
        @input="updateWeekStripMetadata((draft) => { draft.label = ($event.target as HTMLInputElement).value || undefined })"
      />
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="text-xs font-medium text-white/60 mb-1.5 block">Start date</label>
        <input
          type="date"
          class="control-glass"
          :value="weekStripDateValue"
          @change="updateWeekStripMetadata((draft) => { const v = ($event.target as HTMLInputElement).value; if (v) draft.startDate = v })"
        />
      </div>
      <div>
        <label class="text-xs font-medium text-white/60 mb-1.5 block">Week starts</label>
        <select
          class="control-glass"
          :value="weekStripMetadata.startDay"
          @change="updateWeekStripMetadata((draft) => { draft.startDay = Number(($event.target as HTMLSelectElement).value) as WeekStripMetadata['startDay'] })"
        >
          <option v-for="d in weekStartOptions" :key="d.value" :value="d.value">{{ d.label }}</option>
        </select>
      </div>
    </div>

    <div>
      <label class="text-xs font-medium text-white/60 mb-1.5 block">Country</label>
      <AppSearchableSelect
        :model-value="weekStripMetadata.country ?? 'US'"
        :options="countryOptions"
        placeholder="Select country..."
        @update:model-value="(val: string | number | null) => updateWeekStripMetadata((draft) => { draft.country = val as any })"
      />
    </div>

    <div>
      <label class="text-xs font-medium text-white/60 mb-1.5 block">Language</label>
      <AppSearchableSelect
        :model-value="weekStripMetadata.language ?? 'en'"
        :options="languageOptions"
        placeholder="Select language..."
        @update:model-value="(val: string | number | null) => updateWeekStripMetadata((draft) => { draft.language = val as any })"
      />
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="text-xs font-medium text-white/60 mb-1.5 block">Background</label>
        <ColorPicker
          :model-value="weekStripMetadata.backgroundColor ?? '#ffffff'"
          @update:modelValue="(c) => updateWeekStripMetadata((draft) => { draft.backgroundColor = c })"
        />
      </div>
      <div>
        <label class="text-xs font-medium text-white/60 mb-1.5 block">Border</label>
        <ColorPicker
          :model-value="weekStripMetadata.borderColor ?? '#e5e7eb'"
          @update:modelValue="(c) => updateWeekStripMetadata((draft) => { draft.borderColor = c })"
        />
      </div>
    </div>
    <div class="flex flex-wrap items-center gap-4 text-xs text-white/80">
      <label class="flex items-center gap-2">
        <input
          type="checkbox"
          class="accent-primary-400"
          :checked="weekStripMetadata.showBackground !== false"
          @change="updateWeekStripMetadata((draft) => { draft.showBackground = ($event.target as HTMLInputElement).checked })"
        />
        <span>Show background</span>
      </label>
      <label class="flex items-center gap-2">
        <input
          type="checkbox"
          class="accent-primary-400"
          :checked="weekStripMetadata.showBorder !== false"
          @change="updateWeekStripMetadata((draft) => { draft.showBorder = ($event.target as HTMLInputElement).checked })"
        />
        <span>Show border</span>
      </label>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="text-xs font-medium text-white/60 mb-1.5 block">Radius</label>
        <input
          type="number"
          min="0"
          max="80"
          class="control-glass"
          :value="weekStripMetadata.cornerRadius ?? 24"
          @change="updateWeekStripMetadata((draft) => { draft.cornerRadius = Math.max(0, Math.min(80, Number(($event.target as HTMLInputElement).value) || 0)) })"
        />
      </div>
      <div>
        <label class="text-xs font-medium text-white/60 mb-1.5 block">Cell lines</label>
        <ColorPicker
          :model-value="weekStripMetadata.cellBorderColor ?? '#f1f5f9'"
          @update:modelValue="(c) => updateWeekStripMetadata((draft) => { draft.cellBorderColor = c })"
        />
      </div>
    </div>

    <div class="grid grid-cols-3 gap-3">
      <div>
        <label class="text-xs font-medium text-white/60 mb-1.5 block">Label</label>
        <ColorPicker
          :model-value="weekStripMetadata.labelColor ?? '#0f172a'"
          @update:modelValue="(c) => updateWeekStripMetadata((draft) => { draft.labelColor = c })"
        />
      </div>
      <div>
        <label class="text-xs font-medium text-white/60 mb-1.5 block">Weekday</label>
        <ColorPicker
          :model-value="weekStripMetadata.weekdayColor ?? '#64748b'"
          @update:modelValue="(c) => updateWeekStripMetadata((draft) => { draft.weekdayColor = c })"
        />
      </div>
      <div>
        <label class="text-xs font-medium text-white/60 mb-1.5 block">Number</label>
        <ColorPicker
          :model-value="weekStripMetadata.dayNumberColor ?? '#0f172a'"
          @update:modelValue="(c) => updateWeekStripMetadata((draft) => { draft.dayNumberColor = c })"
        />
      </div>
    </div>

    <div class="pt-3 border-t border-white/10 space-y-4">
      <div class="flex items-center justify-between">
        <p class="text-[11px] font-semibold text-white/60">Holidays</p>
        <label class="flex items-center gap-2 text-sm text-white/80">
          <input
            type="checkbox"
            class="accent-primary-400"
            :checked="weekStripMetadata.showHolidayMarkers ?? true"
            @change="updateWeekStripMetadata((draft) => { draft.showHolidayMarkers = ($event.target as HTMLInputElement).checked })"
          >
          <span>Show</span>
        </label>
      </div>

      <div v-if="weekStripMetadata.showHolidayMarkers !== false" class="space-y-3">
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="text-xs font-medium text-white/60">Marker Style</label>
            <div v-if="isMarkerLocked(holidayMarkerOptions.find(o => o.value === weekStripMetadata.holidayMarkerStyle))" class="flex items-center gap-1">
              <AppTierBadge tier="pro" size="sm" />
            </div>
          </div>
          <select
            class="control-glass"
            :value="weekStripMetadata.holidayMarkerStyle ?? 'text'"
            @change="updateWeekStripMetadata((draft) => { 
              const val = ($event.target as HTMLSelectElement).value;
              const option = holidayMarkerOptions.find(o => o.value === val);
              if (option && !isMarkerLocked(option)) {
                draft.holidayMarkerStyle = val as any;
              }
            })"
          >
            <option 
              v-for="option in holidayMarkerOptions" 
              :key="option.value" 
              :value="option.value"
              :disabled="isMarkerLocked(option)"
            >
              {{ option.label }}{{ isMarkerLocked(option) ? ' (Pro)' : '' }}
            </option>
          </select>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs font-medium text-white/60 mb-1.5 block">Color</label>
            <ColorPicker
              :model-value="weekStripMetadata.holidayMarkerColor ?? '#ef4444'"
              @update:modelValue="(c) => updateWeekStripMetadata((draft) => { draft.holidayMarkerColor = c })"
            />
          </div>
          <div v-if="!['background', 'text'].includes(weekStripMetadata.holidayMarkerStyle ?? 'text')">
            <label class="text-xs font-medium text-white/60 mb-1.5 block">{{ (weekStripMetadata.holidayMarkerStyle === 'dot' || weekStripMetadata.holidayMarkerStyle === 'square' || weekStripMetadata.holidayMarkerStyle === 'triangle') ? 'Size' : (weekStripMetadata.holidayMarkerStyle === 'border' ? 'Width' : 'Height') }}</label>
            <input
              type="number"
              min="1"
              max="20"
              class="control-glass"
              :value="weekStripMetadata.holidayMarkerHeight ?? 4"
              @change="updateWeekStripMetadata((draft) => { draft.holidayMarkerHeight = Math.max(1, Math.min(20, Number(($event.target as HTMLInputElement).value) || 4)) })"
            />
          </div>
        </div>
      </div>

      <div class="pt-3 border-t border-white/10 space-y-3">
        <div class="flex items-center justify-between gap-4">
          <label class="flex items-center gap-2 text-sm text-white/80">
            <input
              type="checkbox"
              class="accent-primary-400"
              :checked="weekStripMetadata.showHolidayList !== false"
              @change="updateWeekStripMetadata((draft) => { draft.showHolidayList = ($event.target as HTMLInputElement).checked })"
            >
            <span>Show holiday list</span>
          </label>
          <span class="text-[11px] text-white/50">Shows holidays in week</span>
        </div>

        <template v-if="weekStripMetadata.showHolidayList !== false">
          <div>
            <label class="text-xs font-medium text-white/60 mb-1.5 block">List title</label>
            <input
              type="text"
              class="control-glass"
              :value="weekStripMetadata.holidayListTitle ?? 'Holidays'"
              @input="updateWeekStripMetadata((draft) => { draft.holidayListTitle = ($event.target as HTMLInputElement).value })"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs font-medium text-white/60 mb-1.5 block">Max items</label>
              <input
                type="number"
                min="1"
                max="8"
                class="control-glass"
                :value="weekStripMetadata.holidayListMaxItems ?? 4"
                @change="updateWeekStripMetadata((draft) => { draft.holidayListMaxItems = Math.max(1, Math.min(8, Number(($event.target as HTMLInputElement).value) || 4)) })"
              />
            </div>
            <div>
              <label class="text-xs font-medium text-white/60 mb-1.5 block">List height</label>
              <input
                type="number"
                min="40"
                max="220"
                class="control-glass"
                :value="weekStripMetadata.holidayListHeight ?? 96"
                @change="updateWeekStripMetadata((draft) => { draft.holidayListHeight = Math.max(40, Math.min(220, Number(($event.target as HTMLInputElement).value) || 96)) })"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs font-medium text-white/60 mb-1.5 block">Text color</label>
              <ColorPicker
                :model-value="weekStripMetadata.holidayListTextColor ?? '#4b5563'"
                @update:modelValue="(c) => updateWeekStripMetadata((draft) => { draft.holidayListTextColor = c })"
              />
            </div>
            <div>
              <label class="text-xs font-medium text-white/60 mb-1.5 block">Accent color</label>
              <ColorPicker
                :model-value="weekStripMetadata.holidayListAccentColor ?? weekStripMetadata.holidayMarkerColor ?? '#ef4444'"
                @update:modelValue="(c) => updateWeekStripMetadata((draft) => { draft.holidayListAccentColor = c })"
              />
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
