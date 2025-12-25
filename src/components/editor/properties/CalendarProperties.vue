<script setup lang="ts">
import { computed } from 'vue'
import ColorPicker from '../ColorPicker.vue'
import AppSearchableSelect from '@/components/ui/AppSearchableSelect.vue'
import { localizationService } from '@/services/calendar/localization.service'
import { countries } from '@/data/countries'
import type { CalendarGridMetadata } from '@/types'

interface Props {
  calendarMetadata: CalendarGridMetadata | null
  updateCalendarMetadata: (updater: (draft: CalendarGridMetadata) => void) => void
}

const props = defineProps<Props>()

const weekStartOptions = [
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
    name: `${l.name} (${l.nativeName})`
  }))
)

const countryOptions = computed(() =>
  countries.map(c => ({
    id: c.code,
    name: `${c.flag} ${c.name}`
  }))
)
</script>

<template>
  <div class="space-y-4 border border-gray-200 dark:border-gray-700 rounded-2xl p-4" v-if="calendarMetadata">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-xs font-semibold text-gray-500 uppercase tracking-widest">Calendar</p>
        <p class="text-sm text-gray-700 dark:text-gray-100">Month Grid</p>
      </div>
      <select
        class="select-sm w-auto"
        :value="calendarMetadata.mode"
        @change="updateCalendarMetadata((draft) => { draft.mode = ($event.target as HTMLSelectElement).value as CalendarGridMetadata['mode'] })"
      >
        <option value="month">Actual Month</option>
        <option value="blank">Blank Grid</option>
      </select>
    </div>
    
    <div>
      <label class="block text-xs text-gray-500 mb-1">Date</label>
      <input
        type="date"
        class="input"
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
    </div>
    
    <div>
      <label class="block text-xs text-gray-500 mb-1">Week starts on</label>
      <select
        class="select"
        :value="calendarMetadata.startDay"
        @change="updateCalendarMetadata((draft) => { draft.startDay = Number(($event.target as HTMLSelectElement).value) as CalendarGridMetadata['startDay'] })"
      >
        <option v-for="day in weekStartOptions" :key="day.value" :value="day.value">
          {{ day.label }}
        </option>
      </select>
    </div>
    
    <div>
      <label class="block text-xs text-gray-500 mb-1">Country</label>
      <AppSearchableSelect
        :model-value="calendarMetadata.country ?? 'US'"
        :options="countryOptions"
        placeholder="Select country..."
        @update:model-value="(val) => updateCalendarMetadata((draft) => { draft.country = val as any })"
      />
    </div>
    
    <div>
      <label class="block text-xs text-gray-500 mb-1">Language</label>
      <AppSearchableSelect
        :model-value="calendarMetadata.language ?? 'en'"
        :options="languageOptions"
        placeholder="Select language..."
        @update:model-value="(val) => updateCalendarMetadata((draft) => { draft.language = val as any })"
      />
    </div>
    
    <div class="flex items-center justify-between text-sm">
      <label class="flex items-center gap-2">
        <input
          type="checkbox"
          class="accent-primary-500"
          :checked="calendarMetadata.showHeader"
          @change="updateCalendarMetadata((draft) => { draft.showHeader = ($event.target as HTMLInputElement).checked })"
        >
        <span>Header</span>
      </label>
      <label class="flex items-center gap-2">
        <input
          type="checkbox"
          class="accent-primary-500"
          :checked="calendarMetadata.showWeekdays"
          @change="updateCalendarMetadata((draft) => { draft.showWeekdays = ($event.target as HTMLInputElement).checked })"
        >
        <span>Weekdays</span>
      </label>
    </div>

    <div>
      <label class="block text-xs text-gray-500 mb-1">Title override</label>
      <input
        type="text"
        class="input"
        placeholder="(optional)"
        :value="calendarMetadata.title"
        @input="updateCalendarMetadata((draft) => { draft.title = ($event.target as HTMLInputElement).value })"
      />
    </div>

    <div class="pt-3 border-t border-gray-100 dark:border-gray-700 space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-widest">Holidays</p>
          <p class="text-sm text-gray-600 dark:text-gray-300">Markers & List</p>
        </div>
        <label class="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
          <input
            type="checkbox"
            class="accent-primary-500"
            :checked="calendarMetadata.showHolidayMarkers ?? true"
            @change="updateCalendarMetadata((draft) => { draft.showHolidayMarkers = ($event.target as HTMLInputElement).checked })"
          >
          <span>Show</span>
        </label>
      </div>

      <div v-if="calendarMetadata.showHolidayMarkers !== false" class="space-y-3">
        <div>
          <label class="block text-xs text-gray-500 mb-1">Marker Style</label>
          <select
            class="select"
            :value="calendarMetadata.holidayMarkerStyle ?? 'text'"
            @change="updateCalendarMetadata((draft) => { draft.holidayMarkerStyle = ($event.target as HTMLSelectElement).value as any })"
          >
            <option value="bar">Bar (Bottom)</option>
            <option value="dot">Dot (Circle)</option>
            <option value="square">Square (Solid)</option>
            <option value="border">Border (Ring)</option>
            <option value="triangle">Corner (Triangle)</option>
            <option value="background">Background (Fill)</option>
            <option value="text">Text (Highlight)</option>
          </select>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs text-gray-500 mb-1">Color</label>
            <ColorPicker
              :model-value="calendarMetadata.holidayMarkerColor ?? '#ef4444'"
              @update:model-value="(color) => updateCalendarMetadata((draft) => { draft.holidayMarkerColor = color })"
            />
          </div>
          <div v-if="!['background', 'text'].includes(calendarMetadata.holidayMarkerStyle ?? 'text')">
            <label class="block text-xs text-gray-500 mb-1">{{ (calendarMetadata.holidayMarkerStyle === 'dot' || calendarMetadata.holidayMarkerStyle === 'square' || calendarMetadata.holidayMarkerStyle === 'triangle') ? 'Size' : (calendarMetadata.holidayMarkerStyle === 'border' ? 'Width' : 'Height') }}</label>
            <input
              type="number"
              min="1"
              max="20"
              class="input"
              :value="calendarMetadata.holidayMarkerHeight ?? 4"
              @change="updateCalendarMetadata((draft) => { draft.holidayMarkerHeight = Math.max(1, Math.min(20, Number(($event.target as HTMLInputElement).value) || 4)) })"
            />
          </div>
        </div>

        <!-- Holiday List Sub-section -->
        <div class="pt-3 border-t border-gray-100 dark:border-gray-700 space-y-3">
          <div class="flex items-center justify-between">
            <label class="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
              <input
                type="checkbox"
                class="accent-primary-500"
                :checked="calendarMetadata.showHolidayList !== false"
                @change="updateCalendarMetadata((draft) => { draft.showHolidayList = ($event.target as HTMLInputElement).checked })"
              >
              <span>Show List</span>
            </label>
            <span class="text-[11px] text-gray-500">Below grid</span>
          </div>

          <template v-if="calendarMetadata.showHolidayList !== false">
            <div>
              <label class="block text-xs text-gray-500 mb-1">List Title</label>
              <input
                type="text"
                class="input"
                :value="calendarMetadata.holidayListTitle ?? 'Holidays'"
                @input="updateCalendarMetadata((draft) => { draft.holidayListTitle = ($event.target as HTMLInputElement).value })"
              />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs text-gray-500 mb-1">Max Items</label>
                <input
                  type="number"
                  min="1"
                  max="8"
                  class="input"
                  :value="calendarMetadata.holidayListMaxItems ?? 4"
                  @change="updateCalendarMetadata((draft) => { draft.holidayListMaxItems = Math.max(1, Math.min(8, Number(($event.target as HTMLInputElement).value) || 4)) })"
                />
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">List Height</label>
                <input
                  type="number"
                  min="40"
                  max="220"
                  class="input"
                  :value="calendarMetadata.holidayListHeight ?? 96"
                  @change="updateCalendarMetadata((draft) => { draft.holidayListHeight = Math.max(40, Math.min(220, Number(($event.target as HTMLInputElement).value) || 96)) })"
                />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs text-gray-500 mb-1">Text Color</label>
                <ColorPicker
                  :model-value="calendarMetadata.holidayListTextColor ?? '#4b5563'"
                  @update:model-value="(color) => updateCalendarMetadata((draft) => { draft.holidayListTextColor = color })"
                />
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">Date Color</label>
                <ColorPicker
                  :model-value="calendarMetadata.holidayListAccentColor ?? calendarMetadata.holidayMarkerColor ?? '#ef4444'"
                  @update:model-value="(color) => updateCalendarMetadata((draft) => { draft.holidayListAccentColor = color })"
                />
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
