import { useEditorStore } from '@/stores/editor.store'
import type { SubscriptionTier } from '@/types'

export type ElementType = 'shape' | 'calendar' | 'planner' | 'text' | 'collage' | 'table'

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
  table: { x: 360, y: 240 },
}

export function getCenteredTablePlacement(
  element: ElementItem,
  sizeOverride?: { width: number; height: number },
): { x: number; y: number } {
  const fallback = elementPlacementDefaults.table
  const editorStore = useEditorStore()
  const canvasWidth = editorStore.canvas?.width ?? editorStore.project?.canvas.width ?? 800
  const canvasHeight = editorStore.canvas?.height ?? editorStore.project?.canvas.height ?? 600
  const width = sizeOverride?.width ?? Number((element.options as any)?.width ?? 440)
  const height = sizeOverride?.height ?? Number((element.options as any)?.height ?? 360)
  if (!canvasWidth || !canvasHeight || width <= 0 || height <= 0) return fallback
  const margin = 24
  const centeredX = Math.max(margin, (canvasWidth - width) / 2)
  const centeredY = Math.max(margin, (canvasHeight - height) / 2)
  return { x: centeredX, y: centeredY }
}

export function getFittedTableOptions(element: ElementItem): {
  width: number
  height: number
  scale: number
  columnWidths?: number[]
  rowHeights?: number[]
} {
  const editorStore = useEditorStore()
  const canvasWidth = editorStore.canvas?.width ?? editorStore.project?.canvas.width ?? 0
  const canvasHeight = editorStore.canvas?.height ?? editorStore.project?.canvas.height ?? 0
  const defaults = (element.options as any) ?? {}
  const width = Number(defaults.width ?? 440)
  const height = Number(defaults.height ?? 360)
  const baseColumnWidths = Array.isArray(defaults.columnWidths) ? defaults.columnWidths : undefined
  const baseRowHeights = Array.isArray(defaults.rowHeights) ? defaults.rowHeights : undefined

  if (!canvasWidth || !canvasHeight || width <= 0 || height <= 0) {
    return { width, height, scale: 1, columnWidths: baseColumnWidths, rowHeights: baseRowHeights }
  }

  const margin = 48
  const maxWidth = Math.max(120, canvasWidth - margin * 2)
  const maxHeight = Math.max(120, canvasHeight - margin * 2)
  const scale = Math.min(1, maxWidth / width, maxHeight / height)

  if (scale >= 0.999) {
    return { width, height, scale: 1, columnWidths: baseColumnWidths, rowHeights: baseRowHeights }
  }

  const scaledWidth = +(width * scale).toFixed(2)
  const scaledHeight = +(height * scale).toFixed(2)

  const scaleArray = (values?: number[]): number[] | undefined => {
    if (!values) return undefined
    const next = values
      .map((value) => {
        const numeric = Number(value)
        if (!Number.isFinite(numeric)) return 0
        return +(numeric * scale).toFixed(2)
      })
      .map((value) => (value < 0 ? 0 : value))
    return next
  }

  return {
    width: scaledWidth,
    height: scaledHeight,
    scale,
    columnWidths: scaleArray(baseColumnWidths),
    rowHeights: scaleArray(baseRowHeights),
  }
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
    name: 'Tables',
    items: [
      {
        id: 'simple-table',
        name: 'Table',
        icon: '▦',
        type: 'table',
        description: 'Customizable table with rows & columns',
        options: {
          width: 480,
          height: 340,
          rows: 5,
          columns: 4,
          headerRows: 1,
          stripeEvenRows: true,
          stripeColor: '#f8fafc',
          headerBackgroundColor: '#1f2937',
          headerTextColor: '#ffffff',
          cellPadding: 14,
          columnWidths: [160, 110, 100, 110],
          cellContents: [
            { row: 0, column: 0, text: 'Task' },
            { row: 0, column: 1, text: 'Owner' },
            { row: 0, column: 2, text: 'Status' },
            { row: 0, column: 3, text: 'Notes' },
            { row: 1, column: 0, text: 'Design exploration' },
            { row: 1, column: 1, text: 'Mia' },
            { row: 1, column: 2, text: 'In progress' },
            { row: 1, column: 3, text: 'Mood board + refs' },
            { row: 2, column: 0, text: 'Copy polish' },
            { row: 2, column: 1, text: 'Alex' },
            { row: 2, column: 2, text: 'Review' },
            { row: 2, column: 3, text: 'Tone & grammar' },
            { row: 3, column: 0, text: 'Print proofs' },
            { row: 3, column: 1, text: 'Noah' },
            { row: 3, column: 2, text: 'Blocked' },
            { row: 3, column: 3, text: 'Waiting on vendor' },
            { row: 4, column: 0, text: 'Launch checklist' },
            { row: 4, column: 1, text: 'Team' },
            { row: 4, column: 2, text: 'Queued' },
            { row: 4, column: 3, text: 'Kickoff Friday' },
          ],
        },
      },
      {
        id: 'table-weekly-planner',
        name: 'Weekly Planner',
        icon: '🗓️',
        type: 'table',
        description: 'Striped planner table for tracking weekly goals',
        options: {
          width: 560,
          height: 360,
          rows: 8,
          columns: 4,
          headerRows: 1,
          stripeEvenRows: true,
          stripeColor: '#f8fafc',
          headerBackgroundColor: '#0f172a',
          headerTextColor: '#ffffff',
          cellBackgroundColor: '#ffffff',
          borderColor: '#cbd5f5',
          borderWidth: 2,
          cellPadding: 14,
          columnWidths: [180, 120, 120, 120],
          cellContents: [
            { row: 0, column: 0, text: 'Day' },
            { row: 0, column: 1, text: 'Top Focus' },
            { row: 0, column: 2, text: 'Priority' },
            { row: 0, column: 3, text: 'Notes' },
            { row: 1, column: 0, text: 'Monday' },
            { row: 1, column: 1, text: 'Planning Sprint' },
            { row: 1, column: 2, text: '🔥' },
            { row: 1, column: 3, text: 'Outline milestones' },
            { row: 2, column: 0, text: 'Tuesday' },
            { row: 2, column: 1, text: 'Design Review' },
            { row: 2, column: 2, text: 'High' },
            { row: 2, column: 3, text: 'Sync w/ team' },
            { row: 3, column: 0, text: 'Wednesday' },
            { row: 3, column: 1, text: 'Content Drafts' },
            { row: 3, column: 2, text: 'Medium' },
            { row: 3, column: 3, text: 'Prep newsletters' },
            { row: 4, column: 0, text: 'Thursday' },
            { row: 4, column: 1, text: 'Platform QA' },
            { row: 4, column: 2, text: 'High' },
            { row: 4, column: 3, text: 'Device testing' },
            { row: 5, column: 0, text: 'Friday' },
            { row: 5, column: 1, text: 'Launch Prep' },
            { row: 5, column: 2, text: '🔥' },
            { row: 5, column: 3, text: 'Finalize assets' },
            { row: 6, column: 0, text: 'Weekend' },
            { row: 6, column: 1, text: 'Reflect & reset' },
            { row: 6, column: 2, text: 'Low' },
            { row: 6, column: 3, text: 'Plan next week' },
            { row: 7, column: 0, text: 'Notes' },
            { row: 7, column: 1, text: 'Ideas, gratitude, wins' },
          ],
        },
      },
      {
        id: 'table-meal-plan',
        name: 'Meal Plan',
        icon: '🍽️',
        type: 'table',
        description: 'Seven-day meal planner with breakfast/lunch/dinner columns',
        options: {
          width: 600,
          height: 420,
          rows: 8,
          columns: 4,
          headerRows: 1,
          stripeEvenRows: true,
          stripeColor: '#f1f5f9',
          headerBackgroundColor: '#dc2626',
          headerTextColor: '#ffffff',
          cellPadding: 16,
          columnWidths: [140, 150, 150, 150],
          cellContents: [
            { row: 0, column: 0, text: 'Day' },
            { row: 0, column: 1, text: 'Breakfast' },
            { row: 0, column: 2, text: 'Lunch' },
            { row: 0, column: 3, text: 'Dinner' },
            { row: 1, column: 0, text: 'Monday' },
            { row: 1, column: 1, text: 'Oats + berries' },
            { row: 1, column: 2, text: 'Quinoa salad' },
            { row: 1, column: 3, text: 'Grilled salmon' },
            { row: 2, column: 0, text: 'Tuesday' },
            { row: 2, column: 1, text: 'Yogurt parfait' },
            { row: 2, column: 2, text: 'Veggie tacos' },
            { row: 2, column: 3, text: 'Pasta primavera' },
            { row: 3, column: 0, text: 'Wednesday' },
            { row: 3, column: 1, text: 'Green smoothie' },
            { row: 3, column: 2, text: 'Sushi bowl' },
            { row: 3, column: 3, text: 'Stir-fry' },
            { row: 4, column: 0, text: 'Thursday' },
            { row: 4, column: 1, text: 'Avocado toast' },
            { row: 4, column: 2, text: 'Soup + sourdough' },
            { row: 4, column: 3, text: 'Roasted veggies' },
            { row: 5, column: 0, text: 'Friday' },
            { row: 5, column: 1, text: 'Protein pancakes' },
            { row: 5, column: 2, text: 'Mediterranean bowl' },
            { row: 5, column: 3, text: 'Sushi night' },
            { row: 6, column: 0, text: 'Saturday' },
            { row: 6, column: 1, text: 'Breakfast burrito' },
            { row: 6, column: 2, text: 'Picnic sandwiches' },
            { row: 6, column: 3, text: 'BBQ skewers' },
            { row: 7, column: 0, text: 'Sunday' },
            { row: 7, column: 1, text: 'Waffles' },
            { row: 7, column: 2, text: 'Leftovers' },
            { row: 7, column: 3, text: 'Slow cooker stew' },
          ],
        },
      },
      {
        id: 'table-budget',
        name: 'Budget Tracker',
        icon: '💰',
        type: 'table',
        description: 'Finance table with totals row',
        options: {
          width: 520,
          height: 360,
          rows: 7,
          columns: 5,
          headerRows: 1,
          footerRows: 1,
          headerBackgroundColor: '#0f172a',
          headerTextColor: '#ffffff',
          footerBackgroundColor: '#e0f2fe',
          footerTextColor: '#0f172a',
          borderColor: '#94a3b8',
          borderWidth: 2,
          cellPadding: 12,
          columnWidths: [160, 90, 90, 90, 90],
          cellContents: [
            { row: 0, column: 0, text: 'Category' },
            { row: 0, column: 1, text: 'Planned' },
            { row: 0, column: 2, text: 'Actual' },
            { row: 0, column: 3, text: 'Diff' },
            { row: 0, column: 4, text: 'Notes' },
            { row: 1, column: 0, text: 'Rent / Mortgage' },
            { row: 1, column: 1, text: '$1,200' },
            { row: 1, column: 2, text: '$1,200' },
            { row: 1, column: 3, text: '$0' },
            { row: 1, column: 4, text: 'Paid 1st' },
            { row: 2, column: 0, text: 'Groceries' },
            { row: 2, column: 1, text: '$400' },
            { row: 2, column: 2, text: '$365' },
            { row: 2, column: 3, text: '+$35' },
            { row: 2, column: 4, text: 'Market sale' },
            { row: 3, column: 0, text: 'Transport' },
            { row: 3, column: 1, text: '$120' },
            { row: 3, column: 2, text: '$98' },
            { row: 3, column: 3, text: '+$22' },
            { row: 3, column: 4, text: 'WFH days' },
            { row: 4, column: 0, text: 'Subscriptions' },
            { row: 4, column: 1, text: '$90' },
            { row: 4, column: 2, text: '$110' },
            { row: 4, column: 3, text: '-$20' },
            { row: 4, column: 4, text: 'Annual renewals' },
            { row: 5, column: 0, text: 'Wellness' },
            { row: 5, column: 1, text: '$80' },
            { row: 5, column: 2, text: '$60' },
            { row: 5, column: 3, text: '+$20' },
            { row: 5, column: 4, text: 'Yoga pass' },
            { row: 6, column: 0, text: 'TOTAL', textAlign: 'right' },
            { row: 6, column: 1, text: '$1,890' },
            { row: 6, column: 2, text: '$1,833' },
            { row: 6, column: 3, text: '+$57' },
            { row: 6, column: 4, text: 'Under budget 🎉' },
          ],
        },
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
    const placement =
      element.type === 'calendar'
        ? getSmartCalendarPlacement(element)
        : element.type === 'table'
        ? getCenteredTablePlacement(element)
        : elementPlacementDefaults[element.type]
    const options = { x: placement?.x, y: placement?.y, ...(element.options || {}) }

    if (element.type === 'text') {
      editorStore.addObject('text', options)
      return
    }

    if (element.type === 'collage') {
      editorStore.addObject('collage', { collageLayout: element.collageLayout || 'grid-2x2', ...options })
    } else if (element.type === 'table') {
      editorStore.addObject('table', {
        rows: (element.options as any)?.rows ?? 4,
        columns: (element.options as any)?.columns ?? 4,
        ...options,
      })
    } else if (element.type === 'shape') {
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
