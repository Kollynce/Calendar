import { useEditorStore } from '@/stores/editor.store'

export type ElementType = 'shape' | 'calendar' | 'planner' | 'text'

export interface ElementItem {
  id: string
  name: string
  icon: string
  type: ElementType
  description?: string
  shapeType?: string
  calendarType?: 'month-grid' | 'week-strip' | 'date-cell'
  plannerType?: 'notes-panel' | 'schedule' | 'checklist'
  options?: Record<string, any>
}

export interface ElementCategory {
  name: string
  items: ElementItem[]
}

export const elementPlacementDefaults: Record<ElementType, { x: number; y: number }> = {
  shape: { x: 140, y: 140 },
  calendar: { x: 80, y: 220 },
  planner: { x: 420, y: 160 },
  text: { x: 180, y: 180 },
}

export const elementCategories: ElementCategory[] = [
  {
    name: 'Basic Shapes',
    items: [
      { id: 'rect', name: 'Rectangle', icon: '▢', type: 'shape', shapeType: 'rect', options: { width: 220, height: 140, fill: '#f4f4f5', stroke: '#d4d4d8', strokeWidth: 1 } },
      { id: 'rounded-rect', name: 'Rounded Rect', icon: '▢', type: 'shape', shapeType: 'rect', options: { width: 220, height: 120, cornerRadius: 28, fill: '#fef3c7', stroke: '#fcd34d', strokeWidth: 1 } },
      { id: 'circle', name: 'Circle', icon: '○', type: 'shape', shapeType: 'circle', options: { radius: 70, fill: '#dbeafe' } },
    ],
  },
  {
    name: 'Lines & Arrows',
    items: [
      { id: 'line', name: 'Line', icon: '—', type: 'shape', shapeType: 'line', options: { width: 260, stroke: '#0f172a', strokeWidth: 4 } },
      { id: 'arrow', name: 'Arrow', icon: '→', type: 'shape', shapeType: 'arrow', options: { width: 240, stroke: '#1d4ed8', strokeWidth: 4, arrowEnds: 'end', arrowHeadStyle: 'filled', arrowHeadLength: 18, arrowHeadWidth: 14 } },
      { id: 'divider', name: 'Divider', icon: '┄', type: 'shape', shapeType: 'line', options: { width: 260, stroke: '#94a3b8', strokeWidth: 2, strokeDashArray: [10, 8] } },
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
        description: 'Patterned notes panel (Hero / Ruled / Grid / Dot)',
        options: {
          pattern: 'ruled',
          title: 'Notes',
          accentColor: '#2563eb',
          width: 320,
          height: 320,
        },
      },
      {
        id: 'schedule-block',
        name: 'Schedule',
        icon: '🕒',
        type: 'planner',
        plannerType: 'schedule',
        description: 'Timeline schedule with time slots',
        options: {
          title: 'Schedule',
          accentColor: '#a855f7',
          startHour: 6,
          endHour: 20,
          intervalMinutes: 60,
          width: 320,
          height: 640,
        },
      },
      {
        id: 'checklist-block',
        name: 'Checklist',
        icon: '☑️',
        type: 'planner',
        plannerType: 'checklist',
        description: 'To-do list with optional checkboxes',
        options: {
          title: 'To Do',
          accentColor: '#ec4899',
          rows: 8,
          showCheckboxes: true,
          width: 320,
          height: 420,
        },
      },
    ],
  },
  {
    name: 'Decorative',
    items: [
      {
        id: 'soft-frame',
        name: 'Soft Frame',
        icon: '⬜',
        type: 'shape',
        shapeType: 'rect',
        description: 'Rounded photo frame with subtle stroke',
        options: { width: 240, height: 180, cornerRadius: 32, fill: '#ffffff', stroke: '#cbd5f5', strokeWidth: 3 },
      },
      {
        id: 'emoji',
        name: 'Emoji',
        icon: '😊',
        type: 'text',
        description: 'Add an emoji sticker',
        options: {
          content: '😊',
          fontSize: 64,
          fontFamily: 'Noto Color Emoji, Segoe UI Emoji, Apple Color Emoji, sans-serif',
          fontWeight: 400,
        },
      },
    ],
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
