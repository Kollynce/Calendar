<script setup lang="ts">
import { computed } from 'vue'
import ColorPicker from '../ColorPicker.vue'
import AppSearchableSelect from '@/components/ui/AppSearchableSelect.vue'
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
  <div class="pt-4 border-t border-white/10 space-y-4">
    <p class="text-xs font-semibold uppercase tracking-widest text-white/60">Date Cell</p>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="text-xs font-medium text-white/60 mb-1.5 block">Date</label>
        <input
          type="date"
          class="control-glass"
          :value="dateCellDateValue"
          @change="updateDateCellMetadata((draft) => { const v = ($event.target as HTMLInputElement).value; if (v) draft.date = v })"
        />
      </div>
      <div>
        <label class="text-xs font-medium text-white/60 mb-1.5 block">Accent</label>
        <ColorPicker
          :model-value="dateCellMetadata.highlightAccent"
          @update:modelValue="(c) => updateDateCellMetadata((draft) => { draft.highlightAccent = c })"
        />
      </div>
    </div>

    <div>
      <label class="text-xs font-medium text-white/60 mb-1.5 block">Country</label>
      <AppSearchableSelect
        :model-value="dateCellMetadata.country ?? 'US'"
        :options="countryOptions"
        placeholder="Select country..."
        @update:model-value="(val: string | number | null) => updateDateCellMetadata((draft) => { draft.country = val as any })"
      />
    </div>

    <div>
      <label class="text-xs font-medium text-white/60 mb-1.5 block">Language</label>
      <AppSearchableSelect
        :model-value="dateCellMetadata.language ?? 'en'"
        :options="languageOptions"
        placeholder="Select language..."
        @update:model-value="(val: string | number | null) => updateDateCellMetadata((draft) => { draft.language = val as any })"
      />
    </div>

    <div>
      <label class="text-xs font-medium text-white/60 mb-1.5 block">Placeholder</label>
      <input
        type="text"
        class="control-glass"
        :value="dateCellMetadata.notePlaceholder"
        @input="updateDateCellMetadata((draft) => { draft.notePlaceholder = ($event.target as HTMLInputElement).value })"
      />
    </div>

    <div>
      <label class="text-xs font-medium text-white/60 mb-1.5 block">Accent height</label>
      <div class="flex items-center gap-3">
        <input
          type="range"
          min="0.1"
          max="0.8"
          step="0.01"
          class="flex-1 accent-primary-400"
          :value="dateCellMetadata.accentHeightRatio ?? 0.4"
          @input="updateDateCellMetadata((draft) => { draft.accentHeightRatio = Number(($event.target as HTMLInputElement).value) })"
        />
        <span class="text-xs text-white/70 w-12 text-right">{{ Math.round(((dateCellMetadata.accentHeightRatio ?? 0.4) as number) * 100) }}%</span>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="text-xs font-medium text-white/60 mb-1.5 block">Background</label>
        <ColorPicker
          :model-value="dateCellMetadata.backgroundColor ?? '#ffffff'"
          @update:modelValue="(c) => updateDateCellMetadata((draft) => { draft.backgroundColor = c })"
        />
      </div>
      <div>
        <label class="text-xs font-medium text-white/60 mb-1.5 block">Border</label>
        <ColorPicker
          :model-value="dateCellMetadata.borderColor ?? '#e2e8f0'"
          @update:modelValue="(c) => updateDateCellMetadata((draft) => { draft.borderColor = c })"
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
          :value="dateCellMetadata.cornerRadius ?? 24"
          @change="updateDateCellMetadata((draft) => { draft.cornerRadius = Math.max(0, Math.min(80, Number(($event.target as HTMLInputElement).value) || 0)) })"
        />
      </div>
      <div>
        <label class="text-xs font-medium text-white/60 mb-1.5 block">Border Width</label>
        <input
          type="number"
          min="0"
          max="10"
          class="control-glass"
          :value="dateCellMetadata.borderWidth ?? 1"
          @change="updateDateCellMetadata((draft) => { draft.borderWidth = Math.max(0, Math.min(10, Number(($event.target as HTMLInputElement).value) || 0)) })"
        />
      </div>
    </div>

    <div class="grid grid-cols-3 gap-3">
      <div>
        <label class="text-xs font-medium text-white/60 mb-1.5 block">Weekday</label>
        <ColorPicker
          :model-value="dateCellMetadata.weekdayColor ?? '#78350f'"
          @update:modelValue="(c) => updateDateCellMetadata((draft) => { draft.weekdayColor = c })"
        />
      </div>
      <div>
        <label class="text-xs font-medium text-white/60 mb-1.5 block">Number</label>
        <ColorPicker
          :model-value="dateCellMetadata.dayNumberColor ?? '#92400e'"
          @update:modelValue="(c) => updateDateCellMetadata((draft) => { draft.dayNumberColor = c })"
        />
      </div>
      <div>
        <label class="text-xs font-medium text-white/60 mb-1.5 block">Text</label>
        <ColorPicker
          :model-value="dateCellMetadata.placeholderColor ?? '#475569'"
          @update:modelValue="(c) => updateDateCellMetadata((draft) => { draft.placeholderColor = c })"
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
            :checked="dateCellMetadata.showHolidayMarkers ?? true"
            @change="updateDateCellMetadata((draft) => { draft.showHolidayMarkers = ($event.target as HTMLInputElement).checked })"
          >
          <span>Show</span>
        </label>
      </div>

      <div v-if="dateCellMetadata.showHolidayMarkers !== false" class="space-y-3">
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="text-xs font-medium text-white/60">Marker Style</label>
            <div v-if="isMarkerLocked(holidayMarkerOptions.find(o => o.value === dateCellMetadata.holidayMarkerStyle))" class="flex items-center gap-1">
              <AppTierBadge tier="pro" size="sm" />
            </div>
          </div>
          <select
            class="control-glass"
            :value="dateCellMetadata.holidayMarkerStyle ?? 'text'"
            @change="updateDateCellMetadata((draft) => { 
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
              :model-value="dateCellMetadata.holidayMarkerColor ?? '#ef4444'"
              @update:modelValue="(c) => updateDateCellMetadata((draft) => { draft.holidayMarkerColor = c })"
            />
          </div>
          <div v-if="!['background', 'text'].includes(dateCellMetadata.holidayMarkerStyle ?? 'text')">
            <label class="text-xs font-medium text-white/60 mb-1.5 block">{{ (dateCellMetadata.holidayMarkerStyle === 'dot' || dateCellMetadata.holidayMarkerStyle === 'square' || dateCellMetadata.holidayMarkerStyle === 'triangle') ? 'Size' : (dateCellMetadata.holidayMarkerStyle === 'border' ? 'Width' : 'Height') }}</label>
            <input
              type="number"
              min="1"
              max="20"
              class="control-glass"
              :value="dateCellMetadata.holidayMarkerHeight ?? 4"
              @change="updateDateCellMetadata((draft) => { draft.holidayMarkerHeight = Math.max(1, Math.min(20, Number(($event.target as HTMLInputElement).value) || 4)) })"
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
              :checked="dateCellMetadata.showHolidayInfo !== false"
              @change="updateDateCellMetadata((draft) => { draft.showHolidayInfo = ($event.target as HTMLInputElement).checked })"
            >
            <span>Show holiday info</span>
          </label>
          <span class="text-[11px] text-white/50">If date is a holiday</span>
        </div>

        <template v-if="dateCellMetadata.showHolidayInfo !== false">
          <div>
            <label class="text-xs font-medium text-white/60 mb-1.5 block">Info position</label>
            <select
              class="control-glass"
              :value="dateCellMetadata.holidayInfoPosition ?? 'bottom'"
              @change="updateDateCellMetadata((draft) => { draft.holidayInfoPosition = ($event.target as HTMLSelectElement).value as any })"
            >
              <option value="top">Top</option>
              <option value="bottom">Bottom</option>
              <option value="overlay">Overlay</option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs font-medium text-white/60 mb-1.5 block">Text color</label>
              <ColorPicker
                :model-value="dateCellMetadata.holidayInfoTextColor ?? '#4b5563'"
                @update:modelValue="(c) => updateDateCellMetadata((draft) => { draft.holidayInfoTextColor = c })"
              />
            </div>
            <div>
              <label class="text-xs font-medium text-white/60 mb-1.5 block">Accent color</label>
              <ColorPicker
                :model-value="dateCellMetadata.holidayInfoAccentColor ?? dateCellMetadata.holidayMarkerColor ?? '#ef4444'"
                @update:modelValue="(c) => updateDateCellMetadata((draft) => { draft.holidayInfoAccentColor = c })"
              />
            </div>
          </div>

          <div>
            <label class="text-xs font-medium text-white/60 mb-1.5 block">Font size</label>
            <input
              type="number"
              min="8"
              max="24"
              class="control-glass"
              :value="dateCellMetadata.holidayInfoFontSize ?? 12"
              @change="updateDateCellMetadata((draft) => { draft.holidayInfoFontSize = Math.max(8, Math.min(24, Number(($event.target as HTMLInputElement).value) || 12)) })"
            />
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
