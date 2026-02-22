import { mmToPx, pxToMm } from './canvas-presets'
import type { CanvasBackgroundPattern, CanvasPatternConfig } from '@/types'

export type CanvasUnit = 'px' | 'mm' | 'cm' | 'in'

export type { CanvasBackgroundPattern, CanvasPatternConfig }

export const PATTERN_OPTIONS: { value: CanvasBackgroundPattern; label: string; icon: string }[] = [
  { value: 'none', label: 'None', icon: '○' },
  { value: 'ruled', label: 'Ruled', icon: '☰' },
  { value: 'grid', label: 'Grid', icon: '▦' },
  { value: 'dot', label: 'Dotted', icon: '⁙' },
]

export const DEFAULT_PATTERN_CONFIG: CanvasPatternConfig = {
  pattern: 'none',
  color: '#e2e8f0',
  spacing: 24,
  opacity: 0.5,
}

export const UNIT_OPTIONS: { value: CanvasUnit; label: string }[] = [
  { value: 'px', label: 'Pixels (px)' },
  { value: 'mm', label: 'Millimeters (mm)' },
  { value: 'cm', label: 'Centimeters (cm)' },
  { value: 'in', label: 'Inches (in)' },
]

export const PRESET_GROUP_DEFS = [
  {
    label: 'Popular print',
    keys: ['A5', 'A4', 'A3', 'A2', 'Letter', 'Legal', 'Tabloid', 'Executive', 'Poster18x24', 'Poster24x36'],
  },
  {
    label: 'Photo & square',
    keys: ['Photo4x6', 'Photo5x7', 'Square12in'],
  },
  {
    label: 'Digital & social',
    keys: ['InstagramSquare', 'InstagramStory', 'PinterestPin'],
  },
  {
    label: 'Slides & screens',
    keys: ['PresentationHD'],
  },
] as const

export function convertUnitValue(value: number, from: CanvasUnit, to: CanvasUnit): number {
  if (!Number.isFinite(value)) return 0
  if (from === to) return value
  if (from === 'px') {
    if (to === 'mm') return pxToMm(value)
    if (to === 'cm') return pxToMm(value) / 10
    if (to === 'in') return pxToMm(value) / 25.4
  }
  if (from === 'mm') {
    if (to === 'px') return mmToPx(value)
    if (to === 'cm') return value / 10
    if (to === 'in') return value / 25.4
  }
  if (from === 'cm') {
    if (to === 'px') return mmToPx(value * 10)
    if (to === 'mm') return value * 10
    if (to === 'in') return value / 2.54
  }
  if (from === 'in') {
    if (to === 'px') return mmToPx(value * 25.4)
    if (to === 'mm') return value * 25.4
    if (to === 'cm') return value * 2.54
  }
  return 0
}
