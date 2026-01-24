<script setup lang="ts">
import { computed, ref } from 'vue'
import ColorPicker from '../ColorPicker.vue'
import FontPicker from '../FontPicker.vue'
import AppSearchableSelect from '@/components/ui/AppSearchableSelect.vue'
import PropertySection from './PropertySection.vue'
import PropertyField from './PropertyField.vue'
import PropertyRow from './PropertyRow.vue'
import { localizationService } from '@/services/calendar/localization.service'
import { countries } from '@/data/countries'
import type { CalendarGridMetadata } from '@/types'

import { useAuthStore } from '@/stores'

interface Props {
  calendarMetadata: CalendarGridMetadata
  updateCalendarMetadata: (updater: (draft: CalendarGridMetadata) => void) => void
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
  return activeSections.value.has(id);
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

const weekStartOptions: { value: 0 | 1 | 2 | 3 | 4 | 5 | 6; label: string }[] = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]
</script>

<template>
  <div class="space-y-0">
    <!-- Grid Data (Content) -->
    <PropertySection 
      title="Calendar Data" 
      :is-open="isSectionOpen('content')"
      @toggle="toggleSection('content')"
    >
      <PropertyField label="Mode">
        <select
          class="control-glass-sm text-[10px] w-full"
          :value="calendarMetadata.mode"
          @change="updateCalendarMetadata((draft) => { draft.mode = ($event.target as HTMLSelectElement).value as CalendarGridMetadata['mode'] })"
        >
          <option value="month">Actual Month</option>
          <option value="blank">Blank Grid</option>
        </select>
      </PropertyField>

      <PropertyField label="Start Month">
        <input
          type="date"
          class="control-glass text-xs"
          :value="`${calendarMetadata.year}-${String(calendarMetadata.month).padStart(2, '0')}-01`"
          @change="(e) => {
            const val = (e.target as HTMLInputElement).value
            if (val) {
              const [year, month] = val.split('-').map(Number)
              updateCalendarMetadata((draft) => {
                draft.year = year || draft.year
                draft.month = month || draft.month
              })
            }
          }"
        />
      </PropertyField>

      <PropertyField label="Country">
        <AppSearchableSelect
          :model-value="calendarMetadata.country ?? 'US'"
          :options="countryOptions"
          placeholder="Select country..."
          @update:model-value="(val: string | number | null) => updateCalendarMetadata((draft) => { draft.country = val as any })"
        />
      </PropertyField>

      <PropertyField label="Language">
        <AppSearchableSelect
          :model-value="calendarMetadata.language ?? 'en'"
          :options="languageOptions"
          placeholder="Select language..."
          @update:model-value="(val: string | number | null) => updateCalendarMetadata((draft) => { draft.language = val as any })"
        />
      </PropertyField>

      <PropertyField label="Week Start">
        <select
          class="control-glass-sm text-[10px] w-full"
          :value="calendarMetadata.startDay"
          @change="updateCalendarMetadata((draft) => { draft.startDay = Number(($event.target as HTMLSelectElement).value) as CalendarGridMetadata['startDay'] })"
        >
          <option v-for="d in weekStartOptions" :key="d.value" :value="d.value">{{ d.label }}</option>
        </select>
      </PropertyField>
    </PropertySection>

    <!-- Header & Weekdays (Appearance) -->
    <PropertySection 
      title="Header & Labels" 
      :is-open="isSectionOpen('header')"
      @toggle="toggleSection('header')"
    >
      <PropertyRow>
        <label class="flex items-center gap-2 text-[11px] text-white/60 cursor-pointer">
          <input
            type="checkbox"
            class="accent-primary-400"
            :checked="calendarMetadata.showHeader"
            @change="updateCalendarMetadata((draft) => { draft.showHeader = ($event.target as HTMLInputElement).checked })"
          >
          <span>Show Header</span>
        </label>
        <label class="flex items-center gap-2 text-[11px] text-white/60 cursor-pointer">
          <input
            type="checkbox"
            class="accent-primary-400"
            :checked="calendarMetadata.showWeekdays"
            @change="updateCalendarMetadata((draft) => { draft.showWeekdays = ($event.target as HTMLInputElement).checked })"
          >
          <span>Show Weekdays</span>
        </label>
      </PropertyRow>

      <div v-if="calendarMetadata.showHeader" class="space-y-4 pt-4 border-t border-white/5">
        <PropertyField label="Title Override">
          <input
            type="text"
            placeholder="(Optional)"
            class="control-glass text-xs"
            :value="calendarMetadata.title ?? ''"
            @input="updateCalendarMetadata((draft) => { draft.title = ($event.target as HTMLInputElement).value || undefined })"
          />
        </PropertyField>

        <PropertyRow>
          <PropertyField label="Background">
            <ColorPicker
              :model-value="calendarMetadata.headerBackgroundColor ?? '#111827'"
              @update:modelValue="(c) => updateCalendarMetadata((draft) => { draft.headerBackgroundColor = c })"
            />
          </PropertyField>
          <PropertyField label="Header Text">
            <ColorPicker
              :model-value="calendarMetadata.headerTextColor ?? '#ffffff'"
              @update:modelValue="(c) => updateCalendarMetadata((draft) => { draft.headerTextColor = c })"
            />
          </PropertyField>
        </PropertyRow>

        <PropertyField label="Alignment">
          <select
            class="control-glass-sm text-[10px] w-full"
            :value="calendarMetadata.headerTextAlign ?? 'center'"
            @change="updateCalendarMetadata((draft) => { draft.headerTextAlign = ($event.target as HTMLSelectElement).value as CalendarGridMetadata['headerTextAlign'] })"
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </PropertyField>
      </div>
    </PropertySection>

    <!-- Grid & Cells (Appearance) -->
    <PropertySection 
      title="Grid & Cells" 
      :is-open="isSectionOpen('grid')"
      @toggle="toggleSection('grid')"
    >
      <PropertyRow>
        <label class="flex items-center gap-2 text-[11px] text-white/60 cursor-pointer">
          <input
            type="checkbox"
            class="accent-primary-400"
            :checked="calendarMetadata.showBackground"
            @change="updateCalendarMetadata((draft) => { draft.showBackground = ($event.target as HTMLInputElement).checked })"
          >
          <span>Show Background</span>
        </label>
        <label class="flex items-center gap-2 text-[11px] text-white/60 cursor-pointer">
          <input
            type="checkbox"
            class="accent-primary-400"
            :checked="calendarMetadata.showBorder"
            @change="updateCalendarMetadata((draft) => { draft.showBorder = ($event.target as HTMLInputElement).checked })"
          >
          <span>Show Border</span>
        </label>
      </PropertyRow>

      <PropertyRow>
        <PropertyField label="Background">
          <ColorPicker
            :model-value="calendarMetadata.backgroundColor ?? '#ffffff'"
            @update:modelValue="(c) => updateCalendarMetadata((draft) => { draft.backgroundColor = c })"
          />
        </PropertyField>
        <PropertyField label="Border">
          <ColorPicker
            :model-value="calendarMetadata.borderColor ?? '#e5e7eb'"
            @update:modelValue="(c) => updateCalendarMetadata((draft) => { draft.borderColor = c })"
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
            :value="calendarMetadata.cornerRadius ?? 26"
            @change="updateCalendarMetadata((draft) => { draft.cornerRadius = Math.max(0, Math.min(80, Number(($event.target as HTMLInputElement).value) || 0)) })"
          />
        </PropertyField>
        <PropertyField label="Cell Gap">
          <input
            type="number"
            min="0"
            max="30"
            class="control-glass text-xs"
            :value="calendarMetadata.cellGap ?? 0"
            @change="updateCalendarMetadata((draft) => { draft.cellGap = Math.max(0, Math.min(30, Number(($event.target as HTMLInputElement).value) || 0)) })"
          />
        </PropertyField>
      </PropertyRow>

      <div class="pt-4 border-t border-white/5 space-y-4">
        <PropertyRow>
          <PropertyField label="Grid Lines">
            <ColorPicker
              :model-value="calendarMetadata.gridLineColor ?? '#e5e7eb'"
              @update:modelValue="(c) => updateCalendarMetadata((draft) => { draft.gridLineColor = c })"
            />
          </PropertyField>
          <PropertyField label="Line Width">
            <input
              type="number"
              min="0"
              max="6"
              class="control-glass text-xs"
              :value="calendarMetadata.gridLineWidth ?? 1"
              @change="updateCalendarMetadata((draft) => { draft.gridLineWidth = Math.max(0, Math.min(6, Number(($event.target as HTMLInputElement).value) || 0)) })"
            />
          </PropertyField>
        </PropertyRow>

        <PropertyRow>
          <PropertyField label="Day Color">
            <ColorPicker
              :model-value="calendarMetadata.dayNumberColor ?? '#1f2937'"
              @update:modelValue="(c) => updateCalendarMetadata((draft) => { draft.dayNumberColor = c })"
            />
          </PropertyField>
          <PropertyField label="Weekend BG">
            <ColorPicker
              :model-value="calendarMetadata.weekendBackgroundColor ?? 'rgba(0,0,0,0)'"
              @update:modelValue="(c) => updateCalendarMetadata((draft) => { draft.weekendBackgroundColor = c })"
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
    >
      <div class="flex items-center justify-between">
        <span class="text-[10px] font-medium text-white/40 uppercase">Markers</span>
        <label class="flex items-center gap-2 text-[11px] text-white/60 cursor-pointer">
          <input
            type="checkbox"
            class="accent-primary-400"
            :checked="calendarMetadata.showHolidayMarkers ?? true"
            @change="updateCalendarMetadata((draft) => { draft.showHolidayMarkers = ($event.target as HTMLInputElement).checked })"
          >
          <span>Enabled</span>
        </label>
      </div>

      <div v-if="calendarMetadata.showHolidayMarkers !== false" class="space-y-4 pt-4 border-t border-white/5">
        <PropertyField label="Marker Style" :is-pro="isMarkerLocked(holidayMarkerOptions.find(o => o.value === calendarMetadata.holidayMarkerStyle))">
          <select
            class="control-glass text-xs"
            :value="calendarMetadata.holidayMarkerStyle ?? 'text'"
            @change="updateCalendarMetadata((draft) => { 
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
              :model-value="calendarMetadata.holidayMarkerColor ?? '#ef4444'"
              @update:modelValue="(c) => updateCalendarMetadata((draft) => { draft.holidayMarkerColor = c })"
            />
          </PropertyField>
          <PropertyField 
            v-if="!['background', 'text'].includes(calendarMetadata.holidayMarkerStyle ?? 'text')"
            label="Size"
          >
            <input
              type="number"
              min="1"
              max="20"
              class="control-glass text-xs"
              :value="calendarMetadata.holidayMarkerHeight ?? 4"
              @change="updateCalendarMetadata((draft) => { draft.holidayMarkerHeight = Math.max(1, Math.min(20, Number(($event.target as HTMLInputElement).value) || 4)) })"
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
              :checked="calendarMetadata.showHolidayList !== false"
              @change="updateCalendarMetadata((draft) => { draft.showHolidayList = ($event.target as HTMLInputElement).checked })"
            >
            <span>Show</span>
          </label>
        </div>

        <div v-if="calendarMetadata.showHolidayList !== false" class="space-y-4">
          <PropertyField label="List Title">
            <input
              type="text"
              class="control-glass text-xs"
              :value="calendarMetadata.holidayListTitle ?? 'Holidays'"
              @input="updateCalendarMetadata((draft) => { draft.holidayListTitle = ($event.target as HTMLInputElement).value })"
            />
          </PropertyField>

          <PropertyRow>
            <PropertyField label="Max Items">
              <input
                type="number"
                min="1"
                max="8"
                class="control-glass text-xs"
                :value="calendarMetadata.holidayListMaxItems ?? 4"
                @change="updateCalendarMetadata((draft) => { draft.holidayListMaxItems = Math.max(1, Math.min(8, Number(($event.target as HTMLInputElement).value) || 4)) })"
              />
            </PropertyField>
            <PropertyField label="Height">
              <input
                type="number"
                min="40"
                max="220"
                class="control-glass text-xs"
                :value="calendarMetadata.holidayListHeight ?? 96"
                @change="updateCalendarMetadata((draft) => { draft.holidayListHeight = Math.max(40, Math.min(220, Number(($event.target as HTMLInputElement).value) || 96)) })"
              />
            </PropertyField>
          </PropertyRow>
        </div>
      </div>
    </PropertySection>

    <!-- Typography Section -->
    <PropertySection 
      title="Typography" 
      :is-open="isSectionOpen('typography')"
      @toggle="toggleSection('typography')"
      is-last
    >
      <div class="space-y-4">
        <PropertyField label="Header Font">
          <PropertyRow>
            <FontPicker
              :model-value="calendarMetadata.headerFontFamily ?? 'Outfit'"
              @update:modelValue="(v) => updateCalendarMetadata((draft) => { draft.headerFontFamily = v })"
            />
            <input
              type="number"
              min="8"
              max="96"
              class="control-glass text-xs"
              :value="calendarMetadata.headerFontSize ?? 24"
              @change="updateCalendarMetadata((draft) => { draft.headerFontSize = Math.max(8, Math.min(96, Number(($event.target as HTMLInputElement).value) || 24)) })"
            />
          </PropertyRow>
        </PropertyField>

        <PropertyField label="Weekday Font" class="pt-4 border-t border-white/5">
          <PropertyRow>
            <FontPicker
              :model-value="calendarMetadata.weekdayFontFamily ?? 'Inter'"
              @update:modelValue="(v) => updateCalendarMetadata((draft) => { draft.weekdayFontFamily = v })"
            />
            <input
              type="number"
              min="8"
              max="40"
              class="control-glass text-xs"
              :value="calendarMetadata.weekdayFontSize ?? 12"
              @change="updateCalendarMetadata((draft) => { draft.weekdayFontSize = Math.max(8, Math.min(40, Number(($event.target as HTMLInputElement).value) || 12)) })"
            />
          </PropertyRow>
          <div class="mt-2">
            <ColorPicker
              :model-value="calendarMetadata.weekdayTextColor ?? '#6b7280'"
              @update:modelValue="(c) => updateCalendarMetadata((draft) => { draft.weekdayTextColor = c })"
            />
          </div>
        </PropertyField>

        <PropertyField label="Day Number Font" class="pt-4 border-t border-white/5">
          <PropertyRow>
            <FontPicker
              :model-value="calendarMetadata.dayNumberFontFamily ?? 'Inter'"
              @update:modelValue="(v) => updateCalendarMetadata((draft) => { draft.dayNumberFontFamily = v })"
            />
            <input
              type="number"
              min="8"
              max="60"
              class="control-glass text-xs"
              :value="calendarMetadata.dayNumberFontSize ?? 16"
              @change="updateCalendarMetadata((draft) => { draft.dayNumberFontSize = Math.max(8, Math.min(60, Number(($event.target as HTMLInputElement).value) || 16)) })"
            />
          </PropertyRow>
        </PropertyField>
      </div>
    </PropertySection>
  </div>
</template>
