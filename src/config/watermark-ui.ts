import type { WatermarkMode, WatermarkPositionPreset } from '../types'

export const WATERMARK_MODE_OPTIONS: { id: WatermarkMode; label: string; subtitle: string }[] = [
  { id: 'text', label: 'Text', subtitle: 'Custom credit line' },
  { id: 'image', label: 'Logo', subtitle: 'Use a brand mark' },
]

export const WATERMARK_PRESETS: { value: WatermarkPositionPreset; label: string }[] = [
  { value: 'top-left', label: 'Top left' },
  { value: 'top-right', label: 'Top right' },
  { value: 'bottom-left', label: 'Bottom left' },
  { value: 'bottom-right', label: 'Bottom right' },
  { value: 'center', label: 'Center' },
  { value: 'custom', label: 'Custom' },
]
