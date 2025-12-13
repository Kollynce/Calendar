import type { TemplateOptions } from '@/types'

export const DEFAULT_TEMPLATE_OPTIONS: TemplateOptions = {
  highlightToday: true,
  highlightWeekends: true,
  hasPhotoArea: false,
  hasNotesArea: false,
  primaryColor: '#1a1a1a',
  accentColor: '#6366f1',
  backgroundColor: '#ffffff',
}

export function mergeTemplateOptions(
  overrides?: Partial<TemplateOptions>,
): TemplateOptions {
  if (!overrides) {
    return { ...DEFAULT_TEMPLATE_OPTIONS }
  }

  const sanitizedEntries = Object.entries(overrides).filter(
    ([, value]) => value !== undefined,
  )

  const sanitizedOverrides = Object.fromEntries(sanitizedEntries) as Partial<TemplateOptions>

  return {
    ...DEFAULT_TEMPLATE_OPTIONS,
    ...sanitizedOverrides,
  }
}
