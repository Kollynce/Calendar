import type { WatermarkConfig, WatermarkMode, WatermarkPositionPreset } from '../types'

const DEFAULT_TEXT = 'Created with CalendarCreator'

export const CALENDAR_CREATOR_WATERMARK_IMAGE = new URL(
  '../assets/branding/calendar-creator-logo.svg',
  import.meta.url,
).href

export const FREE_WATERMARK_PRESETS: WatermarkPositionPreset[] = [
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
  'center',
]

const DEFAULT_POSITION_PRESET: WatermarkPositionPreset = 'bottom-right'
const DEFAULT_MODE: WatermarkMode = 'text'

export const DEFAULT_WATERMARK_CONFIG: WatermarkConfig = {
  visible: true,
  mode: DEFAULT_MODE,
  text: DEFAULT_TEXT,
  position: {
    preset: DEFAULT_POSITION_PRESET,
  },
  imageSrc: CALENDAR_CREATOR_WATERMARK_IMAGE,
  size: 0.22,
  opacity: 0.6,
}

type PartialWatermark = Partial<Omit<WatermarkConfig, 'position'>> & {
  position?: Partial<WatermarkConfig['position']>
}

export function normalizeWatermarkConfig(
  incoming?: PartialWatermark | null,
  fallback: WatermarkConfig = DEFAULT_WATERMARK_CONFIG,
): WatermarkConfig {
  const base = { ...fallback }
  if (!incoming) return base

  const next: WatermarkConfig = {
    ...base,
    ...incoming,
    position: {
      preset: incoming.position?.preset ?? base.position.preset,
      coordinates: incoming.position?.coordinates ?? base.position.coordinates,
    },
  }

  if (next.mode === 'text') {
    next.text = incoming.text ?? base.text ?? DEFAULT_TEXT
    next.imageId = undefined
    next.imageSrc = undefined
  } else {
    next.text = incoming.text ?? base.text
  }

  next.size = clamp(next.size, 0.05, 1)
  next.opacity = clamp(next.opacity, 0, 1)

  // Ensure coordinates stay within canvas bounds when provided
  if (next.position.coordinates) {
    next.position.coordinates = {
      x: clamp(next.position.coordinates.x, 0, 1),
      y: clamp(next.position.coordinates.y, 0, 1),
    }
  }

  return next
}

export function clamp(value: number | undefined, min: number, max: number): number {
  if (!Number.isFinite(Number(value))) return min
  return Math.min(Math.max(Number(value), min), max)
}

export function enforceWatermarkForTier(
  config: WatermarkConfig,
  options: { requiresWatermark: boolean },
): WatermarkConfig {
  const normalized = normalizeWatermarkConfig(config, DEFAULT_WATERMARK_CONFIG)
  if (!options.requiresWatermark) {
    return normalized
  }

  const clampedPreset = FREE_WATERMARK_PRESETS.includes(normalized.position.preset)
    ? normalized.position.preset
    : DEFAULT_POSITION_PRESET

  return {
    ...normalized,
    visible: true,
    mode: 'image',
    text: DEFAULT_TEXT,
    imageId: undefined,
    imageSrc: normalized.imageSrc || CALENDAR_CREATOR_WATERMARK_IMAGE,
    opacity: 0.6,
    size: clamp(normalized.size, 0.18, 0.32),
    position: { preset: clampedPreset },
  }
}
