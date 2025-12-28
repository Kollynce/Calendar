import { useEditorStore } from '@/stores/editor.store'
import type { SubscriptionTier } from '@/types'

export type ElementType = 'shape' | 'calendar' | 'planner' | 'text' | 'collage'

export interface ElementItem {
  id: string
  name: string
  icon: string
  type: ElementType
  description?: string
  shapeType?: string
  calendarType?: 'month-grid' | 'week-strip' | 'date-cell'
  plannerType?: 'notes-panel' | 'schedule' | 'checklist'
  collageLayout?: 'grid-2x2' | 'grid-3x3' | 'grid-2x3' | 'masonry' | 'polaroid' | 'filmstrip' | 'scrapbook' | 'mood-board'
  options?: Record<string, any>
  requiredTier?: SubscriptionTier
}

export interface ElementCategory {
  name: string
  items: ElementItem[]
  collapsed?: boolean
}

export interface EmojiCategory {
  id: string
  name: string
  icon: string
  emojis: string[]
}

export const elementPlacementDefaults: Record<ElementType, { x: number; y: number }> = {
  shape: { x: 140, y: 140 },
  calendar: { x: 80, y: 220 },
  planner: { x: 420, y: 160 },
  text: { x: 180, y: 180 },
  collage: { x: 100, y: 100 },
}

// Expanded emoji library organized by categories
export const emojiCategories: EmojiCategory[] = [
  {
    id: 'popular',
    name: 'Popular',
    icon: '⭐',
    emojis: ['😊', '❤️', '✨', '🎉', '🔥', '💯', '👍', '🙌', '💪', '🎯', '⚡', '🌟'],
  },
  {
    id: 'faces',
    name: 'Faces',
    icon: '😀',
    emojis: ['😀', '😃', '😄', '😁', '😊', '🥰', '😍', '🤩', '😎', '🤗', '🤔', '😌', '😴', '🥳', '😇', '🙂'],
  },
  {
    id: 'hearts',
    name: 'Hearts & Love',
    icon: '❤️',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💕', '💖', '💗', '💘', '💝', '💞', '💓'],
  },
  {
    id: 'nature',
    name: 'Nature',
    icon: '🌸',
    emojis: ['🌸', '🌺', '🌻', '🌹', '🌷', '💐', '🌿', '🍀', '🌴', '🌳', '🌲', '🍁', '🍂', '🌾', '☀️', '🌙'],
  },
  {
    id: 'weather',
    name: 'Weather',
    icon: '☀️',
    emojis: ['☀️', '🌤️', '⛅', '🌥️', '☁️', '🌧️', '⛈️', '🌩️', '❄️', '🌨️', '🌪️', '🌈', '💧', '💦', '🌊', '⚡'],
  },
  {
    id: 'celebration',
    name: 'Celebration',
    icon: '🎉',
    emojis: ['🎉', '🎊', '🎈', '🎁', '🎀', '🎂', '🍰', '🥳', '🎆', '🎇', '✨', '🎄', '🎃', '🎗️', '🏆', '🥇'],
  },
  {
    id: 'food',
    name: 'Food & Drink',
    icon: '🍕',
    emojis: ['🍕', '🍔', '🍟', '🌮', '🍣', '🍜', '🍝', '🍩', '🍪', '🍫', '🍦', '🧁', '☕', '🍵', '🧃', '🍷'],
  },
  {
    id: 'animals',
    name: 'Animals',
    icon: '🐱',
    emojis: ['🐱', '🐶', '🐰', '🦊', '🐻', '🐼', '🐨', '🦁', '🐯', '🦋', '🐝', '🐞', '🦄', '🐬', '🦅', '🦉'],
  },
  {
    id: 'travel',
    name: 'Travel',
    icon: '✈️',
    emojis: ['✈️', '🚗', '🚕', '🚌', '🚂', '🚀', '🛸', '⛵', '🏖️', '🏔️', '🗼', '🗽', '🏰', '⛺', '🎡', '🌍'],
  },
  {
    id: 'activities',
    name: 'Activities',
    icon: '⚽',
    emojis: ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🎱', '🏓', '🎯', '🎮', '🎨', '🎭', '🎬', '🎤', '🎧', '🎹'],
  },
  {
    id: 'objects',
    name: 'Objects',
    icon: '💡',
    emojis: ['💡', '🔔', '📌', '📎', '✏️', '📝', '📅', '📆', '🗓️', '📋', '📁', '💼', '🎒', '👓', '🔑', '🔒'],
  },
  {
    id: 'symbols',
    name: 'Symbols',
    icon: '✅',
    emojis: ['✅', '❌', '⭕', '❗', '❓', '💯', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🔶', '🔷'],
  },
  {
    id: 'arrows',
    name: 'Arrows',
    icon: '➡️',
    emojis: ['➡️', '⬅️', '⬆️', '⬇️', '↗️', '↘️', '↙️', '↖️', '↕️', '↔️', '🔄', '🔃', '🔙', '🔚', '🔛', '🔜'],
  },
  {
    id: 'zodiac',
    name: 'Zodiac',
    icon: '♈',
    emojis: ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '⛎', '🔯', '☯️', '🌙'],
  },
  {
    id: 'hands',
    name: 'Hands',
    icon: '👋',
    emojis: ['👋', '🤚', '✋', '🖐️', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👍', '👎', '👏'],
  },
]

// Premium decorative elements
export const decorativeElements: ElementItem[] = [
  // Frames & Containers
  {
    id: 'soft-frame',
    name: 'Soft Frame',
    icon: '⬜',
    type: 'shape',
    shapeType: 'rect',
    description: 'Rounded photo frame',
    requiredTier: 'pro',
    options: { width: 240, height: 180, cornerRadius: 32, fill: '#ffffff', stroke: '#e2e8f0', strokeWidth: 2 },
  },
  {
    id: 'gradient-card',
    name: 'Gradient Card',
    icon: '🎨',
    type: 'shape',
    shapeType: 'rect',
    description: 'Modern gradient card',
    requiredTier: 'pro',
    options: { width: 280, height: 160, cornerRadius: 20, fill: '#f0f9ff', stroke: '#bae6fd', strokeWidth: 1 },
  },
  {
    id: 'pill-badge',
    name: 'Pill Badge',
    icon: '💊',
    type: 'shape',
    shapeType: 'rect',
    description: 'Rounded pill shape',
    requiredTier: 'pro',
    options: { width: 120, height: 40, cornerRadius: 20, fill: '#fef3c7', stroke: '#fcd34d', strokeWidth: 1 },
  },
  {
    id: 'circle-frame',
    name: 'Circle Frame',
    icon: '⭕',
    type: 'shape',
    shapeType: 'circle',
    description: 'Circular photo frame',
    requiredTier: 'pro',
    options: { radius: 80, fill: '#ffffff', stroke: '#e2e8f0', strokeWidth: 3 },
  },
  // Accent shapes
  {
    id: 'accent-dot',
    name: 'Accent Dot',
    icon: '●',
    type: 'shape',
    shapeType: 'circle',
    description: 'Small decorative dot',
    options: { radius: 8, fill: '#3b82f6' },
  },
  {
    id: 'highlight-bar',
    name: 'Highlight Bar',
    icon: '▬',
    type: 'shape',
    shapeType: 'rect',
    description: 'Accent highlight bar',
    options: { width: 60, height: 6, cornerRadius: 3, fill: '#f59e0b' },
  },
  {
    id: 'section-divider',
    name: 'Section Divider',
    icon: '━',
    type: 'shape',
    shapeType: 'line',
    description: 'Elegant section divider',
    options: { width: 200, stroke: '#cbd5e1', strokeWidth: 1 },
  },
]

// Sticker-style elements (emojis with preset styles)
export const stickerElements: ElementItem[] = [
  {
    id: 'sticker-star',
    name: 'Star',
    icon: '⭐',
    type: 'text',
    description: 'Star sticker',
    options: { content: '⭐', fontSize: 48, fontFamily: 'Noto Color Emoji, Segoe UI Emoji, Apple Color Emoji, sans-serif' },
  },
  {
    id: 'sticker-heart',
    name: 'Heart',
    icon: '❤️',
    type: 'text',
    description: 'Heart sticker',
    options: { content: '❤️', fontSize: 48, fontFamily: 'Noto Color Emoji, Segoe UI Emoji, Apple Color Emoji, sans-serif' },
  },
  {
    id: 'sticker-sparkle',
    name: 'Sparkle',
    icon: '✨',
    type: 'text',
    description: 'Sparkle sticker',
    options: { content: '✨', fontSize: 48, fontFamily: 'Noto Color Emoji, Segoe UI Emoji, Apple Color Emoji, sans-serif' },
  },
  {
    id: 'sticker-fire',
    name: 'Fire',
    icon: '🔥',
    type: 'text',
    description: 'Fire sticker',
    options: { content: '🔥', fontSize: 48, fontFamily: 'Noto Color Emoji, Segoe UI Emoji, Apple Color Emoji, sans-serif' },
  },
  {
    id: 'sticker-check',
    name: 'Check',
    icon: '✅',
    type: 'text',
    description: 'Check sticker',
    options: { content: '✅', fontSize: 48, fontFamily: 'Noto Color Emoji, Segoe UI Emoji, Apple Color Emoji, sans-serif' },
  },
  {
    id: 'sticker-target',
    name: 'Target',
    icon: '🎯',
    type: 'text',
    description: 'Target sticker',
    options: { content: '🎯', fontSize: 48, fontFamily: 'Noto Color Emoji, Segoe UI Emoji, Apple Color Emoji, sans-serif' },
  },
]

// Icon elements (text-based icons)
export const iconElements: ElementItem[] = [
  {
    id: 'icon-calendar',
    name: 'Calendar',
    icon: '📅',
    type: 'text',
    description: 'Calendar icon',
    options: { content: '📅', fontSize: 32, fontFamily: 'Noto Color Emoji, Segoe UI Emoji, Apple Color Emoji, sans-serif' },
  },
  {
    id: 'icon-clock',
    name: 'Clock',
    icon: '🕐',
    type: 'text',
    description: 'Clock icon',
    options: { content: '🕐', fontSize: 32, fontFamily: 'Noto Color Emoji, Segoe UI Emoji, Apple Color Emoji, sans-serif' },
  },
  {
    id: 'icon-pin',
    name: 'Pin',
    icon: '📌',
    type: 'text',
    description: 'Pin icon',
    options: { content: '📌', fontSize: 32, fontFamily: 'Noto Color Emoji, Segoe UI Emoji, Apple Color Emoji, sans-serif' },
  },
  {
    id: 'icon-bell',
    name: 'Bell',
    icon: '🔔',
    type: 'text',
    description: 'Bell icon',
    options: { content: '🔔', fontSize: 32, fontFamily: 'Noto Color Emoji, Segoe UI Emoji, Apple Color Emoji, sans-serif' },
  },
  {
    id: 'icon-note',
    name: 'Note',
    icon: '📝',
    type: 'text',
    description: 'Note icon',
    options: { content: '📝', fontSize: 32, fontFamily: 'Noto Color Emoji, Segoe UI Emoji, Apple Color Emoji, sans-serif' },
  },
  {
    id: 'icon-folder',
    name: 'Folder',
    icon: '📁',
    type: 'text',
    description: 'Folder icon',
    options: { content: '📁', fontSize: 32, fontFamily: 'Noto Color Emoji, Segoe UI Emoji, Apple Color Emoji, sans-serif' },
  },
]

export const elementCategories: ElementCategory[] = [
  {
    name: 'Basic Shapes',
    items: [
      { id: 'rect', name: 'Rectangle', icon: '▢', type: 'shape', shapeType: 'rect', options: { width: 220, height: 140, fill: '#f4f4f5', stroke: '#d4d4d8', strokeWidth: 1 } },
      { id: 'rounded-rect', name: 'Rounded Rect', icon: '▢', type: 'shape', shapeType: 'rect', options: { width: 220, height: 120, cornerRadius: 28, fill: '#fef3c7', stroke: '#fcd34d', strokeWidth: 1 } },
      { id: 'circle', name: 'Circle', icon: '○', type: 'shape', shapeType: 'circle', options: { radius: 70, fill: '#dbeafe' } },
      { id: 'ellipse', name: 'Ellipse', icon: '⬭', type: 'shape', shapeType: 'ellipse', options: { width: 160, height: 100, fill: '#fce7f3', stroke: '#f9a8d4', strokeWidth: 1 } },
      { id: 'triangle', name: 'Triangle', icon: '△', type: 'shape', shapeType: 'triangle', options: { width: 120, height: 104, fill: '#dcfce7', stroke: '#86efac', strokeWidth: 1 } },
      { id: 'square', name: 'Square', icon: '■', type: 'shape', shapeType: 'rect', options: { width: 120, height: 120, fill: '#e0e7ff', stroke: '#a5b4fc', strokeWidth: 1 } },
    ],
  },
  {
    name: 'Lines & Arrows',
    items: [
      { id: 'line', name: 'Line', icon: '—', type: 'shape', shapeType: 'line', options: { width: 260, stroke: '#0f172a', strokeWidth: 4 } },
      { id: 'arrow', name: 'Arrow', icon: '→', type: 'shape', shapeType: 'arrow', options: { width: 240, stroke: '#1d4ed8', strokeWidth: 4, arrowEnds: 'end', arrowHeadStyle: 'filled', arrowHeadLength: 18, arrowHeadWidth: 14 } },
      { id: 'divider', name: 'Divider', icon: '┄', type: 'shape', shapeType: 'line', options: { width: 260, stroke: '#94a3b8', strokeWidth: 2, strokeDashArray: [10, 8] } },
      { id: 'double-arrow', name: 'Double Arrow', icon: '↔', type: 'shape', shapeType: 'arrow', options: { width: 200, stroke: '#7c3aed', strokeWidth: 3, arrowEnds: 'both', arrowHeadStyle: 'filled', arrowHeadLength: 14, arrowHeadWidth: 10 } },
    ],
  },
  {
    name: 'Calendar Elements',
    items: [
      { id: 'month-grid', name: 'Month Grid', icon: '▦', type: 'calendar', calendarType: 'month-grid', options: { width: 460, height: 360 } },
      { id: 'week-strip', name: 'Week Strip', icon: '▤', type: 'calendar', calendarType: 'week-strip', options: { width: 520, height: 180 } },
      { id: 'date-cell', name: 'Date Cell', icon: '□', type: 'calendar', calendarType: 'date-cell', options: { width: 200, height: 220 } },
    ],
  },
  {
    name: 'Planner Blocks',
    items: [
      {
        id: 'notes-panel',
        name: 'Notes Panel',
        icon: '🗒️',
        type: 'planner',
        plannerType: 'notes-panel',
        description: 'Patterned notes panel',
        requiredTier: 'pro',
        options: { pattern: 'ruled', title: 'Notes', accentColor: '#2563eb', width: 320, height: 320 },
      },
      {
        id: 'schedule-block',
        name: 'Schedule',
        icon: '🕒',
        type: 'planner',
        plannerType: 'schedule',
        description: 'Timeline schedule',
        requiredTier: 'pro',
        options: { title: 'Schedule', accentColor: '#a855f7', startHour: 6, endHour: 20, intervalMinutes: 60, width: 320, height: 640 },
      },
      {
        id: 'checklist-block',
        name: 'Checklist',
        icon: '☑️',
        type: 'planner',
        plannerType: 'checklist',
        description: 'To-do list',
        requiredTier: 'pro',
        options: { title: 'To Do', accentColor: '#ec4899', rows: 8, showCheckboxes: true, width: 320, height: 420 },
      },
    ],
  },
  {
    name: 'Photo Collages',
    items: [
      {
        id: 'collage-grid-2x2',
        name: '2×2 Grid',
        icon: '⊞',
        type: 'collage',
        collageLayout: 'grid-2x2',
        description: 'Simple 4-photo grid layout',
        requiredTier: 'pro',
        options: { width: 400, height: 400 },
      },
      {
        id: 'collage-grid-3x3',
        name: '3×3 Grid',
        icon: '▦',
        type: 'collage',
        collageLayout: 'grid-3x3',
        description: '9-photo grid layout',
        requiredTier: 'pro',
        options: { width: 450, height: 450 },
      },
      {
        id: 'collage-grid-2x3',
        name: '2×3 Grid',
        icon: '▤',
        type: 'collage',
        collageLayout: 'grid-2x3',
        description: '6-photo vertical grid',
        requiredTier: 'pro',
        options: { width: 360, height: 480 },
      },
      {
        id: 'collage-masonry',
        name: 'Masonry',
        icon: '⧉',
        type: 'collage',
        collageLayout: 'masonry',
        description: 'Pinterest-style layout',
        requiredTier: 'pro',
        options: { width: 420, height: 400 },
      },
      {
        id: 'collage-polaroid',
        name: 'Polaroid',
        icon: '📷',
        type: 'collage',
        collageLayout: 'polaroid',
        description: 'Stacked polaroid photos',
        requiredTier: 'pro',
        options: { width: 400, height: 380 },
      },
      {
        id: 'collage-filmstrip',
        name: 'Filmstrip',
        icon: '🎞️',
        type: 'collage',
        collageLayout: 'filmstrip',
        description: 'Horizontal film strip',
        requiredTier: 'pro',
        options: { width: 520, height: 200 },
      },
      {
        id: 'collage-scrapbook',
        name: 'Scrapbook',
        icon: '📔',
        type: 'collage',
        collageLayout: 'scrapbook',
        description: 'Overlapping creative layout',
        requiredTier: 'pro',
        options: { width: 440, height: 400 },
      },
      {
        id: 'collage-mood-board',
        name: 'Mood Board',
        icon: '🎨',
        type: 'collage',
        collageLayout: 'mood-board',
        description: 'Marketing mood board',
        requiredTier: 'pro',
        options: { width: 480, height: 420 },
      },
    ],
  },
  {
    name: 'Frames & Cards',
    items: decorativeElements.slice(0, 4),
  },
  {
    name: 'Accents',
    items: decorativeElements.slice(4),
  },
  {
    name: 'Stickers',
    items: stickerElements,
  },
  {
    name: 'Icons',
    items: iconElements,
  },
]

// Text presets
export const textPresets = [
  { id: 'title', name: 'Title', size: 48, weight: 'bold', family: 'Outfit', sample: 'Add Title' },
  { id: 'heading', name: 'Heading', size: 32, weight: '700', family: 'Outfit', sample: 'Add Heading' },
  { id: 'subheading', name: 'Subheading', size: 24, weight: '600', family: 'Inter', sample: 'Add Subheading' },
  { id: 'body', name: 'Body Text', size: 16, weight: 'normal', family: 'Inter', sample: 'Add body text here...' },
  { id: 'caption', name: 'Caption', size: 12, weight: 'normal', family: 'Inter', sample: 'Add caption' },
  { id: 'label', name: 'Label', size: 10, weight: '600', family: 'Inter', sample: 'LABEL', uppercase: true },
]

// Font combinations
export const fontPairings = [
  { id: 'classic', name: 'Classic', heading: 'Playfair Display', body: 'Inter', preview: 'Aa' },
  { id: 'modern', name: 'Modern', heading: 'Outfit', body: 'Inter', preview: 'Aa' },
  { id: 'casual', name: 'Casual', heading: 'Poppins', body: 'Open Sans', preview: 'Aa' },
  { id: 'elegant', name: 'Elegant', heading: 'Cormorant Garamond', body: 'Lato', preview: 'Aa' },
]

// Calendar text styles
export const calendarTextStyles = [
  { id: 'month-name', name: 'Month Name', size: 28, weight: 'bold', family: 'Outfit', color: '#1a1a1a' },
  { id: 'day-number', name: 'Day Number', size: 14, weight: '500', family: 'Inter', color: '#374151' },
  { id: 'weekday', name: 'Weekday', size: 12, weight: '600', family: 'Inter', color: '#6b7280' },
  { id: 'holiday', name: 'Holiday', size: 10, weight: '500', family: 'Inter', color: '#dc2626' },
]

export function useElements() {
  const editorStore = useEditorStore()

  function getSmartCalendarPlacement(element: ElementItem): { x: number; y: number } {
    const fallback = elementPlacementDefaults[element.type] ?? { x: 140, y: 140 }

    if (element.type !== 'calendar') return fallback
    if (!editorStore.canvas) return fallback

    const canvas = editorStore.canvas
    const canvasWidth = canvas.width || editorStore.project?.canvas.width || 800
    const canvasHeight = canvas.height || editorStore.project?.canvas.height || 600

    const requestedWidth = Number((element.options as any)?.width ?? 0) || 0
    const requestedHeight = Number((element.options as any)?.height ?? 0) || 0

    const margin = 80

    const grid = canvas
      .getObjects()
      .find((obj) => (obj as any)?.data?.elementMetadata?.kind === 'calendar-grid') as any

    if (!grid || typeof grid.getScaledWidth !== 'function' || typeof grid.getScaledHeight !== 'function') {
      if (element.calendarType === 'date-cell' && requestedWidth && requestedHeight) {
        const xRaw = canvasWidth - margin - requestedWidth
        return {
          x: Math.max(margin, Math.min(canvasWidth - margin - requestedWidth, xRaw)),
          y: Math.max(margin, fallback.y),
        }
      }

      if (element.calendarType === 'week-strip' && requestedWidth && requestedHeight) {
        const yRaw = canvasHeight - margin - requestedHeight
        return {
          x: Math.max(margin, Math.min(canvasWidth - margin - requestedWidth, fallback.x)),
          y: Math.max(margin, Math.min(canvasHeight - margin - requestedHeight, yRaw)),
        }
      }

      return fallback
    }

    const gridLeft = Number(grid.left ?? 0) || 0
    const gridTop = Number(grid.top ?? 0) || 0
    const gridWidth = Number(grid.getScaledWidth()) || 0
    const gridHeight = Number(grid.getScaledHeight()) || 0

    if (element.calendarType === 'date-cell' && requestedWidth && requestedHeight) {
      const xRaw = gridLeft + gridWidth + margin
      const x = Math.max(margin, Math.min(canvasWidth - margin - requestedWidth, xRaw))
      const yRaw = gridTop + Math.max(0, (gridHeight - requestedHeight) / 2)
      const y = Math.max(margin, Math.min(canvasHeight - margin - requestedHeight, yRaw))
      return { x, y }
    }

    if (element.calendarType === 'week-strip' && requestedWidth && requestedHeight) {
      const x = Math.max(margin, Math.min(canvasWidth - margin - requestedWidth, gridLeft))
      const yRaw = gridTop + gridHeight + margin
      const y = Math.max(margin, Math.min(canvasHeight - margin - requestedHeight, yRaw))
      return { x, y }
    }

    return fallback
  }

  function addElement(element: ElementItem) {
    const placement = element.type === 'calendar' ? getSmartCalendarPlacement(element) : elementPlacementDefaults[element.type]
    const baseOptions = {
      x: placement?.x,
      y: placement?.y,
    }
    const options = {
      ...baseOptions,
      ...(element.options || {}),
    }

    if (element.type === 'text') {
      editorStore.addObject('text', options)
      return
    }

    if (element.type === 'shape') {
      editorStore.addObject('shape', { shapeType: element.shapeType || 'rect', ...options })
      return
    }

    if (element.type === 'calendar') {
      if (element.calendarType === 'month-grid') {
        editorStore.addObject('calendar-grid', options)
      } else if (element.calendarType === 'week-strip') {
        editorStore.addObject('week-strip', options)
      } else if (element.calendarType === 'date-cell') {
        editorStore.addObject('date-cell', options)
      }
      return
    }

    if (element.type === 'planner') {
      if (element.plannerType === 'notes-panel') {
        editorStore.addObject('notes-panel', options)
      } else if (element.plannerType === 'schedule') {
        editorStore.addObject('schedule', options)
      } else if (element.plannerType === 'checklist') {
        editorStore.addObject('checklist', options)
      }
    }
  }

  function addTextPreset(preset: typeof textPresets[0]) {
    editorStore.addObject('text', {
      content: preset.sample,
      fontSize: preset.size,
      fontFamily: preset.family,
      fontWeight: preset.weight,
      x: 100,
      y: 100
    })
  }

  function addCalendarTextStyle(style: typeof calendarTextStyles[0]) {
    editorStore.addObject('text', {
      content: style.name,
      fontSize: style.size,
      fontFamily: style.family,
      fontWeight: style.weight,
      color: style.color,
      x: 100,
      y: 100
    })
  }

  function applyFontPairing(pairing: typeof fontPairings[0]) {
    editorStore.addObject('text', {
      content: 'Heading',
      fontSize: 32,
      fontFamily: pairing.heading,
      fontWeight: 'bold',
      x: 100,
      y: 100
    })
    
    setTimeout(() => {
      editorStore.addObject('text', {
        content: 'Body text goes here with the matching font.',
        fontSize: 16,
        fontFamily: pairing.body,
        x: 100,
        y: 150
      })
    }, 50)
  }

  return {
    addElement,
    addTextPreset,
    addCalendarTextStyle,
    applyFontPairing,
    getSmartCalendarPlacement,
  }
}
