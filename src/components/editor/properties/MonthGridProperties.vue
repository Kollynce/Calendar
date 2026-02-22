<script setup lang="ts">
import { computed, ref } from 'vue'
import ColorPicker from '../ColorPicker.vue'
import FontPicker from '../FontPicker.vue'
import AppSearchableSelect from '@/components/ui/AppSearchableSelect.vue'
import PropertySection from './PropertySection.vue'
import PropertyField from './PropertyField.vue'
import PropertyRow from './PropertyRow.vue'
import HeaderWeekdayToggles from './HeaderWeekdayToggles.vue'
import BackgroundBorderControls from './BackgroundBorderControls.vue'
import CornerRadiusField from './CornerRadiusField.vue'
import HolidayMarkerControls from './HolidayMarkerControls.vue'
import HolidayListControls from './HolidayListControls.vue'
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
      <HeaderWeekdayToggles
        :show-header="calendarMetadata.showHeader"
        :show-weekdays="calendarMetadata.showWeekdays"
        @update:showHeader="(value) => updateCalendarMetadata((draft) => { draft.showHeader = value })"
        @update:showWeekdays="(value) => updateCalendarMetadata((draft) => { draft.showWeekdays = value })"
      />

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
      <BackgroundBorderControls
        :show-background="calendarMetadata.showBackground ?? true"
        :show-border="calendarMetadata.showBorder ?? true"
        :background-color="calendarMetadata.backgroundColor ?? '#ffffff'"
        :border-color="calendarMetadata.borderColor ?? '#e5e7eb'"
        @update:showBackground="(value) => updateCalendarMetadata((draft) => { draft.showBackground = value })"
        @update:showBorder="(value) => updateCalendarMetadata((draft) => { draft.showBorder = value })"
        @update:backgroundColor="(value) => updateCalendarMetadata((draft) => { draft.backgroundColor = value })"
        @update:borderColor="(value) => updateCalendarMetadata((draft) => { draft.borderColor = value })"
      />

      <PropertyRow>
        <CornerRadiusField
          :model-value="calendarMetadata.cornerRadius ?? 26"
          @update:modelValue="(value) => updateCalendarMetadata((draft) => { draft.cornerRadius = value })"
        />
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
      <HolidayMarkerControls
        :show-markers="calendarMetadata.showHolidayMarkers ?? true"
        :marker-style="calendarMetadata.holidayMarkerStyle ?? 'text'"
        :marker-color="calendarMetadata.holidayMarkerColor ?? '#ef4444'"
        :marker-height="calendarMetadata.holidayMarkerHeight ?? 4"
        :options="holidayMarkerOptions"
        :is-marker-locked="isMarkerLocked"
        @update:showMarkers="(value) => updateCalendarMetadata((draft) => { draft.showHolidayMarkers = value })"
        @update:markerStyle="(value) => updateCalendarMetadata((draft) => { draft.holidayMarkerStyle = value as any })"
        @update:markerColor="(value) => updateCalendarMetadata((draft) => { draft.holidayMarkerColor = value })"
        @update:markerHeight="(value) => updateCalendarMetadata((draft) => { draft.holidayMarkerHeight = value })"
      />

      <HolidayListControls
        :show-list="calendarMetadata.showHolidayList !== false"
        :list-title="calendarMetadata.holidayListTitle ?? 'Holidays'"
        :max-items="calendarMetadata.holidayListMaxItems ?? 4"
        :list-height="calendarMetadata.holidayListHeight ?? 96"
        @update:showList="(value) => updateCalendarMetadata((draft) => { draft.showHolidayList = value })"
        @update:listTitle="(value) => updateCalendarMetadata((draft) => { draft.holidayListTitle = value })"
        @update:maxItems="(value) => updateCalendarMetadata((draft) => { draft.holidayListMaxItems = value })"
        @update:listHeight="(value) => updateCalendarMetadata((draft) => { draft.holidayListHeight = value })"
      />
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
