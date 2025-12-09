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
