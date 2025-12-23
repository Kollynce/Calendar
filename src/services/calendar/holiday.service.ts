import Holidays from 'date-holidays'
import { format, parseISO } from 'date-fns'
import type { Holiday, CustomHoliday, CountryCode, LanguageCode } from '@/types'
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
    language?: LanguageCode,
    forceRefresh = false
  ): Promise<{ holidays: Holiday[]; source: 'api' | 'static' }> {
    const cacheKey = `${country}-${year}-${language || 'en'}`

    // Check cache
    if (!forceRefresh && this.isCacheValid(cacheKey)) {
      return {
        holidays: this.cache.get(cacheKey)!,
        source: 'api'
      }
    }

    try {
      // Try API first
      this.holidayLib.init(country, language)
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
    month: number,
    language?: LanguageCode
  ): Promise<Holiday[]> {
    const { holidays } = await this.getHolidays(country, year, language)

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
    date: Date,
    language?: LanguageCode
  ): Promise<Holiday[]> {
    const year = date.getFullYear()
    const { holidays } = await this.getHolidays(country, year, language)
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
      const { frequency, endDate } = holiday.recurrence
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
