import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
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
    country: 'KE',
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
        type: 'custom',
        updatedAt: new Date().toISOString(),
      } as CustomHoliday
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
  // Migrate previous default country
  if (config.value.country === 'ZA') {
    config.value.country = 'KE'
  }
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
