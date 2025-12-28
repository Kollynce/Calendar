<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useEditorStore } from '@/stores/editor.store'
import type { WeekDay } from '@/types'
import {
  PlusIcon,
  TrashIcon,
  SparklesIcon,
  GlobeAltIcon,
  LanguageIcon
} from '@heroicons/vue/24/outline'
import AppSearchableSelect from '@/components/ui/AppSearchableSelect.vue'
import { countries } from '@/data/countries'
import { localizationService } from '@/services/calendar/localization.service'
import { calendarGeneratorService } from '@/services/calendar/generator.service'
import { useCalendarStore } from '@/stores/calendar.store'

import AppTierBadge from '@/components/ui/AppTierBadge.vue'
import { useAuthStore } from '@/stores'

const emit = defineEmits<{
  (e: 'generate'): void
}>()

const editorStore = useEditorStore()
const calendarStore = useCalendarStore()
const authStore = useAuthStore()

const canAddMoreEvents = computed(() => {
  return customEvents.value.length < authStore.tierLimits.customHolidays
})

const holidayLimit = computed(() => authStore.tierLimits.customHolidays)

// Options for searchables
const countryOptions = computed(() => 
  countries.map(c => ({ id: c.code, name: c.name, icon: c.flag }))
)

const languageOptions = computed(() => 
  localizationService.getAvailableLanguages().map(l => ({ 
    id: l.code, 
    name: l.nativeName ? `${l.name} (${l.nativeName})` : l.name
  }))
)

// Calendar Configuration State
const calendarType = ref<'monthly' | 'quarterly' | 'yearly'>('monthly')
const year = ref(new Date().getFullYear())
const startingMonth = ref(new Date().getMonth() + 1)
const monthsPerPage = ref(1)
const weekStartsOn = ref<0 | 1>(0) // 0 = Sunday, 1 = Monday
const showWeekNumbers = ref(false)
const selectedCountry = computed({
  get: () => calendarStore.config.country,
  set: (val) => calendarStore.setCountry(val as any)
})

const selectedLanguage = computed({
  get: () => calendarStore.config.language,
  set: (val) => {
    // If holiday language was same as previous global language (or unset), update it too
    if (!calendarStore.config.holidayLanguage || calendarStore.config.holidayLanguage === calendarStore.config.language) {
      calendarStore.setHolidayLanguage(val as any)
    }
    calendarStore.setLanguage(val as any)
  }
})

const selectedHolidayLanguage = computed({
  get: () => calendarStore.config.holidayLanguage || calendarStore.config.language,
  set: (val) => calendarStore.setHolidayLanguage(val as any)
})

const showPublicHolidays = computed({
  get: () => calendarStore.config.showHolidays,
  set: (val) => calendarStore.toggleHolidays(val)
})

const highlightWeekends = ref(true)

// Custom Events
interface CustomEvent {
  id: string
  name: string
  date: string
  color: string
}
const customEvents = ref<CustomEvent[]>([])
const newEventName = ref('')
const newEventDate = ref('')
const newEventColor = ref('#6366f1')
const showAddEvent = ref(false)

// Calendar type options
const calendarTypes = [
  { id: 'monthly', name: 'Monthly', description: '1 month per page', icon: '📅' },
  { id: 'quarterly', name: 'Quarterly', description: '3 months per page', icon: '📊' },
  { id: 'yearly', name: 'Year Grid', description: '12 months overview', icon: '🗓️' }
]

const monthNames = computed(() =>
  calendarGeneratorService.getAllMonthNames(calendarStore.config.language, 'long'),
)

// Month options (localized)
const monthsList = computed(() =>
  monthNames.value.map((name, index) => ({
    value: index + 1,
    name: name || `Month ${index + 1}`,
  })),
)

// Countries list is now imported from data/countries

// Months per page options based on calendar type
const monthsPerPageOptions = computed(() => {
  if (calendarType.value === 'yearly') return [{ value: 12, label: '12 months' }]
  if (calendarType.value === 'quarterly') return [{ value: 3, label: '3 months' }]
  return [
    { value: 1, label: '1 month' },
    { value: 2, label: '2 months' },
    { value: 3, label: '3 months' },
    { value: 6, label: '6 months' }
  ]
})

// Watch calendar type to update months per page
watch(calendarType, (type) => {
  if (type === 'yearly') monthsPerPage.value = 12
  else if (type === 'quarterly') monthsPerPage.value = 3
  else monthsPerPage.value = 1
})

// Holiday count for selected country
const holidayCount = computed(() => {
  return calendarStore.holidayCount
})

// Add custom event
function addCustomEvent() {
  if (!newEventName.value || !newEventDate.value) return
  
  customEvents.value.push({
    id: `event-${Date.now()}`,
    name: newEventName.value,
    date: newEventDate.value,
    color: newEventColor.value
  })
  
  // Reset form
  newEventName.value = ''
  newEventDate.value = ''
  showAddEvent.value = false
}

function removeEvent(id: string) {
  customEvents.value = customEvents.value.filter(e => e.id !== id)
}

const DEFAULT_PADDING = 36

interface GridBlockOptions {
  month: number
  year: number
  areaWidth: number
  areaHeight: number
  offsetX: number
  offsetY: number
  padding?: number
  showHeader?: boolean
  showWeekdays?: boolean
  showHolidayList?: boolean
  showHolidayMarkers?: boolean
  weekdayFormat?: 'long' | 'short' | 'narrow'
  holidayListTitleFontSize?: number
  holidayListEntryFontSize?: number
}

interface PageSpacing {
  margin: number
  padding: number
  compactPadding: number
  gutter: number
  compactGutter: number
}

interface LayoutSlot {
  x: number
  y: number
  width: number
  height: number
}

type SlotRenderOptions = Omit<
  GridBlockOptions,
  'areaWidth' | 'areaHeight' | 'offsetX' | 'offsetY' | 'padding'
>

const clampValue = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

function computePageSpacing(canvasWidth: number, canvasHeight: number): PageSpacing {
  const shortestEdge = Math.min(canvasWidth, canvasHeight)
  const baseMargin = clampValue(shortestEdge * 0.05, 24, 72)
  const padding = clampValue(shortestEdge * 0.035, 20, 44)
  const compactPadding = clampValue(shortestEdge * 0.025, 12, 32)
  const margin = Math.max(baseMargin, Math.max(padding, compactPadding) + 12)
  const gutter = clampValue(shortestEdge * 0.04, 24, 56)
  const compactGutter = clampValue(shortestEdge * 0.025, 14, 36)

  return {
    margin,
    padding,
    compactPadding,
    gutter,
    compactGutter,
  }
}

function createGridSlots(
  canvasWidth: number,
  canvasHeight: number,
  cols: number,
  rows: number,
  spacing: PageSpacing,
  compact = false,
): LayoutSlot[] {
  const gutterX = cols > 1 ? (compact ? spacing.compactGutter : spacing.gutter) : 0
  const gutterY = rows > 1 ? (compact ? spacing.compactGutter : spacing.gutter) : 0
  const usableWidth = canvasWidth - spacing.margin * 2 - gutterX * (cols - 1)
  const usableHeight = canvasHeight - spacing.margin * 2 - gutterY * (rows - 1)

  const slotWidth = (usableWidth > 0 ? usableWidth : canvasWidth - spacing.margin * 2) / cols
  const slotHeight = (usableHeight > 0 ? usableHeight : canvasHeight - spacing.margin * 2) / rows

  const slots: LayoutSlot[] = []
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      slots.push({
        width: slotWidth,
        height: slotHeight,
        x: spacing.margin + col * (slotWidth + gutterX),
        y: spacing.margin + row * (slotHeight + gutterY),
      })
    }
  }
  return slots
}

function renderBlockInSlot(slot: LayoutSlot, padding: number, options: SlotRenderOptions) {
  const offsetX = slot.x - padding
  const offsetY = slot.y - padding
  const areaWidth = slot.width + padding * 2
  const areaHeight = slot.height + padding * 2

  renderCalendarGridBlock({
    ...options,
    areaWidth,
    areaHeight,
    offsetX,
    offsetY,
    padding,
  })
}

// Generate calendar with dynamic dates
function generateCalendar() {
  if (!editorStore.canvas) return
  
  const canvas = editorStore.canvas
  const canvasWidth = canvas.width || 595
  const canvasHeight = canvas.height || 842
  
  // Clear existing objects
  canvas.clear()
  canvas.backgroundColor = '#ffffff'
  
  // Calculate layout based on type - render synchronously for performance
  if (calendarType.value === 'yearly') {
    renderYearlyCalendar(canvasWidth, canvasHeight)
  } else if (calendarType.value === 'quarterly') {
    renderQuarterlyCalendar(canvasWidth, canvasHeight)
  } else {
    renderMonthlyCalendar(canvasWidth, canvasHeight)
  }
  
  canvas.renderAll()
  emit('generate')
}

// Render calendar with support for multiple months - SYNCHRONOUS for performance
function renderMonthlyCalendar(canvasWidth: number, canvasHeight: number) {
  const numMonths = monthsPerPage.value
  const spacing = computePageSpacing(canvasWidth, canvasHeight)
  const isPortrait = canvasWidth < canvasHeight

  const getOffsetMonth = (offset: number) => {
    const totalMonths = startingMonth.value - 1 + offset
    const yearOffset = Math.floor(totalMonths / 12)
    const month = ((totalMonths % 12) + 12) % 12
    return {
      month: month + 1,
      year: year.value + yearOffset,
    }
  }

  if (numMonths === 1) {
    const [slot] = createGridSlots(canvasWidth, canvasHeight, 1, 1, spacing)
    if (slot) {
      renderBlockInSlot(slot, spacing.padding, {
        ...getOffsetMonth(0),
        showHolidayList: true,
      })
    }
    return
  }

  if (numMonths === 2) {
    // Portrait: 1 col x 2 rows. Landscape: 2 cols x 1 row.
    const cols = isPortrait ? 1 : 2
    const rows = isPortrait ? 2 : 1
    const slots = createGridSlots(canvasWidth, canvasHeight, cols, rows, spacing)
    slots.forEach((slot, index) => {
      renderBlockInSlot(slot, spacing.padding, {
        ...getOffsetMonth(index),
      })
    })
    return
  }

  if (numMonths === 3) {
    // Portrait: 1 col x 3 rows. Landscape: 3 cols x 1 row.
    const cols = isPortrait ? 1 : 3
    const rows = isPortrait ? 3 : 1
    const slots = createGridSlots(canvasWidth, canvasHeight, cols, rows, spacing)
    slots.forEach((slot, index) => {
      renderBlockInSlot(slot, spacing.padding, {
        ...getOffsetMonth(index),
      })
    })
    return
  }

  if (numMonths === 6) {
    // Portrait: 2 cols x 3 rows. Landscape: 3 cols x 2 rows
    const cols = isPortrait ? 2 : 3
    const rows = isPortrait ? 3 : 2
    const slots = createGridSlots(canvasWidth, canvasHeight, cols, rows, spacing, true)
    slots.forEach((slot, index) => {
      renderBlockInSlot(slot, spacing.compactPadding, {
        ...getOffsetMonth(index),
        showHeader: true,
        showHolidayList: false,
      })
    })
  }
}

// Render quarterly calendar (3 months adaptive)
function renderQuarterlyCalendar(canvasWidth: number, canvasHeight: number) {
  const isPortrait = canvasWidth < canvasHeight
  
  // Portrait: 1 col x 3 rows (vertical stack)
  // Landscape: 3 cols x 1 row (horizontal strip)
  const cols = isPortrait ? 1 : 3
  const rows = isPortrait ? 3 : 1
  
  const spacing = computePageSpacing(canvasWidth, canvasHeight)
  const slots = createGridSlots(canvasWidth, canvasHeight, cols, rows, spacing)

  slots.forEach((slot, index) => {
    const totalMonths = startingMonth.value - 1 + index
    const monthValue = ((totalMonths % 12) + 12) % 12
    const resolvedYear = year.value + Math.floor(totalMonths / 12)
    renderBlockInSlot(slot, spacing.padding, {
      month: monthValue + 1,
      year: resolvedYear,
      showHolidayList: false, 
      showHolidayMarkers: true,
    })
  })
}

// Render yearly calendar (4x3 grid)
// Render yearly calendar (Dynamic grid based on orientation)
function renderYearlyCalendar(canvasWidth: number, canvasHeight: number) {
  const isPortrait = canvasWidth < canvasHeight
  // Portrait: 3 columns x 4 rows
  // Landscape: 4 columns x 3 rows
  const cols = isPortrait ? 3 : 4
  const rows = isPortrait ? 4 : 3
  
  const spacing = computePageSpacing(canvasWidth, canvasHeight)
  const slots = createGridSlots(canvasWidth, canvasHeight, cols, rows, spacing, true)

  slots.forEach((slot, index) => {
    const monthName = monthsList.value[index]?.name || monthNames.value[index] || `Month ${index + 1}`
    renderBlockInSlot(slot, spacing.compactPadding, {
      month: index + 1,
      year: year.value,
      title: monthName, // Only show month name in yearly grid
      showHeader: true,
      showWeekdays: true,
      showHolidayList: false,
      // Keep markers (red text/dots) so holidays are visible, but remove the list
      showHolidayMarkers: true,
      // Compact styling for year grid
      holidayMarkerHeight: 2,
      headerHeight: 18, // Even more compact header
      headerFontSize: 9,
      weekdayHeight: 14,
      weekdayFontSize: 7,
      weekdayFormat: 'narrow',
      dayNumberFontSize: 10,
      holidayListTitleFontSize: 10,
      holidayListEntryFontSize: 10,
      dayNumberInsetX: 2,
      dayNumberInsetY: 2,
      gridLineWidth: 0.5,
      cornerRadius: 4,
      borderWidth: 1,
      cellGap: 0,
    })
  })
}

interface GridBlockOptions {
  month: number
  year: number
  title?: string
  areaWidth: number
  areaHeight: number
  offsetX: number
  offsetY: number
  padding?: number
  showHeader?: boolean
  showWeekdays?: boolean
  showHolidayList?: boolean
  showHolidayMarkers?: boolean
  // Style overrides
  headerHeight?: number
  headerFontSize?: number
  weekdayHeight?: number
  weekdayFontSize?: number
  dayNumberFontSize?: number
  dayNumberInsetX?: number
  dayNumberInsetY?: number
  gridLineWidth?: number
  cornerRadius?: number
  borderWidth?: number
  cellGap?: number
  holidayListMaxItems?: number
  holidayListHeight?: number
  holidayMarkerHeight?: number
  holidayListTitleFontSize?: number
  holidayListEntryFontSize?: number
}

function renderCalendarGridBlock({
  month,
  year: yearValue,
  title,
  areaWidth,
  areaHeight,
  offsetX,
  offsetY,
  padding = DEFAULT_PADDING,
  showHeader = true,
  showWeekdays = true,
  showHolidayList = false,
  showHolidayMarkers,
  ...styleOverrides
}: GridBlockOptions) {
  const width = areaWidth - padding * 2
  const height = areaHeight - padding * 2
  const x = offsetX + padding
  const y = offsetY + padding

  // Force disable holiday list for yearly view to prevent clutter
  const isYearly = calendarType.value === 'yearly'
  const effectiveShowHolidayList = isYearly ? false : (showHolidayList && showPublicHolidays.value)
  const effectiveShowHolidayMarkers = showHolidayMarkers ?? showPublicHolidays.value

  editorStore.addObject('calendar-grid', {
    calendarMode: 'month',
    year: yearValue,
    month,
    title,
    startDay: weekStartsOn.value as WeekDay,
    language: calendarStore.config.language,
    x,
    y,
    width,
    height,
    showHeader,
    showWeekdays,
    showHolidayList: effectiveShowHolidayList,
    showHolidayMarkers: effectiveShowHolidayMarkers,
    weekendBackgroundColor: highlightWeekends.value ? '#f8fafc' : undefined,
    todayBackgroundColor: '#dbeafe',
    headerBackgroundColor: '#0f172a',
    headerTextColor: '#ffffff',
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    ...styleOverrides,
  })
}
</script>

<template>
  <div class="calendar-config space-y-5">
    <!-- Calendar Type Selector -->
    <div>
      <label class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3 block">
        Calendar Type
      </label>
      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="type in calendarTypes"
          :key="type.id"
          @click="calendarType = type.id as any"
          :class="[
            'p-3 rounded-xl border-2 transition-all text-center',
            calendarType === type.id
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          ]"
        >
          <span class="text-xl mb-1 block">{{ type.icon }}</span>
          <span class="text-xs font-medium text-gray-900 dark:text-white block">{{ type.name }}</span>
        </button>
      </div>
    </div>

    <!-- Year & Starting Month -->
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1.5 block">Year</label>
        <input
          v-model.number="year"
          type="number"
          min="2020"
          max="2100"
          class="input"
        />
      </div>
      <div>
        <label class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1.5 block">Start Month</label>
        <select
          v-model="startingMonth"
          class="select"
        >
          <option v-for="month in monthsList" :key="month.value" :value="month.value">
            {{ month.name }}
          </option>
        </select>
      </div>
    </div>

    <!-- Months per page (if applicable) -->
    <div v-if="calendarType === 'monthly'">
      <label class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1.5 block">
        Months per Page
      </label>
      <div class="grid grid-cols-2 gap-2">
        <button
          v-for="option in monthsPerPageOptions"
          :key="option.value"
          @click="monthsPerPage = option.value"
          :class="[
            'py-2 px-3 text-xs font-medium rounded-lg transition-colors',
            monthsPerPage === option.value
              ? 'bg-primary-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          ]"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <!-- Week Settings -->
    <div class="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl space-y-3">
      <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Week Settings</p>
      
      <div class="flex items-center justify-between">
        <span class="text-sm text-gray-700 dark:text-gray-300">Week starts on</span>
        <select
          v-model="weekStartsOn"
          class="select-sm w-auto"
        >
          <option :value="0">Sunday</option>
          <option :value="1">Monday</option>
        </select>
      </div>
      
      <label class="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          v-model="showWeekNumbers"
          class="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
        />
        <span class="text-sm text-gray-700 dark:text-gray-300">Show week numbers</span>
      </label>
      
      <label class="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          v-model="highlightWeekends"
          class="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
        />
        <span class="text-sm text-gray-700 dark:text-gray-300">Highlight weekends</span>
      </label>
    </div>

    <!-- Holidays Section -->
    <div class="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl space-y-3">
      <div class="flex items-center gap-2">
        <GlobeAltIcon class="w-4 h-4 text-gray-500" />
        <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Holidays</p>
      </div>
      
      <div class="grid grid-cols-1 gap-3">
        <AppSearchableSelect
          v-model="selectedCountry"
          :options="countryOptions"
          label="Country"
          placeholder="Search country..."
        />
        
        <AppSearchableSelect
          v-model="selectedLanguage"
          :options="languageOptions"
          label="Calendar Language"
          placeholder="Select language..."
        >
          <template #label-prefix>
            <LanguageIcon class="w-3 h-3 inline-block mr-1 opacity-70" />
          </template>
        </AppSearchableSelect>

        <AppSearchableSelect
          v-model="selectedHolidayLanguage"
          :options="languageOptions"
          label="Holiday Language"
          placeholder="Same as calendar"
        >
          <template #label-prefix>
            <LanguageIcon class="w-3 h-3 inline-block mr-1 opacity-70" />
          </template>
        </AppSearchableSelect>
        
        <p class="text-xs text-gray-400">{{ holidayCount }} public holidays available</p>
      </div>
      
      <label class="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          v-model="showPublicHolidays"
          class="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
        />
        <span class="text-sm text-gray-700 dark:text-gray-300">Show public holidays</span>
      </label>
    </div>

    <!-- Custom Events -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Custom Events</p>
          <span v-if="!canAddMoreEvents" class="flex items-center gap-1">
            <AppTierBadge :tier="holidayLimit > 10 ? 'business' : 'pro'" size="sm" />
          </span>
        </div>
        <button
          @click="showAddEvent = !showAddEvent"
          :disabled="!canAddMoreEvents && !showAddEvent"
          class="text-xs text-primary-600 dark:text-primary-400 font-medium hover:underline flex items-center gap-1 disabled:opacity-50 disabled:no-underline"
        >
          <PlusIcon class="w-3.5 h-3.5" />
          Add Event
        </button>
      </div>
      
      <div v-if="!canAddMoreEvents && !showAddEvent" class="text-[10px] text-amber-600 dark:text-amber-400">
        Event limit reached ({{ customEvents.length }}/{{ holidayLimit }}). Upgrade to add more.
      </div>
      
      <!-- Add Event Form -->
      <div v-if="showAddEvent" class="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-xl space-y-2">
        <input
          v-model="newEventName"
          type="text"
          placeholder="Event name"
          class="input"
        />
        <div class="flex gap-2">
          <input
            v-model="newEventDate"
            type="date"
            class="input"
          />
          <input
            v-model="newEventColor"
            type="color"
            class="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
          />
        </div>
        <div class="flex gap-2">
          <button
            @click="addCustomEvent"
            class="btn btn-primary flex-1"
          >
            Add
          </button>
          <button
            @click="showAddEvent = false"
            class="btn btn-secondary"
          >
            Cancel
          </button>
        </div>
      </div>
      
      <!-- Events List -->
      <div v-if="customEvents.length > 0" class="space-y-1">
        <div
          v-for="event in customEvents"
          :key="event.id"
          class="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700"
        >
          <div class="w-3 h-3 rounded-full" :style="{ backgroundColor: event.color }"></div>
          <span class="flex-1 text-sm text-gray-700 dark:text-gray-300">{{ event.name }}</span>
          <span class="text-xs text-gray-400">{{ event.date }}</span>
          <button
            @click="removeEvent(event.id)"
            class="p-1 text-gray-400 hover:text-red-500 transition-colors"
          >
            <TrashIcon class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <p v-else class="text-xs text-gray-400 text-center py-2">No custom events added</p>
    </div>

    <!-- Generate Button -->
    <button
      @click="generateCalendar"
      class="w-full py-3 bg-linear-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all shadow-lg shadow-primary-500/25 flex items-center justify-center gap-2"
    >
      <SparklesIcon class="w-5 h-5" />
      Generate Calendar
    </button>
    
    <!-- Preview Info -->
    <p class="text-xs text-gray-400 text-center">
      Generates a {{ calendarType }} calendar for {{ year }} starting from {{ monthsList[startingMonth - 1]?.name }}
    </p>
  </div>
</template>

<style scoped>
/* Custom checkbox styling */
input[type="checkbox"] {
  cursor: pointer;
}

input[type="color"] {
  -webkit-appearance: none;
  appearance: none;
  padding: 0;
}
input[type="color"]::-webkit-color-swatch-wrapper {
  padding: 2px;
}
input[type="color"]::-webkit-color-swatch {
  border: none;
  border-radius: 6px;
}
</style>
