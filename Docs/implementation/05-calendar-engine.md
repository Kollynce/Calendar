# Phase 2: Calendar Engine & Rendering

## 1. Holiday Service

```typescript
// src/services/calendar/holiday.service.ts
import Holidays from 'date-holidays'
import { format, parseISO } from 'date-fns'
import type { Holiday, CustomHoliday, CountryCode } from '@/types'
import { staticHolidays } from '@/data/holidays'

class HolidayService {
  private holidayLib: Holidays
  private cache: Map<string, Holiday[]> = new Map()
  private cacheExpiry: Map<string, number> = new Map()
  private readonly CACHE_TTL = 1000 * 60 * 60 // 1 hour

  constructor() {
    this.holidayLib = new Holidays()
  }

  /**
   * Fetch holidays for a specific country and year
   */
  async getHolidays(
    country: CountryCode, 
    year: number,
    forceRefresh = false
  ): Promise<{ holidays: Holiday[]; source: 'api' | 'static' }> {
    const cacheKey = `${country}-${year}`
    
    // Check cache
    if (!forceRefresh && this.isCacheValid(cacheKey)) {
      return { 
        holidays: this.cache.get(cacheKey)!, 
        source: 'api' 
      }
    }

    try {
      // Try API first
      this.holidayLib.init(country)
      const apiHolidays = this.holidayLib.getHolidays(year)
      
      const holidays: Holiday[] = apiHolidays.map((h, index) => ({
        id: `${country}-${year}-${index}`,
        date: format(new Date(h.date), 'yyyy-MM-dd'),
        name: h.name,
        localName: h.name,
        type: this.mapHolidayType(h.type),
        isPublic: h.type === 'public',
        country,
      }))

      // Update cache
      this.cache.set(cacheKey, holidays)
      this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_TTL)
      
      return { holidays, source: 'api' }
    } catch (error) {
      console.warn(`API failed for ${country}/${year}, using static data`)
      const holidays = this.getStaticHolidays(country, year)
      return { holidays, source: 'static' }
    }
  }

  /**
   * Get holidays for a specific month
   */
  async getHolidaysForMonth(
    country: CountryCode, 
    year: number, 
    month: number
  ): Promise<Holiday[]> {
    const { holidays } = await this.getHolidays(country, year)
    
    return holidays.filter((h) => {
      const date = parseISO(h.date)
      return date.getMonth() + 1 === month
    })
  }

  /**
   * Get holidays for a specific date
   */
  async getHolidaysForDate(
    country: CountryCode,
    date: Date
  ): Promise<Holiday[]> {
    const year = date.getFullYear()
    const { holidays } = await this.getHolidays(country, year)
    const dateStr = format(date, 'yyyy-MM-dd')
    
    return holidays.filter((h) => h.date === dateStr)
  }

  /**
   * Merge custom holidays with official holidays
   */
  mergeWithCustomHolidays(
    holidays: Holiday[],
    customHolidays: CustomHoliday[],
    year: number
  ): Holiday[] {
    // Expand recurring custom holidays
    const expandedCustom = this.expandRecurringHolidays(customHolidays, year)
    
    const merged = [...holidays]
    
    for (const custom of expandedCustom) {
      // Check for duplicates by date
      const existingIndex = merged.findIndex((h) => h.date === custom.date)
      if (existingIndex === -1) {
        merged.push(custom)
      }
    }

    // Sort by date
    return merged.sort((a, b) => a.date.localeCompare(b.date))
  }

  /**
   * Expand recurring holidays for a specific year
   */
  private expandRecurringHolidays(
    holidays: CustomHoliday[], 
    year: number
  ): CustomHoliday[] {
    const expanded: CustomHoliday[] = []

    for (const holiday of holidays) {
      if (!holiday.recurrence) {
        // Non-recurring - check if it's in the target year
        if (parseISO(holiday.date).getFullYear() === year) {
          expanded.push(holiday)
        }
        continue
      }

      // Handle recurring holidays
      const originalDate = parseISO(holiday.date)
      const { frequency, interval, endDate } = holiday.recurrence
      const end = endDate ? parseISO(endDate) : new Date(year, 11, 31)

      if (frequency === 'yearly') {
        // Create instance for target year
        const instanceDate = new Date(
          year,
          originalDate.getMonth(),
          originalDate.getDate()
        )
        
        if (instanceDate <= end) {
          expanded.push({
            ...holiday,
            id: `${holiday.id}-${year}`,
            date: format(instanceDate, 'yyyy-MM-dd'),
          })
        }
      }
      // Add monthly/weekly handling as needed
    }

    return expanded
  }

  /**
   * Get static fallback holidays
   */
  private getStaticHolidays(country: CountryCode, year: number): Holiday[] {
    const countryHolidays = staticHolidays[country] || []
    
    return countryHolidays.map((h, index) => ({
      id: `static-${country}-${year}-${index}`,
      date: `${year}-${h.month.toString().padStart(2, '0')}-${h.day.toString().padStart(2, '0')}`,
      name: h.name,
      type: h.type || 'public',
      isPublic: h.type === 'public',
      country,
    }))
  }

  private mapHolidayType(type: string): Holiday['type'] {
    const typeMap: Record<string, Holiday['type']> = {
      public: 'public',
      bank: 'bank',
      school: 'school',
      optional: 'optional',
      observance: 'observance',
    }
    return typeMap[type] || 'observance'
  }

  private isCacheValid(key: string): boolean {
    const expiry = this.cacheExpiry.get(key)
    return !!expiry && Date.now() < expiry && this.cache.has(key)
  }

  clearCache(): void {
    this.cache.clear()
    this.cacheExpiry.clear()
  }
}

export const holidayService = new HolidayService()
```

---

## 2. Calendar Generator Service

```typescript
// src/services/calendar/generator.service.ts
import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek,
  eachDayOfInterval,
  format,
  getWeek,
  isSameMonth,
  isToday,
  isWeekend,
  addDays,
  addWeeks,
} from 'date-fns'
import type { 
  CalendarConfig, 
  Holiday, 
  WeekDay,
  CalendarDay,
  CalendarMonth,
  CalendarYear,
} from '@/types'

class CalendarGeneratorService {
  /**
   * Generate calendar data for an entire year
   */
  generateYear(
    year: number,
    holidays: Holiday[],
    startDay: WeekDay = 0,
    locale: string = 'en'
  ): CalendarYear {
    const months: CalendarMonth[] = []

    for (let month = 1; month <= 12; month++) {
      months.push(this.generateMonth(year, month, holidays, startDay, locale))
    }

    return { year, months }
  }

  /**
   * Generate calendar data for a single month
   */
  generateMonth(
    year: number,
    month: number,
    holidays: Holiday[],
    startDay: WeekDay = 0,
    locale: string = 'en'
  ): CalendarMonth {
    const date = new Date(year, month - 1, 1)
    const monthStart = startOfMonth(date)
    const monthEnd = endOfMonth(date)
    
    // Get the full week range (including days from adjacent months)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: startDay })
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: startDay })

    const allDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

    const days: CalendarDay[] = allDays.map((d) => ({
      date: d,
      dayOfMonth: d.getDate(),
      isCurrentMonth: isSameMonth(d, date),
      isToday: isToday(d),
      isWeekend: isWeekend(d),
      weekNumber: getWeek(d, { weekStartsOn: startDay }),
      holidays: this.getHolidaysForDate(d, holidays),
    }))

    // Group days into weeks
    const weeks: CalendarDay[][] = []
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7))
    }

    return {
      year,
      month,
      name: this.getMonthName(month, locale, 'long'),
      shortName: this.getMonthName(month, locale, 'short'),
      days,
      weeks,
    }
  }

  /**
   * Generate weekly planner data
   */
  generateWeek(
    startDate: Date,
    holidays: Holiday[],
    startDay: WeekDay = 0
  ): CalendarDay[] {
    const weekStart = startOfWeek(startDate, { weekStartsOn: startDay })
    const days: CalendarDay[] = []

    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i)
      days.push({
        date: d,
        dayOfMonth: d.getDate(),
        isCurrentMonth: true,
        isToday: isToday(d),
        isWeekend: isWeekend(d),
        weekNumber: getWeek(d, { weekStartsOn: startDay }),
        holidays: this.getHolidaysForDate(d, holidays),
      })
    }

    return days
  }

  /**
   * Get weekday names based on locale and start day
   */
  getWeekdayNames(
    startDay: WeekDay = 0,
    locale: string = 'en',
    formatStyle: 'long' | 'short' | 'narrow' = 'short'
  ): string[] {
    const baseDate = new Date(2024, 0, 7) // A Sunday
    const days: string[] = []

    for (let i = 0; i < 7; i++) {
      const dayIndex = (startDay + i) % 7
      const date = new Date(baseDate)
      date.setDate(date.getDate() + dayIndex)
      
      days.push(
        date.toLocaleDateString(locale, { weekday: formatStyle })
      )
    }

    return days
  }

  /**
   * Get month name
   */
  getMonthName(
    month: number,
    locale: string = 'en',
    formatStyle: 'long' | 'short' = 'long'
  ): string {
    const date = new Date(2024, month - 1, 1)
    return date.toLocaleDateString(locale, { month: formatStyle })
  }

  /**
   * Get all month names for a locale
   */
  getAllMonthNames(
    locale: string = 'en',
    formatStyle: 'long' | 'short' = 'long'
  ): string[] {
    return Array.from({ length: 12 }, (_, i) => 
      this.getMonthName(i + 1, locale, formatStyle)
    )
  }

  /**
   * Get holidays for a specific date
   */
  private getHolidaysForDate(date: Date, holidays: Holiday[]): Holiday[] {
    const dateStr = format(date, 'yyyy-MM-dd')
    return holidays.filter((h) => h.date === dateStr)
  }

  /**
   * Calculate grid dimensions for different layouts
   */
  getGridLayout(monthCount: number): { cols: number; rows: number } {
    const layouts: Record<number, { cols: number; rows: number }> = {
      1: { cols: 1, rows: 1 },
      2: { cols: 2, rows: 1 },
      3: { cols: 3, rows: 1 },
      4: { cols: 2, rows: 2 },
      6: { cols: 3, rows: 2 },
      12: { cols: 4, rows: 3 },
    }
    return layouts[monthCount] || { cols: 4, rows: 3 }
  }

  /**
   * Get number of weeks in a month
   */
  getWeeksInMonth(year: number, month: number, startDay: WeekDay = 0): number {
    const date = new Date(year, month - 1, 1)
    const monthStart = startOfMonth(date)
    const monthEnd = endOfMonth(date)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: startDay })
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: startDay })
    
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })
    return Math.ceil(days.length / 7)
  }
}

export const calendarGeneratorService = new CalendarGeneratorService()
```

---

## 3. Localization Service

```typescript
// src/services/calendar/localization.service.ts
import type { LanguageCode } from '@/types'
import { translations } from '@/data/translations'

export interface LocaleStrings {
  months: {
    long: string[]
    short: string[]
  }
  weekdays: {
    long: string[]
    short: string[]
    narrow: string[]
  }
  ui: {
    today: string
    holidays: string
    customEvents: string
    weekend: string
    week: string
    year: string
    month: string
    day: string
    export: string
    settings: string
    noHolidays: string
  }
}

class LocalizationService {
  private currentLocale: LanguageCode = 'en'

  setLocale(locale: LanguageCode): void {
    this.currentLocale = locale
  }

  getLocale(): LanguageCode {
    return this.currentLocale
  }

  /**
   * Get all strings for current locale
   */
  getStrings(): LocaleStrings {
    return translations[this.currentLocale] || translations.en
  }

  /**
   * Get month names
   */
  getMonthNames(format: 'long' | 'short' = 'long'): string[] {
    const strings = this.getStrings()
    return strings.months[format]
  }

  /**
   * Get weekday names
   */
  getWeekdayNames(format: 'long' | 'short' | 'narrow' = 'short'): string[] {
    const strings = this.getStrings()
    return strings.weekdays[format]
  }

  /**
   * Get a specific UI string
   */
  t(key: keyof LocaleStrings['ui']): string {
    const strings = this.getStrings()
    return strings.ui[key] || key
  }

  /**
   * Format a date according to locale
   */
  formatDate(date: Date, format: 'full' | 'long' | 'medium' | 'short' = 'medium'): string {
    const localeMap: Record<LanguageCode, string> = {
      en: 'en-US',
      sw: 'sw-KE',
      am: 'am-ET',
      yo: 'yo-NG',
      zu: 'zu-ZA',
      ar: 'ar-EG',
      fr: 'fr-FR',
      pt: 'pt-PT',
      ha: 'ha-NG',
      ig: 'ig-NG',
    }

    const dateStyle = format === 'full' ? 'full' 
      : format === 'long' ? 'long'
      : format === 'medium' ? 'medium'
      : 'short'

    return date.toLocaleDateString(localeMap[this.currentLocale], {
      dateStyle,
    })
  }

  /**
   * Get available languages
   */
  getAvailableLanguages(): Array<{ code: LanguageCode; name: string; nativeName: string }> {
    return [
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' },
      { code: 'am', name: 'Amharic', nativeName: 'አማርኛ' },
      { code: 'yo', name: 'Yoruba', nativeName: 'Yorùbá' },
      { code: 'zu', name: 'Zulu', nativeName: 'isiZulu' },
      { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
      { code: 'fr', name: 'French', nativeName: 'Français' },
      { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
      { code: 'ha', name: 'Hausa', nativeName: 'Hausa' },
      { code: 'ig', name: 'Igbo', nativeName: 'Igbo' },
    ]
  }
}

export const localizationService = new LocalizationService()
```

---

## 4. Calendar Store

```typescript
// src/stores/calendar.store.ts
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { holidayService } from '@/services/calendar/holiday.service'
import { calendarGeneratorService } from '@/services/calendar/generator.service'
import { localizationService } from '@/services/calendar/localization.service'
import type { 
  CalendarConfig, 
  CalendarYear, 
  Holiday, 
  CustomHoliday,
  CountryCode,
  LanguageCode,
  CalendarLayout,
  WeekDay,
} from '@/types'

export const useCalendarStore = defineStore('calendar', () => {
  // ═══════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════
  const config = useLocalStorage<CalendarConfig>('calendar-config', {
    year: new Date().getFullYear(),
    country: 'ZA',
    language: 'en',
    layout: 'year-grid',
    startDay: 0,
    showHolidays: true,
    showCustomHolidays: true,
    showWeekNumbers: false,
    currentMonth: new Date().getMonth() + 1,
  })

  const calendarData = ref<CalendarYear | null>(null)
  const holidays = ref<Holiday[]>([])
  const customHolidays = useLocalStorage<CustomHoliday[]>('custom-holidays', [])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const holidaySource = ref<'api' | 'static'>('api')

  // ═══════════════════════════════════════════════════════════════
  // GETTERS
  // ═══════════════════════════════════════════════════════════════
  const allHolidays = computed(() => {
    if (!config.value.showHolidays && !config.value.showCustomHolidays) {
      return []
    }

    let result: Holiday[] = []

    if (config.value.showHolidays) {
      result = [...holidays.value]
    }

    if (config.value.showCustomHolidays) {
      result = holidayService.mergeWithCustomHolidays(
        result,
        customHolidays.value,
        config.value.year
      )
    }

    return result
  })

  const holidayCount = computed(() => allHolidays.value.length)

  const currentMonthData = computed(() => {
    if (!calendarData.value) return null
    return calendarData.value.months.find(
      m => m.month === config.value.currentMonth
    )
  })

  // ═══════════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Generate calendar data
   */
  async function generateCalendar(): Promise<void> {
    loading.value = true
    error.value = null

    try {
      // Fetch holidays
      const { holidays: fetchedHolidays, source } = await holidayService.getHolidays(
        config.value.country,
        config.value.year
      )
      
      holidays.value = fetchedHolidays
      holidaySource.value = source

      // Update localization
      localizationService.setLocale(config.value.language)

      // Generate calendar
      calendarData.value = calendarGeneratorService.generateYear(
        config.value.year,
        allHolidays.value,
        config.value.startDay,
        config.value.language
      )
    } catch (e: any) {
      error.value = e.message || 'Failed to generate calendar'
      console.error('Calendar generation error:', e)
    } finally {
      loading.value = false
    }
  }

  /**
   * Update configuration
   */
  function updateConfig(updates: Partial<CalendarConfig>): void {
    config.value = { ...config.value, ...updates }
  }

  /**
   * Set year
   */
  function setYear(year: number): void {
    config.value.year = year
    generateCalendar()
  }

  /**
   * Set country
   */
  function setCountry(country: CountryCode): void {
    config.value.country = country
    generateCalendar()
  }

  /**
   * Set language
   */
  function setLanguage(language: LanguageCode): void {
    config.value.language = language
    generateCalendar()
  }

  /**
   * Set layout
   */
  function setLayout(layout: CalendarLayout): void {
    config.value.layout = layout
  }

  /**
   * Set start day of week
   */
  function setStartDay(startDay: WeekDay): void {
    config.value.startDay = startDay
    generateCalendar()
  }

  /**
   * Navigate to previous month (monthly view)
   */
  function previousMonth(): void {
    if (config.value.currentMonth && config.value.currentMonth > 1) {
      config.value.currentMonth--
    }
  }

  /**
   * Navigate to next month (monthly view)
   */
  function nextMonth(): void {
    if (config.value.currentMonth && config.value.currentMonth < 12) {
      config.value.currentMonth++
    }
  }

  /**
   * Go to specific month
   */
  function goToMonth(month: number): void {
    if (month >= 1 && month <= 12) {
      config.value.currentMonth = month
    }
  }

  /**
   * Toggle holiday visibility
   */
  function toggleHolidays(show?: boolean): void {
    config.value.showHolidays = show ?? !config.value.showHolidays
    generateCalendar()
  }

  /**
   * Toggle custom holidays visibility
   */
  function toggleCustomHolidays(show?: boolean): void {
    config.value.showCustomHolidays = show ?? !config.value.showCustomHolidays
    generateCalendar()
  }

  /**
   * Toggle week numbers
   */
  function toggleWeekNumbers(show?: boolean): void {
    config.value.showWeekNumbers = show ?? !config.value.showWeekNumbers
  }

  // ═══════════════════════════════════════════════════════════════
  // CUSTOM HOLIDAYS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Add custom holiday
   */
  function addCustomHoliday(holiday: Omit<CustomHoliday, 'id' | 'createdAt' | 'updatedAt'>): void {
    const newHoliday: CustomHoliday = {
      ...holiday,
      id: `custom-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    customHolidays.value.push(newHoliday)
    generateCalendar()
  }

  /**
   * Update custom holiday
   */
  function updateCustomHoliday(id: string, updates: Partial<CustomHoliday>): void {
    const index = customHolidays.value.findIndex(h => h.id === id)
    if (index !== -1) {
      customHolidays.value[index] = {
        ...customHolidays.value[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      }
      generateCalendar()
    }
  }

  /**
   * Delete custom holiday
   */
  function deleteCustomHoliday(id: string): void {
    const index = customHolidays.value.findIndex(h => h.id === id)
    if (index !== -1) {
      customHolidays.value.splice(index, 1)
      generateCalendar()
    }
  }

  /**
   * Refresh calendar data
   */
  async function refresh(): Promise<void> {
    holidayService.clearCache()
    await generateCalendar()
  }

  // Initialize on store creation
  generateCalendar()

  return {
    // State
    config,
    calendarData,
    holidays,
    customHolidays,
    loading,
    error,
    holidaySource,
    // Getters
    allHolidays,
    holidayCount,
    currentMonthData,
    // Actions
    generateCalendar,
    updateConfig,
    setYear,
    setCountry,
    setLanguage,
    setLayout,
    setStartDay,
    previousMonth,
    nextMonth,
    goToMonth,
    toggleHolidays,
    toggleCustomHolidays,
    toggleWeekNumbers,
    addCustomHoliday,
    updateCustomHoliday,
    deleteCustomHoliday,
    refresh,
  }
})
```

---

## 5. Static Holiday Data

```typescript
// src/data/holidays/index.ts
import type { CountryCode } from '@/types'

export interface StaticHoliday {
  month: number
  day: number
  name: string
  type?: 'public' | 'observance'
}

// South Africa
const za: StaticHoliday[] = [
  { month: 1, day: 1, name: "New Year's Day", type: 'public' },
  { month: 3, day: 21, name: 'Human Rights Day', type: 'public' },
  { month: 4, day: 27, name: 'Freedom Day', type: 'public' },
  { month: 5, day: 1, name: "Workers' Day", type: 'public' },
  { month: 6, day: 16, name: 'Youth Day', type: 'public' },
  { month: 8, day: 9, name: "National Women's Day", type: 'public' },
  { month: 9, day: 24, name: 'Heritage Day', type: 'public' },
  { month: 12, day: 16, name: 'Day of Reconciliation', type: 'public' },
  { month: 12, day: 25, name: 'Christmas Day', type: 'public' },
  { month: 12, day: 26, name: 'Day of Goodwill', type: 'public' },
]

// Nigeria
const ng: StaticHoliday[] = [
  { month: 1, day: 1, name: "New Year's Day", type: 'public' },
  { month: 5, day: 1, name: "Workers' Day", type: 'public' },
  { month: 5, day: 29, name: 'Democracy Day', type: 'public' },
  { month: 10, day: 1, name: 'Independence Day', type: 'public' },
  { month: 12, day: 25, name: 'Christmas Day', type: 'public' },
  { month: 12, day: 26, name: 'Boxing Day', type: 'public' },
]

// Kenya
const ke: StaticHoliday[] = [
  { month: 1, day: 1, name: "New Year's Day", type: 'public' },
  { month: 5, day: 1, name: 'Labour Day', type: 'public' },
  { month: 6, day: 1, name: 'Madaraka Day', type: 'public' },
  { month: 10, day: 10, name: 'Huduma Day', type: 'public' },
  { month: 10, day: 20, name: 'Mashujaa Day', type: 'public' },
  { month: 12, day: 12, name: 'Jamhuri Day', type: 'public' },
  { month: 12, day: 25, name: 'Christmas Day', type: 'public' },
  { month: 12, day: 26, name: 'Boxing Day', type: 'public' },
]

// Egypt
const eg: StaticHoliday[] = [
  { month: 1, day: 7, name: 'Coptic Christmas', type: 'public' },
  { month: 1, day: 25, name: 'Revolution Day', type: 'public' },
  { month: 4, day: 25, name: 'Sinai Liberation Day', type: 'public' },
  { month: 5, day: 1, name: 'Labour Day', type: 'public' },
  { month: 7, day: 23, name: 'Revolution Day', type: 'public' },
  { month: 10, day: 6, name: 'Armed Forces Day', type: 'public' },
]

// Ghana
const gh: StaticHoliday[] = [
  { month: 1, day: 1, name: "New Year's Day", type: 'public' },
  { month: 3, day: 6, name: 'Independence Day', type: 'public' },
  { month: 5, day: 1, name: 'May Day', type: 'public' },
  { month: 5, day: 25, name: 'Africa Day', type: 'public' },
  { month: 7, day: 1, name: 'Republic Day', type: 'public' },
  { month: 9, day: 21, name: "Founder's Day", type: 'public' },
  { month: 12, day: 25, name: 'Christmas Day', type: 'public' },
  { month: 12, day: 26, name: 'Boxing Day', type: 'public' },
]

// Export all countries
export const staticHolidays: Partial<Record<CountryCode, StaticHoliday[]>> = {
  ZA: za,
  NG: ng,
  KE: ke,
  EG: eg,
  GH: gh,
  // Add more countries as needed
}
```

---

## 6. Translations Data

```typescript
// src/data/translations/index.ts
import type { LanguageCode } from '@/types'
import type { LocaleStrings } from '@/services/calendar/localization.service'

export const translations: Record<LanguageCode, LocaleStrings> = {
  en: {
    months: {
      long: ['January', 'February', 'March', 'April', 'May', 'June', 
             'July', 'August', 'September', 'October', 'November', 'December'],
      short: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
              'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    },
    weekdays: {
      long: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      short: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      narrow: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
    },
    ui: {
      today: 'Today',
      holidays: 'Holidays',
      customEvents: 'Custom Events',
      weekend: 'Weekend',
      week: 'Week',
      year: 'Year',
      month: 'Month',
      day: 'Day',
      export: 'Export',
      settings: 'Settings',
      noHolidays: 'No holidays',
    },
  },
  sw: {
    months: {
      long: ['Januari', 'Februari', 'Machi', 'Aprili', 'Mei', 'Juni',
             'Julai', 'Agosti', 'Septemba', 'Oktoba', 'Novemba', 'Desemba'],
      short: ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun',
              'Jul', 'Ago', 'Sep', 'Okt', 'Nov', 'Des'],
    },
    weekdays: {
      long: ['Jumapili', 'Jumatatu', 'Jumanne', 'Jumatano', 'Alhamisi', 'Ijumaa', 'Jumamosi'],
      short: ['Jpi', 'Jtt', 'Jnn', 'Jtn', 'Alh', 'Iju', 'Jms'],
      narrow: ['P', 'T', 'N', 'T', 'A', 'I', 'M'],
    },
    ui: {
      today: 'Leo',
      holidays: 'Sikukuu',
      customEvents: 'Matukio ya Kibinafsi',
      weekend: 'Wikendi',
      week: 'Wiki',
      year: 'Mwaka',
      month: 'Mwezi',
      day: 'Siku',
      export: 'Hamisha',
      settings: 'Mipangilio',
      noHolidays: 'Hakuna sikukuu',
    },
  },
  fr: {
    months: {
      long: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
             'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
      short: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun',
              'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'],
    },
    weekdays: {
      long: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
      short: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
      narrow: ['D', 'L', 'M', 'M', 'J', 'V', 'S'],
    },
    ui: {
      today: "Aujourd'hui",
      holidays: 'Jours fériés',
      customEvents: 'Événements personnalisés',
      weekend: 'Week-end',
      week: 'Semaine',
      year: 'Année',
      month: 'Mois',
      day: 'Jour',
      export: 'Exporter',
      settings: 'Paramètres',
      noHolidays: 'Pas de jours fériés',
    },
  },
  ar: {
    months: {
      long: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
             'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
      short: ['ينا', 'فبر', 'مار', 'أبر', 'ماي', 'يون',
              'يول', 'أغس', 'سبت', 'أكت', 'نوف', 'ديس'],
    },
    weekdays: {
      long: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
      short: ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'],
      narrow: ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'],
    },
    ui: {
      today: 'اليوم',
      holidays: 'العطلات',
      customEvents: 'أحداث مخصصة',
      weekend: 'نهاية الأسبوع',
      week: 'أسبوع',
      year: 'سنة',
      month: 'شهر',
      day: 'يوم',
      export: 'تصدير',
      settings: 'الإعدادات',
      noHolidays: 'لا توجد عطلات',
    },
  },
  pt: {
    months: {
      long: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
             'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
      short: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
              'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
    },
    weekdays: {
      long: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
      short: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
      narrow: ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'],
    },
    ui: {
      today: 'Hoje',
      holidays: 'Feriados',
      customEvents: 'Eventos Personalizados',
      weekend: 'Fim de semana',
      week: 'Semana',
      year: 'Ano',
      month: 'Mês',
      day: 'Dia',
      export: 'Exportar',
      settings: 'Configurações',
      noHolidays: 'Sem feriados',
    },
  },
  // Add remaining languages (am, yo, zu, ha, ig) with similar structure
  am: {
    months: {
      long: ['ጃንዩወሪ', 'ፌብሩወሪ', 'ማርች', 'ኤፕሪል', 'ሜይ', 'ጁን',
             'ጁላይ', 'ኦገስት', 'ሴፕቴምበር', 'ኦክቶበር', 'ኖቬምበር', 'ዲሴምበር'],
      short: ['ጃን', 'ፌብ', 'ማር', 'ኤፕ', 'ሜይ', 'ጁን', 'ጁላ', 'ኦገ', 'ሴፕ', 'ኦክ', 'ኖቬ', 'ዲሴ'],
    },
    weekdays: {
      long: ['እሑድ', 'ሰኞ', 'ማክሰኞ', 'ረቡዕ', 'ሐሙስ', 'ዓርብ', 'ቅዳሜ'],
      short: ['እሑድ', 'ሰኞ', 'ማክ', 'ረቡ', 'ሐሙ', 'ዓርብ', 'ቅዳ'],
      narrow: ['እ', 'ሰ', 'ማ', 'ረ', 'ሐ', 'ዓ', 'ቅ'],
    },
    ui: {
      today: 'ዛሬ',
      holidays: 'በዓላት',
      customEvents: 'ብጁ ክስተቶች',
      weekend: 'ቅዳሜና እሑድ',
      week: 'ሳምንት',
      year: 'ዓመት',
      month: 'ወር',
      day: 'ቀን',
      export: 'ላክ',
      settings: 'ቅንብሮች',
      noHolidays: 'በዓላት የሉም',
    },
  },
  yo: {
    months: {
      long: ['Oṣù Ṣẹ́rẹ́', 'Oṣù Èrèlè', 'Oṣù Ẹrẹ̀nà', 'Oṣù Ìgbé', 'Oṣù Ẹ̀bibi', 'Oṣù Òkúdu',
             'Oṣù Agẹmọ', 'Oṣù Ògún', 'Oṣù Owewe', 'Oṣù Ọ̀wàrà', 'Oṣù Bélú', 'Oṣù Ọ̀pẹ̀'],
      short: ['Ṣẹ́r', 'Èrè', 'Ẹrẹ̀', 'Ìgb', 'Ẹ̀bi', 'Òkú', 'Agẹ', 'Ògú', 'Owe', 'Ọ̀wà', 'Bél', 'Ọ̀pẹ̀'],
    },
    weekdays: {
      long: ['Ọjọ́ Àìkú', 'Ọjọ́ Ajé', 'Ọjọ́ Ìṣẹ́gun', 'Ọjọ́rú', 'Ọjọ́bọ̀', 'Ọjọ́ Ẹtì', 'Ọjọ́ Àbámẹ́ta'],
      short: ['Àìk', 'Ajé', 'Ìṣẹ́', 'Ọjọ́', 'Ọjọ́b', 'Ẹtì', 'Àbá'],
      narrow: ['À', 'A', 'Ì', 'Ọ', 'Ọ', 'Ẹ', 'À'],
    },
    ui: {
      today: 'Lónìí',
      holidays: 'Ọjọ́ Ìsinmi',
      customEvents: 'Àwọn Ìṣẹ̀lẹ̀ Àdáni',
      weekend: 'Ìparí Ọ̀sẹ̀',
      week: 'Ọ̀sẹ̀',
      year: 'Ọdún',
      month: 'Oṣù',
      day: 'Ọjọ́',
      export: 'Gbé Jáde',
      settings: 'Ètò',
      noHolidays: 'Kò sí ọjọ́ ìsinmi',
    },
  },
  zu: {
    months: {
      long: ['uMasingana', 'uNhlolanja', 'uNdasa', 'uMbasa', 'uNhlaba', 'uNhlangulana',
             'uNtulikazi', 'uNcwaba', 'uMandulo', 'uMfumfu', 'uLwezi', 'uZibandlela'],
      short: ['Mas', 'Nhlo', 'Nda', 'Mba', 'Nhla', 'Nhlu', 'Ntu', 'Ncw', 'Man', 'Mfu', 'Lwe', 'Zib'],
    },
    weekdays: {
      long: ['ISonto', 'UMsombuluko', 'ULwesibili', 'ULwesithathu', 'ULwesine', 'ULwesihlanu', 'UMgqibelo'],
      short: ['Son', 'Mso', 'Bil', 'Tha', 'Sin', 'Hla', 'Mgq'],
      narrow: ['S', 'M', 'B', 'T', 'S', 'H', 'M'],
    },
    ui: {
      today: 'Namuhla',
      holidays: 'Amaholide',
      customEvents: 'Imicimbi Yakho',
      weekend: 'Impelasonto',
      week: 'Iviki',
      year: 'Unyaka',
      month: 'Inyanga',
      day: 'Usuku',
      export: 'Thumela',
      settings: 'Izilungiselelo',
      noHolidays: 'Awekho amaholide',
    },
  },
  ha: {
    months: {
      long: ['Janairu', 'Fabrairu', 'Maris', 'Afrilu', 'Mayu', 'Yuni',
             'Yuli', 'Agusta', 'Satumba', 'Oktoba', 'Nuwamba', 'Disamba'],
      short: ['Jan', 'Fab', 'Mar', 'Afr', 'May', 'Yun', 'Yul', 'Agu', 'Sat', 'Okt', 'Nuw', 'Dis'],
    },
    weekdays: {
      long: ['Lahadi', 'Litinin', 'Talata', 'Laraba', 'Alhamis', 'Jummaʼa', 'Asabar'],
      short: ['Lah', 'Lit', 'Tal', 'Lar', 'Alh', 'Jum', 'Asa'],
      narrow: ['L', 'L', 'T', 'L', 'A', 'J', 'A'],
    },
    ui: {
      today: 'Yau',
      holidays: 'Ranakun Hutu',
      customEvents: 'Abubuwan da aka tsara',
      weekend: 'Karshen Mako',
      week: 'Mako',
      year: 'Shekara',
      month: 'Wata',
      day: 'Rana',
      export: 'Fitar',
      settings: 'Saituna',
      noHolidays: 'Babu ranakun hutu',
    },
  },
  ig: {
    months: {
      long: ['Jenụwarị', 'Febrụwarị', 'Maachị', 'Eprel', 'Mee', 'Juun',
             'Julaị', 'Ọgọọst', 'Septemba', 'Ọktoba', 'Novemba', 'Disemba'],
      short: ['Jen', 'Feb', 'Maa', 'Epr', 'Mee', 'Juu', 'Jul', 'Ọgọ', 'Sep', 'Ọkt', 'Nov', 'Dis'],
    },
    weekdays: {
      long: ['Ụbọchị Ụka', 'Mọnde', 'Tuzdee', 'Wenezdee', 'Tọọzdee', 'Fraịdee', 'Satọdee'],
      short: ['Ụka', 'Mọn', 'Tuz', 'Wen', 'Tọọ', 'Fra', 'Sat'],
      narrow: ['Ụ', 'M', 'T', 'W', 'T', 'F', 'S'],
    },
    ui: {
      today: 'Taa',
      holidays: 'Ụbọchị ezumike',
      customEvents: 'Ihe omume nke onwe',
      weekend: 'Ngwụcha izu',
      week: 'Izu',
      year: 'Afọ',
      month: 'Ọnwa',
      day: 'Ụbọchị',
      export: 'Mbupụ',
      settings: 'Ntọala',
      noHolidays: 'Enweghị ụbọchị ezumike',
    },
  },
}
```

---

*Continue to [06-design-editor.md](./06-design-editor.md) for the canvas-based design studio implementation.*
