<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useEditorStore } from '@/stores/editor.store'
import { useCalendarStore } from '@/stores/calendar.store'
import { useAuthStore } from '@/stores/auth.store'
import { storeToRefs } from 'pinia'
import {
  calendarTemplates,
  templateCategories,
  type CalendarTemplate,
  buildTemplateInstance,
  getTemplateDefaultOptions,
  resolveTemplateOptions,
} from '@/data/templates/calendar-templates'
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
  TrashIcon,
} from '@heroicons/vue/24/outline'
import ExportModal from '@/components/export/ExportModal.vue'
import CanvasSetupModal from '@/components/editor/CanvasSetupModal.vue'
import ColorPicker from '@/components/editor/ColorPicker.vue'
import TypographyProperties from '@/components/editor/properties/TypographyProperties.vue'
import CalendarConfigPanel from '@/components/editor/CalendarConfigPanel.vue'
import EditorLayers from '@/components/editor/EditorLayers.vue'
import TemplatePanel from '@/components/editor/TemplatePanel.vue'
import Canvas from '@/components/editor/Canvas.vue'
import PropertiesPanelContent from '@/components/editor/panels/PropertiesPanelContent.vue'
import ElementsPanel from '@/components/editor/panels/ElementsPanel.vue'
import TextPanel from '@/components/editor/panels/TextPanel.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppAlert from '@/components/ui/AppAlert.vue'
import { renderTemplateOnCanvas, generateTemplateThumbnail } from '@/services/editor/template-renderer'
import { getPresetByCanvasSize } from '@/config/canvas-presets'
import {
  uploadUserAsset,
  listUserAssets,
  deleteUserAsset,
  type UserUploadAsset,
  type UploadCategory,
} from '@/services/storage/user-uploads.service'
import type {
  CanvasElementMetadata,
  CalendarGridMetadata,
  TemplateOptions,
  WeekStripMetadata,
  DateCellMetadata,
  PlannerNoteMetadata,
  PlannerPatternVariant,
  PlannerHeaderStyle,
  ScheduleMetadata,
  ChecklistMetadata,
} from '@/types'
import { DEFAULT_TEMPLATE_OPTIONS } from '@/config/editor-defaults'

const router = useRouter()
const route = useRoute()
const editorStore = useEditorStore()
const calendarStore = useCalendarStore()
const authStore = useAuthStore()

// Store refs
const { 
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
const canvasElRef = ref<HTMLCanvasElement | null>(null)
const canvasComponentRef = ref<InstanceType<typeof Canvas> | null>(null)
const canvasKey = ref(0) // Key to force Canvas remount on project switch
const isExportModalOpen = ref(false)
const isCanvasSetupModalOpen = ref(false)
const userUploads = ref<UserUploadAsset[]>([])
const uploadsLoading = ref(false)
const uploadError = ref<string | null>(null)
const activeUploads = ref<Record<string, { name: string; progress: number }>>({})
const deletingUploads = ref<Record<string, boolean>>({})
const isDragging = ref(false)
const isCanvasDragOver = ref(false)
const uploadCategory = ref<UploadCategory>('sticker')
const activeUploadList = computed(() =>
  Object.entries(activeUploads.value).map(([id, meta]) => ({
    id,
    ...meta,
  })),
)
const isAuthenticated = computed(() => !!authStore.user?.id)
const selectedTemplateCategory = ref('all')
const templateThumbnails = ref<Record<string, string>>({})
const thumbnailsLoading = ref(false)
const activeTemplateId = ref<string | null>(null)

// Panel visibility state for Adobe-style collapsible UI
const isRightSidebarVisible = ref(true)
const isPropertiesCollapsed = ref(false)
const isLayersCollapsed = ref(false)
const rightSidebarWidth = ref(256)
const isResizingRightSidebar = ref(false)
const templateOverrides = ref<TemplateOptions>({ ...DEFAULT_TEMPLATE_OPTIONS })
const alignTarget = ref<'canvas' | 'selection'>('canvas')
const isApplyingTemplate = ref(false)
const isSyncingTemplateUiFromProject = ref(false)
let overridesRenderTimer: ReturnType<typeof setTimeout> | null = null
const uploadsPanelTab = ref<'my_uploads' | 'curated'>('my_uploads')
const curatedFilter = ref<'all' | 'background' | 'pattern'>('background')
const curatedFilterOptions: { value: 'all' | 'background' | 'pattern'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'background', label: 'Backgrounds' },
  { value: 'pattern', label: 'Patterns' },
]

type CuratedAssetType = 'background' | 'pattern'

interface CuratedVisualAsset {
  id: string
  name: string
  description: string
  type: CuratedAssetType
  tags: string[]
  resolution: string
  assetUrl: string
}

function createGradientDataUrl(
  width: number,
  height: number,
  angle: number,
  stops: { offset: number; color: string; opacity?: number }[],
): string {
  const stopsMarkup = stops
    .map((stop) => `<stop offset="${stop.offset}%" stop-color="${stop.color}" stop-opacity="${stop.opacity ?? 1}"/>`)
    .join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><linearGradient id="g" gradientTransform="rotate(${angle})">${stopsMarkup}</linearGradient></defs><rect width="${width}" height="${height}" fill="url(#g)"/></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

function createPatternDataUrl(options: { background?: string; stroke?: string; accent?: string }): string {
  const background = options.background ?? '#0f172a'
  const stroke = options.stroke ?? '#1e293b'
  const accent = options.accent ?? '#38bdf8'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320"><rect width="320" height="320" fill="${background}"/><g opacity="0.6" stroke="${stroke}" stroke-width="1"><path d="M0 40h320"/><path d="M0 80h320"/><path d="M0 120h320"/><path d="M0 160h320"/><path d="M0 200h320"/><path d="M0 240h320"/><path d="M0 280h320"/></g><g opacity="0.6" stroke="${stroke}" stroke-width="1"><path d="M40 0v320"/><path d="M80 0v320"/><path d="M120 0v320"/><path d="M160 0v320"/><path d="M200 0v320"/><path d="M240 0v320"/><path d="M280 0v320"/></g><circle cx="40" cy="40" r="6" fill="${accent}" opacity="0.7"/><circle cx="280" cy="120" r="10" fill="${accent}" opacity="0.5"/><circle cx="160" cy="240" r="8" fill="${accent}" opacity="0.4"/></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

const curatedVisualAssets: CuratedVisualAsset[] = [
  {
    id: 'sunset-haze',
    name: 'Sunset Haze',
    description: 'Warm gradient wash that pairs well with bold typography.',
    type: 'background',
    tags: ['gradient', 'warm'],
    resolution: '1600 × 1200',
    assetUrl: createGradientDataUrl(1600, 1200, 45, [
      { offset: 0, color: '#ff9a8b' },
      { offset: 50, color: '#ff6a88' },
      { offset: 100, color: '#ff99ac' },
    ]),
  },
  {
    id: 'deep-space',
    name: 'Deep Space',
    description: 'Moody blue-purple blend for dramatic hero backgrounds.',
    type: 'background',
    tags: ['gradient', 'dark'],
    resolution: '1600 × 1200',
    assetUrl: createGradientDataUrl(1600, 1200, 120, [
      { offset: 0, color: '#0f172a' },
      { offset: 50, color: '#1e1b4b' },
      { offset: 100, color: '#4c1d95' },
    ]),
  },
  {
    id: 'modern-grid',
    name: 'Modern Grid',
    description: 'Subtle grid texture ideal for planners and schedules.',
    type: 'pattern',
    tags: ['grid', 'subtle'],
    resolution: '800 × 800',
    assetUrl: createPatternDataUrl({ background: '#0b1120', stroke: '#1e293b', accent: '#38bdf8' }),
  },
  {
    id: 'paper-fiber',
    name: 'Paper Fiber',
    description: 'Soft teal fiber texture that feels tactile and organic.',
    type: 'background',
    tags: ['texture', 'cool'],
    resolution: '1600 × 1200',
    assetUrl: createGradientDataUrl(1600, 1200, 15, [
      { offset: 0, color: '#b1f0f7' },
      { offset: 100, color: '#6dd5ed' },
    ]),
  },
]

const filteredCuratedAssets = computed(() => {
  if (curatedFilter.value === 'all') return curatedVisualAssets
  return curatedVisualAssets.filter((asset) => asset.type === curatedFilter.value)
})

interface DraggedAssetPayload {
  source: 'upload' | 'curated'
  url: string
  name: string
}

const ASSET_DRAG_MIME = 'application/x-calendar-asset'

const PAPER_SIZES = {
  portrait: { width: 744, height: 1052 },
  landscape: { width: 1052, height: 744 },
}

const ACCEPTED_FILE_EXTENSIONS = '.png,.jpg,.jpeg,.gif,.svg,.webp'
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024 // 20MB matches storage rules

function validateUploadFile(file: File): string | null {
  if (!file.type.startsWith('image/')) {
    return 'Only image uploads are supported.'
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return 'Images must be 20MB or smaller.'
  }
  return null
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / Math.pow(1024, exponent)
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`
}

async function handleSaveProject(): Promise<void> {
  try {
    await editorStore.saveProject()
    if (!routeProjectId.value && editorStore.project?.id) {
      router.replace(`/editor/${editorStore.project.id}`)
    }
  } catch (e) {
    console.error('Failed to save project', e)
  }
}

function startResizingRightSidebar(e: MouseEvent) {
  e.preventDefault()
  isResizingRightSidebar.value = true
  document.body.style.cursor = 'ew-resize'
  document.body.style.userSelect = 'none'
}

function handleResizeRightSidebar(e: MouseEvent) {
  if (!isResizingRightSidebar.value) return
  const newWidth = window.innerWidth - e.clientX
  rightSidebarWidth.value = Math.max(200, Math.min(600, newWidth))
}

function stopResizingRightSidebar() {
  isResizingRightSidebar.value = false
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

onMounted(() => {
  document.addEventListener('mousemove', handleResizeRightSidebar)
  document.addEventListener('mouseup', stopResizingRightSidebar)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', handleResizeRightSidebar)
  document.removeEventListener('mouseup', stopResizingRightSidebar)
})

const uploadCategoryOptions: { id: UploadCategory; label: string; description: string }[] = [
  { id: 'sticker', label: 'Stickers', description: 'Ideal for overlays & elements' },
  { id: 'background', label: 'Backgrounds', description: 'Full-canvas photos or textures' },
]

const uploadsTabOptions: { id: 'my_uploads' | 'curated'; label: string }[] = [
  { id: 'my_uploads', label: 'My uploads' },
  { id: 'curated', label: 'Backgrounds & patterns' },
]

const DEFAULT_CANVAS = PAPER_SIZES.portrait

const canvasOrientation = computed(() => {
  const { width, height } = canvasSize.value
  if (!width || !height) return 'Portrait'
  return width >= height ? 'Landscape' : 'Portrait'
})

const canvasPreset = computed(() => getPresetByCanvasSize(canvasSize.value.width, canvasSize.value.height))
const activeMonth = computed(() => {
  return calendarStore.config.currentMonth ?? editorStore.project?.config.currentMonth ?? 1
})

const canvasSizeLabel = computed(() => {
  const presetLabel = canvasPreset.value?.label
  if (presetLabel) {
    return `${presetLabel} ${canvasOrientation.value}`
  }
  const { width, height } = canvasSize.value
  if (!width || !height) return 'Custom size'
  return `${width} × ${height}px ${canvasOrientation.value}`
})

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

  const customizedTemplate = buildTemplateInstance(template, templateOverrides.value)

  let renderWidth = canvasSize.value.width
  let renderHeight = canvasSize.value.height
  const targetSize = getCanvasSizeForTemplate(customizedTemplate)

  const needsOrientationSwitch =
    !renderWidth ||
    !renderHeight ||
    (customizedTemplate.config.layout === 'landscape' && renderWidth <= renderHeight) ||
    (customizedTemplate.config.layout === 'portrait' && renderWidth >= renderHeight)

  if (needsOrientationSwitch) {
    renderWidth = targetSize.width
    renderHeight = targetSize.height
    editorStore.setCanvasSize(renderWidth, renderHeight)
    await nextTick()
    editorStore.canvas?.calcOffset()
  }

  await renderTemplateOnCanvas(
    editorStore.canvas,
    customizedTemplate,
    {
      year: editorStore.project?.config.year ?? new Date().getFullYear(),
      month: activeMonth.value,
      canvasWidth: renderWidth ?? PAPER_SIZES.portrait.width,
      canvasHeight: renderHeight ?? PAPER_SIZES.portrait.height,
      getHolidaysForYear: editorStore.getHolidaysForCalendarYear,
    },
    { preserveUserObjects: true },
  )

  if (recordHistory) {
    editorStore.snapshotCanvasState()
  }
}

function resetTemplateOverrides() {
  if (!activeTemplate.value) return
  templateOverrides.value = getTemplateDefaultOptions(activeTemplate.value)
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

  const projectOptions = editorStore.project?.config.templateOptions
  templateOverrides.value = resolveTemplateOptions(template, projectOptions || {})

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

watch(
  () => calendarStore.config.currentMonth,
  (month) => {
    if (!editorStore.project) return
    editorStore.project.config.currentMonth = month ?? editorStore.project.config.currentMonth ?? 1
  },
  { immediate: true },
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

// Computed
const selectedObject = computed(() => selectedObjects.value[0])

const objectType = computed(() => {
  if (!selectedObject.value) return null
  return selectedObject.value.type
})

// Canvas background color
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

// Text properties (two-way binding with canvas)
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
  const result = typeof raw === 'string' && raw.length > 0 ? raw : null
  console.log('[routeProjectId computed] Route params.id:', raw, '→ result:', result)
  return result
})

function buildDefaultProjectConfig() {
  return {
    year: new Date().getFullYear(),
    country: 'KE',
    language: 'en',
    layout: 'monthly',
    startDay: 0,
    showHolidays: true,
    showCustomHolidays: false,
    showWeekNumbers: false,
  } as const
}

async function ensureProjectForRoute(): Promise<void> {
  const id = routeProjectId.value

  if (id) {
    await editorStore.loadProjectById(id)
  } else {
    if (editorStore.canvas) {
      editorStore.destroyCanvas()
    }
    editorStore.createNewProject(buildDefaultProjectConfig())
  }

  const project = editorStore.project
  if (project) {
    project.canvas.width = project.canvas.width || DEFAULT_CANVAS.width
    project.canvas.height = project.canvas.height || DEFAULT_CANVAS.height
  }

  if (canvasElRef.value && !editorStore.canvas) {
    await initializeEditorCanvas()
  }
}

let isInitializing = false

function handleCanvasReady(canvasEl: HTMLCanvasElement): void {
  console.log('[handleCanvasReady] Canvas element ready, initializing editor canvas')
  canvasElRef.value = canvasEl
  void initializeEditorCanvas()
}

async function initializeEditorCanvas(): Promise<void> {
  await nextTick()

  if (!canvasElRef.value) {
    console.log('[initializeEditorCanvas] No canvas ref, skipping')
    return
  }
  if (editorStore.canvas) {
    console.log('[initializeEditorCanvas] Canvas already exists, skipping')
    return
  }
  if (isInitializing) {
    console.log('[initializeEditorCanvas] Already initializing, skipping duplicate call')
    return
  }

  // Verify the loaded project matches the route before initializing
  const expectedProjectId = routeProjectId.value
  const loadedProjectId = editorStore.project?.id
  if (expectedProjectId && loadedProjectId !== expectedProjectId) {
    console.log('[initializeEditorCanvas] Project mismatch - route:', expectedProjectId, 'loaded:', loadedProjectId, '- skipping initialization')
    return
  }

  isInitializing = true
  try {
    console.log('[initializeEditorCanvas] Initializing canvas for project:', editorStore.project?.id)
    await editorStore.initializeCanvas(canvasElRef.value)
    const currentCanvas = editorStore.canvas
    const objectCount = (currentCanvas as any)?.getObjects?.().length ?? 0
    console.log('[initializeEditorCanvas] Canvas initialized with', objectCount, 'objects')
  } finally {
    isInitializing = false
  }

  requestAnimationFrame(() => {
    editorStore.setZoom(1)
    editorStore.canvas?.calcOffset()
    // Fit canvas to screen after initialization
    canvasComponentRef.value?.fitToScreen()
  })

  // Welcome text removed as per request for blank canvas
}

onMounted(() => {
  void ensureProjectForRoute()
  loadTemplateThumbnails()
})

watch(routeProjectId, async (next, prev) => {
  console.log('[routeProjectId watch] Route changed from', prev, 'to', next)
  console.log('[routeProjectId watch] Current project in store:', editorStore.project?.id)
  console.log('[routeProjectId watch] Canvas exists:', !!editorStore.canvas)
  
  if (next === prev) {
    console.log('[routeProjectId watch] Same route ID, skipping')
    return
  }

  // Always destroy and reload if the route project ID doesn't match the loaded project
  if (next && editorStore.project?.id === next && editorStore.canvas) {
    console.log('[routeProjectId watch] Same project already loaded, skipping')
    return
  }

  console.log('[routeProjectId watch] Destroying canvas and loading new project')
  
  // Destroy canvas and clear state before loading new project
  if (editorStore.canvas) {
    console.log('[routeProjectId watch] Destroying existing canvas')
    editorStore.destroyCanvas()
  }
  
  // Clear the canvas ref so it gets recreated
  canvasElRef.value = null
  
  // Increment key to force Canvas component to remount with fresh DOM element
  canvasKey.value++
  console.log('[routeProjectId watch] Canvas key incremented to', canvasKey.value)
  
  // Wait a tick to ensure canvas component unmounts
  await nextTick()
  
  console.log('[routeProjectId watch] Loading project:', next)
  await ensureProjectForRoute()
  console.log('[routeProjectId watch] Project loaded:', editorStore.project?.id, 'with', editorStore.project?.canvas.objects.length, 'objects')
  
  // Wait another tick to ensure project is fully loaded and Canvas remounts
  await nextTick()
  
  // Canvas will emit canvas-ready when it remounts, which will call initializeEditorCanvas
  console.log('[routeProjectId watch] Waiting for Canvas to remount and emit canvas-ready')
}, { immediate: false, flush: 'post' })

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
  templateOverrides.value = getTemplateDefaultOptions(template)

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

// Upload handling
function resetUploadError() {
  uploadError.value = null
}

async function loadUserUploads(): Promise<void> {
  const userId = authStore.user?.id
  if (!userId) {
    userUploads.value = []
    uploadsLoading.value = false
    return
  }

  uploadsLoading.value = true
  resetUploadError()
  try {
    const assets = await listUserAssets(userId)
    userUploads.value = assets
  } catch (error: any) {
    console.error('Failed to load uploads', error)
    uploadError.value = error?.message || 'Failed to load your uploads.'
  } finally {
    uploadsLoading.value = false
  }
}

watch(
  () => authStore.user?.id,
  () => {
    void loadUserUploads()
  },
  { immediate: true },
)

function trackActiveUpload(id: string, meta: { name: string; progress: number }) {
  activeUploads.value = {
    ...activeUploads.value,
    [id]: meta,
  }
}

function removeActiveUpload(id: string) {
  const { [id]: _removed, ...rest } = activeUploads.value
  activeUploads.value = rest
}

function handleUploadDragOver(e: DragEvent) {
  e.preventDefault()
  isDragging.value = true
}

function handleUploadDragLeave() {
  isDragging.value = false
}

function handleUploadDrop(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false

  if (!isAuthenticated.value) {
    uploadError.value = 'Sign in to upload your assets.'
    return
  }

  const files = e.dataTransfer?.files
  if (files) {
    void handleFiles(files)
  }
}

function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files) {
    void handleFiles(input.files)
    input.value = ''
  }
}

async function handleFiles(files: FileList): Promise<void> {
  if (!isAuthenticated.value) {
    uploadError.value = 'Sign in to upload your assets.'
    return
  }

  resetUploadError()

  await Promise.all(
    Array.from(files).map(async (file) => {
      const validation = validateUploadFile(file)
      if (validation) {
        uploadError.value = validation
        return
      }
      await startUpload(file)
    }),
  )
}

function makeUploadId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `upload-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  }
}

async function startUpload(file: File): Promise<void> {
  const userId = authStore.user?.id
  if (!userId) {
    uploadError.value = 'Sign in to upload your assets.'
    return
  }

  const uploadId = makeUploadId()
  trackActiveUpload(uploadId, { name: file.name, progress: 0 })

  try {
    const asset = await uploadUserAsset(userId, file, {
      category: uploadCategory.value,
      onProgress(progress) {
        trackActiveUpload(uploadId, {
          name: file.name,
          progress: progress || 0,
        })
      },
    })

    userUploads.value = [asset, ...userUploads.value.filter((existing) => existing.storagePath !== asset.storagePath)]
  } catch (error: any) {
    console.error('Upload failed', error)
    uploadError.value = error?.message || `Failed to upload "${file.name}".`
  } finally {
    removeActiveUpload(uploadId)
  }
}

async function handleDeleteAsset(asset: UserUploadAsset): Promise<void> {
  const userId = authStore.user?.id
  if (!userId) {
    uploadError.value = 'Sign in to manage your uploads.'
    return
  }
  if (deletingUploads.value[asset.storagePath]) return

  deletingUploads.value = {
    ...deletingUploads.value,
    [asset.storagePath]: true,
  }

  try {
    await deleteUserAsset(userId, { id: asset.id, storagePath: asset.storagePath })
    userUploads.value = userUploads.value.filter((item) => item.storagePath !== asset.storagePath)
  } catch (error: any) {
    console.error('Failed to delete upload', error)
    uploadError.value = error?.message || 'Failed to delete upload.'
  } finally {
    const { [asset.storagePath]: _removed, ...rest } = deletingUploads.value
    deletingUploads.value = rest
  }
}

async function addUploadedAssetToCanvas(asset: UserUploadAsset): Promise<void> {
  await addAssetToCanvasFromUrl(asset.url, asset.name)
}

async function addAssetToCanvasFromUrl(url: string, name?: string): Promise<void> {
  await editorStore.addImage(url, { name: name ?? 'Image' })
}

function buildDragPayload(asset: { url: string; name?: string }): string {
  return JSON.stringify({
    source: 'upload',
    url: asset.url,
    name: asset.name ?? 'Image',
  } satisfies DraggedAssetPayload)
}

function onAssetDragStart(event: DragEvent, asset: UserUploadAsset): void {
  if (!event.dataTransfer) return
  event.dataTransfer.setData(ASSET_DRAG_MIME, buildDragPayload(asset))
  event.dataTransfer.effectAllowed = 'copy'
}

function onCuratedAssetDragStart(event: DragEvent, asset: CuratedVisualAsset): void {
  if (!event.dataTransfer) return
  const payload: DraggedAssetPayload = {
    source: 'curated',
    url: asset.assetUrl,
    name: asset.name,
  }
  event.dataTransfer.setData(ASSET_DRAG_MIME, JSON.stringify(payload))
  event.dataTransfer.effectAllowed = 'copy'
}

function onAssetDragEnd(): void {
  isCanvasDragOver.value = false
}

function handleCanvasDragOver(event: DragEvent): void {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'copy'
  }
  if (!isCanvasDragOver.value) {
    isCanvasDragOver.value = true
  }
}

function handleCanvasDragLeave(event: DragEvent): void {
  if (!event.relatedTarget || !(event.currentTarget as HTMLElement)?.contains(event.relatedTarget as Node)) {
    isCanvasDragOver.value = false
  }
}

async function handleCanvasDrop(event: DragEvent): Promise<void> {
  event.preventDefault()
  isCanvasDragOver.value = false
  const raw = event.dataTransfer?.getData(ASSET_DRAG_MIME)
  if (!raw) return
  try {
    const payload = JSON.parse(raw) as DraggedAssetPayload
    if (payload.url) {
      await addAssetToCanvasFromUrl(payload.url, payload.name)
    }
  } catch (error) {
    console.error('Failed to parse dragged asset payload', error)
  }
}

function downloadCuratedAsset(url: string, filename: string): void {
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename.replace(/\s+/g, '-').toLowerCase()}.png`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function handleAlign(action: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') {
  // alignSelection is a void function, so we can't use ?? operator
  // Just call alignSelection directly with the target mode
  editorStore.alignSelection(action, alignTarget.value)
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

        <button
          type="button"
          class="text-xs font-medium text-gray-600 dark:text-gray-200 hover:text-primary-500 flex items-center gap-1"
          @click="isCanvasSetupModalOpen = true"
        >
          <span class="inline-flex items-center gap-1">
            {{ canvasSizeLabel }}
            <svg class="w-3 h-3" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 3l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
        </button>
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

              <!-- ELEMENTS PANEL -->
              <ElementsPanel v-else-if="activeTool === 'elements'" />

              <!-- ═══════════════════════════════════════════════════ -->
              <!-- UPLOADS PANEL -->
              <!-- ═══════════════════════════════════════════════════ -->
              <div v-else-if="activeTool === 'uploads'" class="space-y-4">
                <AppAlert variant="warning" v-if="!isAuthenticated">
                  Sign in to save uploads back to Firebase Storage and access them from any device.
                </AppAlert>
                <AppAlert variant="danger" v-else-if="uploadError">
                  {{ uploadError }}
                </AppAlert>

                <div class="flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl p-1 text-xs font-semibold uppercase tracking-wide">
                  <button
                    v-for="tab in uploadsTabOptions"
                    :key="tab.id"
                    type="button"
                    class="flex-1 px-3 py-2 rounded-lg transition-colors"
                    :class="uploadsPanelTab === tab.id ? 'bg-white dark:bg-gray-900 text-primary-600 dark:text-primary-300 shadow-sm' : 'text-gray-500 dark:text-gray-400'"
                    @click="uploadsPanelTab = tab.id"
                  >
                    {{ tab.label }}
                  </button>
                </div>

                <template v-if="uploadsPanelTab === 'my_uploads'">
                  <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span class="font-semibold uppercase tracking-wide">Upload as</span>
                    <span>{{ uploadCategoryOptions.find((o) => o.id === uploadCategory)?.label }}</span>
                  </div>
                  <div class="grid grid-cols-2 gap-2">
                    <button
                      v-for="option in uploadCategoryOptions"
                      :key="option.id"
                      type="button"
                      @click="uploadCategory = option.id"
                      :class="[
                        'rounded-xl border px-3 py-2 text-left transition-all',
                        uploadCategory === option.id
                          ? 'border-primary-500 bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-200'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-primary-300'
                      ]"
                    >
                      <p class="text-sm font-semibold">{{ option.label }}</p>
                      <p class="text-[11px] text-gray-500 dark:text-gray-400">{{ option.description }}</p>
                    </button>
                  </div>
                  <div 
                    @dragover="handleUploadDragOver"
                    @dragleave="handleUploadDragLeave"
                    @drop="handleUploadDrop"
                    :class="[
                      'dropzone relative overflow-hidden',
                      isDragging 
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                    ]"
                  >
                    <input 
                      type="file" 
                      :accept="ACCEPTED_FILE_EXTENSIONS"
                      multiple 
                      @change="handleFileSelect"
                      class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      :disabled="!isAuthenticated"
                    />
                    <div class="text-center space-y-1.5 pointer-events-none">
                      <PhotoIcon class="w-10 h-10 mx-auto text-gray-400 mb-2" />
                      <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Drop assets here</p>
                      <p class="text-xs text-gray-500">or click to browse files</p>
                      <p class="text-[11px] text-gray-400">
                        PNG · JPG · GIF · SVG · WebP up to {{ formatBytes(MAX_UPLOAD_BYTES) }}
                      </p>
                    </div>
                    <div
                      v-if="!isAuthenticated"
                      class="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-300"
                    >
                      Sign in to upload images
                    </div>
                  </div>

                  <div v-if="activeUploadList.length" class="space-y-2">
                    <p class="text-xs font-semibold text-gray-500 uppercase">
                      Uploading ({{ activeUploadList.length }})
                    </p>
                    <div 
                      v-for="upload in activeUploadList" 
                      :key="upload.id" 
                      class="bg-gray-50 dark:bg-gray-800/70 rounded-lg p-3 border border-gray-100 dark:border-gray-700"
                    >
                      <div class="flex items-center justify-between gap-2 text-xs">
                        <span class="font-medium text-gray-900 dark:text-gray-100 truncate">{{ upload.name }}</span>
                        <span class="text-gray-500 dark:text-gray-400">{{ Math.round(upload.progress * 100) }}%</span>
                      </div>
                      <div class="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          class="h-full bg-primary-500 transition-all" 
                          :style="{ width: `${Math.round(upload.progress * 100)}%` }"
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div class="space-y-2">
                    <div class="flex items-center justify-between">
                      <p class="text-xs font-semibold text-gray-500 uppercase">
                        Library ({{ userUploads.length }})
                      </p>
                      <button
                        type="button"
                        class="text-[11px] font-medium text-primary-500 hover:text-primary-400 disabled:text-gray-400"
                        :disabled="uploadsLoading"
                        @click="loadUserUploads"
                      >
                        {{ uploadsLoading ? 'Refreshing…' : 'Refresh' }}
                      </button>
                    </div>

                    <div 
                      v-if="uploadsLoading" 
                      class="text-xs text-gray-500 dark:text-gray-400 text-center py-6"
                    >
                      Loading your uploads…
                    </div>

                    <div 
                      v-else-if="userUploads.length === 0" 
                      class="text-xs text-gray-400 dark:text-gray-500 text-center py-6"
                    >
                      No uploads yet. Drop files above to start building your asset library.
                    </div>

                    <div v-else class="space-y-3">
                      <div
                        v-for="asset in userUploads"
                        :key="asset.storagePath"
                        class="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/70 shadow-sm p-3 space-y-3"
                        draggable="true"
                        @dragstart="onAssetDragStart($event, asset)"
                        @dragend="onAssetDragEnd"
                      >
                        <div class="flex items-center gap-3">
                          <div class="relative w-20 h-16 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900/40 shrink-0">
                            <img :src="asset.url" :alt="asset.name" class="w-full h-full object-cover" />
                          </div>
                          <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate" :title="asset.name">
                              {{ asset.name }}
                            </p>
                            <p class="text-[11px] text-gray-500 dark:text-gray-400">
                              {{ formatBytes(asset.size) }} · {{ new Date(asset.createdAt).toLocaleDateString() }}
                            </p>
                          </div>
                          <span
                            class="text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5"
                            :class="asset.category === 'background' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200' : 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-200'"
                          >
                            {{ asset.category === 'background' ? 'Background' : 'Sticker' }}
                          </span>
                        </div>
                        <div class="flex items-center gap-2">
                          <button
                            type="button"
                            class="btn-secondary-sm flex-1"
                            @click="addUploadedAssetToCanvas(asset)"
                          >
                            Add to canvas
                          </button>
                          <button
                            type="button"
                            class="btn-tertiary-sm px-2"
                            :disabled="deletingUploads[asset.storagePath]"
                            @click="handleDeleteAsset(asset)"
                            title="Delete asset"
                          >
                            <TrashIcon class="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </template>

                <template v-else>
                  <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span class="font-semibold uppercase tracking-wide">Curated collection</span>
                    <select
                      class="select-sm bg-gray-100 dark:bg-gray-800 rounded-lg px-2 py-1 text-[11px]"
                      v-model="curatedFilter"
                    >
                      <option v-for="opt in curatedFilterOptions" :key="opt.value" :value="opt.value">
                        {{ opt.label }}
                      </option>
                    </select>
                  </div>
                  <div class="space-y-3">
                    <div
                      v-for="asset in filteredCuratedAssets"
                      :key="asset.id"
                      class="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 shadow-sm hover:border-primary-200 dark:hover:border-primary-500/60 transition-colors flex flex-col gap-3 p-3"
                      draggable="true"
                      @dragstart="onCuratedAssetDragStart($event, asset)"
                      @dragend="onAssetDragEnd"
                    >
                      <div class="relative rounded-xl overflow-hidden h-36 bg-gray-100 dark:bg-gray-800">
                        <img :src="asset.assetUrl" :alt="asset.name" class="w-full h-full object-cover" />
                        <span
                          class="absolute top-2 left-2 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-black/60 text-white"
                        >
                          {{ asset.type === 'background' ? 'Background' : 'Pattern' }}
                        </span>
                      </div>
                      <div class="space-y-2">
                        <div class="flex items-center justify-between gap-2">
                          <div class="min-w-0">
                            <p class="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{{ asset.name }}</p>
                            <p class="text-[11px] text-gray-500 dark:text-gray-400">{{ asset.resolution }}</p>
                          </div>
                          <span class="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                            {{ asset.type === 'background' ? 'Full canvas' : 'Repeating' }}
                          </span>
                        </div>
                        <p class="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2">
                          {{ asset.description }}
                        </p>
                        <div class="flex gap-1 flex-wrap text-[10px] text-gray-500 dark:text-gray-400">
                          <span
                            v-for="tag in asset.tags"
                            :key="tag"
                            class="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800"
                          >
                            {{ tag }}
                          </span>
                        </div>
                        <div class="flex gap-2">
                          <button
                            type="button"
                            class="btn-secondary-sm flex-1"
                            @click="addAssetToCanvasFromUrl(asset.assetUrl, asset.name)"
                          >
                            Add to canvas
                          </button>
                          <button
                            type="button"
                            class="btn-tertiary-sm flex-1"
                            @click="downloadCuratedAsset(asset.assetUrl, asset.name)"
                          >
                            Download
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </template>
              </div>

              <!-- TEXT PANEL -->
              <TextPanel v-else-if="activeTool === 'text'" />

              <!-- ═══════════════════════════════════════════════════ -->
              <!-- CALENDAR PANEL - Full configuration -->
              <!-- ═══════════════════════════════════════════════════ -->
              <div v-else-if="activeTool === 'calendar'">
                <CalendarConfigPanel />
              </div>

            </div>
          </div>
        </transition>
      </aside>

      <!-- Center Canvas Area (Adobe-style) -->
      <main
        class="flex-1 relative overflow-hidden flex flex-col"
        @dragover.prevent="handleCanvasDragOver"
        @dragleave="handleCanvasDragLeave"
        @drop="handleCanvasDrop"
      >
        <Canvas 
          :key="canvasKey"
          ref="canvasComponentRef"
          :canvas-ref="canvasElRef"
          @canvas-ready="handleCanvasReady"
        />
        <div
          v-if="isCanvasDragOver"
          class="absolute inset-0 border-4 border-primary-500/50 rounded-3xl pointer-events-none bg-primary-500/5 backdrop-blur-sm flex items-center justify-center text-primary-600 dark:text-primary-300 text-xs font-semibold uppercase tracking-[0.3em]"
        >
          Drop to place asset
        </div>
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
        :style="{ width: `${rightSidebarWidth}px` }"
        class="bg-[#0f1627] text-white border-l border-white/10 shrink-0 hidden lg:flex flex-col z-10 overflow-hidden relative"
      >
        <!-- Resize Handle -->
        <div
          @mousedown="startResizingRightSidebar"
          class="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-primary-500/50 transition-colors z-20"
          :class="{ 'bg-primary-500': isResizingRightSidebar }"
        ></div>
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
        <div :class="['flex flex-col min-h-0 border-b border-white/5 transition-all duration-200', isPropertiesCollapsed ? 'h-8' : (isLayersCollapsed ? 'flex-1' : 'flex-1')]">
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
          
          <div v-show="!isPropertiesCollapsed" class="flex-1 min-h-0 overflow-y-auto space-y-3 p-3">
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

            <!-- Canvas Properties (No Selection State) -->
            <section
              v-if="!hasSelection"
              class="rounded-2xl border border-white/10 bg-white/5 backdrop-blur px-4 py-4 space-y-5"
            >
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold uppercase tracking-widest text-white/60">Canvas</span>
              </div>
              
              <!-- Canvas Background Color -->
              <div class="space-y-3">
                <div>
                  <label class="text-xs font-medium text-white/60 mb-1.5 block">Background Color</label>
                  <ColorPicker 
                    :model-value="canvasBackgroundColor" 
                    @update:modelValue="updateCanvasBackgroundColor"
                  />
                </div>
                
                <!-- Quick Color Presets -->
                <div>
                  <label class="text-xs font-medium text-white/60 mb-2 block">Quick Presets</label>
                  <div class="grid grid-cols-6 gap-1.5">
                    <button
                      v-for="color in canvasColorPresets"
                      :key="color"
                      @click="updateCanvasBackgroundColor(color)"
                      class="w-8 h-8 rounded-lg border-2 transition-all hover:scale-110"
                      :class="canvasBackgroundColor === color ? 'border-primary-400 ring-2 ring-primary-400/30' : 'border-white/20'"
                      :style="{ backgroundColor: color }"
                      :title="color"
                    />
                  </div>
                </div>
              </div>
              
              <!-- Canvas Size Info -->
              <div class="pt-3 border-t border-white/10">
                <div class="flex items-center justify-between text-xs">
                  <span class="text-white/60">Size</span>
                  <span class="text-white/80 font-medium">{{ canvasSize.width }} × {{ canvasSize.height }} px</span>
                </div>
              </div>
              
              <!-- Hint -->
              <div class="pt-3 border-t border-white/10 text-center">
                <p class="text-xs text-white/50">Click any object on the canvas to edit its properties</p>
              </div>
            </section>
            
            <!-- Properties Panel Content (extracted component) -->
            <PropertiesPanelContent
              v-else
              :align-target="alignTarget"
              @align="handleAlign"
              @distribute="handleDistribute"
              @update:alignTarget="alignTarget = $event"
            />
          </div>
        </div>
        
        <!-- Layers Panel -->
        <div :class="['flex flex-col min-h-0 bg-[#0b111d] transition-all duration-200', isLayersCollapsed ? 'h-8' : (isPropertiesCollapsed ? 'flex-1' : 'flex-1')]">
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
          <div v-show="!isLayersCollapsed" class="flex-1 min-h-0 overflow-y-auto">
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

    <!-- Canvas Setup Modal -->
    <CanvasSetupModal
      :is-open="isCanvasSetupModalOpen"
      @close="isCanvasSetupModalOpen = false"
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
