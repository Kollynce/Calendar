<script setup lang="ts">
import { computed } from 'vue'
import ColorPicker from '../ColorPicker.vue'
import AppSearchableSelect from '@/components/ui/AppSearchableSelect.vue'
import PropertySection from './PropertySection.vue'
import PropertyField from './PropertyField.vue'
import PropertyRow from './PropertyRow.vue'
import HeaderWeekdayToggles from './HeaderWeekdayToggles.vue'
import BackgroundBorderControls from './BackgroundBorderControls.vue'
import CornerRadiusField from './CornerRadiusField.vue'
import HolidayMarkerControls from './HolidayMarkerControls.vue'
import HolidayListControls from './HolidayListControls.vue'
import { usePropertySections } from './usePropertySections'
import { useHolidayMarkerOptions } from './useHolidayMarkerOptions'
import { localizationService } from '@/services/calendar/localization.service'
import { countries } from '@/data/countries'
import type { WeekStripMetadata } from '@/types'


interface Props {
  weekStripMetadata: WeekStripMetadata
  updateWeekStripMetadata: (updater: (draft: WeekStripMetadata) => void) => void
}

const props = defineProps<Props>()
const { toggleSection, isSectionOpen } = usePropertySections(['content'])
const { holidayMarkerOptions, isMarkerLocked } = useHolidayMarkerOptions()

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

      <div class="pt-4 border-t border-white/5 space-y-3">
        <span class="text-[10px] font-medium text-white/40 uppercase">Header & Labels</span>
        <HeaderWeekdayToggles
          :show-header="weekStripMetadata.showHeader !== false"
          :show-weekdays="weekStripMetadata.showWeekdays !== false"
          @update:showHeader="(value) => updateWeekStripMetadata((draft) => { draft.showHeader = value })"
          @update:showWeekdays="(value) => updateWeekStripMetadata((draft) => { draft.showWeekdays = value })"
        />

        <PropertyField
          v-if="weekStripMetadata.showHeader !== false"
          label="Label Override"
        >
          <input
            type="text"
            placeholder="(Optional)"
            class="control-glass text-xs"
            :value="weekStripMetadata.label ?? ''"
            @input="updateWeekStripMetadata((draft) => { draft.label = ($event.target as HTMLInputElement).value || undefined })"
          />
        </PropertyField>
      </div>
    </PropertySection>

    <!-- Appearance Section -->
    <PropertySection 
      title="Appearance" 
      :is-open="isSectionOpen('appearance')"
      @toggle="toggleSection('appearance')"
    >
      <BackgroundBorderControls
        :show-background="weekStripMetadata.showBackground ?? true"
        :show-border="weekStripMetadata.showBorder ?? true"
        :background-color="weekStripMetadata.backgroundColor ?? '#ffffff'"
        :border-color="weekStripMetadata.borderColor ?? '#e5e7eb'"
        @update:showBackground="(value) => updateWeekStripMetadata((draft) => { draft.showBackground = value })"
        @update:showBorder="(value) => updateWeekStripMetadata((draft) => { draft.showBorder = value })"
        @update:backgroundColor="(value) => updateWeekStripMetadata((draft) => { draft.backgroundColor = value })"
        @update:borderColor="(value) => updateWeekStripMetadata((draft) => { draft.borderColor = value })"
      />

      <PropertyRow>
        <CornerRadiusField
          :model-value="weekStripMetadata.cornerRadius ?? 24"
          @update:modelValue="(value) => updateWeekStripMetadata((draft) => { draft.cornerRadius = value })"
        />
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
      <HolidayMarkerControls
        :show-markers="weekStripMetadata.showHolidayMarkers ?? true"
        :marker-style="weekStripMetadata.holidayMarkerStyle ?? 'text'"
        :marker-color="weekStripMetadata.holidayMarkerColor ?? '#ef4444'"
        :marker-height="weekStripMetadata.holidayMarkerHeight ?? 4"
        :options="holidayMarkerOptions"
        :is-marker-locked="isMarkerLocked"
        @update:showMarkers="(value) => updateWeekStripMetadata((draft) => { draft.showHolidayMarkers = value })"
        @update:markerStyle="(value) => updateWeekStripMetadata((draft) => { draft.holidayMarkerStyle = value as any })"
        @update:markerColor="(value) => updateWeekStripMetadata((draft) => { draft.holidayMarkerColor = value })"
        @update:markerHeight="(value) => updateWeekStripMetadata((draft) => { draft.holidayMarkerHeight = value })"
      />

      <HolidayListControls
        :show-list="weekStripMetadata.showHolidayList !== false"
        :list-title="weekStripMetadata.holidayListTitle ?? 'Holidays'"
        :max-items="weekStripMetadata.holidayListMaxItems ?? 4"
        :list-height="weekStripMetadata.holidayListHeight ?? 96"
        @update:showList="(value) => updateWeekStripMetadata((draft) => { draft.showHolidayList = value })"
        @update:listTitle="(value) => updateWeekStripMetadata((draft) => { draft.holidayListTitle = value })"
        @update:maxItems="(value) => updateWeekStripMetadata((draft) => { draft.holidayListMaxItems = value })"
        @update:listHeight="(value) => updateWeekStripMetadata((draft) => { draft.holidayListHeight = value })"
      />
    </PropertySection>
  </div>
</template>
