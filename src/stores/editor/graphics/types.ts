import type { Holiday } from '@/types'

export type HolidaysGetter = (year: number, country?: string, language?: string) => Holiday[]
