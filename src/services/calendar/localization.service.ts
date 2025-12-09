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
