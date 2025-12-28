<script setup lang="ts">
import { computed } from 'vue'
import ColorPicker from '../ColorPicker.vue'
import FontPicker from '../FontPicker.vue'
import AppSearchableSelect from '@/components/ui/AppSearchableSelect.vue'
import { localizationService } from '@/services/calendar/localization.service'
import { countries } from '@/data/countries'
import type { CalendarGridMetadata } from '@/types'

import AppTierBadge from '@/components/ui/AppTierBadge.vue'
import { useAuthStore } from '@/stores'

interface Props {
  calendarMetadata: CalendarGridMetadata
  updateCalendarMetadata: (updater: (draft: CalendarGridMetadata) => void) => void
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
  <div class="pt-4 border-t border-white/10 space-y-4">
    <div class="flex items-center justify-between">
      <p class="text-xs font-semibold uppercase tracking-widest text-white/60">Month Grid</p>
      <select
        class="control-glass-sm"
        :value="calendarMetadata.mode"
        @change="updateCalendarMetadata((draft) => { draft.mode = ($event.target as HTMLSelectElement).value as CalendarGridMetadata['mode'] })"
      >
        <option value="month">Actual Month</option>
        <option value="blank">Blank Grid</option>
      </select>
    </div>

    <div>
      <label class="text-xs font-medium text-white/60 mb-1.5 block">Date</label>
      <input
        type="date"
        class="control-glass"
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
      <label class="text-xs font-medium text-white/60 mb-1.5 block">Country</label>
      <AppSearchableSelect
        :model-value="calendarMetadata.country ?? 'US'"
        :options="countryOptions"
        placeholder="Select country..."
        @update:model-value="(val: string | number | null) => updateCalendarMetadata((draft) => { draft.country = val as any })"
      />
    </div>

    <div>
      <label class="text-xs font-medium text-white/60 mb-1.5 block">Language</label>
      <AppSearchableSelect
        :model-value="calendarMetadata.language ?? 'en'"
        :options="languageOptions"
        placeholder="Select language..."
        @update:model-value="(val: string | number | null) => updateCalendarMetadata((draft) => { draft.language = val as any })"
      />
    </div>

    <div>
      <label class="text-xs font-medium text-white/60 mb-1.5 block">Week starts on</label>
      <select
        class="control-glass"
        :value="calendarMetadata.startDay"
        @change="updateCalendarMetadata((draft) => { draft.startDay = Number(($event.target as HTMLSelectElement).value) as CalendarGridMetadata['startDay'] })"
      >
        <option v-for="d in weekStartOptions" :key="d.value" :value="d.value">{{ d.label }}</option>
      </select>
    </div>

    <div class="flex items-center justify-between gap-4">
      <label class="flex items-center gap-2 text-sm text-white/80">
        <input
          type="checkbox"
          class="accent-primary-400"
          :checked="calendarMetadata.showHeader"
          @change="updateCalendarMetadata((draft) => { draft.showHeader = ($event.target as HTMLInputElement).checked })"
        >
        <span>Header</span>
      </label>
      <label class="flex items-center gap-2 text-sm text-white/80">
        <input
          type="checkbox"
          class="accent-primary-400"
          :checked="calendarMetadata.showWeekdays"
          @change="updateCalendarMetadata((draft) => { draft.showWeekdays = ($event.target as HTMLInputElement).checked })"
        >
        <span>Weekdays</span>
      </label>
    </div>

    <div>
      <label class="text-xs font-medium text-white/60 mb-1.5 block">Title override</label>
      <input
        type="text"
        placeholder="(optional)"
        class="control-glass"
        :value="calendarMetadata.title ?? ''"
        @input="updateCalendarMetadata((draft) => { draft.title = ($event.target as HTMLInputElement).value || undefined })"
      />
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="text-xs font-medium text-white/60 mb-1.5 block">Background</label>
        <ColorPicker
          :model-value="calendarMetadata.backgroundColor ?? '#ffffff'"
          @update:modelValue="(c) => updateCalendarMetadata((draft) => { draft.backgroundColor = c })"
        />
      </div>
      <div>
        <label class="text-xs font-medium text-white/60 mb-1.5 block">Border</label>
        <ColorPicker
          :model-value="calendarMetadata.borderColor ?? '#e5e7eb'"
          @update:modelValue="(c) => updateCalendarMetadata((draft) => { draft.borderColor = c })"
        />
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="text-xs font-medium text-white/60 mb-1.5 block">Radius</label>
        <input
          type="number"
          min="0"
          max="80"
          class="control-glass"
          :value="calendarMetadata.cornerRadius ?? 26"
          @change="updateCalendarMetadata((draft) => { draft.cornerRadius = Math.max(0, Math.min(80, Number(($event.target as HTMLInputElement).value) || 0)) })"
        />
      </div>
      <div>
        <label class="text-xs font-medium text-white/60 mb-1.5 block">Border Width</label>
        <input
          type="number"
          min="0"
          max="10"
          class="control-glass"
          :value="calendarMetadata.borderWidth ?? 1"
          @change="updateCalendarMetadata((draft) => { draft.borderWidth = Math.max(0, Math.min(10, Number(($event.target as HTMLInputElement).value) || 0)) })"
        />
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="text-xs font-medium text-white/60 mb-1.5 block">Header bg</label>
        <ColorPicker
          :model-value="calendarMetadata.headerBackgroundColor ?? '#111827'"
          @update:modelValue="(c) => updateCalendarMetadata((draft) => { draft.headerBackgroundColor = c })"
        />
      </div>
      <div>
        <label class="text-xs font-medium text-white/60 mb-1.5 block">Header text</label>
        <ColorPicker
          :model-value="calendarMetadata.headerTextColor ?? '#ffffff'"
          @update:modelValue="(c) => updateCalendarMetadata((draft) => { draft.headerTextColor = c })"
        />
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="text-xs font-medium text-white/60 mb-1.5 block">Grid lines</label>
        <ColorPicker
          :model-value="calendarMetadata.gridLineColor ?? '#e5e7eb'"
          @update:modelValue="(c) => updateCalendarMetadata((draft) => { draft.gridLineColor = c })"
        />
      </div>
      <div>
        <label class="text-xs font-medium text-white/60 mb-1.5 block">Line width</label>
        <input
          type="number"
          min="0"
          max="6"
          class="control-glass"
          :value="calendarMetadata.gridLineWidth ?? 1"
          @change="updateCalendarMetadata((draft) => { draft.gridLineWidth = Math.max(0, Math.min(6, Number(($event.target as HTMLInputElement).value) || 0)) })"
        />
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="text-xs font-medium text-white/60 mb-1.5 block">Day color</label>
        <ColorPicker
          :model-value="calendarMetadata.dayNumberColor ?? '#1f2937'"
          @update:modelValue="(c) => updateCalendarMetadata((draft) => { draft.dayNumberColor = c })"
        />
      </div>
      <div>
        <label class="text-xs font-medium text-white/60 mb-1.5 block">Muted</label>
        <ColorPicker
          :model-value="calendarMetadata.dayNumberMutedColor ?? '#9ca3af'"
          @update:modelValue="(c) => updateCalendarMetadata((draft) => { draft.dayNumberMutedColor = c })"
        />
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="text-xs font-medium text-white/60 mb-1.5 block">Weekend bg</label>
        <ColorPicker
          :model-value="calendarMetadata.weekendBackgroundColor ?? 'rgba(0,0,0,0)'"
          @update:modelValue="(c) => updateCalendarMetadata((draft) => { draft.weekendBackgroundColor = c })"
        />
      </div>
      <div>
        <label class="text-xs font-medium text-white/60 mb-1.5 block">Today bg</label>
        <ColorPicker
          :model-value="calendarMetadata.todayBackgroundColor ?? 'rgba(0,0,0,0)'"
          @update:modelValue="(c) => updateCalendarMetadata((draft) => { draft.todayBackgroundColor = c })"
        />
      </div>
    </div>

    <div class="pt-3 border-t border-white/10 space-y-3">
      <p class="text-[11px] font-semibold text-white/60">Layout</p>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Header height</label>
          <input
            type="number"
            min="0"
            max="200"
            class="control-glass"
            :value="calendarMetadata.headerHeight ?? 60"
            @change="updateCalendarMetadata((draft) => { draft.headerHeight = Math.max(0, Math.min(200, Number(($event.target as HTMLInputElement).value) || 0)) })"
          />
        </div>
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Weekday height</label>
          <input
            type="number"
            min="0"
            max="120"
            class="control-glass"
            :value="calendarMetadata.weekdayHeight ?? 36"
            @change="updateCalendarMetadata((draft) => { draft.weekdayHeight = Math.max(0, Math.min(120, Number(($event.target as HTMLInputElement).value) || 0)) })"
          />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Cell gap</label>
          <input
            type="number"
            min="0"
            max="30"
            class="control-glass"
            :value="calendarMetadata.cellGap ?? 0"
            @change="updateCalendarMetadata((draft) => { draft.cellGap = Math.max(0, Math.min(30, Number(($event.target as HTMLInputElement).value) || 0)) })"
          />
        </div>
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Grid line width</label>
          <input
            type="number"
            min="0"
            max="6"
            class="control-glass"
            :value="calendarMetadata.gridLineWidth ?? 1"
            @change="updateCalendarMetadata((draft) => { draft.gridLineWidth = Math.max(0, Math.min(6, Number(($event.target as HTMLInputElement).value) || 0)) })"
          />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Day padding X</label>
          <input
            type="number"
            min="0"
            max="60"
            class="control-glass"
            :value="calendarMetadata.dayNumberInsetX ?? 12"
            @change="updateCalendarMetadata((draft) => { draft.dayNumberInsetX = Math.max(0, Math.min(60, Number(($event.target as HTMLInputElement).value) || 0)) })"
          />
        </div>
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Day padding Y</label>
          <input
            type="number"
            min="0"
            max="60"
            class="control-glass"
            :value="calendarMetadata.dayNumberInsetY ?? 8"
            @change="updateCalendarMetadata((draft) => { draft.dayNumberInsetY = Math.max(0, Math.min(60, Number(($event.target as HTMLInputElement).value) || 0)) })"
          />
        </div>
      </div>
    </div>

    <div class="pt-3 border-t border-white/10 space-y-4">
      <div class="flex items-center justify-between">
        <p class="text-[11px] font-semibold text-white/60">Holidays</p>
        <label class="flex items-center gap-2 text-sm text-white/80">
          <input
            type="checkbox"
            class="accent-primary-400"
            :checked="calendarMetadata.showHolidayMarkers ?? true"
            @change="updateCalendarMetadata((draft) => { draft.showHolidayMarkers = ($event.target as HTMLInputElement).checked })"
          >
          <span>Show</span>
        </label>
      </div>

      <div v-if="calendarMetadata.showHolidayMarkers !== false" class="space-y-3">
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="text-xs font-medium text-white/60">Marker Style</label>
            <div v-if="isMarkerLocked(holidayMarkerOptions.find(o => o.value === calendarMetadata.holidayMarkerStyle))" class="flex items-center gap-1">
              <AppTierBadge tier="pro" size="sm" />
            </div>
          </div>
          <select
            class="control-glass"
            :value="calendarMetadata.holidayMarkerStyle ?? 'text'"
            @change="updateCalendarMetadata((draft) => { 
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
              :model-value="calendarMetadata.holidayMarkerColor ?? '#ef4444'"
              @update:modelValue="(c) => updateCalendarMetadata((draft) => { draft.holidayMarkerColor = c })"
            />
          </div>
          <div v-if="!['background', 'text'].includes(calendarMetadata.holidayMarkerStyle ?? 'text')">
            <label class="text-xs font-medium text-white/60 mb-1.5 block">{{ (calendarMetadata.holidayMarkerStyle === 'dot' || calendarMetadata.holidayMarkerStyle === 'square' || calendarMetadata.holidayMarkerStyle === 'triangle') ? 'Size' : (calendarMetadata.holidayMarkerStyle === 'border' ? 'Width' : 'Height') }}</label>
            <input
              type="number"
              min="1"
              max="20"
              class="control-glass"
              :value="calendarMetadata.holidayMarkerHeight ?? 4"
              @change="updateCalendarMetadata((draft) => { draft.holidayMarkerHeight = Math.max(1, Math.min(20, Number(($event.target as HTMLInputElement).value) || 4)) })"
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
              :checked="calendarMetadata.showHolidayList !== false"
              @change="updateCalendarMetadata((draft) => { draft.showHolidayList = ($event.target as HTMLInputElement).checked })"
            >
            <span>Show holiday list</span>
          </label>
          <span class="text-[11px] text-white/50">Uses space below grid</span>
        </div>

        <template v-if="calendarMetadata.showHolidayList !== false">
          <div>
            <label class="text-xs font-medium text-white/60 mb-1.5 block">List title</label>
            <input
              type="text"
              class="control-glass"
              :value="calendarMetadata.holidayListTitle ?? 'Holidays'"
              @input="updateCalendarMetadata((draft) => { draft.holidayListTitle = ($event.target as HTMLInputElement).value })"
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
                :value="calendarMetadata.holidayListMaxItems ?? 4"
                @change="updateCalendarMetadata((draft) => { draft.holidayListMaxItems = Math.max(1, Math.min(8, Number(($event.target as HTMLInputElement).value) || 4)) })"
              />
            </div>
            <div>
              <label class="text-xs font-medium text-white/60 mb-1.5 block">List height</label>
              <input
                type="number"
                min="40"
                max="220"
                class="control-glass"
                :value="calendarMetadata.holidayListHeight ?? 96"
                @change="updateCalendarMetadata((draft) => { draft.holidayListHeight = Math.max(40, Math.min(220, Number(($event.target as HTMLInputElement).value) || 96)) })"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs font-medium text-white/60 mb-1.5 block">Text color</label>
              <ColorPicker
                :model-value="calendarMetadata.holidayListTextColor ?? '#4b5563'"
                @update:modelValue="(c) => updateCalendarMetadata((draft) => { draft.holidayListTextColor = c })"
              />
            </div>
            <div>
              <label class="text-xs font-medium text-white/60 mb-1.5 block">Accent color</label>
              <ColorPicker
                :model-value="calendarMetadata.holidayListAccentColor ?? calendarMetadata.holidayMarkerColor ?? '#ef4444'"
                @update:modelValue="(c) => updateCalendarMetadata((draft) => { draft.holidayListAccentColor = c })"
              />
            </div>
          </div>
        </template>
      </div>
    </div>

    <div class="pt-3 border-t border-white/10 space-y-3">
      <p class="text-[11px] font-semibold text-white/60">Typography</p>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Header font</label>
          <FontPicker
            :model-value="calendarMetadata.headerFontFamily ?? 'Outfit'"
            @update:modelValue="(v) => updateCalendarMetadata((draft) => { draft.headerFontFamily = v })"
          />
        </div>
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Header size</label>
          <input
            type="number"
            min="8"
            max="96"
            class="control-glass"
            :value="calendarMetadata.headerFontSize ?? 24"
            @change="updateCalendarMetadata((draft) => { draft.headerFontSize = Math.max(8, Math.min(96, Number(($event.target as HTMLInputElement).value) || 24)) })"
          />
        </div>
      </div>

      <div>
        <label class="text-xs font-medium text-white/60 mb-1.5 block">Header weight</label>
        <input
          type="text"
          class="control-glass"
          :value="String(calendarMetadata.headerFontWeight ?? 600)"
          @input="updateCalendarMetadata((draft) => { const v = (($event.target as HTMLInputElement).value || '').trim(); draft.headerFontWeight = /^\d+$/.test(v) ? Number(v) : (v || 600) })"
        />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Weekday font</label>
          <FontPicker
            :model-value="calendarMetadata.weekdayFontFamily ?? 'Inter'"
            @update:modelValue="(v) => updateCalendarMetadata((draft) => { draft.weekdayFontFamily = v })"
          />
        </div>
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Weekday size</label>
          <input
            type="number"
            min="8"
            max="40"
            class="control-glass"
            :value="calendarMetadata.weekdayFontSize ?? 12"
            @change="updateCalendarMetadata((draft) => { draft.weekdayFontSize = Math.max(8, Math.min(40, Number(($event.target as HTMLInputElement).value) || 12)) })"
          />
        </div>
      </div>

      <div>
        <label class="text-xs font-medium text-white/60 mb-1.5 block">Weekday weight</label>
        <input
          type="text"
          class="control-glass"
          :value="String(calendarMetadata.weekdayFontWeight ?? 600)"
          @input="updateCalendarMetadata((draft) => { const v = (($event.target as HTMLInputElement).value || '').trim(); draft.weekdayFontWeight = /^\d+$/.test(v) ? Number(v) : (v || 600) })"
        />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Day font</label>
          <FontPicker
            :model-value="calendarMetadata.dayNumberFontFamily ?? 'Inter'"
            @update:modelValue="(v) => updateCalendarMetadata((draft) => { draft.dayNumberFontFamily = v })"
          />
        </div>
        <div>
          <label class="text-xs font-medium text-white/60 mb-1.5 block">Day size</label>
          <input
            type="number"
            min="8"
            max="60"
            class="control-glass"
            :value="calendarMetadata.dayNumberFontSize ?? 16"
            @change="updateCalendarMetadata((draft) => { draft.dayNumberFontSize = Math.max(8, Math.min(60, Number(($event.target as HTMLInputElement).value) || 16)) })"
          />
        </div>
      </div>

      <div>
        <label class="text-xs font-medium text-white/60 mb-1.5 block">Day weight</label>
        <input
          type="text"
          class="control-glass"
          :value="String(calendarMetadata.dayNumberFontWeight ?? 600)"
          @input="updateCalendarMetadata((draft) => { const v = (($event.target as HTMLInputElement).value || '').trim(); draft.dayNumberFontWeight = /^\d+$/.test(v) ? Number(v) : (v || 600) })"
        />
      </div>
    </div>
  </div>
</template>
