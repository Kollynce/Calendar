<script setup lang="ts">
import { useEditorStore } from '@/stores/editor.store'

type ElementType = 'shape' | 'calendar' | 'planner' | 'text'

interface ElementItem {
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

interface ElementCategory {
  name: string
  items: ElementItem[]
}

const elementPlacementDefaults: Record<ElementType, { x: number; y: number }> = {
  shape: { x: 140, y: 140 },
  calendar: { x: 80, y: 220 },
  planner: { x: 420, y: 160 },
  text: { x: 180, y: 180 },
}

const elementCategories: ElementCategory[] = [
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
      { id: 'notes-panel', name: 'Notes Panel', icon: '🗒️', type: 'planner', plannerType: 'notes-panel', description: 'Patterned notes panel', options: { pattern: 'ruled', title: 'Notes', accentColor: '#2563eb', width: 320, height: 320 } },
      { id: 'schedule-block', name: 'Schedule', icon: '🕒', type: 'planner', plannerType: 'schedule', description: 'Timeline schedule', options: { title: 'Schedule', accentColor: '#a855f7', startHour: 6, endHour: 20, intervalMinutes: 60, width: 320, height: 640 } },
      { id: 'checklist-block', name: 'Checklist', icon: '☑️', type: 'planner', plannerType: 'checklist', description: 'To-do list', options: { title: 'To Do', accentColor: '#ec4899', rows: 8, showCheckboxes: true, width: 320, height: 420 } },
    ],
  },
  {
    name: 'Decorative',
    items: [
      { id: 'soft-frame', name: 'Soft Frame', icon: '⬜', type: 'shape', shapeType: 'rect', description: 'Rounded photo frame', options: { width: 240, height: 180, cornerRadius: 32, fill: '#ffffff', stroke: '#cbd5f5', strokeWidth: 3 } },
      { id: 'emoji', name: 'Emoji', icon: '😊', type: 'text', description: 'Add an emoji sticker', options: { content: '😊', fontSize: 64, fontFamily: 'Noto Color Emoji, Segoe UI Emoji, Apple Color Emoji, sans-serif', fontWeight: 400 } },
    ],
  },
]

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

  const grid = canvas.getObjects().find((obj: any) => obj?.data?.elementMetadata?.kind === 'calendar-grid') as any

  if (!grid || typeof grid.getScaledWidth !== 'function') {
    if (element.calendarType === 'date-cell' && requestedWidth && requestedHeight) {
      return { x: Math.max(margin, canvasWidth - margin - requestedWidth), y: Math.max(margin, fallback.y) }
    }
    if (element.calendarType === 'week-strip' && requestedWidth && requestedHeight) {
      return { x: Math.max(margin, fallback.x), y: Math.max(margin, canvasHeight - margin - requestedHeight) }
    }
    return fallback
  }

  const gridLeft = Number(grid.left ?? 0) || 0
  const gridTop = Number(grid.top ?? 0) || 0
  const gridWidth = Number(grid.getScaledWidth()) || 0
  const gridHeight = Number(grid.getScaledHeight()) || 0

  if (element.calendarType === 'date-cell' && requestedWidth && requestedHeight) {
    return { x: Math.max(margin, Math.min(canvasWidth - margin - requestedWidth, gridLeft + gridWidth + margin)), y: Math.max(margin, gridTop + (gridHeight - requestedHeight) / 2) }
  }
  if (element.calendarType === 'week-strip' && requestedWidth && requestedHeight) {
    return { x: Math.max(margin, gridLeft), y: Math.max(margin, Math.min(canvasHeight - margin - requestedHeight, gridTop + gridHeight + margin)) }
  }
  return fallback
}

function addElement(element: ElementItem) {
  const placement = element.type === 'calendar' ? getSmartCalendarPlacement(element) : elementPlacementDefaults[element.type]
  const options = { x: placement?.x, y: placement?.y, ...(element.options || {}) }

  if (element.type === 'text') {
    editorStore.addObject('text', options)
  } else if (element.type === 'shape') {
    editorStore.addObject('shape', { shapeType: element.shapeType || 'rect', ...options })
  } else if (element.type === 'calendar') {
    if (element.calendarType === 'month-grid') editorStore.addObject('calendar-grid', options)
    else if (element.calendarType === 'week-strip') editorStore.addObject('week-strip', options)
    else if (element.calendarType === 'date-cell') editorStore.addObject('date-cell', options)
  } else if (element.type === 'planner') {
    if (element.plannerType === 'notes-panel') editorStore.addObject('notes-panel', options)
    else if (element.plannerType === 'schedule') editorStore.addObject('schedule', options)
    else if (element.plannerType === 'checklist') editorStore.addObject('checklist', options)
  }
}
</script>

<template>
  <div class="space-y-5">
    <div v-for="category in elementCategories" :key="category.name">
      <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">{{ category.name }}</p>
      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="element in category.items"
          :key="element.id"
          @click="addElement(element)"
          class="aspect-square surface-hover rounded-xl flex flex-col items-center justify-center transition-all group border border-gray-200 dark:border-gray-600"
        >
          <span class="h-8 w-8 flex items-center justify-center text-2xl leading-none mb-1 transition-transform group-hover:scale-105">{{ element.icon }}</span>
          <span class="text-[10px] text-gray-500 dark:text-gray-400 font-medium text-center leading-tight px-1">{{ element.name }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
