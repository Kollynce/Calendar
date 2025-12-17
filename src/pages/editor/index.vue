<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useEditorStore } from '@/stores/editor.store'
import { storeToRefs } from 'pinia'
import { calendarTemplates, templateCategories, type CalendarTemplate } from '@/data/templates/calendar-templates'
import { 
  ArrowLeftIcon, 
  ArrowDownTrayIcon, 
  ShareIcon,
  Squares2X2Icon,
  PhotoIcon,
  DocumentTextIcon,
  SwatchIcon,
  CalendarDaysIcon,
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  ArrowLongRightIcon
} from '@heroicons/vue/24/outline'
import ExportModal from '@/components/export/ExportModal.vue'
import ColorPicker from '@/components/editor/ColorPicker.vue'
import FontPicker from '@/components/editor/FontPicker.vue'
import CalendarConfigPanel from '@/components/editor/CalendarConfigPanel.vue'
import EditorLayers from '@/components/editor/EditorLayers.vue'
import TemplatePanel from '@/components/editor/TemplatePanel.vue'
import AdobeCanvas from '@/components/editor/AdobeCanvas.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { renderTemplateOnCanvas, generateTemplateThumbnail } from '@/services/editor/template-renderer'
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

const router = useRouter()
const route = useRoute()
const editorStore = useEditorStore()

// Store refs
const { 
  zoom, 
  hasSelection, 
  selectedObjects, 
  isDirty, 
  saving,
  canUndo,
  canRedo,
  canvasSize,
} = storeToRefs(editorStore)

// Local State
const activeTool = ref('templates')
const canvasRef = ref<HTMLCanvasElement | null>(null)
const adobeCanvasRef = ref<InstanceType<typeof AdobeCanvas> | null>(null)
const isExportModalOpen = ref(false)
const uploadedImages = ref<{ id: string; url: string; name: string }[]>([])
const isDragging = ref(false)
const selectedTemplateCategory = ref('all')
const templateThumbnails = ref<Record<string, string>>({})
const thumbnailsLoading = ref(false)
const activeTemplateId = ref<string | null>(null)

// Panel visibility state for Adobe-style collapsible UI
const isRightSidebarVisible = ref(true)
const isPropertiesCollapsed = ref(false)
const isLayersCollapsed = ref(false)
const templateOverrides = ref({
  highlightToday: true,
  highlightWeekends: true,
  hasPhotoArea: false,
  hasNotesArea: false,
})
const alignTarget = ref<'canvas' | 'selection'>('canvas')
const isApplyingTemplate = ref(false)
const isSyncingTemplateUiFromProject = ref(false)
let overridesRenderTimer: ReturnType<typeof setTimeout> | null = null

const PAPER_SIZES = {
  portrait: { width: 744, height: 1052 },
  landscape: { width: 1052, height: 744 },
}

async function handleSaveProject(): Promise<void> {
  await editorStore.saveProject()
  if (!routeProjectId.value && editorStore.project?.id) {
    router.replace(`/editor/${editorStore.project.id}`)
  }
}

const DEFAULT_CANVAS = PAPER_SIZES.portrait

const paperWidth = computed(() => canvasSize.value.width || DEFAULT_CANVAS.width)

// Tools configuration - Updated with Calendar instead of Holidays
const tools = [
  { id: 'templates', name: 'Templates', icon: Squares2X2Icon },
  { id: 'elements', name: 'Elements', icon: SwatchIcon },
  { id: 'uploads', name: 'Uploads', icon: PhotoIcon },
  { id: 'text', name: 'Text', icon: DocumentTextIcon },
  { id: 'calendar', name: 'Calendar', icon: CalendarDaysIcon },
]

function getCanvasSizeForTemplate(template: CalendarTemplate) {
  return template.config.layout === 'landscape'
    ? PAPER_SIZES.landscape
    : PAPER_SIZES.portrait
}

interface RenderOptions {
  recordHistory?: boolean
}

async function renderTemplateWithOverrides(
  template: CalendarTemplate,
  options: RenderOptions = {},
) {
  const { recordHistory = true } = options

  if (!editorStore.canvas) return

  const customizedTemplate: CalendarTemplate = {
    ...template,
    preview: {
      ...template.preview,
      hasPhotoArea: templateOverrides.value.hasPhotoArea,
      hasNotesArea: templateOverrides.value.hasNotesArea,
    },
    config: {
      ...template.config,
      highlightToday: templateOverrides.value.highlightToday,
      highlightWeekends: templateOverrides.value.highlightWeekends,
    },
  }

  const targetSize = getCanvasSizeForTemplate(customizedTemplate)
  let sizeChanged = false

  if (editorStore.project) {
    const { width, height } = editorStore.project.canvas
    if (width !== targetSize.width || height !== targetSize.height) {
      editorStore.setCanvasSize(targetSize.width, targetSize.height)
      sizeChanged = true
    }
  }

  if (sizeChanged) {
    await nextTick()
    editorStore.canvas?.calcOffset()
  }

  await renderTemplateOnCanvas(
    editorStore.canvas,
    customizedTemplate,
    {
      year: editorStore.project?.config.year ?? new Date().getFullYear(),
      month: editorStore.project?.config.currentMonth ?? 1,
    },
    { preserveUserObjects: true },
  )

  if (recordHistory) {
    editorStore.snapshotCanvasState()
  }
}

function resetTemplateOverrides() {
  if (!activeTemplate.value) return
  templateOverrides.value = {
    highlightToday: activeTemplate.value.config.highlightToday,
    highlightWeekends: activeTemplate.value.config.highlightWeekends,
    hasPhotoArea: activeTemplate.value.preview.hasPhotoArea,
    hasNotesArea: activeTemplate.value.preview.hasNotesArea,
  }
}

watch(
  templateOverrides,
  async () => {
    if (!activeTemplate.value || isApplyingTemplate.value || isSyncingTemplateUiFromProject.value) return

    editorStore.updateTemplateOptions({ ...templateOverrides.value })

    if (overridesRenderTimer) clearTimeout(overridesRenderTimer)
    overridesRenderTimer = setTimeout(async () => {
      await renderTemplateWithOverrides(activeTemplate.value!, { recordHistory: false })
    }, 200)
  },
  { deep: true },
)

onBeforeUnmount(() => {
  if (overridesRenderTimer) {
    clearTimeout(overridesRenderTimer)
  }
})

// Filtered templates based on category
const filteredTemplates = computed(() => {
  if (selectedTemplateCategory.value === 'all') return calendarTemplates
  return calendarTemplates.filter((t) => t.category === selectedTemplateCategory.value)
})

const activeTemplate = computed(() => {
  if (!activeTemplateId.value) return null
  return calendarTemplates.find((t) => t.id === activeTemplateId.value) || null
})

async function syncTemplateUiFromProject(): Promise<void> {
  const templateId = editorStore.project?.templateId
  if (!templateId) return

  const template = calendarTemplates.find((t) => t.id === templateId) || null
  if (!template) return

  isApplyingTemplate.value = true
  isSyncingTemplateUiFromProject.value = true
  activeTemplateId.value = template.id

  const options = editorStore.project?.config.templateOptions
  templateOverrides.value = {
    highlightToday: options?.highlightToday ?? template.config.highlightToday,
    highlightWeekends: options?.highlightWeekends ?? template.config.highlightWeekends,
    hasPhotoArea: options?.hasPhotoArea ?? template.preview.hasPhotoArea,
    hasNotesArea: options?.hasNotesArea ?? template.preview.hasNotesArea,
  }

  await nextTick()
  isSyncingTemplateUiFromProject.value = false
  isApplyingTemplate.value = false
}

watch(
  () => editorStore.project?.templateId,
  (next, prev) => {
    if (isApplyingTemplate.value) return
    if (!next || next === prev) return
    void syncTemplateUiFromProject()
  },
  { immediate: true },
)

watch(
  () => editorStore.project?.config.templateOptions,
  () => {
    if (isApplyingTemplate.value) return
    if (!editorStore.project?.templateId) return
    void syncTemplateUiFromProject()
  },
  { deep: true },
)

const templateSupportsPhoto = computed(() => !!activeTemplate.value?.preview.photoPosition)
const templateSupportsNotes = computed(() => !!activeTemplate.value?.preview.notesPosition)

watch(
  () => selectedObjects.value.length,
  (len) => {
    alignTarget.value = len > 1 ? 'selection' : 'canvas'
  },
  { immediate: true },
)

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
      { id: 'week-strip', name: 'Week Strip', icon: '▤', type: 'calendar', calendarType: 'week-strip', options: { width: 520, height: 110 } },
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

// Text presets - Industry standard
const textPresets = [
  { id: 'title', name: 'Title', size: 48, weight: 'bold', family: 'Outfit', sample: 'Add Title' },
  { id: 'heading', name: 'Heading', size: 32, weight: '700', family: 'Outfit', sample: 'Add Heading' },
  { id: 'subheading', name: 'Subheading', size: 24, weight: '600', family: 'Inter', sample: 'Add Subheading' },
  { id: 'body', name: 'Body Text', size: 16, weight: 'normal', family: 'Inter', sample: 'Add body text here...' },
  { id: 'caption', name: 'Caption', size: 12, weight: 'normal', family: 'Inter', sample: 'Add caption' },
  { id: 'label', name: 'Label', size: 10, weight: '600', family: 'Inter', sample: 'LABEL', uppercase: true },
]

// Font combinations
const fontPairings = [
  { id: 'classic', name: 'Classic', heading: 'Playfair Display', body: 'Inter', preview: 'Aa' },
  { id: 'modern', name: 'Modern', heading: 'Outfit', body: 'Inter', preview: 'Aa' },
  { id: 'casual', name: 'Casual', heading: 'Poppins', body: 'Open Sans', preview: 'Aa' },
  { id: 'elegant', name: 'Elegant', heading: 'Cormorant Garamond', body: 'Lato', preview: 'Aa' },
]

// Calendar text styles
const calendarTextStyles = [
  { id: 'month-name', name: 'Month Name', size: 28, weight: 'bold', family: 'Outfit', color: '#1a1a1a' },
  { id: 'day-number', name: 'Day Number', size: 14, weight: '500', family: 'Inter', color: '#374151' },
  { id: 'weekday', name: 'Weekday', size: 12, weight: '600', family: 'Inter', color: '#6b7280' },
  { id: 'holiday', name: 'Holiday', size: 10, weight: '500', family: 'Inter', color: '#dc2626' },
]

// Computed
const selectedObject = computed(() => selectedObjects.value[0])

const objectType = computed(() => {
  if (!selectedObject.value) return null
  return selectedObject.value.type
})

// Text properties (two-way binding with canvas)
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

const elementMetadata = computed<CanvasElementMetadata | null>(() => {
  // Ensure this recomputes on selection changes (Fabric active object isn't reactive).
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

const monthOptions = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
]

const weekStartOptions: { value: 0 | 1 | 2 | 3 | 4 | 5 | 6; label: string }[] = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

function normalizeDateInput(value: string): string {
  if (!value) return ''
  return value.includes('T') ? value.split('T')[0] : value
}

const weekStripDateValue = computed(() =>
  weekStripMetadata.value ? normalizeDateInput(weekStripMetadata.value.startDate) : '',
)

const dateCellDateValue = computed(() =>
  dateCellMetadata.value ? normalizeDateInput(dateCellMetadata.value.date) : '',
)

const elementSize = computed(() => {
  const meta = elementMetadata.value as any
  if (!meta || !meta.size) return null
  return meta.size as { width: number; height: number }
})

function updateElementSize(next: { width: number; height: number }) {
  editorStore.updateSelectedElementMetadata((metadata) => {
    const draft: any = metadata as any
    if (!draft.size) return null
    draft.size.width = Math.max(10, Number(next.width) || draft.size.width)
    draft.size.height = Math.max(10, Number(next.height) || draft.size.height)
    return metadata
  })
}

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

const scheduleIntervalOptions: { value: ScheduleMetadata['intervalMinutes']; label: string }[] = [
  { value: 30, label: '30 min' },
  { value: 60, label: '60 min' },
]

const headerStyleOptions: { value: PlannerHeaderStyle; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'tint', label: 'Tint' },
  { value: 'filled', label: 'Filled' },
]

const plannerPatternOptions: { value: PlannerPatternVariant; label: string }[] = [
  { value: 'hero', label: 'Hero Banner' },
  { value: 'ruled', label: 'Ruled Lines' },
  { value: 'grid', label: 'Grid' },
  { value: 'dot', label: 'Dot Grid' },
]

const projectName = computed({
  get: () => editorStore.project?.name || 'Untitled Calendar',
  set: (value: string) => editorStore.setProjectName(value),
})

const routeProjectId = computed(() => {
  const raw = route.params.id
  return typeof raw === 'string' && raw.length > 0 ? raw : null
})

async function ensureProjectForRoute(): Promise<void> {
  const id = routeProjectId.value

  if (id) {
    await editorStore.loadProjectById(id)
  } else if (!editorStore.project) {
    editorStore.createNewProject({
      year: new Date().getFullYear(),
      country: 'KE',
      language: 'en',
      layout: 'monthly',
      startDay: 0,
      showHolidays: true,
      showCustomHolidays: false,
      showWeekNumbers: false,
    })
  }

  const project = editorStore.project
  if (project) {
    project.canvas.width = project.canvas.width || DEFAULT_CANVAS.width
    project.canvas.height = project.canvas.height || DEFAULT_CANVAS.height
  }
}

function shouldAddWelcomeText(): boolean {
  if (routeProjectId.value) return false
  if (!editorStore.project) return false
  if (editorStore.project.canvas.objects?.length) return false
  return true
}

function handleCanvasReady(canvasEl: HTMLCanvasElement): void {
  canvasRef.value = canvasEl
  void initializeEditorCanvas()
}

async function initializeEditorCanvas(): Promise<void> {
  await nextTick()

  if (!canvasRef.value) return
  if (editorStore.canvas) return

  editorStore.initializeCanvas(canvasRef.value)

  requestAnimationFrame(() => {
    editorStore.setZoom(1)
    editorStore.canvas?.calcOffset()
    // Fit canvas to screen after initialization
    adobeCanvasRef.value?.fitToScreen()
  })

  if (shouldAddWelcomeText()) {
    setTimeout(() => {
      editorStore.addObject('text', {
        content: 'Start Designing Your Calendar',
        x: Math.round(paperWidth.value / 2),
        y: 90,
        fontSize: 32,
        fontFamily: 'Outfit',
        textAlign: 'center',
        originX: 'center',
        color: '#1a1a1a',
      })

      requestAnimationFrame(() => {
        editorStore.canvas?.calcOffset()
      })
    }, 100)
  }
}

onMounted(() => {
  void ensureProjectForRoute()
  loadTemplateThumbnails()
})

watch(routeProjectId, (next, prev) => {
  if (next === prev) return
  editorStore.destroyCanvas()
  void ensureProjectForRoute()
})

onBeforeUnmount(() => {
  editorStore.destroyCanvas()
})

// Template Functions
async function applyTemplate(template: CalendarTemplate) {
  if (template.presetId) {
    await applyPlannerPreset(template.presetId)
    return
  }
  if (!editorStore.canvas) return
  isApplyingTemplate.value = true
  activeTemplateId.value = template.id
  editorStore.setProjectTemplateId(template.id)
  templateOverrides.value = {
    highlightToday: template.config.highlightToday,
    highlightWeekends: template.config.highlightWeekends,
    hasPhotoArea: template.preview.hasPhotoArea,
    hasNotesArea: template.preview.hasNotesArea,
  }

  editorStore.updateTemplateOptions({ ...templateOverrides.value })

  await renderTemplateWithOverrides(template)
  await nextTick()
  isApplyingTemplate.value = false
}

async function loadTemplateThumbnails() {
  thumbnailsLoading.value = true
  const entries = await Promise.all(
    calendarTemplates.map(async (template) => {
      if (template.presetId === 'daily-pastel') {
        return [template.id, buildPlannerPresetThumbnail('pastel')] as const
      }
      if (template.presetId === 'daily-minimal') {
        return [template.id, buildPlannerPresetThumbnail('minimal')] as const
      }
      const dataUrl = await generateTemplateThumbnail(template, { multiplier: 0.28 })
      return [template.id, dataUrl] as const
    })
  )
  templateThumbnails.value = Object.fromEntries(entries)
  thumbnailsLoading.value = false
}

function buildPlannerPresetThumbnail(variant: 'pastel' | 'minimal'): string {
  const accentA = variant === 'pastel' ? '#a855f7' : '#f59e0b'
  const accentB = variant === 'pastel' ? '#ec4899' : '#84cc16'
  const stroke = '#e2e8f0'
  const bg = '#ffffff'

  const focusLines = Array.from({ length: 9 })
    .map((_, i) => {
      const y = 150 + i * 22
      return `<rect x="68" y="${y}" width="150" height="2" fill="#e5e7eb"/>`
    })
    .join('')

  const todoRows = Array.from({ length: 6 })
    .map((_, i) => {
      const y = 282 + i * 20
      return `
        <rect x="258" y="${y}" width="10" height="10" rx="3" fill="none" stroke="${accentA}" stroke-width="2"/>
        <rect x="276" y="${y + 4}" width="44" height="2" fill="#e5e7eb"/>
      `
    })
    .join('')

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="360" height="480" viewBox="0 0 360 480">
  <rect x="0" y="0" width="360" height="480" fill="#f8fafc"/>
  <rect x="26" y="22" width="308" height="436" rx="18" ry="18" fill="${bg}" stroke="${stroke}" stroke-width="2"/>

  <text x="52" y="68" font-family="Inter, Arial" font-size="22" font-weight="700" fill="#111827">Daily Planner</text>
  <rect x="232" y="56" width="78" height="10" rx="5" fill="#cbd5e1" opacity="0.85"/>

  <rect x="52" y="98" width="182" height="260" rx="16" fill="#ffffff" stroke="${stroke}" stroke-width="2"/>
  <rect x="52" y="112" width="182" height="8" fill="${accentA}" opacity="0.9"/>
  <text x="68" y="132" font-family="Inter, Arial" font-size="12" font-weight="700" fill="#111827">Today's Focus</text>
  ${focusLines}

  <rect x="246" y="98" width="84" height="120" rx="16" fill="#ffffff" stroke="${stroke}" stroke-width="2"/>
  <rect x="246" y="112" width="84" height="8" fill="${accentB}" opacity="0.9"/>
  <text x="258" y="132" font-family="Inter, Arial" font-size="12" font-weight="700" fill="#111827">Top Priority</text>

  <rect x="246" y="234" width="84" height="170" rx="16" fill="#ffffff" stroke="${stroke}" stroke-width="2"/>
  <rect x="246" y="248" width="84" height="18" rx="9" fill="${accentA}" opacity="0.18"/>
  <text x="258" y="262" font-family="Inter, Arial" font-size="12" font-weight="700" fill="#111827">To-Do</text>
  ${todoRows}

  <rect x="246" y="416" width="84" height="28" rx="14" fill="#ffffff" stroke="${stroke}" stroke-width="2" opacity="0.0"/>
</svg>`

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

// Element Functions
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

async function applyPlannerPreset(presetId: 'daily-pastel' | 'daily-minimal') {
  if (!editorStore.canvas) return

  editorStore.setCanvasSize(PAPER_SIZES.portrait.width, PAPER_SIZES.portrait.height)
  await nextTick()
  editorStore.setZoom(1)
  await nextTick()
  editorStore.canvas.calcOffset()

  editorStore.canvas.clear()
  editorStore.canvas.backgroundColor = '#ffffff'

  if (presetId === 'daily-pastel') {
    editorStore.addObject('text', {
      content: 'Today is a good day!',
      x: 372,
      y: 54,
      fontSize: 34,
      fontFamily: 'Outfit',
      fontWeight: 700,
      textAlign: 'center',
      originX: 'center',
      color: '#1f2937',
    })
    editorStore.addObject('text', {
      content: 'Daily Planner',
      x: 372,
      y: 96,
      fontSize: 18,
      fontFamily: 'Inter',
      fontWeight: 600,
      textAlign: 'center',
      originX: 'center',
      color: '#ec4899',
    })

    editorStore.addObject('text', {
      content: 'Date:',
      x: 540,
      y: 140,
      fontSize: 12,
      fontFamily: 'Inter',
      fontWeight: 700,
      color: '#6b7280',
    })
    editorStore.addObject('shape', {
      x: 580,
      y: 156,
      width: 120,
      stroke: '#cbd5e1',
      strokeWidth: 2,
      shapeType: 'line',
    })

    editorStore.addObject('schedule', {
      x: 60,
      y: 170,
      width: 380,
      height: 650,
      title: 'Schedule',
      accentColor: '#a855f7',
      startHour: 6,
      endHour: 20,
      intervalMinutes: 60,
    })

    editorStore.addObject('notes-panel', {
      x: 468,
      y: 170,
      width: 216,
      height: 180,
      pattern: 'ruled',
      title: 'Grateful for',
      accentColor: '#60a5fa',
    })

    editorStore.addObject('checklist', {
      x: 468,
      y: 376,
      width: 216,
      height: 440,
      title: 'To Do',
      accentColor: '#ec4899',
      rows: 8,
      showCheckboxes: true,
    })

    editorStore.addObject('notes-panel', {
      x: 60,
      y: 850,
      width: 624,
      height: 160,
      pattern: 'grid',
      title: 'Important',
      accentColor: '#93c5fd',
    })
  }

  if (presetId === 'daily-minimal') {
    editorStore.addObject('text', {
      content: 'Daily Planner',
      x: 60,
      y: 54,
      fontSize: 46,
      fontFamily: 'Outfit',
      fontWeight: 700,
      textAlign: 'left',
      originX: 'left',
      color: '#111827',
    })

    editorStore.addObject('text', {
      content: 'Date:',
      x: 520,
      y: 70,
      fontSize: 12,
      fontFamily: 'Inter',
      fontWeight: 700,
      textAlign: 'left',
      originX: 'left',
      color: '#6b7280',
    })
    editorStore.addObject('shape', {
      x: 560,
      y: 88,
      width: 140,
      stroke: '#cbd5e1',
      strokeWidth: 2,
      shapeType: 'line',
    })

    editorStore.addObject('notes-panel', {
      x: 60,
      y: 140,
      width: 380,
      height: 740,
      pattern: 'ruled',
      title: "Today's Focus",
      accentColor: '#f59e0b',
    })

    editorStore.addObject('notes-panel', {
      x: 468,
      y: 140,
      width: 216,
      height: 240,
      pattern: 'dot',
      title: 'Top Priority',
      accentColor: '#84cc16',
    })

    editorStore.addObject('checklist', {
      x: 468,
      y: 406,
      width: 216,
      height: 300,
      title: 'To-Do List',
      accentColor: '#f59e0b',
      rows: 6,
      showCheckboxes: true,
    })

    editorStore.addObject('notes-panel', {
      x: 468,
      y: 730,
      width: 216,
      height: 240,
      pattern: 'ruled',
      title: 'Notes',
      accentColor: '#94a3b8',
    })

    // Simple mood row (editable shapes)
    editorStore.addObject('text', {
      content: 'Mood:',
      x: 468,
      y: 1006,
      fontSize: 12,
      fontFamily: 'Inter',
      fontWeight: 700,
      textAlign: 'left',
      originX: 'left',
      color: '#6b7280',
    })
    for (let i = 0; i < 5; i++) {
      editorStore.addObject('shape', {
        x: 520 + i * 32,
        y: 1000,
        radius: 10,
        fill: '#f3f4f6',
        stroke: '#cbd5e1',
        strokeWidth: 2,
        shapeType: 'circle',
      })
    }
  }

  await nextTick()
  editorStore.canvas.calcOffset()
  editorStore.canvas.renderAll()
  editorStore.snapshotCanvasState()
}

// Text Functions
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
  // Add heading with the pairing's heading font
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

// Upload handling
function handleDragOver(e: DragEvent) {
  e.preventDefault()
  isDragging.value = true
}

function handleDragLeave() {
  isDragging.value = false
}

function handleDrop(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false
  
  const files = e.dataTransfer?.files
  if (files) {
    handleFiles(files)
  }
}

function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files) {
    handleFiles(input.files)
  }
}

function handleFiles(files: FileList) {
  Array.from(files).forEach(file => {
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file)
      const id = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      uploadedImages.value.push({ id, url, name: file.name })
    }
  })
}

function addUploadedImage(image: { url: string }) {
  editorStore.addImage(image.url)
}

function removeUploadedImage(id: string) {
  const index = uploadedImages.value.findIndex(img => img.id === id)
  if (index > -1) {
    const target = uploadedImages.value[index]
    if (target) {
      URL.revokeObjectURL(target.url)
      uploadedImages.value.splice(index, 1)
    }
  }
}

function handleAlign(action: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') {
  editorStore.alignSelection?.(action, alignTarget.value) ?? editorStore.alignObjects(action)
}

function handleDistribute(axis: 'horizontal' | 'vertical') {
  editorStore.distributeSelection?.(axis)
}

</script>

<template>
  <div class="h-screen flex flex-col bg-gray-100 dark:bg-gray-900 overflow-hidden">
    <!-- Header -->
    <header class="h-14 bg-white dark:bg-gray-800 z-20 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
      <div class="flex items-center gap-4">
        <button @click="router.push('/dashboard')" class="btn-icon" title="Back to Dashboard">
          <ArrowLeftIcon class="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
        <div class="h-6 w-px bg-gray-200 dark:bg-gray-700"></div>
        <div>
          <input
            v-model="projectName"
            class="input-inline w-64 max-w-[40vw]"
            aria-label="Project name"
          />
          <p class="text-xs text-gray-500">
            <span v-if="isDirty" class="text-amber-500">● Unsaved changes</span>
            <span v-else class="text-green-500">✓ All changes saved</span>
          </p>
        </div>
      </div>
      
      <div class="flex items-center gap-3">
        <!-- Undo/Redo -->
        <div class="flex items-center gap-1 pr-3 border-r border-gray-200 dark:border-gray-700">
          <button 
            @click="editorStore.undo()" 
            :disabled="!canUndo"
            class="btn-icon"
            title="Undo (Ctrl+Z)"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
          <button 
            @click="editorStore.redo()" 
            :disabled="!canRedo"
            class="btn-icon"
            title="Redo (Ctrl+Shift+Z)"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
            </svg>
          </button>
        </div>

        <span class="text-xs text-gray-500 font-medium">A4 Portrait</span>
        <div class="h-6 w-px bg-gray-200 dark:bg-gray-700"></div>
        
        <AppButton variant="secondary-sm" class="flex items-center gap-1.5" type="button">
          <ShareIcon class="w-4 h-4" /> Share
        </AppButton>
        <AppButton
          variant="secondary-sm"
          class="flex items-center gap-1.5"
          type="button"
          :disabled="!isDirty || saving"
          @click="handleSaveProject()"
        >
          {{ saving ? 'Saving...' : 'Save' }}
        </AppButton>
        <AppButton
          variant="primary-sm"
          class="flex items-center gap-1.5"
          type="button"
          @click="isExportModalOpen = true"
        >
          <ArrowDownTrayIcon class="w-4 h-4" /> Export
        </AppButton>
      </div>
    </header>

    <div class="flex-1 flex overflow-hidden">
      <!-- Left Sidebar -->
      <aside class="flex h-full z-10 shrink-0">
        <!-- Icon Rail (Compact) -->
        <div class="w-12 bg-white dark:bg-gray-800 flex flex-col items-center py-3 gap-0.5 border-r border-gray-200 dark:border-gray-700">
          <button 
            v-for="tool in tools" 
            :key="tool.id"
            @click="activeTool = activeTool === tool.id ? '' : tool.id"
            :class="[
              'w-10 h-10 rounded-lg flex flex-col items-center justify-center transition-all',
              activeTool === tool.id 
                ? 'bg-primary-500 text-white shadow-md' 
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            ]"
            :title="tool.name"
          >
            <component :is="tool.icon" class="w-5 h-5" />
          </button>
        </div>

        <!-- Drawer Panel -->
        <transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="w-0 opacity-0"
          enter-to-class="w-64 opacity-100"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="w-64 opacity-100"
          leave-to-class="w-0 opacity-0"
        >
          <div v-if="activeTool" class="w-64 xl:w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
            <!-- Panel Header -->
            <div class="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center shrink-0">
              <h2 class="font-medium text-sm text-gray-900 dark:text-white capitalize">{{ activeTool }}</h2>
              <button @click="activeTool = ''" class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <XMarkIcon class="w-4 h-4 text-gray-400" />
              </button>
            </div>
            
            <!-- Panel Content -->
            <div class="flex-1 overflow-y-auto p-3">
              
              <!-- ═══════════════════════════════════════════════════ -->
              <!-- TEMPLATES PANEL - Redesigned with categories -->
              <!-- ═══════════════════════════════════════════════════ -->
              <div v-if="activeTool === 'templates'" class="space-y-4">
                <TemplatePanel
                  :categories="templateCategories"
                  :selected-category="selectedTemplateCategory"
                  :templates="filteredTemplates"
                  :thumbnails="templateThumbnails"
                  :loading="thumbnailsLoading"
                  @update:selected-category="selectedTemplateCategory = $event"
                  @apply="applyTemplate"
                />
              </div>

              <!-- ═══════════════════════════════════════════════════ -->
              <!-- ELEMENTS PANEL - Expanded with categories -->
              <!-- ═══════════════════════════════════════════════════ -->
              <div v-else-if="activeTool === 'elements'" class="space-y-5">
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

              <!-- ═══════════════════════════════════════════════════ -->
              <!-- UPLOADS PANEL -->
              <!-- ═══════════════════════════════════════════════════ -->
              <div v-else-if="activeTool === 'uploads'" class="space-y-4">
                <!-- Drop Zone -->
                <div 
                  @dragover="handleDragOver"
                  @dragleave="handleDragLeave"
                  @drop="handleDrop"
                  :class="[
                    'dropzone',
                    isDragging 
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                  ]"
                >
                  <input 
                    type="file" 
                    accept="image/*" 
                    multiple 
                    @change="handleFileSelect"
                    class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <PhotoIcon class="w-10 h-10 mx-auto text-gray-400 mb-3" />
                  <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Drop images here</p>
                  <p class="text-xs text-gray-500 mt-1">or click to browse</p>
                </div>
                
                <!-- Uploaded Images Grid -->
                <div v-if="uploadedImages.length > 0" class="space-y-2">
                  <p class="text-xs font-semibold text-gray-500 uppercase">Your uploads ({{ uploadedImages.length }})</p>
                  <div class="grid grid-cols-2 gap-2">
                    <div 
                      v-for="image in uploadedImages" 
                      :key="image.id"
                      class="relative group aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700"
                    >
                      <img :src="image.url" :alt="image.name" class="w-full h-full object-cover" />
                      <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button 
                          @click="addUploadedImage(image)"
                          class="btn-overlay"
                          title="Add to canvas"
                        >
                          <PlusIcon class="w-4 h-4 text-gray-800" />
                        </button>
                        <button 
                          @click="removeUploadedImage(image.id)"
                          class="btn-overlay-danger"
                          title="Remove"
                        >
                          <TrashIcon class="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <p v-else class="text-xs text-gray-400 text-center py-4">No images uploaded yet</p>
              </div>

              <!-- ═══════════════════════════════════════════════════ -->
              <!-- TEXT PANEL - Industry standard presets -->
              <!-- ═══════════════════════════════════════════════════ -->
              <div v-else-if="activeTool === 'text'" class="space-y-5">
                <!-- Typography Presets -->
                <div>
                  <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">Typography Presets</p>
                  <div class="space-y-2">
                    <button 
                      v-for="preset in textPresets" 
                      :key="preset.id"
                      @click="addTextPreset(preset)"
                      class="w-full text-left p-3 surface-hover rounded-xl group border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
                    >
                      <p 
                        :style="{ 
                          fontSize: Math.min(preset.size, 24) + 'px', 
                          fontWeight: preset.weight,
                          fontFamily: preset.family,
                          textTransform: (preset as any).uppercase ? 'uppercase' : 'none'
                        }"
                        class="text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors"
                      >
                        {{ preset.sample }}
                      </p>
                      <p class="text-[10px] text-gray-400 mt-1">{{ preset.name }} · {{ preset.family }} · {{ preset.size }}px</p>
                    </button>
                  </div>
                </div>
                
                <!-- Font Pairings -->
                <div>
                  <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">Font Pairings</p>
                  <div class="grid grid-cols-2 gap-2">
                    <button
                      v-for="pairing in fontPairings"
                      :key="pairing.id"
                      @click="applyFontPairing(pairing)"
                      class="p-3 surface-hover rounded-xl text-center group border border-transparent hover:border-primary-300"
                    >
                      <p :style="{ fontFamily: pairing.heading }" class="text-xl font-bold text-gray-900 dark:text-white">{{ pairing.preview }}</p>
                      <p class="text-[10px] text-gray-500 mt-1">{{ pairing.name }}</p>
                    </button>
                  </div>
                </div>
                
                <!-- Calendar Text Styles -->
                <div>
                  <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">Calendar Styles</p>
                  <div class="space-y-1.5">
                    <button
                      v-for="style in calendarTextStyles"
                      :key="style.id"
                      @click="addCalendarTextStyle(style)"
                      class="w-full flex items-center justify-between p-2.5 surface-hover rounded-lg group"
                    >
                      <span 
                        :style="{ 
                          fontSize: Math.max(style.size, 12) + 'px', 
                          fontWeight: style.weight,
                          fontFamily: style.family,
                          color: style.color
                        }"
                      >
                        {{ style.name }}
                      </span>
                      <ArrowLongRightIcon class="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </div>
                </div>
              </div>

              <!-- ═══════════════════════════════════════════════════ -->
              <!-- CALENDAR PANEL - Full configuration -->
              <!-- ═══════════════════════════════════════════════════ -->
              <div v-else-if="activeTool === 'calendar'">
                <CalendarConfigPanel @generate="activeTool = ''" />
              </div>

            </div>
          </div>
        </transition>
      </aside>

      <!-- Center Canvas Area (Adobe-style) -->
      <main class="flex-1 relative overflow-hidden flex flex-col">
        <AdobeCanvas 
          ref="adobeCanvasRef"
          :canvas-ref="canvasRef"
          @canvas-ready="handleCanvasReady"
        />
      </main>

      <!-- Right Sidebar Toggle Button -->
      <button
        v-if="!isRightSidebarVisible"
        @click="isRightSidebarVisible = true"
        class="fixed right-0 top-1/2 -translate-y-1/2 z-20 bg-[#0f1627] text-white/70 hover:text-white p-2 rounded-l-lg border border-r-0 border-white/10 transition-colors"
        title="Show sidebar"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
      </button>

      <!-- Right Sidebar (Properties + Layers) -->
      <aside 
        v-show="isRightSidebarVisible"
        class="w-56 xl:w-64 bg-[#0f1627] text-white border-l border-white/10 shrink-0 hidden lg:flex flex-col z-10 overflow-hidden transition-all duration-200"
      >
        <!-- Sidebar Header with Hide Button -->
        <div class="px-3 py-2 border-b border-white/10 flex items-center justify-between shrink-0">
          <span class="text-[10px] font-semibold uppercase tracking-wider text-white/50">Inspector</span>
          <button
            @click="isRightSidebarVisible = false"
            class="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors"
            title="Hide sidebar"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>

        <!-- Properties Panel -->
        <div :class="['flex flex-col border-b border-white/5 transition-all duration-200', isPropertiesCollapsed ? 'h-8' : (isLayersCollapsed ? 'flex-1' : 'flex-1')]">
          <button 
            @click="isPropertiesCollapsed = !isPropertiesCollapsed"
            class="px-3 py-1.5 border-b border-white/5 shrink-0 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer"
          >
            <div class="flex items-center gap-2">
              <svg :class="['w-3 h-3 transition-transform', isPropertiesCollapsed ? '-rotate-90' : 'rotate-0']" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
              <span class="text-xs font-medium">Properties</span>
            </div>
            <span class="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white/60">
              {{ isDirty ? 'Unsaved' : 'Synced' }}
            </span>
          </button>
          
          <div v-show="!isPropertiesCollapsed" class="flex-1 overflow-y-auto space-y-3 p-3">
            <!-- Template Overrides -->
            <section
              v-if="activeTemplate"
              class="rounded-2xl border border-white/10 bg-white/5 backdrop-blur px-4 py-3 space-y-3"
            >
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-xs uppercase tracking-wide text-white/60">Template</p>
                  <p class="text-sm font-semibold">{{ activeTemplate.name }}</p>
                </div>
                <button
                  class="text-xs text-primary-200 hover:text-primary-100 font-semibold"
                  @click="resetTemplateOverrides"
                >
                  Reset
                </button>
              </div>
              <div class="space-y-2 text-sm">
                <label class="flex items-center justify-between gap-2">
                  <span class="text-white/80">Highlight today</span>
                  <input type="checkbox" v-model="templateOverrides.highlightToday" class="accent-primary-400">
                </label>
                <label class="flex items-center justify-between gap-2">
                  <span class="text-white/80">Highlight weekends</span>
                  <input type="checkbox" v-model="templateOverrides.highlightWeekends" class="accent-primary-400">
                </label>
                <label
                  v-if="templateSupportsPhoto"
                  class="flex items-center justify-between gap-2"
                >
                  <span class="text-white/80">Show photo area</span>
                  <input type="checkbox" v-model="templateOverrides.hasPhotoArea" class="accent-primary-400">
                </label>
                <label
                  v-if="templateSupportsNotes"
                  class="flex items-center justify-between gap-2"
                >
                  <span class="text-white/80">Show notes area</span>
                  <input type="checkbox" v-model="templateOverrides.hasNotesArea" class="accent-primary-400">
                </label>
              </div>
            </section>

            <!-- No Selection State -->
            <section
              v-if="!hasSelection"
              class="rounded-2xl border border-dashed border-white/10 bg-white/5 backdrop-blur px-6 py-8 text-center space-y-4"
            >
              <div class="w-16 h-16 mx-auto bg-white/10 rounded-3xl flex items-center justify-center text-white/60">
                <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
              </div>
              <div>
                <p class="text-sm font-medium text-white">Select an object to edit</p>
                <p class="text-xs text-white/60">Click any layer on the canvas or in the list below.</p>
              </div>
            </section>
            
            <!-- Properties Panel -->
            <section v-else class="rounded-2xl border border-white/10 bg-white/5 backdrop-blur px-4 py-4 space-y-5">
              <!-- Object Type -->
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold uppercase tracking-widest text-white/60">{{ objectType }}</span>
                <button @click="editorStore.deleteSelected()" class="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors group" title="Delete">
                  <TrashIcon class="w-4 h-4 text-white/50 group-hover:text-red-200" />
                </button>
              </div>

              <!-- Layout (Position & Size) -->
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <p class="text-xs font-semibold uppercase tracking-widest text-white/60">Layout</p>
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="text-xs font-medium text-white/60 mb-1.5 block">X</label>
                    <input
                      v-model.number="positionX"
                      type="number"
                      class="control-glass"
                    />
                  </div>
                  <div>
                    <label class="text-xs font-medium text-white/60 mb-1.5 block">Y</label>
                    <input
                      v-model.number="positionY"
                      type="number"
                      class="control-glass"
                    />
                  </div>
                </div>

                <div v-if="elementSize" class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="text-xs font-medium text-white/60 mb-1.5 block">W</label>
                    <input
                      type="number"
                      min="10"
                      class="control-glass"
                      :value="Math.round(elementSize.width)"
                      @change="updateElementSize({ width: Number(($event.target as HTMLInputElement).value), height: elementSize.height })"
                    />
                  </div>
                  <div>
                    <label class="text-xs font-medium text-white/60 mb-1.5 block">H</label>
                    <input
                      type="number"
                      min="10"
                      class="control-glass"
                      :value="Math.round(elementSize.height)"
                      @change="updateElementSize({ width: elementSize.width, height: Number(($event.target as HTMLInputElement).value) })"
                    />
                  </div>
                </div>

                <div v-else class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="text-xs font-medium text-white/60 mb-1.5 block">W</label>
                    <input
                      v-model.number="objectWidth"
                      type="number"
                      min="1"
                      class="control-glass"
                    />
                  </div>
                  <div>
                    <label class="text-xs font-medium text-white/60 mb-1.5 block">H</label>
                    <input
                      v-model.number="objectHeight"
                      type="number"
                      min="1"
                      class="control-glass"
                    />
                  </div>
                </div>
              </div>

              <!-- Align & Distribute -->
              <div class="pt-4 border-t border-white/10 space-y-3">
                <div class="flex items-center justify-between gap-3">
                  <p class="text-xs font-semibold uppercase tracking-widest text-white/60">Align</p>
                  <select v-model="alignTarget" class="control-glass-sm w-auto">
                    <option value="canvas">To Page</option>
                    <option value="selection">To Selection</option>
                  </select>
                </div>

                <div class="grid grid-cols-3 gap-2">
                  <button type="button" class="btn-glass-sm w-full" @click="handleAlign('left')">Left</button>
                  <button type="button" class="btn-glass-sm w-full" @click="handleAlign('center')">Center</button>
                  <button type="button" class="btn-glass-sm w-full" @click="handleAlign('right')">Right</button>
                  <button type="button" class="btn-glass-sm w-full" @click="handleAlign('top')">Top</button>
                  <button type="button" class="btn-glass-sm w-full" @click="handleAlign('middle')">Middle</button>
                  <button type="button" class="btn-glass-sm w-full" @click="handleAlign('bottom')">Bottom</button>
                </div>

                <div class="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    class="btn-glass-sm w-full"
                    :disabled="selectedObjects.length < 3"
                    :class="selectedObjects.length < 3 ? 'opacity-50 cursor-not-allowed' : ''"
                    @click="handleDistribute('horizontal')"
                  >
                    Distribute H
                  </button>
                  <button
                    type="button"
                    class="btn-glass-sm w-full"
                    :disabled="selectedObjects.length < 3"
                    :class="selectedObjects.length < 3 ? 'opacity-50 cursor-not-allowed' : ''"
                    @click="handleDistribute('vertical')"
                  >
                    Distribute V
                  </button>
                </div>

                <p class="text-[11px] text-white/50">
                  Tip: single object → “To Page”. Multiple → “To Selection”.
                </p>
              </div>

              <!-- Calendar Grid -->
              <template v-if="calendarMetadata">
                <div class="pt-4 border-t border-white/10 space-y-4">
                  <div class="flex items-center justify-between">
                    <p class="text-xs font-semibold uppercase tracking-widest text-white/60">Month Grid</p>
                    <select
                      class="control-glass-sm"
                      :value="calendarMetadata.mode"
                      @change="updateCalendarMetadata((draft) => { draft.mode = ($event.target as HTMLSelectElement).value as CalendarGridMetadata['mode'] })"
                    >
                      <option value="month">Actual Month</option>
                      <option value="blank">Blank Grid</option>
                    </select>
                  </div>

                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="text-xs font-medium text-white/60 mb-1.5 block">Year</label>
                      <input
                        type="number"
                        min="1900"
                        max="2100"
                        class="control-glass"
                        :value="calendarMetadata.year"
                        @change="updateCalendarMetadata((draft) => { draft.year = Number(($event.target as HTMLInputElement).value) || draft.year })"
                      />
                    </div>
                    <div>
                      <label class="text-xs font-medium text-white/60 mb-1.5 block">Month</label>
                      <select
                        class="control-glass"
                        :value="calendarMetadata.month"
                        @change="updateCalendarMetadata((draft) => { draft.month = Number(($event.target as HTMLSelectElement).value) || draft.month })"
                      >
                        <option v-for="m in monthOptions" :key="m.value" :value="m.value">{{ m.label }}</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label class="text-xs font-medium text-white/60 mb-1.5 block">Week starts on</label>
                    <select
                      class="control-glass"
                      :value="calendarMetadata.startDay"
                      @change="updateCalendarMetadata((draft) => { draft.startDay = Number(($event.target as HTMLSelectElement).value) as CalendarGridMetadata['startDay'] })"
                    >
                      <option v-for="d in weekStartOptions" :key="d.value" :value="d.value">{{ d.label }}</option>
                    </select>
                  </div>

                  <div class="flex items-center justify-between gap-4">
                    <label class="flex items-center gap-2 text-sm text-white/80">
                      <input
                        type="checkbox"
                        class="accent-primary-400"
                        :checked="calendarMetadata.showHeader"
                        @change="updateCalendarMetadata((draft) => { draft.showHeader = ($event.target as HTMLInputElement).checked })"
                      >
                      <span>Header</span>
                    </label>
                    <label class="flex items-center gap-2 text-sm text-white/80">
                      <input
                        type="checkbox"
                        class="accent-primary-400"
                        :checked="calendarMetadata.showWeekdays"
                        @change="updateCalendarMetadata((draft) => { draft.showWeekdays = ($event.target as HTMLInputElement).checked })"
                      >
                      <span>Weekdays</span>
                    </label>
                  </div>

                  <div>
                    <label class="text-xs font-medium text-white/60 mb-1.5 block">Title override</label>
                    <input
                      type="text"
                      placeholder="(optional)"
                      class="control-glass"
                      :value="calendarMetadata.title ?? ''"
                      @input="updateCalendarMetadata((draft) => { draft.title = ($event.target as HTMLInputElement).value || undefined })"
                    />
                  </div>

                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="text-xs font-medium text-white/60 mb-1.5 block">Background</label>
                      <ColorPicker
                        :model-value="calendarMetadata.backgroundColor ?? '#ffffff'"
                        @update:modelValue="(c) => updateCalendarMetadata((draft) => { draft.backgroundColor = c })"
                      />
                    </div>
                    <div>
                      <label class="text-xs font-medium text-white/60 mb-1.5 block">Border</label>
                      <ColorPicker
                        :model-value="calendarMetadata.borderColor ?? '#e5e7eb'"
                        @update:modelValue="(c) => updateCalendarMetadata((draft) => { draft.borderColor = c })"
                      />
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="text-xs font-medium text-white/60 mb-1.5 block">Radius</label>
                      <input
                        type="number"
                        min="0"
                        max="80"
                        class="control-glass"
                        :value="calendarMetadata.cornerRadius ?? 26"
                        @change="updateCalendarMetadata((draft) => { draft.cornerRadius = Math.max(0, Math.min(80, Number(($event.target as HTMLInputElement).value) || 0)) })"
                      />
                    </div>
                    <div>
                      <label class="text-xs font-medium text-white/60 mb-1.5 block">Border Width</label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        class="control-glass"
                        :value="calendarMetadata.borderWidth ?? 1"
                        @change="updateCalendarMetadata((draft) => { draft.borderWidth = Math.max(0, Math.min(10, Number(($event.target as HTMLInputElement).value) || 0)) })"
                      />
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="text-xs font-medium text-white/60 mb-1.5 block">Header bg</label>
                      <ColorPicker
                        :model-value="calendarMetadata.headerBackgroundColor ?? '#111827'"
                        @update:modelValue="(c) => updateCalendarMetadata((draft) => { draft.headerBackgroundColor = c })"
                      />
                    </div>
                    <div>
                      <label class="text-xs font-medium text-white/60 mb-1.5 block">Header text</label>
                      <ColorPicker
                        :model-value="calendarMetadata.headerTextColor ?? '#ffffff'"
                        @update:modelValue="(c) => updateCalendarMetadata((draft) => { draft.headerTextColor = c })"
                      />
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="text-xs font-medium text-white/60 mb-1.5 block">Grid lines</label>
                      <ColorPicker
                        :model-value="calendarMetadata.gridLineColor ?? '#e5e7eb'"
                        @update:modelValue="(c) => updateCalendarMetadata((draft) => { draft.gridLineColor = c })"
                      />
                    </div>
                    <div>
                      <label class="text-xs font-medium text-white/60 mb-1.5 block">Line width</label>
                      <input
                        type="number"
                        min="0"
                        max="6"
                        class="control-glass"
                        :value="calendarMetadata.gridLineWidth ?? 1"
                        @change="updateCalendarMetadata((draft) => { draft.gridLineWidth = Math.max(0, Math.min(6, Number(($event.target as HTMLInputElement).value) || 0)) })"
                      />
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="text-xs font-medium text-white/60 mb-1.5 block">Day color</label>
                      <ColorPicker
                        :model-value="calendarMetadata.dayNumberColor ?? '#1f2937'"
                        @update:modelValue="(c) => updateCalendarMetadata((draft) => { draft.dayNumberColor = c })"
                      />
                    </div>
                    <div>
                      <label class="text-xs font-medium text-white/60 mb-1.5 block">Muted</label>
                      <ColorPicker
                        :model-value="calendarMetadata.dayNumberMutedColor ?? '#9ca3af'"
                        @update:modelValue="(c) => updateCalendarMetadata((draft) => { draft.dayNumberMutedColor = c })"
                      />
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="text-xs font-medium text-white/60 mb-1.5 block">Weekend bg</label>
                      <ColorPicker
                        :model-value="calendarMetadata.weekendBackgroundColor ?? 'rgba(0,0,0,0)'"
                        @update:modelValue="(c) => updateCalendarMetadata((draft) => { draft.weekendBackgroundColor = c })"
                      />
                    </div>
                    <div>
                      <label class="text-xs font-medium text-white/60 mb-1.5 block">Today bg</label>
                      <ColorPicker
                        :model-value="calendarMetadata.todayBackgroundColor ?? 'rgba(0,0,0,0)'"
                        @update:modelValue="(c) => updateCalendarMetadata((draft) => { draft.todayBackgroundColor = c })"
                      />
                    </div>
                  </div>

                  <div class="pt-3 border-t border-white/10 space-y-3">
                    <p class="text-[11px] font-semibold text-white/60">Layout</p>

                    <div class="grid grid-cols-2 gap-3">
                      <div>
                        <label class="text-xs font-medium text-white/60 mb-1.5 block">Header height</label>
                        <input
                          type="number"
                          min="0"
                          max="200"
                          class="control-glass"
                          :value="calendarMetadata.headerHeight ?? 60"
                          @change="updateCalendarMetadata((draft) => { draft.headerHeight = Math.max(0, Math.min(200, Number(($event.target as HTMLInputElement).value) || 0)) })"
                        />
                      </div>
                      <div>
                        <label class="text-xs font-medium text-white/60 mb-1.5 block">Weekday height</label>
                        <input
                          type="number"
                          min="0"
                          max="120"
                          class="control-glass"
                          :value="calendarMetadata.weekdayHeight ?? 36"
                          @change="updateCalendarMetadata((draft) => { draft.weekdayHeight = Math.max(0, Math.min(120, Number(($event.target as HTMLInputElement).value) || 0)) })"
                        />
                      </div>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                      <div>
                        <label class="text-xs font-medium text-white/60 mb-1.5 block">Cell gap</label>
                        <input
                          type="number"
                          min="0"
                          max="30"
                          class="control-glass"
                          :value="calendarMetadata.cellGap ?? 0"
                          @change="updateCalendarMetadata((draft) => { draft.cellGap = Math.max(0, Math.min(30, Number(($event.target as HTMLInputElement).value) || 0)) })"
                        />
                      </div>
                      <div>
                        <label class="text-xs font-medium text-white/60 mb-1.5 block">Grid line width</label>
                        <input
                          type="number"
                          min="0"
                          max="6"
                          class="control-glass"
                          :value="calendarMetadata.gridLineWidth ?? 1"
                          @change="updateCalendarMetadata((draft) => { draft.gridLineWidth = Math.max(0, Math.min(6, Number(($event.target as HTMLInputElement).value) || 0)) })"
                        />
                      </div>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                      <div>
                        <label class="text-xs font-medium text-white/60 mb-1.5 block">Day padding X</label>
                        <input
                          type="number"
                          min="0"
                          max="60"
                          class="control-glass"
                          :value="calendarMetadata.dayNumberInsetX ?? 12"
                          @change="updateCalendarMetadata((draft) => { draft.dayNumberInsetX = Math.max(0, Math.min(60, Number(($event.target as HTMLInputElement).value) || 0)) })"
                        />
                      </div>
                      <div>
                        <label class="text-xs font-medium text-white/60 mb-1.5 block">Day padding Y</label>
                        <input
                          type="number"
                          min="0"
                          max="60"
                          class="control-glass"
                          :value="calendarMetadata.dayNumberInsetY ?? 8"
                          @change="updateCalendarMetadata((draft) => { draft.dayNumberInsetY = Math.max(0, Math.min(60, Number(($event.target as HTMLInputElement).value) || 0)) })"
                        />
                      </div>
                    </div>
                  </div>

                  <div class="pt-3 border-t border-white/10 space-y-3">
                    <p class="text-[11px] font-semibold text-white/60">Holiday markers</p>

                    <div class="flex items-center justify-between gap-4">
                      <label class="flex items-center gap-2 text-sm text-white/80">
                        <input
                          type="checkbox"
                          class="accent-primary-400"
                          :checked="calendarMetadata.showHolidayMarkers ?? true"
                          @change="updateCalendarMetadata((draft) => { draft.showHolidayMarkers = ($event.target as HTMLInputElement).checked })"
                        >
                        <span>Show</span>
                      </label>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                      <div>
                        <label class="text-xs font-medium text-white/60 mb-1.5 block">Color</label>
                        <ColorPicker
                          :model-value="calendarMetadata.holidayMarkerColor ?? '#ef4444'"
                          @update:modelValue="(c) => updateCalendarMetadata((draft) => { draft.holidayMarkerColor = c })"
                        />
                      </div>
                      <div>
                        <label class="text-xs font-medium text-white/60 mb-1.5 block">Height</label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          class="control-glass"
                          :value="calendarMetadata.holidayMarkerHeight ?? 4"
                          @change="updateCalendarMetadata((draft) => { draft.holidayMarkerHeight = Math.max(1, Math.min(20, Number(($event.target as HTMLInputElement).value) || 4)) })"
                        />
                      </div>
                    </div>
                  </div>

                  <div class="pt-3 border-t border-white/10 space-y-3">
                    <p class="text-[11px] font-semibold text-white/60">Typography</p>

                    <div class="grid grid-cols-2 gap-3">
                      <div>
                        <label class="text-xs font-medium text-white/60 mb-1.5 block">Header font</label>
                        <FontPicker
                          :model-value="calendarMetadata.headerFontFamily ?? 'Outfit'"
                          @update:modelValue="(v) => updateCalendarMetadata((draft) => { draft.headerFontFamily = v })"
                        />
                      </div>
                      <div>
                        <label class="text-xs font-medium text-white/60 mb-1.5 block">Header size</label>
                        <input
                          type="number"
                          min="8"
                          max="96"
                          class="control-glass"
                          :value="calendarMetadata.headerFontSize ?? 24"
                          @change="updateCalendarMetadata((draft) => { draft.headerFontSize = Math.max(8, Math.min(96, Number(($event.target as HTMLInputElement).value) || 24)) })"
                        />
                      </div>
                    </div>

                    <div>
                      <label class="text-xs font-medium text-white/60 mb-1.5 block">Header weight</label>
                      <input
                        type="text"
                        class="control-glass"
                        :value="String(calendarMetadata.headerFontWeight ?? 600)"
                        @input="updateCalendarMetadata((draft) => { const v = (($event.target as HTMLInputElement).value || '').trim(); draft.headerFontWeight = /^\d+$/.test(v) ? Number(v) : (v || 600) })"
                      />
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                      <div>
                        <label class="text-xs font-medium text-white/60 mb-1.5 block">Weekday font</label>
                        <FontPicker
                          :model-value="calendarMetadata.weekdayFontFamily ?? 'Inter'"
                          @update:modelValue="(v) => updateCalendarMetadata((draft) => { draft.weekdayFontFamily = v })"
                        />
                      </div>
                      <div>
                        <label class="text-xs font-medium text-white/60 mb-1.5 block">Weekday size</label>
                        <input
                          type="number"
                          min="8"
                          max="40"
                          class="control-glass"
                          :value="calendarMetadata.weekdayFontSize ?? 12"
                          @change="updateCalendarMetadata((draft) => { draft.weekdayFontSize = Math.max(8, Math.min(40, Number(($event.target as HTMLInputElement).value) || 12)) })"
                        />
                      </div>
                    </div>

                    <div>
                      <label class="text-xs font-medium text-white/60 mb-1.5 block">Weekday weight</label>
                      <input
                        type="text"
                        class="control-glass"
                        :value="String(calendarMetadata.weekdayFontWeight ?? 600)"
                        @input="updateCalendarMetadata((draft) => { const v = (($event.target as HTMLInputElement).value || '').trim(); draft.weekdayFontWeight = /^\d+$/.test(v) ? Number(v) : (v || 600) })"
                      />
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                      <div>
                        <label class="text-xs font-medium text-white/60 mb-1.5 block">Day font</label>
                        <FontPicker
                          :model-value="calendarMetadata.dayNumberFontFamily ?? 'Inter'"
                          @update:modelValue="(v) => updateCalendarMetadata((draft) => { draft.dayNumberFontFamily = v })"
                        />
                      </div>
                      <div>
                        <label class="text-xs font-medium text-white/60 mb-1.5 block">Day size</label>
                        <input
                          type="number"
                          min="8"
                          max="60"
                          class="control-glass"
                          :value="calendarMetadata.dayNumberFontSize ?? 16"
                          @change="updateCalendarMetadata((draft) => { draft.dayNumberFontSize = Math.max(8, Math.min(60, Number(($event.target as HTMLInputElement).value) || 16)) })"
                        />
                      </div>
                    </div>

                    <div>
                      <label class="text-xs font-medium text-white/60 mb-1.5 block">Day weight</label>
                      <input
                        type="text"
                        class="control-glass"
                        :value="String(calendarMetadata.dayNumberFontWeight ?? 600)"
                        @input="updateCalendarMetadata((draft) => { const v = (($event.target as HTMLInputElement).value || '').trim(); draft.dayNumberFontWeight = /^\d+$/.test(v) ? Number(v) : (v || 600) })"
                      />
                    </div>
                  </div>
                </div>
              </template>

              <template v-if="isLineOrArrow">
                <div class="pt-4 border-t border-white/10 space-y-4">
                  <p class="text-[11px] font-semibold text-white/60">Lines &amp; Arrows</p>

                  <div>
                    <label class="text-xs font-medium text-white/60 mb-1.5 block">Stroke</label>
                    <ColorPicker v-model="lineStrokeColor" />
                  </div>

                  <div>
                    <label class="text-xs font-medium text-white/60 mb-1.5 block">Stroke Width</label>
                    <div class="flex items-center gap-3">
                      <input
                        v-model.number="lineStrokeWidth"
                        type="range"
                        min="1"
                        max="24"
                        class="flex-1 accent-primary-400"
                      />
                      <span class="text-xs text-white/70 w-8 text-right">{{ lineStrokeWidth }}px</span>
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="text-xs font-medium text-white/60 mb-1.5 block">Dash</label>
                      <select class="control-glass" :value="dashStyle" @change="dashStyle = ($event.target as HTMLSelectElement).value">
                        <option value="solid">Solid</option>
                        <option value="dashed">Dashed</option>
                        <option value="dotted">Dotted</option>
                        <option value="dash-dot">Dash-dot</option>
                      </select>
                    </div>
                    <div>
                      <label class="text-xs font-medium text-white/60 mb-1.5 block">Cap</label>
                      <select class="control-glass" :value="lineCap" @change="lineCap = ($event.target as HTMLSelectElement).value">
                        <option value="butt">Butt</option>
                        <option value="round">Round</option>
                        <option value="square">Square</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label class="text-xs font-medium text-white/60 mb-1.5 block">Join</label>
                    <select class="control-glass" :value="lineJoin" @change="lineJoin = ($event.target as HTMLSelectElement).value">
                      <option value="miter">Miter</option>
                      <option value="round">Round</option>
                      <option value="bevel">Bevel</option>
                    </select>
                  </div>

                  <div v-if="isArrow" class="pt-3 border-t border-white/10 space-y-3">
                    <p class="text-[11px] font-semibold text-white/60">Arrowhead</p>

                    <div class="grid grid-cols-2 gap-3">
                      <div>
                        <label class="text-xs font-medium text-white/60 mb-1.5 block">Ends</label>
                        <select class="control-glass" :value="arrowEnds" @change="arrowEnds = ($event.target as HTMLSelectElement).value">
                          <option value="end">End</option>
                          <option value="start">Start</option>
                          <option value="both">Both</option>
                          <option value="none">None</option>
                        </select>
                      </div>
                      <div>
                        <label class="text-xs font-medium text-white/60 mb-1.5 block">Style</label>
                        <select class="control-glass" :value="arrowHeadStyle" @change="arrowHeadStyle = ($event.target as HTMLSelectElement).value">
                          <option value="filled">Filled</option>
                          <option value="open">Open</option>
                        </select>
                      </div>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                      <div>
                        <label class="text-xs font-medium text-white/60 mb-1.5 block">Length</label>
                        <input v-model.number="arrowHeadLength" type="number" min="4" max="80" class="control-glass" />
                      </div>
                      <div>
                        <label class="text-xs font-medium text-white/60 mb-1.5 block">Width</label>
                        <input v-model.number="arrowHeadWidth" type="number" min="4" max="80" class="control-glass" />
                      </div>
                    </div>
                  </div>
                </div>
              </template>

              <!-- Week Strip -->
              <template v-if="weekStripMetadata">
                <div class="pt-4 border-t border-white/10 space-y-4">
                  <p class="text-xs font-semibold uppercase tracking-widest text-white/60">Week Strip</p>

                  <div>
                    <label class="text-xs font-medium text-white/60 mb-1.5 block">Label</label>
                    <input
                      type="text"
                      class="control-glass"
                      :value="weekStripMetadata.label ?? ''"
                      @input="updateWeekStripMetadata((draft) => { draft.label = ($event.target as HTMLInputElement).value || undefined })"
                    />
                  </div>

                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="text-xs font-medium text-white/60 mb-1.5 block">Start date</label>
                      <input
                        type="date"
                        class="control-glass"
                        :value="weekStripDateValue"
                        @change="updateWeekStripMetadata((draft) => { const v = ($event.target as HTMLInputElement).value; if (v) draft.startDate = v })"
                      />
                    </div>
                    <div>
                      <label class="text-xs font-medium text-white/60 mb-1.5 block">Week starts</label>
                      <select
                        class="control-glass"
                        :value="weekStripMetadata.startDay"
                        @change="updateWeekStripMetadata((draft) => { draft.startDay = Number(($event.target as HTMLSelectElement).value) as WeekStripMetadata['startDay'] })"
                      >
                        <option v-for="d in weekStartOptions" :key="d.value" :value="d.value">{{ d.label }}</option>
                      </select>
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="text-xs font-medium text-white/60 mb-1.5 block">Background</label>
                      <ColorPicker
                        :model-value="weekStripMetadata.backgroundColor ?? '#ffffff'"
                        @update:modelValue="(c) => updateWeekStripMetadata((draft) => { draft.backgroundColor = c })"
                      />
                    </div>
                    <div>
                      <label class="text-xs font-medium text-white/60 mb-1.5 block">Border</label>
                      <ColorPicker
                        :model-value="weekStripMetadata.borderColor ?? '#e5e7eb'"
                        @update:modelValue="(c) => updateWeekStripMetadata((draft) => { draft.borderColor = c })"
                      />
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="text-xs font-medium text-white/60 mb-1.5 block">Radius</label>
                      <input
                        type="number"
                        min="0"
                        max="80"
                        class="control-glass"
                        :value="weekStripMetadata.cornerRadius ?? 24"
                        @change="updateWeekStripMetadata((draft) => { draft.cornerRadius = Math.max(0, Math.min(80, Number(($event.target as HTMLInputElement).value) || 0)) })"
                      />
                    </div>
                    <div>
                      <label class="text-xs font-medium text-white/60 mb-1.5 block">Cell lines</label>
                      <ColorPicker
                        :model-value="weekStripMetadata.cellBorderColor ?? '#f1f5f9'"
                        @update:modelValue="(c) => updateWeekStripMetadata((draft) => { draft.cellBorderColor = c })"
                      />
                    </div>
                  </div>

                  <div class="grid grid-cols-3 gap-3">
                    <div>
                      <label class="text-xs font-medium text-white/60 mb-1.5 block">Label</label>
                      <ColorPicker
                        :model-value="weekStripMetadata.labelColor ?? '#0f172a'"
                        @update:modelValue="(c) => updateWeekStripMetadata((draft) => { draft.labelColor = c })"
                      />
                    </div>
                    <div>
                      <label class="text-xs font-medium text-white/60 mb-1.5 block">Weekday</label>
                      <ColorPicker
                        :model-value="weekStripMetadata.weekdayColor ?? '#64748b'"
                        @update:modelValue="(c) => updateWeekStripMetadata((draft) => { draft.weekdayColor = c })"
                      />
                    </div>
                    <div>
                      <label class="text-xs font-medium text-white/60 mb-1.5 block">Number</label>
                      <ColorPicker
                        :model-value="weekStripMetadata.dayNumberColor ?? '#0f172a'"
                        @update:modelValue="(c) => updateWeekStripMetadata((draft) => { draft.dayNumberColor = c })"
                      />
                    </div>
                  </div>
                </div>
              </template>

              <!-- Date Cell -->
              <template v-if="dateCellMetadata">
                <div class="pt-4 border-t border-white/10 space-y-4">
                  <p class="text-xs font-semibold uppercase tracking-widest text-white/60">Date Cell</p>

                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="text-xs font-medium text-white/60 mb-1.5 block">Date</label>
                      <input
                        type="date"
                        class="control-glass"
                        :value="dateCellDateValue"
                        @change="updateDateCellMetadata((draft) => { const v = ($event.target as HTMLInputElement).value; if (v) draft.date = v })"
                      />
                    </div>
                    <div>
                      <label class="text-xs font-medium text-white/60 mb-1.5 block">Accent</label>
                      <ColorPicker
                        :model-value="dateCellMetadata.highlightAccent"
                        @update:modelValue="(c) => updateDateCellMetadata((draft) => { draft.highlightAccent = c })"
                      />
                    </div>
                  </div>

                  <div>
                    <label class="text-xs font-medium text-white/60 mb-1.5 block">Placeholder</label>
                    <input
                      type="text"
                      class="control-glass"
                      :value="dateCellMetadata.notePlaceholder"
                      @input="updateDateCellMetadata((draft) => { draft.notePlaceholder = ($event.target as HTMLInputElement).value })"
                    />
                  </div>

                  <div>
                    <label class="text-xs font-medium text-white/60 mb-1.5 block">Accent height</label>
                    <div class="flex items-center gap-3">
                      <input
                        type="range"
                        min="0.1"
                        max="0.8"
                        step="0.01"
                        class="flex-1 accent-primary-400"
                        :value="dateCellMetadata.accentHeightRatio ?? 0.4"
                        @input="updateDateCellMetadata((draft) => { draft.accentHeightRatio = Number(($event.target as HTMLInputElement).value) })"
                      />
                      <span class="text-xs text-white/70 w-12 text-right">{{ Math.round(((dateCellMetadata.accentHeightRatio ?? 0.4) as number) * 100) }}%</span>
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="text-xs font-medium text-white/60 mb-1.5 block">Background</label>
                      <ColorPicker
                        :model-value="dateCellMetadata.backgroundColor ?? '#ffffff'"
                        @update:modelValue="(c) => updateDateCellMetadata((draft) => { draft.backgroundColor = c })"
                      />
                    </div>
                    <div>
                      <label class="text-xs font-medium text-white/60 mb-1.5 block">Border</label>
                      <ColorPicker
                        :model-value="dateCellMetadata.borderColor ?? '#e2e8f0'"
                        @update:modelValue="(c) => updateDateCellMetadata((draft) => { draft.borderColor = c })"
                      />
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="text-xs font-medium text-white/60 mb-1.5 block">Radius</label>
                      <input
                        type="number"
                        min="0"
                        max="80"
                        class="control-glass"
                        :value="dateCellMetadata.cornerRadius ?? 24"
                        @change="updateDateCellMetadata((draft) => { draft.cornerRadius = Math.max(0, Math.min(80, Number(($event.target as HTMLInputElement).value) || 0)) })"
                      />
                    </div>
                    <div>
                      <label class="text-xs font-medium text-white/60 mb-1.5 block">Border Width</label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        class="control-glass"
                        :value="dateCellMetadata.borderWidth ?? 1"
                        @change="updateDateCellMetadata((draft) => { draft.borderWidth = Math.max(0, Math.min(10, Number(($event.target as HTMLInputElement).value) || 0)) })"
                      />
                    </div>
                  </div>

                  <div class="grid grid-cols-3 gap-3">
                    <div>
                      <label class="text-xs font-medium text-white/60 mb-1.5 block">Weekday</label>
                      <ColorPicker
                        :model-value="dateCellMetadata.weekdayColor ?? '#78350f'"
                        @update:modelValue="(c) => updateDateCellMetadata((draft) => { draft.weekdayColor = c })"
                      />
                    </div>
                    <div>
                      <label class="text-xs font-medium text-white/60 mb-1.5 block">Number</label>
                      <ColorPicker
                        :model-value="dateCellMetadata.dayNumberColor ?? '#92400e'"
                        @update:modelValue="(c) => updateDateCellMetadata((draft) => { draft.dayNumberColor = c })"
                      />
                    </div>
                    <div>
                      <label class="text-xs font-medium text-white/60 mb-1.5 block">Text</label>
                      <ColorPicker
                        :model-value="dateCellMetadata.placeholderColor ?? '#475569'"
                        @update:modelValue="(c) => updateDateCellMetadata((draft) => { draft.placeholderColor = c })"
                      />
                    </div>
                  </div>
                </div>
              </template>

              <!-- Schedule Block -->
              <template v-if="scheduleMetadata">
                <div class="pt-4 border-t border-white/10 space-y-4">
                  <div class="flex items-center justify-between">
                    <p class="text-xs font-semibold uppercase tracking-widest text-white/60">Schedule</p>
                    <select
                      class="control-glass-sm"
                      :value="scheduleMetadata.intervalMinutes"
                      @change="updateScheduleMetadata((draft) => { draft.intervalMinutes = Number(($event.target as HTMLSelectElement).value) as ScheduleMetadata['intervalMinutes'] })"
                    >
                      <option v-for="opt in scheduleIntervalOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                    </select>
                  </div>

                  <div>
                    <label class="text-xs font-medium text-white/60 mb-1.5 block">Title</label>
                    <input
                      type="text"
                      class="control-glass"
                      :value="scheduleMetadata.title"
                      @input="updateScheduleMetadata((draft) => { draft.title = ($event.target as HTMLInputElement).value })"
                    />
                  </div>

                  <div>
                    <label class="text-xs font-medium text-white/60 mb-1.5 block">Header Style</label>
                    <select
                      class="control-glass"
                      :value="scheduleMetadata.headerStyle ?? 'minimal'"
                      @change="updateScheduleMetadata((draft) => { draft.headerStyle = ($event.target as HTMLSelectElement).value as PlannerHeaderStyle })"
                    >
                      <option v-for="opt in headerStyleOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                    </select>
                  </div>

                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="text-xs font-medium text-white/60 mb-1.5 block">Accent</label>
                      <ColorPicker
                        :model-value="scheduleMetadata.accentColor"
                        @update:modelValue="(c) => updateScheduleMetadata((draft) => { draft.accentColor = c })"
                      />
                    </div>
                    <div>
                      <label class="text-xs font-medium text-white/60 mb-1.5 block">Lines</label>
                      <ColorPicker
                        :model-value="scheduleMetadata.lineColor ?? '#e2e8f0'"
                        @update:modelValue="(c) => updateScheduleMetadata((draft) => { draft.lineColor = c })"
                      />
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="text-xs font-medium text-white/60 mb-1.5 block">Background</label>
                      <ColorPicker
                        :model-value="scheduleMetadata.backgroundColor ?? '#ffffff'"
                        @update:modelValue="(c) => updateScheduleMetadata((draft) => { draft.backgroundColor = c })"
                      />
                    </div>
                    <div>
                      <label class="text-xs font-medium text-white/60 mb-1.5 block">Border</label>
                      <ColorPicker
                        :model-value="scheduleMetadata.borderColor ?? '#e2e8f0'"
                        @update:modelValue="(c) => updateScheduleMetadata((draft) => { draft.borderColor = c })"
                      />
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="text-xs font-medium text-white/60 mb-1.5 block">Radius</label>
                      <input
                        type="number"
                        min="0"
                        max="80"
                        class="control-glass"
                        :value="scheduleMetadata.cornerRadius ?? 22"
                        @change="updateScheduleMetadata((draft) => { draft.cornerRadius = Math.max(0, Math.min(80, Number(($event.target as HTMLInputElement).value) || 0)) })"
                      />
                    </div>
                    <div>
                      <label class="text-xs font-medium text-white/60 mb-1.5 block">Border Width</label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        class="control-glass"
                        :value="scheduleMetadata.borderWidth ?? 1"
                        @change="updateScheduleMetadata((draft) => { draft.borderWidth = Math.max(0, Math.min(10, Number(($event.target as HTMLInputElement).value) || 0)) })"
                      />
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="text-xs font-medium text-white/60 mb-1.5 block">Start Hour</label>
                      <input
                        type="number"
                        min="0"
                        max="23"
                        class="control-glass"
                        :value="scheduleMetadata.startHour"
                        @change="updateScheduleMetadata((draft) => { draft.startHour = Math.max(0, Math.min(23, Number(($event.target as HTMLInputElement).value) || draft.startHour)) })"
                      />
                    </div>
                    <div>
                      <label class="text-xs font-medium text-white/60 mb-1.5 block">End Hour</label>
                      <input
                        type="number"
                        min="0"
                        max="23"
                        class="control-glass"
                        :value="scheduleMetadata.endHour"
                        @change="updateScheduleMetadata((draft) => { draft.endHour = Math.max(0, Math.min(23, Number(($event.target as HTMLInputElement).value) || draft.endHour)) })"
                      />
                    </div>
                  </div>
                </div>
              </template>

              <!-- Checklist Block -->
              <template v-if="checklistMetadata">
                <div class="pt-4 border-t border-white/10 space-y-4">
                  <p class="text-xs font-semibold uppercase tracking-widest text-white/60">Checklist</p>

                  <div>
                    <label class="text-xs font-medium text-white/60 mb-1.5 block">Title</label>
                    <input
                      type="text"
                      class="control-glass"
                      :value="checklistMetadata.title"
                      @input="updateChecklistMetadata((draft) => { draft.title = ($event.target as HTMLInputElement).value })"
                    />
                  </div>

                  <div>
                    <label class="text-xs font-medium text-white/60 mb-1.5 block">Header Style</label>
                    <select
                      class="control-glass"
                      :value="checklistMetadata.headerStyle ?? 'tint'"
                      @change="updateChecklistMetadata((draft) => { draft.headerStyle = ($event.target as HTMLSelectElement).value as PlannerHeaderStyle })"
                    >
                      <option v-for="opt in headerStyleOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                    </select>
                  </div>

                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="text-xs font-medium text-white/60 mb-1.5 block">Accent</label>
                      <ColorPicker
                        :model-value="checklistMetadata.accentColor"
                        @update:modelValue="(c) => updateChecklistMetadata((draft) => { draft.accentColor = c })"
                      />
                    </div>
                    <div>
                      <label class="text-xs font-medium text-white/60 mb-1.5 block">Checkbox</label>
                      <ColorPicker
                        :model-value="checklistMetadata.checkboxColor ?? checklistMetadata.accentColor"
                        @update:modelValue="(c) => updateChecklistMetadata((draft) => { draft.checkboxColor = c })"
                      />
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="text-xs font-medium text-white/60 mb-1.5 block">Background</label>
                      <ColorPicker
                        :model-value="checklistMetadata.backgroundColor ?? '#ffffff'"
                        @update:modelValue="(c) => updateChecklistMetadata((draft) => { draft.backgroundColor = c })"
                      />
                    </div>
                    <div>
                      <label class="text-xs font-medium text-white/60 mb-1.5 block">Border</label>
                      <ColorPicker
                        :model-value="checklistMetadata.borderColor ?? '#e2e8f0'"
                        @update:modelValue="(c) => updateChecklistMetadata((draft) => { draft.borderColor = c })"
                      />
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="text-xs font-medium text-white/60 mb-1.5 block">Rows</label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        class="control-glass"
                        :value="checklistMetadata.rows"
                        @change="updateChecklistMetadata((draft) => { draft.rows = Math.max(1, Math.min(30, Number(($event.target as HTMLInputElement).value) || draft.rows)) })"
                      />
                    </div>
                    <div class="flex items-end">
                      <label class="flex items-center gap-2 text-sm text-white/80">
                        <input
                          type="checkbox"
                          class="accent-primary-400"
                          :checked="checklistMetadata.showCheckboxes"
                          @change="updateChecklistMetadata((draft) => { draft.showCheckboxes = ($event.target as HTMLInputElement).checked })"
                        >
                        <span>Checkboxes</span>
                      </label>
                    </div>
                  </div>
                </div>
              </template>

              <!-- Notes Block (Planner Note) -->
              <template v-if="plannerNoteMetadata">
                <div class="pt-4 border-t border-white/10 space-y-4">
                  <div class="flex items-center justify-between">
                    <p class="text-xs font-semibold uppercase tracking-widest text-white/60">Notes</p>
                    <select
                      class="control-glass-sm"
                      :value="plannerNoteMetadata.pattern"
                      @change="updatePlannerMetadata((draft) => { draft.pattern = ($event.target as HTMLSelectElement).value as PlannerPatternVariant })"
                    >
                      <option v-for="opt in plannerPatternOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                    </select>
                  </div>

                  <div>
                    <label class="text-xs font-medium text-white/60 mb-1.5 block">Title</label>
                    <input
                      type="text"
                      class="control-glass"
                      :value="plannerNoteMetadata.title"
                      @input="updatePlannerMetadata((draft) => { draft.title = ($event.target as HTMLInputElement).value })"
                    />
                  </div>

                  <div>
                    <label class="text-xs font-medium text-white/60 mb-1.5 block">Header Style</label>
                    <select
                      class="control-glass"
                      :value="plannerNoteMetadata.headerStyle ?? (plannerNoteMetadata.pattern === 'hero' ? 'filled' : 'minimal')"
                      @change="updatePlannerMetadata((draft) => { draft.headerStyle = ($event.target as HTMLSelectElement).value as PlannerHeaderStyle })"
                    >
                      <option v-for="opt in headerStyleOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                    </select>
                  </div>

                  <div>
                    <label class="text-xs font-medium text-white/60 mb-1.5 block">Accent</label>
                    <ColorPicker
                      :model-value="plannerNoteMetadata.accentColor"
                      @update:modelValue="(c) => updatePlannerMetadata((draft) => { draft.accentColor = c })"
                    />
                  </div>

                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="text-xs font-medium text-white/60 mb-1.5 block">Background</label>
                      <ColorPicker
                        :model-value="plannerNoteMetadata.backgroundColor ?? '#ffffff'"
                        @update:modelValue="(c) => updatePlannerMetadata((draft) => { draft.backgroundColor = c })"
                      />
                    </div>
                    <div>
                      <label class="text-xs font-medium text-white/60 mb-1.5 block">Border</label>
                      <ColorPicker
                        :model-value="plannerNoteMetadata.borderColor ?? '#e2e8f0'"
                        @update:modelValue="(c) => updatePlannerMetadata((draft) => { draft.borderColor = c })"
                      />
                    </div>
                  </div>
                </div>
              </template>
              
              <!-- Text Properties -->
              <template v-if="objectType === 'textbox'">
                <div class="space-y-4">
                  <div>
                    <label class="text-xs font-medium text-white/60 mb-1.5 block">Content</label>
                    <textarea 
                      v-model="textContent" 
                      rows="3"
                      class="control-glass resize-none"
                    ></textarea>
                  </div>
                  
                  <div>
                    <label class="text-xs font-medium text-white/60 mb-1.5 block">Font Family</label>
                    <FontPicker v-model="fontFamily" class="control-glass" />
                  </div>
                  
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="text-xs font-medium text-white/60 mb-1.5 block">Size</label>
                      <input 
                        v-model.number="fontSize" 
                        type="number" 
                        min="8" 
                        max="200"
                        class="control-glass"
                      />
                    </div>
                    <div>
                      <label class="text-xs font-medium text-white/60 mb-1.5 block">Color</label>
                      <ColorPicker v-model="textColor" />
                    </div>
                  </div>
                </div>
              </template>
              
              <!-- Shape Properties -->
              <template v-if="objectType === 'rect' || objectType === 'circle'">
                <div class="space-y-4">
                  <div>
                    <label class="text-xs font-medium text-white/60 mb-1.5 block">Fill Color</label>
                    <ColorPicker v-model="fillColor" />
                  </div>
                  <div>
                    <label class="text-xs font-medium text-white/60 mb-1.5 block">Stroke Color</label>
                    <ColorPicker v-model="strokeColor" />
                  </div>
                  <div>
                    <label class="text-xs font-medium text-white/60 mb-1.5 block">Stroke Width</label>
                    <div class="flex items-center gap-3">
                      <input 
                        v-model.number="strokeWidth" 
                        type="range" 
                        min="0" 
                        max="20"
                        class="flex-1 accent-primary-400"
                      />
                      <span class="text-xs text-white/70 w-8 text-right">{{ strokeWidth }}px</span>
                    </div>
                  </div>
                </div>
              </template>
              
              <!-- Common Properties -->
              <div class="pt-4 border-t border-white/10 space-y-4">
                <div>
                  <label class="text-xs font-medium text-white/60 mb-1.5 block">Opacity</label>
                  <div class="flex items-center gap-3">
                    <input 
                      v-model.number="opacity" 
                      type="range" 
                      min="0" 
                      max="100"
                      class="flex-1 accent-primary-400"
                    />
                    <span class="text-xs text-white/70 w-10 text-right">{{ Math.round(opacity) }}%</span>
                  </div>
                </div>
                
                <div>
                  <label class="text-xs font-medium text-white/60 mb-2 block">Layer Order</label>
                  <div class="grid grid-cols-2 gap-2">
                    <button 
                      @click="editorStore.bringToFront()"
                      class="btn-glass-sm w-full"
                    >
                      Bring Front
                    </button>
                    <button 
                      @click="editorStore.sendToBack()"
                      class="btn-glass-sm w-full"
                    >
                      Send Back
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
        
        <!-- Layers Panel -->
        <div :class="['flex flex-col bg-[#0b111d] transition-all duration-200', isLayersCollapsed ? 'h-8' : (isPropertiesCollapsed ? 'flex-1' : 'flex-1')]">
          <button 
            @click="isLayersCollapsed = !isLayersCollapsed"
            class="px-3 py-1.5 border-b border-white/10 shrink-0 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer"
          >
            <div class="flex items-center gap-2">
              <svg :class="['w-3 h-3 transition-transform', isLayersCollapsed ? '-rotate-90' : 'rotate-0']" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
              <span class="text-xs font-medium">Layers</span>
            </div>
            <span class="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white/60">{{ editorStore.canvas?.getObjects().length || 0 }}</span>
          </button>
          <div v-show="!isLayersCollapsed" class="flex-1 overflow-y-auto">
            <EditorLayers />
          </div>
        </div>
      </aside>
    </div>

    <!-- Export Modal -->
    <ExportModal 
      :is-open="isExportModalOpen" 
      @close="isExportModalOpen = false"
    />
  </div>
</template>

<style scoped>
/* Smooth transitions for panels */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}
</style>
