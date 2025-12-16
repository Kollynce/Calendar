<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useEditorStore } from '@/stores/editor.store'
import { calendarGeneratorService } from '@/services/calendar/generator.service'
import { staticHolidays } from '@/data/holidays'
import type { CountryCode, Holiday, WeekDay } from '@/types'
import {
  PlusIcon,
  TrashIcon,
  SparklesIcon,
  GlobeAltIcon
} from '@heroicons/vue/24/outline'

const emit = defineEmits<{
  (e: 'generate'): void
}>()

const editorStore = useEditorStore()

// Calendar Configuration State
const calendarType = ref<'monthly' | 'quarterly' | 'yearly'>('monthly')
const year = ref(new Date().getFullYear())
const startingMonth = ref(new Date().getMonth() + 1)
const monthsPerPage = ref(1)
const weekStartsOn = ref<0 | 1>(0) // 0 = Sunday, 1 = Monday
const showWeekNumbers = ref(false)
const selectedCountry = ref<CountryCode>('KE')
const showPublicHolidays = ref(true)
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

// Month options
const monthsList = [
  { value: 1, name: 'January' },
  { value: 2, name: 'February' },
  { value: 3, name: 'March' },
  { value: 4, name: 'April' },
  { value: 5, name: 'May' },
  { value: 6, name: 'June' },
  { value: 7, name: 'July' },
  { value: 8, name: 'August' },
  { value: 9, name: 'September' },
  { value: 10, name: 'October' },
  { value: 11, name: 'November' },
  { value: 12, name: 'December' }
]

// Countries with flags
const countries = [
  { code: 'ZA' as CountryCode, name: 'South Africa', flag: '🇿🇦' },
  { code: 'NG' as CountryCode, name: 'Nigeria', flag: '🇳🇬' },
  { code: 'KE' as CountryCode, name: 'Kenya', flag: '🇰🇪' },
  { code: 'EG' as CountryCode, name: 'Egypt', flag: '🇪🇬' },
  { code: 'GH' as CountryCode, name: 'Ghana', flag: '🇬🇭' },
  { code: 'TZ' as CountryCode, name: 'Tanzania', flag: '🇹🇿' },
  { code: 'UG' as CountryCode, name: 'Uganda', flag: '🇺🇬' },
  { code: 'ET' as CountryCode, name: 'Ethiopia', flag: '🇪🇹' },
]

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

// Get holidays for the selected country and year
const holidays = computed((): Holiday[] => {
  if (!showPublicHolidays.value) return []
  const countryHolidays = staticHolidays[selectedCountry.value] || []
  return countryHolidays.map((h, index) => ({
    id: `static-${selectedCountry.value}-${year.value}-${index}`,
    date: `${year.value}-${h.month.toString().padStart(2, '0')}-${h.day.toString().padStart(2, '0')}`,
    name: h.name,
    type: h.type || 'public',
    isPublic: h.type === 'public',
    country: selectedCountry.value,
  }))
})

// Holiday count for selected country
const holidayCount = computed(() => {
  return staticHolidays[selectedCountry.value]?.length || 0
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

// Remove custom event
function removeEvent(id: string) {
  customEvents.value = customEvents.value.filter(e => e.id !== id)
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
  
  // Helper to calculate year offset when months wrap
  const getYearForMonth = (monthOffset: number) => {
    const totalMonths = startingMonth.value - 1 + monthOffset
    return year.value + Math.floor(totalMonths / 12)
  }
  
  const getMonthNum = (monthOffset: number) => {
    return ((startingMonth.value - 1 + monthOffset) % 12) + 1
  }
  
  // Calculate layout based on number of months - all synchronous
  if (numMonths === 1) {
    renderSingleMonth(canvasWidth, canvasHeight, startingMonth.value, year.value, 0, 0)
  } else if (numMonths === 2) {
    const halfWidth = canvasWidth / 2
    renderSingleMonth(halfWidth, canvasHeight, startingMonth.value, year.value, 0, 0, 0.85)
    renderSingleMonth(halfWidth, canvasHeight, getMonthNum(1), getYearForMonth(1), halfWidth, 0, 0.85)
  } else if (numMonths === 3) {
    const thirdWidth = canvasWidth / 3
    for (let i = 0; i < 3; i++) {
      renderSingleMonth(thirdWidth, canvasHeight, getMonthNum(i), getYearForMonth(i), i * thirdWidth, 0, 0.65)
    }
  } else if (numMonths === 6) {
    const cellWidth = canvasWidth / 3
    const cellHeight = canvasHeight / 2
    for (let i = 0; i < 6; i++) {
      const col = i % 3
      const row = Math.floor(i / 3)
      renderSingleMonth(cellWidth, cellHeight, getMonthNum(i), getYearForMonth(i), col * cellWidth, row * cellHeight, 0.55)
    }
  }
}

// Render a single month at a specific position - SYNCHRONOUS
function renderSingleMonth(
  areaWidth: number, 
  _areaHeight: number, 
  monthNum: number, 
  yearNum: number,
  offsetX: number, 
  offsetY: number, 
  scale: number = 1
) {
  const margin = 50 * scale
  const gridWidth = areaWidth - margin * 2
  const gridStartY = (140 * scale) + offsetY
  
  // Generate actual calendar data
  const monthData = calendarGeneratorService.generateMonth(
    yearNum,
    monthNum,
    holidays.value,
    weekStartsOn.value as WeekDay,
    'en'
  )
  
  // Month title
  editorStore.addObject('text', {
    content: monthData.name,
    x: margin + offsetX,
    y: (50 * scale) + offsetY,
    fontSize: Math.round(48 * scale),
    fontFamily: 'Outfit',
    color: '#1a1a1a',
    fontWeight: 'bold'
  })
  
  // Year - positioned below month name
  editorStore.addObject('text', {
    content: yearNum.toString(),
    x: margin + offsetX,
    y: (95 * scale) + offsetY,
    fontSize: Math.round(28 * scale),
    fontFamily: 'Outfit',
    color: '#6b7280',
    fontWeight: '500'
  })
  
  // Weekday headers
  const weekdayNames = calendarGeneratorService.getWeekdayNames(weekStartsOn.value as WeekDay, 'en', 'short')
  const dayWidth = gridWidth / 7
  
  weekdayNames.forEach((dayName, index) => {
    editorStore.addObject('text', {
      content: dayName,
      x: margin + offsetX + index * dayWidth + dayWidth / 2 - (12 * scale),
      y: gridStartY,
      fontSize: Math.round(11 * scale),
      fontFamily: 'Inter',
      color: '#9ca3af',
      fontWeight: '600'
    })
  })
  
  // Render date grid
  const cellHeight = 55 * scale
  const gridTopY = gridStartY + (25 * scale)
  
  monthData.weeks.forEach((week, weekIndex) => {
    week.forEach((day, dayIndex) => {
      const cellX = margin + offsetX + dayIndex * dayWidth
      const cellY = gridTopY + weekIndex * cellHeight
      
      // Draw cell background for weekends if enabled
      if (highlightWeekends.value && day.isWeekend && day.isCurrentMonth) {
        editorStore.addObject('shape', {
          x: cellX + 2,
          y: cellY,
          width: dayWidth - 4,
          height: cellHeight - 4,
          fill: '#f8fafc',
          shapeType: 'rect'
        })
      }
      
      // Day number
      const dayColor = !day.isCurrentMonth ? '#e5e7eb' 
        : day.isWeekend && highlightWeekends.value ? '#94a3b8'
        : day.isToday ? '#ffffff'
        : '#1f2937'
      
      // Today highlight
      if (day.isToday && day.isCurrentMonth) {
        editorStore.addObject('shape', {
          x: cellX + dayWidth / 2 - (14 * scale),
          y: cellY + (4 * scale),
          width: 28 * scale,
          height: 28 * scale,
          fill: '#3b82f6',
          shapeType: 'circle'
        })
      }
      
      editorStore.addObject('text', {
        content: day.dayOfMonth.toString(),
        x: cellX + dayWidth / 2 - (day.dayOfMonth >= 10 ? 10 * scale : 5 * scale),
        y: cellY + (10 * scale),
        fontSize: Math.round(15 * scale),
        fontFamily: 'Inter',
        color: dayColor,
        fontWeight: day.isToday ? '700' : '500'
      })
      
      // Holiday indicator - only show if current month and scale allows
      if (day.holidays.length > 0 && day.isCurrentMonth && scale >= 0.7) {
        const holidayName = day.holidays[0]?.name || 'Holiday'
        const maxChars = Math.floor(dayWidth / (5 * scale))
        const displayName = holidayName.length > maxChars 
          ? holidayName.substring(0, maxChars - 2) + '..' 
          : holidayName
        editorStore.addObject('text', {
          content: displayName,
          x: cellX + 4,
          y: cellY + (36 * scale),
          fontSize: Math.round(7 * scale),
          fontFamily: 'Inter',
          color: '#dc2626',
          fontWeight: '500'
        })
      }
    })
  })
  
  // Show week numbers if enabled
  if (showWeekNumbers.value && scale >= 0.8) {
    monthData.weeks.forEach((week, weekIndex) => {
      if (week[0]) {
        editorStore.addObject('text', {
          content: `W${week[0].weekNumber}`,
          x: 15 + offsetX,
          y: gridTopY + weekIndex * cellHeight + (12 * scale),
          fontSize: Math.round(9 * scale),
          fontFamily: 'Inter',
          color: '#cbd5e1',
          fontWeight: '500'
        })
      }
    })
  }
}

// Render quarterly calendar (3 months)
function renderQuarterlyCalendar(canvasWidth: number, canvasHeight: number) {
  const margin = 30
  const monthHeight = (canvasHeight - 100) / 3
  
  for (let i = 0; i < 3; i++) {
    const monthIndex = (startingMonth.value - 1 + i) % 12
    const actualMonth = monthIndex + 1
    const actualYear = monthIndex < startingMonth.value - 1 ? year.value + 1 : year.value
    
    const monthData = calendarGeneratorService.generateMonth(
      actualYear,
      actualMonth,
      holidays.value,
      weekStartsOn.value as WeekDay,
      'en'
    )
    
    const yOffset = 30 + i * monthHeight
    
    // Month title
    editorStore.addObject('text', {
      content: `${monthData.name} ${actualYear}`,
      x: margin,
      y: yOffset,
      fontSize: 20,
      fontFamily: 'Outfit',
      color: '#1a1a1a',
      fontWeight: 'bold'
    })
    
    // Render compact date grid
    setTimeout(() => {
      renderCompactMonthGrid(monthData, margin, yOffset + 35, canvasWidth - margin * 2, monthHeight - 60)
    }, 100 + i * 100)
  }
}

// Render yearly calendar (4x3 grid)
function renderYearlyCalendar(canvasWidth: number, canvasHeight: number) {
  const margin = 25
  const cols = 4
  const rows = 3
  const cellWidth = (canvasWidth - margin * 2 - 30) / cols
  const cellHeight = (canvasHeight - 100) / rows
  
  // Year title
  editorStore.addObject('text', {
    content: year.value.toString(),
    x: canvasWidth / 2 - 40,
    y: 25,
    fontSize: 36,
    fontFamily: 'Outfit',
    color: '#1a1a1a',
    fontWeight: 'bold'
  })
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const monthIndex = row * cols + col
      const monthData = calendarGeneratorService.generateMonth(
        year.value,
        monthIndex + 1,
        holidays.value,
        weekStartsOn.value as WeekDay,
        'en'
      )
      
      const xPos = margin + col * (cellWidth + 10)
      const yPos = 70 + row * cellHeight
      
      // Month label
      editorStore.addObject('text', {
        content: monthData.shortName,
        x: xPos,
        y: yPos,
        fontSize: 11,
        fontFamily: 'Inter',
        color: '#374151',
        fontWeight: '700'
      })
      
      // Render mini calendar grid
      setTimeout(() => {
        renderMiniMonthGrid(monthData, xPos, yPos + 18, cellWidth, cellHeight - 30)
      }, 50 + (row * cols + col) * 30)
    }
  }
}

// Render compact month grid for quarterly view
function renderCompactMonthGrid(monthData: any, x: number, y: number, width: number, height: number) {
  const dayWidth = width / 7
  const weekdayNames = calendarGeneratorService.getWeekdayNames(weekStartsOn.value as WeekDay, 'en', 'narrow')
  
  // Weekday headers
  weekdayNames.forEach((dayName, index) => {
    editorStore.addObject('text', {
      content: dayName,
      x: x + index * dayWidth + dayWidth / 2 - 4,
      y: y,
      fontSize: 9,
      fontFamily: 'Inter',
      color: '#9ca3af',
      fontWeight: '600'
    })
  })
  
  // Date cells
  const cellHeight = Math.min(20, (height - 20) / monthData.weeks.length)
  monthData.weeks.forEach((week: any[], weekIndex: number) => {
    week.forEach((day: any, dayIndex: number) => {
      if (!day.isCurrentMonth) return
      
      const cellX = x + dayIndex * dayWidth
      const cellY = y + 15 + weekIndex * cellHeight
      
      const dayColor = day.isWeekend && highlightWeekends.value ? '#9ca3af' : '#374151'
      
      editorStore.addObject('text', {
        content: day.dayOfMonth.toString(),
        x: cellX + dayWidth / 2 - 5,
        y: cellY,
        fontSize: 10,
        fontFamily: 'Inter',
        color: dayColor,
        fontWeight: '400'
      })
    })
  })
}

// Render mini month grid for yearly view
function renderMiniMonthGrid(monthData: any, x: number, y: number, width: number, height: number) {
  const dayWidth = width / 7
  const cellHeight = Math.min(12, height / 6)
  
  // Weekday headers (single letter)
  const weekdayNames = calendarGeneratorService.getWeekdayNames(weekStartsOn.value as WeekDay, 'en', 'narrow')
  weekdayNames.forEach((dayName, index) => {
    editorStore.addObject('text', {
      content: dayName,
      x: x + index * dayWidth + 1,
      y: y,
      fontSize: 7,
      fontFamily: 'Inter',
      color: '#9ca3af',
      fontWeight: '600'
    })
  })
  
  // Date cells (minimal)
  monthData.weeks.forEach((week: any[], weekIndex: number) => {
    week.forEach((day: any, dayIndex: number) => {
      if (!day.isCurrentMonth) return
      
      const cellX = x + dayIndex * dayWidth
      const cellY = y + 10 + weekIndex * cellHeight
      
      const isHoliday = day.holidays.length > 0
      const dayColor = isHoliday ? '#dc2626' : (day.isWeekend ? '#9ca3af' : '#6b7280')
      
      editorStore.addObject('text', {
        content: day.dayOfMonth.toString(),
        x: cellX + 1,
        y: cellY,
        fontSize: 7,
        fontFamily: 'Inter',
        color: dayColor,
        fontWeight: isHoliday ? '700' : '400'
      })
    })
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
      <div class="flex gap-2">
        <button
          v-for="option in monthsPerPageOptions"
          :key="option.value"
          @click="monthsPerPage = option.value"
          :class="[
            'flex-1 py-2 px-3 text-xs font-medium rounded-lg transition-colors',
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
      
      <div>
        <label class="text-xs text-gray-500 mb-1 block">Country</label>
        <select
          v-model="selectedCountry"
          class="select"
        >
          <option v-for="country in countries" :key="country.code" :value="country.code">
            {{ country.flag }} {{ country.name }}
          </option>
        </select>
        <p class="text-xs text-gray-400 mt-1">{{ holidayCount }} public holidays available</p>
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
        <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Custom Events</p>
        <button
          @click="showAddEvent = !showAddEvent"
          class="text-xs text-primary-600 dark:text-primary-400 font-medium hover:underline flex items-center gap-1"
        >
          <PlusIcon class="w-3.5 h-3.5" />
          Add Event
        </button>
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
      class="w-full py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all shadow-lg shadow-primary-500/25 flex items-center justify-center gap-2"
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
