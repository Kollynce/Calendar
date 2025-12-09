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
