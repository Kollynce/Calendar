import { useAuthStore } from '@/stores'

export type HolidayMarkerOption = {
  value: string
  label: string
  requiredTier?: 'pro' | 'business'
}

const holidayMarkerOptions: HolidayMarkerOption[] = [
  { value: 'bar', label: 'Bar (Bottom)' },
  { value: 'dot', label: 'Dot (Circle)' },
  { value: 'square', label: 'Square (Solid)' },
  { value: 'border', label: 'Border (Ring)', requiredTier: 'pro' },
  { value: 'triangle', label: 'Corner (Triangle)', requiredTier: 'pro' },
  { value: 'background', label: 'Background (Fill)', requiredTier: 'pro' },
  { value: 'text', label: 'Text (Highlight)', requiredTier: 'pro' },
]

export function useHolidayMarkerOptions() {
  const authStore = useAuthStore()

  function isMarkerLocked(option?: HolidayMarkerOption | null): boolean {
    if (!option?.requiredTier) return false
    if (option.requiredTier === 'pro') return !authStore.isPro
    if (option.requiredTier === 'business') return !authStore.isBusiness
    return false
  }

  return {
    holidayMarkerOptions,
    isMarkerLocked,
  }
}
