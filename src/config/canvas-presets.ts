import { PAPER_SIZES } from './constants'

export const PX_PER_MM = 744 / 210 // Derived from default A4 portrait used in editor (210mm → 744px)

export interface CanvasPreset {
  key: string
  label: string
  widthMm: number
  heightMm: number
}

export function mmToPx(mm: number): number {
  return Math.round(mm * PX_PER_MM)
}

export function pxToMm(px: number): number {
  return Math.round((px / PX_PER_MM) * 10) / 10
}

export function inchesToMm(inches: number): number {
  return Math.round(inches * 25.4 * 10) / 10
}

const basePresets: CanvasPreset[] = (
  Object.entries(PAPER_SIZES) as [string, { width: number; height: number }][]
).map(([key, size]): CanvasPreset => ({
  key,
  label: key,
  widthMm: size.width,
  heightMm: size.height,
}))

const extraPresets: CanvasPreset[] = [
  { key: 'A5', label: 'A5', widthMm: 148, heightMm: 210 },
  { key: 'Tabloid', label: 'Tabloid', widthMm: 279, heightMm: 432 },
  { key: 'Executive', label: 'Executive', widthMm: 184, heightMm: 266 },
  { key: 'Poster18x24', label: 'Poster 18\" × 24\"', widthMm: inchesToMm(18), heightMm: inchesToMm(24) },
  { key: 'Square12in', label: 'Square 12\"', widthMm: inchesToMm(12), heightMm: inchesToMm(12) },
  { key: 'Photo4x6', label: 'Photo 4\" × 6\"', widthMm: inchesToMm(4), heightMm: inchesToMm(6) },
  { key: 'Photo5x7', label: 'Photo 5\" × 7\"', widthMm: inchesToMm(5), heightMm: inchesToMm(7) },
  { key: 'Poster24x36', label: 'Poster 24\" × 36\"', widthMm: inchesToMm(24), heightMm: inchesToMm(36) },
  { key: 'InstagramSquare', label: 'Instagram Square 1080px', widthMm: pxToMm(1080), heightMm: pxToMm(1080) },
  { key: 'InstagramStory', label: 'Instagram Story 1080 × 1920px', widthMm: pxToMm(1080), heightMm: pxToMm(1920) },
  { key: 'PresentationHD', label: 'Presentation 1920 × 1080px', widthMm: pxToMm(1920), heightMm: pxToMm(1080) },
  { key: 'PinterestPin', label: 'Pinterest Pin 1000 × 1500px', widthMm: pxToMm(1000), heightMm: pxToMm(1500) },
]

export const CANVAS_SIZE_PRESETS = [...basePresets, ...extraPresets]

export function getPresetByCanvasSize(widthPx: number, heightPx: number): CanvasPreset | null {
  const tolerance = 2 // px tolerance to account for rounding
  return (
    CANVAS_SIZE_PRESETS.find((preset) => {
      const portraitWidth = mmToPx(preset.widthMm)
      const portraitHeight = mmToPx(preset.heightMm)
      const landscapeWidth = portraitHeight
      const landscapeHeight = portraitWidth

      const isPortraitMatch =
        Math.abs(widthPx - portraitWidth) <= tolerance &&
        Math.abs(heightPx - portraitHeight) <= tolerance
      const isLandscapeMatch =
        Math.abs(widthPx - landscapeWidth) <= tolerance &&
        Math.abs(heightPx - landscapeHeight) <= tolerance

      return isPortraitMatch || isLandscapeMatch
    }) ?? null
  )
}
