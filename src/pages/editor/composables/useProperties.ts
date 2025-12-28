import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor.store'
import { storeToRefs } from 'pinia'
import type { CanvasElementMetadata, CalendarGridMetadata, WeekStripMetadata, DateCellMetadata } from '@/types'

export function useProperties() {
  const editorStore = useEditorStore()
  const { selectedObjects } = storeToRefs(editorStore)

  // Selected object
  const selectedObject = computed(() => selectedObjects.value[0])

  const objectType = computed(() => {
    if (!selectedObject.value) return null
    return selectedObject.value.type
  })

  // Canvas background
  const canvasBackgroundColor = computed(() => {
    return editorStore.project?.canvas?.backgroundColor || '#ffffff'
  })

  const canvasColorPresets = [
    '#ffffff', '#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8',
    '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706',
    '#dcfce7', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a',
    '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb',
    '#f3e8ff', '#e9d5ff', '#d8b4fe', '#c084fc', '#a855f7', '#9333ea',
    '#fce7f3', '#fbcfe8', '#f9a8d4', '#f472b6', '#ec4899', '#db2777',
    '#1a1a1a', '#262626', '#404040', '#525252', '#737373', '#a3a3a3',
  ]

  function updateCanvasBackgroundColor(color: string) {
    editorStore.setBackgroundColor(color)
  }

  // Text properties
  const textContent = computed({
    get: () => (selectedObject.value as any)?.text || '',
    set: (value) => editorStore.updateObjectProperty('text', value),
  })

  // Shape properties
  const fillColor = computed({
    get: () => (selectedObject.value as any)?.fill || '#3b82f6',
    set: (value) => editorStore.updateObjectProperty('fill', value),
  })

  const strokeColor = computed({
    get: () => (selectedObject.value as any)?.stroke || '',
    set: (value) => editorStore.updateObjectProperty('stroke', value),
  })

  const strokeWidth = computed({
    get: () => (selectedObject.value as any)?.strokeWidth || 0,
    set: (value) => editorStore.updateObjectProperty('strokeWidth', value),
  })

  const cornerRadius = computed({
    get: () => (selectedObject.value as any)?.rx || 0,
    set: (value) => {
      editorStore.updateObjectProperty('rx', value)
      editorStore.updateObjectProperty('ry', value)
    },
  })

  // Arrow detection
  const isArrow = computed(() => {
    const obj: any = selectedObject.value as any
    if (!obj) return false
    if (obj.type === 'group' && obj?.data?.shapeKind === 'arrow') return true
    if (obj.type !== 'group') return false
    const parts = (obj?._objects ?? []).map((o: any) => o?.data?.arrowPart).filter(Boolean)
    return parts.includes('line') && (parts.includes('startHead') || parts.includes('endHead'))
  })

  const isLineOrArrow = computed(() => {
    const obj: any = selectedObject.value as any
    return obj?.type === 'line' || isArrow.value
  })

  // Line/Arrow properties
  const lineStrokeColor = computed({
    get: () => {
      const obj: any = selectedObject.value as any
      if (isArrow.value) return obj?.data?.arrowOptions?.stroke ?? '#000000'
      return obj?.stroke ?? '#000000'
    },
    set: (value) => editorStore.updateObjectProperty('stroke', value),
  })

  const lineStrokeWidth = computed({
    get: () => {
      const obj: any = selectedObject.value as any
      if (isArrow.value) return Number(obj?.data?.arrowOptions?.strokeWidth ?? 2) || 2
      return Number(obj?.strokeWidth ?? 0) || 0
    },
    set: (value) => editorStore.updateObjectProperty('strokeWidth', Number(value) || 0),
  })

  const lineCap = computed({
    get: () => {
      const obj: any = selectedObject.value as any
      const line = isArrow.value ? obj?._objects?.find((o: any) => o?.data?.arrowPart === 'line') : obj
      return line?.strokeLineCap ?? 'butt'
    },
    set: (value) => editorStore.updateObjectProperty('strokeLineCap', value),
  })

  const lineJoin = computed({
    get: () => {
      const obj: any = selectedObject.value as any
      const line = isArrow.value ? obj?._objects?.find((o: any) => o?.data?.arrowPart === 'line') : obj
      return line?.strokeLineJoin ?? 'miter'
    },
    set: (value) => editorStore.updateObjectProperty('strokeLineJoin', value),
  })

  const dashStyle = computed({
    get: () => {
      const obj: any = selectedObject.value as any
      const line = isArrow.value ? obj?._objects?.find((o: any) => o?.data?.arrowPart === 'line') : obj
      const dash = line?.strokeDashArray
      if (!dash || dash.length === 0) return 'solid'
      const key = JSON.stringify(dash)
      if (key === JSON.stringify([10, 8])) return 'dashed'
      if (key === JSON.stringify([2, 6])) return 'dotted'
      if (key === JSON.stringify([20, 10, 6, 10])) return 'dash-dot'
      return 'solid'
    },
    set: (value) => {
      if (value === 'solid') editorStore.updateObjectProperty('strokeDashArray', undefined)
      else if (value === 'dashed') editorStore.updateObjectProperty('strokeDashArray', [10, 8])
      else if (value === 'dotted') editorStore.updateObjectProperty('strokeDashArray', [2, 6])
      else if (value === 'dash-dot') editorStore.updateObjectProperty('strokeDashArray', [20, 10, 6, 10])
    },
  })

  // Arrow-specific properties
  const arrowEnds = computed({
    get: () => {
      const obj: any = selectedObject.value as any
      return obj?.data?.arrowOptions?.arrowEnds ?? 'end'
    },
    set: (value) => editorStore.updateObjectProperty('arrowEnds', value),
  })

  const arrowHeadStyle = computed({
    get: () => {
      const obj: any = selectedObject.value as any
      return obj?.data?.arrowOptions?.arrowHeadStyle ?? 'filled'
    },
    set: (value) => editorStore.updateObjectProperty('arrowHeadStyle', value),
  })

  const arrowHeadLength = computed({
    get: () => {
      const obj: any = selectedObject.value as any
      return Number(obj?.data?.arrowOptions?.arrowHeadLength ?? 18) || 18
    },
    set: (value) => editorStore.updateObjectProperty('arrowHeadLength', Math.max(4, Number(value) || 4)),
  })

  const arrowHeadWidth = computed({
    get: () => {
      const obj: any = selectedObject.value as any
      return Number(obj?.data?.arrowOptions?.arrowHeadWidth ?? 14) || 14
    },
    set: (value) => editorStore.updateObjectProperty('arrowHeadWidth', Math.max(4, Number(value) || 4)),
  })

  // Common properties
  const opacity = computed({
    get: () => ((selectedObject.value as any)?.opacity || 1) * 100,
    set: (value) => editorStore.updateObjectProperty('opacity', value / 100),
  })

  // Position properties
  const positionX = computed({
    get: () => Math.round(((selectedObject.value as any)?.left ?? 0) as number),
    set: (value) => editorStore.updateObjectProperty('left', Number(value) || 0),
  })

  const positionY = computed({
    get: () => Math.round(((selectedObject.value as any)?.top ?? 0) as number),
    set: (value) => editorStore.updateObjectProperty('top', Number(value) || 0),
  })

  // Element metadata
  const elementMetadata = computed<CanvasElementMetadata | null>(() => {
    void selectedObjects.value
    return editorStore.getActiveElementMetadata()
  })

  const calendarMetadata = computed<CalendarGridMetadata | null>(() =>
    elementMetadata.value?.kind === 'calendar-grid' ? elementMetadata.value : null,
  )

  const weekStripMetadata = computed<WeekStripMetadata | null>(() =>
    elementMetadata.value?.kind === 'week-strip' ? elementMetadata.value : null,
  )

  const dateCellMetadata = computed<DateCellMetadata | null>(() =>
    elementMetadata.value?.kind === 'date-cell' ? elementMetadata.value : null,
  )

  // Size properties
  const elementSize = computed(() => {
    const meta = elementMetadata.value
    if (!meta || !('size' in meta)) return null
    return meta.size as { width: number; height: number }
  })

  const objectWidth = computed({
    get: () => {
      const obj = selectedObject.value as any
      if (!obj) return 100
      if (typeof obj.getScaledWidth === 'function') {
        return Math.round(obj.getScaledWidth())
      }
      return Math.round((obj.width ?? 100) * (obj.scaleX ?? 1))
    },
    set: (value) => {
      const obj = selectedObject.value as any
      if (!obj) return
      const currentWidth = typeof obj.getScaledWidth === 'function' 
        ? obj.getScaledWidth() 
        : (obj.width ?? 100) * (obj.scaleX ?? 1)
      if (currentWidth > 0) {
        const newScale = value / (obj.width ?? 100)
        editorStore.updateObjectProperty('scaleX', newScale)
      }
    },
  })

  const objectHeight = computed({
    get: () => {
      const obj = selectedObject.value as any
      if (!obj) return 100
      if (typeof obj.getScaledHeight === 'function') {
        return Math.round(obj.getScaledHeight())
      }
      return Math.round((obj.height ?? 100) * (obj.scaleY ?? 1))
    },
    set: (value) => {
      const obj = selectedObject.value as any
      if (!obj) return
      const currentHeight = typeof obj.getScaledHeight === 'function'
        ? obj.getScaledHeight()
        : (obj.height ?? 100) * (obj.scaleY ?? 1)
      if (currentHeight > 0) {
        const newScale = value / (obj.height ?? 100)
        editorStore.updateObjectProperty('scaleY', newScale)
      }
    },
  })

  function updateElementSize(newSize: { width: number; height: number }) {
    const meta = elementMetadata.value
    if (!meta || !('size' in meta)) return
    editorStore.updateActiveElementMetadata({ size: newSize })
  }

  function updateCalendarMetadata(updates: Partial<CalendarGridMetadata>) {
    editorStore.updateActiveElementMetadata(updates)
  }

  function updateWeekStripMetadata(updates: Partial<WeekStripMetadata>) {
    editorStore.updateActiveElementMetadata(updates)
  }

  function updateDateCellMetadata(updates: Partial<DateCellMetadata>) {
    editorStore.updateActiveElementMetadata(updates)
  }

  return {
    // Selection
    selectedObject,
    objectType,
    // Canvas background
    canvasBackgroundColor,
    canvasColorPresets,
    updateCanvasBackgroundColor,
    // Text
    textContent,
    // Shape
    fillColor,
    strokeColor,
    strokeWidth,
    cornerRadius,
    // Line/Arrow detection
    isArrow,
    isLineOrArrow,
    // Line/Arrow properties
    lineStrokeColor,
    lineStrokeWidth,
    lineCap,
    lineJoin,
    dashStyle,
    // Arrow-specific
    arrowEnds,
    arrowHeadStyle,
    arrowHeadLength,
    arrowHeadWidth,
    // Common
    opacity,
    // Position
    positionX,
    positionY,
    // Size
    elementSize,
    objectWidth,
    objectHeight,
    updateElementSize,
    // Metadata
    elementMetadata,
    calendarMetadata,
    weekStripMetadata,
    dateCellMetadata,
    updateCalendarMetadata,
    updateWeekStripMetadata,
    updateDateCellMetadata,
  }
}
