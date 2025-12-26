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
} from 'date-fns'
import type {
  Holiday,
  WeekDay,
  CalendarDay,
  CalendarMonth,
  CalendarYear,
} from '@/types'
import { translations } from '@/data/translations'
import type { LanguageCode } from '@/types'

const LOCALE_MAP: Record<string, string> = {
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

class CalendarGeneratorService {
  /**
   * Generate calendar data for an entire year
   */
  generateYear(
    year: number,
    holidays: Holiday[],
    startDay: WeekDay = 0,
    language: string = 'en'
  ): CalendarYear {
    const months: CalendarMonth[] = []

    for (let month = 1; month <= 12; month++) {
      months.push(this.generateMonth(year, month, holidays, startDay, language))
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
    language: string = 'en'
  ): CalendarMonth {
    // Note: locale mapping available but not currently used
    // const locale = LOCALE_MAP[language] || language
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
      name: this.getMonthName(month, language, 'long'),
      shortName: this.getMonthName(month, language, 'short'),
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
    language: string = 'en',
    formatStyle: 'long' | 'short' | 'narrow' = 'short'
  ): string[] {
    // Check if we have translations for this language
    const langCode = language as LanguageCode
    const translation = translations[langCode]
    
    if (translation && translation.weekdays) {
      // Use our translation files for proper abbreviations
      const weekdayNames = translation.weekdays[formatStyle]
      const days: string[] = []
      
      for (let i = 0; i < 7; i++) {
        const dayIndex = (startDay + i) % 7
        const dayName = weekdayNames[dayIndex]
        if (dayName) {
          days.push(dayName)
        }
      }
      
      if (days.length === 7) {
        return days
      }
    }
    
    // Fallback to browser locale if translation not available
    const locale = LOCALE_MAP[language] || `${language}-${language.toUpperCase()}`
    const baseSunday = new Date(2024, 0, 7)
    const days: string[] = []

    for (let i = 0; i < 7; i++) {
      const date = new Date(baseSunday)
      date.setDate(baseSunday.getDate() + ((startDay + i) % 7))

      try {
        days.push(
          date.toLocaleDateString(locale, { weekday: formatStyle })
        )
      } catch (e) {
        days.push(
          date.toLocaleDateString('en-US', { weekday: formatStyle })
        )
      }
    }

    return days
  }

  /**
   * Get month name
   */
  getMonthName(
    month: number,
    language: string = 'en',
    formatStyle: 'long' | 'short' = 'long'
  ): string {
    const locale = LOCALE_MAP[language] || language
    const date = new Date(2024, month - 1, 1)
    return date.toLocaleDateString(locale, { month: formatStyle })
  }

  /**
   * Get all month names for a locale
   */
  getAllMonthNames(
    language: string = 'en',
    formatStyle: 'long' | 'short' = 'long'
  ): string[] {
    return Array.from({ length: 12 }, (_, i) =>
      this.getMonthName(i + 1, language, formatStyle)
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
