import { computed, watch } from 'vue'
import { useEditorStore } from '@/stores/editor.store'
import { storeToRefs } from 'pinia'
import type {
  CanvasElementMetadata,
  CalendarGridMetadata,
  WeekStripMetadata,
  DateCellMetadata,
  PlannerNoteMetadata,
  PlannerPatternVariant,
  PlannerHeaderStyle,
  ScheduleMetadata,
  ChecklistMetadata,
} from '@/types'
import type { Ref } from 'vue'

export const scheduleIntervalOptions: { value: ScheduleMetadata['intervalMinutes']; label: string }[] = [
  { value: 30, label: '30 min' },
  { value: 60, label: '60 min' },
]

export const headerStyleOptions: { value: PlannerHeaderStyle; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'tint', label: 'Tint' },
  { value: 'filled', label: 'Filled' },
]

export const plannerPatternOptions: { value: PlannerPatternVariant; label: string }[] = [
  { value: 'hero', label: 'Hero Banner' },
  { value: 'ruled', label: 'Ruled Lines' },
  { value: 'grid', label: 'Grid' },
  { value: 'dot', label: 'Dot Grid' },
]

export function useObjectProperties(alignTarget: Ref<'canvas' | 'selection'>) {
  const editorStore = useEditorStore()
  const { selectedObjects } = storeToRefs(editorStore)

  const selectedObject = computed(() => selectedObjects.value[0])

  const objectType = computed(() => {
    if (!selectedObject.value) return null
    return selectedObject.value.type
  })

  // Text properties
  const textContent = computed({
    get: () => (selectedObject.value as any)?.text || '',
    set: (value) => editorStore.updateObjectProperty('text', value),
  })

  const fontSize = computed({
    get: () => (selectedObject.value as any)?.fontSize || 16,
    set: (value) => editorStore.updateObjectProperty('fontSize', value),
  })

  const fontFamily = computed({
    get: () => (selectedObject.value as any)?.fontFamily || 'Inter',
    set: (value) => editorStore.updateObjectProperty('fontFamily', value),
  })

  const textColor = computed({
    get: () => (selectedObject.value as any)?.fill || '#000000',
    set: (value) => editorStore.updateObjectProperty('fill', value),
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

  // Line/Arrow detection
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

  const positionX = computed({
    get: () => Math.round(((selectedObject.value as any)?.left ?? 0) as number),
    set: (value) => editorStore.updateObjectProperty('left', Number(value) || 0),
  })

  const positionY = computed({
    get: () => Math.round(((selectedObject.value as any)?.top ?? 0) as number),
    set: (value) => editorStore.updateObjectProperty('top', Number(value) || 0),
  })

  const objectWidth = computed({
    get: () => {
      if (!selectedObject.value) return 0
      return Math.round(selectedObject.value.getScaledWidth())
    },
    set: (value) => {
      if (!selectedObject.value) return
      const target = Math.max(1, Number(value) || 1)
      const base = (selectedObject.value as any).width || selectedObject.value.getScaledWidth() || 1
      const nextScale = target / base
      editorStore.updateObjectProperty('scaleX', nextScale)
    },
  })

  const objectHeight = computed({
    get: () => {
      if (!selectedObject.value) return 0
      return Math.round(selectedObject.value.getScaledHeight())
    },
    set: (value) => {
      if (!selectedObject.value) return
      const target = Math.max(1, Number(value) || 1)
      const base = (selectedObject.value as any).height || selectedObject.value.getScaledHeight() || 1
      const nextScale = target / base
      editorStore.updateObjectProperty('scaleY', nextScale)
    },
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

  const scheduleMetadata = computed<ScheduleMetadata | null>(() =>
    elementMetadata.value?.kind === 'schedule' ? elementMetadata.value : null,
  )

  const checklistMetadata = computed<ChecklistMetadata | null>(() =>
    elementMetadata.value?.kind === 'checklist' ? elementMetadata.value : null,
  )

  const plannerNoteMetadata = computed<PlannerNoteMetadata | null>(() =>
    elementMetadata.value?.kind === 'planner-note' ? elementMetadata.value : null,
  )

  const elementSize = computed(() => {
    const meta = elementMetadata.value as any
    if (!meta || !meta.size) return null
    return meta.size as { width: number; height: number }
  })

  // Metadata update functions
  function updateScheduleMetadata(updater: (draft: ScheduleMetadata) => void) {
    editorStore.updateSelectedElementMetadata((metadata) => {
      if (metadata.kind !== 'schedule') return null
      updater(metadata)
      return metadata
    })
  }

  function updateChecklistMetadata(updater: (draft: ChecklistMetadata) => void) {
    editorStore.updateSelectedElementMetadata((metadata) => {
      if (metadata.kind !== 'checklist') return null
      updater(metadata)
      return metadata
    })
  }

  function updatePlannerMetadata(updater: (draft: PlannerNoteMetadata) => void) {
    editorStore.updateSelectedElementMetadata((metadata) => {
      if (metadata.kind !== 'planner-note') return null
      updater(metadata)
      return metadata
    })
  }

  function updateCalendarMetadata(updater: (draft: CalendarGridMetadata) => void) {
    editorStore.updateSelectedElementMetadata((metadata) => {
      if (metadata.kind !== 'calendar-grid') return null
      updater(metadata)
      return metadata
    })
  }

  function updateWeekStripMetadata(updater: (draft: WeekStripMetadata) => void) {
    editorStore.updateSelectedElementMetadata((metadata) => {
      if (metadata.kind !== 'week-strip') return null
      updater(metadata)
      return metadata
    })
  }

  function updateDateCellMetadata(updater: (draft: DateCellMetadata) => void) {
    editorStore.updateSelectedElementMetadata((metadata) => {
      if (metadata.kind !== 'date-cell') return null
      updater(metadata)
      return metadata
    })
  }

  function updateElementSize(next: { width: number; height: number }) {
    editorStore.updateSelectedElementMetadata((metadata) => {
      const draft: any = metadata as any
      if (!draft.size) return null
      draft.size.width = Math.max(10, Number(next.width) || draft.size.width)
      draft.size.height = Math.max(10, Number(next.height) || draft.size.height)
      return metadata
    })
  }

  // Setup align target watcher
  function setupAlignTargetWatcher() {
    watch(
      () => selectedObjects.value.length,
      (len) => {
        alignTarget.value = len > 1 ? 'selection' : 'canvas'
      },
      { immediate: true },
    )
  }

  return {
    // Selected object
    selectedObject,
    objectType,
    // Text properties
    textContent,
    fontSize,
    fontFamily,
    textColor,
    // Shape properties
    fillColor,
    strokeColor,
    strokeWidth,
    // Line/Arrow properties
    isArrow,
    isLineOrArrow,
    lineStrokeColor,
    lineStrokeWidth,
    lineCap,
    lineJoin,
    dashStyle,
    arrowEnds,
    arrowHeadStyle,
    arrowHeadLength,
    arrowHeadWidth,
    // Common properties
    opacity,
    positionX,
    positionY,
    objectWidth,
    objectHeight,
    // Element metadata
    elementMetadata,
    calendarMetadata,
    weekStripMetadata,
    dateCellMetadata,
    scheduleMetadata,
    checklistMetadata,
    plannerNoteMetadata,
    elementSize,
    // Metadata update functions
    updateScheduleMetadata,
    updateChecklistMetadata,
    updatePlannerMetadata,
    updateCalendarMetadata,
    updateWeekStripMetadata,
    updateDateCellMetadata,
    updateElementSize,
    // Watchers
    setupAlignTargetWatcher,
  }
}
