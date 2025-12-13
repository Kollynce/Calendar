<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
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
import EditorRulers from '@/components/editor/EditorRulers.vue'
import { renderTemplateOnCanvas, generateTemplateThumbnail } from '@/services/editor/template-renderer'

const router = useRouter()
const editorStore = useEditorStore()
const RULER_SIZE = 32

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
  showRulers,
} = storeToRefs(editorStore)

// Local State
const activeTool = ref('templates')
const canvasRef = ref<HTMLCanvasElement | null>(null)
const isExportModalOpen = ref(false)
const uploadedImages = ref<{ id: string; url: string; name: string }[]>([])
const isDragging = ref(false)
const selectedTemplateCategory = ref('all')
const templateThumbnails = ref<Record<string, string>>({})
const thumbnailsLoading = ref(false)
const activeTemplateId = ref<string | null>(null)
const templateOverrides = ref({
  highlightToday: true,
  highlightWeekends: true,
  hasPhotoArea: false,
  hasNotesArea: false,
})
const isApplyingTemplate = ref(false)
let overridesRenderTimer: ReturnType<typeof setTimeout> | null = null

const PAPER_SIZES = {
  portrait: { width: 744, height: 1052 },
  landscape: { width: 1052, height: 744 },
}

const DEFAULT_CANVAS = PAPER_SIZES.portrait

const paperWidth = computed(() => canvasSize.value.width || DEFAULT_CANVAS.width)
const paperHeight = computed(() => canvasSize.value.height || DEFAULT_CANVAS.height)
const boardStyle = computed(() => ({
  width: `${paperWidth.value}px`,
  height: `${paperHeight.value}px`,
}))
const boardWrapperStyle = computed(() => {
  const offset = showRulers.value ? RULER_SIZE : 0
  return {
    width: `${paperWidth.value + offset}px`,
    height: `${paperHeight.value + offset}px`,
    paddingLeft: `${offset}px`,
    paddingTop: `${offset}px`,
  }
})
const boardOffsetStyle = computed(() =>
  showRulers.value
    ? {
        marginLeft: `${RULER_SIZE}px`,
        marginTop: `${RULER_SIZE}px`,
      }
    : {},
)

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
    if (!activeTemplate.value || isApplyingTemplate.value) return

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

const templateSupportsPhoto = computed(() => !!activeTemplate.value?.preview.photoPosition)
const templateSupportsNotes = computed(() => !!activeTemplate.value?.preview.notesPosition)

type ElementType = 'shape' | 'calendar' | 'planner'

interface ElementItem {
  id: string
  name: string
  icon: string
  type: ElementType
  description?: string
  shapeType?: string
  calendarType?: 'month-grid' | 'week-strip' | 'date-cell'
  plannerType?: 'notes-panel' | 'photo-block'
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
      { id: 'arrow', name: 'Arrow', icon: '→', type: 'shape', shapeType: 'line', options: { width: 240, stroke: '#1d4ed8', strokeWidth: 4 } },
      { id: 'divider', name: 'Divider', icon: '┄', type: 'shape', shapeType: 'line', options: { width: 260, stroke: '#94a3b8', strokeWidth: 2, strokeDashArray: [10, 8] } },
    ],
  },
  {
    name: 'Calendar Elements',
    items: [
      { id: 'month-grid', name: 'Month Grid', icon: '▦', type: 'calendar', calendarType: 'month-grid', options: { width: 460, height: 360 } },
      { id: 'week-strip', name: 'Week Strip', icon: '▤', type: 'calendar', calendarType: 'week-strip', options: { width: 520, height: 90 } },
      { id: 'date-cell', name: 'Date Cell', icon: '□', type: 'calendar', calendarType: 'date-cell', options: { width: 160, height: 190 } },
    ],
  },
  {
    name: 'Planner Blocks',
    items: [
      {
        id: 'planner-hero',
        name: 'Hero Block',
        icon: '🌈',
        type: 'planner',
        plannerType: 'notes-panel',
        description: 'Bold hero banner with layered heading + grid',
        options: {
          pattern: 'hero',
          title: 'Weekly Focus',
          accentColor: '#ea580c',
          width: 360,
          height: 220,
        },
      },
      {
        id: 'planner-ruled',
        name: 'Ruled Notes',
        icon: '�',
        type: 'planner',
        plannerType: 'notes-panel',
        description: 'Classic ruled panel for journaling',
        options: {
          pattern: 'ruled',
          title: 'Notes',
          accentColor: '#2563eb',
          width: 300,
          height: 320,
        },
      },
      {
        id: 'planner-grid',
        name: 'Grid Notes',
        icon: '#️⃣',
        type: 'planner',
        plannerType: 'notes-panel',
        description: 'Square grid bullet journal block',
        options: {
          pattern: 'grid',
          title: 'Habit Tracker',
          accentColor: '#22c55e',
          width: 320,
          height: 320,
        },
      },
      {
        id: 'planner-dot',
        name: 'Dot Notes',
        icon: '⋮',
        type: 'planner',
        plannerType: 'notes-panel',
        description: 'Dot grid for flexible planning',
        options: {
          pattern: 'dot',
          title: 'Ideas',
          accentColor: '#a855f7',
          width: 300,
          height: 300,
        },
      },
      {
        id: 'photo-block',
        name: 'Photo Drop',
        icon: '🖼️',
        type: 'planner',
        plannerType: 'photo-block',
        description: 'Framed photo or inspiration block',
        options: { label: 'Add photo', accentColor: '#0ea5e9', width: 320, height: 240 },
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
        id: 'streamer-banner',
        name: 'Ribbon Banner',
        icon: '🏷️',
        type: 'shape',
        shapeType: 'rect',
        description: 'Wide pill banner for section titles',
        options: { width: 320, height: 90, cornerRadius: 999, fill: '#fee2e2', stroke: '#f97316', strokeWidth: 2 },
      },
      {
        id: 'pill-badge',
        name: 'Pill Badge',
        icon: '⬭',
        type: 'shape',
        shapeType: 'rect',
        description: 'Accent badge for highlighting text',
        options: { width: 180, height: 60, cornerRadius: 999, fill: '#ede9fe', stroke: '#a855f7', strokeWidth: 2 },
      },
      {
        id: 'burst-badge',
        name: 'Burst Badge',
        icon: '✺',
        type: 'shape',
        shapeType: 'circle',
        description: 'Sticker-style highlight badge',
        options: { radius: 70, fill: '#fef9c3', stroke: '#facc15', strokeWidth: 4 },
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

const opacity = computed({
  get: () => ((selectedObject.value as any)?.opacity || 1) * 100,
  set: (value) => editorStore.updateObjectProperty('opacity', value / 100),
})

// Initialize editor with a new project
onMounted(() => {
  // Create a new project if none exists
  if (!editorStore.project) {
    editorStore.createNewProject({
      year: new Date().getFullYear(),
      country: 'ZA',
      language: 'en',
      layout: 'monthly',
      startDay: 0,
      showHolidays: true,
      showCustomHolidays: false,
      showWeekNumbers: false
    })
  }
  
  // Set canvas dimensions
  const project = editorStore.project
  if (project) {
    project.canvas.width = DEFAULT_CANVAS.width
    project.canvas.height = DEFAULT_CANVAS.height
  }
  
  // Initialize canvas after a tick to ensure DOM is ready
  setTimeout(() => {
    if (canvasRef.value && !editorStore.canvas) {
      editorStore.initializeCanvas(canvasRef.value)
      
      // Add a welcome text
      setTimeout(() => {
        editorStore.addObject('text', {
          content: 'Start Designing Your Calendar',
          x: 100,
          y: 100,
          fontSize: 32,
          fontFamily: 'Outfit',
          color: '#1a1a1a'
        })
      }, 100)
    }
  }, 50)

  loadTemplateThumbnails()
})

// Template Functions
async function applyTemplate(template: CalendarTemplate) {
  if (!editorStore.canvas) return
  isApplyingTemplate.value = true
  activeTemplateId.value = template.id
  templateOverrides.value = {
    highlightToday: template.config.highlightToday,
    highlightWeekends: template.config.highlightWeekends,
    hasPhotoArea: template.preview.hasPhotoArea,
    hasNotesArea: template.preview.hasNotesArea,
  }

  await renderTemplateWithOverrides(template)
  isApplyingTemplate.value = false
}

async function loadTemplateThumbnails() {
  thumbnailsLoading.value = true
  const entries = await Promise.all(
    calendarTemplates.map(async (template) => {
      const dataUrl = await generateTemplateThumbnail(template, { multiplier: 0.28 })
      return [template.id, dataUrl] as const
    })
  )
  templateThumbnails.value = Object.fromEntries(entries)
  thumbnailsLoading.value = false
}

// Element Functions
function addElement(element: ElementItem) {
  const placement = elementPlacementDefaults[element.type]
  const baseOptions = {
    x: placement?.x,
    y: placement?.y,
  }
  const options = {
    ...baseOptions,
    ...(element.options || {}),
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
    } else if (element.plannerType === 'photo-block') {
      editorStore.addObject('photo-block', options)
    }
  }
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

function handleZoom(delta: number) {
  const newZoom = Math.max(25, Math.min(300, zoom.value * 100 + delta))
  editorStore.setZoom(newZoom / 100)
}

</script>

<template>
  <div class="h-screen flex flex-col bg-gray-100 dark:bg-gray-900 overflow-hidden">
    <!-- Header -->
    <header class="h-14 bg-white dark:bg-gray-800 z-20 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
      <div class="flex items-center gap-4">
        <button @click="router.push('/dashboard')" class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="Back to Dashboard">
          <ArrowLeftIcon class="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
        <div class="h-6 w-px bg-gray-200 dark:bg-gray-700"></div>
        <div>
          <h1 class="font-semibold text-gray-900 dark:text-white text-sm">{{ editorStore.project?.name || 'Untitled Calendar' }}</h1>
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
            class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Undo (Ctrl+Z)"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
          <button 
            @click="editorStore.redo()" 
            :disabled="!canRedo"
            class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Redo (Ctrl+Shift+Z)"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
            </svg>
          </button>
        </div>
        
        <span class="text-xs text-gray-500 font-medium">A4 Portrait</span>
        <div class="h-6 w-px bg-gray-200 dark:bg-gray-700"></div>
        
        <button class="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5">
          <ShareIcon class="w-4 h-4" /> Share
        </button>
        <button 
          @click="editorStore.saveProject()" 
          :disabled="!isDirty || saving"
          class="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs px-3 py-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
        >
          {{ saving ? 'Saving...' : 'Save' }}
        </button>
        <button @click="isExportModalOpen = true" class="btn-primary text-xs px-4 py-2 flex items-center gap-1.5">
          <ArrowDownTrayIcon class="w-4 h-4" /> Export
        </button>
      </div>
    </header>

    <div class="flex-1 flex overflow-hidden">
      <!-- Left Sidebar -->
      <aside class="flex h-full z-10 shrink-0">
        <!-- Icon Rail -->
        <div class="w-16 bg-white dark:bg-gray-800 flex flex-col items-center py-4 gap-1 border-r border-gray-200 dark:border-gray-700">
          <button 
            v-for="tool in tools" 
            :key="tool.id"
            @click="activeTool = activeTool === tool.id ? '' : tool.id"
            :class="[
              'flex flex-col items-center justify-center w-12 h-14 rounded-xl transition-all duration-200',
              activeTool === tool.id 
                ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400' 
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700/50'
            ]"
          >
            <component :is="tool.icon" class="w-5 h-5 mb-1" />
            <span class="text-[10px] font-medium">{{ tool.name }}</span>
          </button>
        </div>

        <!-- Drawer Panel -->
        <transition
          enter-active-class="transition-all duration-300 ease-out"
          enter-from-class="-translate-x-full opacity-0"
          enter-to-class="translate-x-0 opacity-100"
          leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="translate-x-0 opacity-100"
          leave-to-class="-translate-x-full opacity-0"
        >
          <div v-if="activeTool" class="w-80 xl:w-88 2xl:w-104 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
            <!-- Panel Header -->
            <div class="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center shrink-0">
              <h2 class="font-semibold text-gray-900 dark:text-white capitalize">{{ activeTool }}</h2>
              <button @click="activeTool = ''" class="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <XMarkIcon class="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            <!-- Panel Content -->
            <div class="flex-1 overflow-y-auto p-4">
              
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
                      class="aspect-square bg-gray-50 hover:bg-gray-100 dark:bg-gray-700/50 dark:hover:bg-gray-700 rounded-xl flex flex-col items-center justify-center transition-all hover:scale-105 group border border-gray-200 dark:border-gray-600"
                    >
                      <span class="text-2xl mb-1 group-hover:scale-110 transition-transform">{{ element.icon }}</span>
                      <span class="text-[10px] text-gray-500 dark:text-gray-400 font-medium">{{ element.name }}</span>
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
                    'relative border-2 border-dashed rounded-xl p-6 text-center transition-all',
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
                          class="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"
                          title="Add to canvas"
                        >
                          <PlusIcon class="w-4 h-4 text-gray-800" />
                        </button>
                        <button 
                          @click="removeUploadedImage(image.id)"
                          class="p-2 bg-white rounded-lg hover:bg-red-100 transition-colors"
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
                      class="w-full text-left p-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors group border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
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
                      class="p-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors text-center group border border-transparent hover:border-primary-300"
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
                      class="w-full flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors group"
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

      <!-- Center Canvas Area -->
      <main class="flex-1 relative overflow-hidden flex flex-col bg-[#050b14] text-white">
        <!-- Canvas Background Pattern -->
        <div class="absolute inset-0 opacity-60 pointer-events-none" style="background: radial-gradient(circle at 25% 25%, rgba(255,255,255,0.04), transparent 40%), radial-gradient(circle at 75% 0%, rgba(99,102,241,0.08), transparent 45%), radial-gradient(circle at 10% 80%, rgba(6,182,212,0.06), transparent 40%);"></div>
        <div class="absolute inset-0 pointer-events-none" style="background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0); background-size: 24px 24px;"></div>
        
        <!-- Canvas Container -->
        <div class="flex-1 flex items-center justify-center p-4 overflow-auto relative z-0">
          <div 
            class="canvas-stage relative transition-all duration-300"
            :style="boardWrapperStyle"
          >
            <EditorRulers
              v-if="showRulers"
              :zoom="zoom"
              :width="paperWidth"
              :height="paperHeight"
              :ruler-size="RULER_SIZE"
            />

            <div 
              class="board-stack relative drop-shadow-[0_25px_60px_rgba(15,23,42,0.55)]"
              :style="boardOffsetStyle"
            >
              <!-- White Paper Visual -->
              <div 
                class="bg-white relative rounded-[24px] overflow-hidden"
                :style="boardStyle"
              >
                <!-- Fabric Canvas Element -->
                <canvas 
                  ref="canvasRef"
                  :width="paperWidth"
                  :height="paperHeight"
                  class="absolute inset-0"
                ></canvas>
              </div>
            </div>
          </div>

          <!-- Zoom Controls -->
          <div class="absolute bottom-6 right-8 flex items-center gap-2 bg-white/95 text-gray-800 rounded-2xl px-2 py-1 shadow-xl ring-1 ring-black/5 backdrop-blur z-30">
            <button @click="handleZoom(-10)" class="p-2 hover:bg-gray-100 rounded-xl transition-colors" title="Zoom out">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" /></svg>
            </button>
            <span class="text-xs font-semibold min-w-14 text-center">{{ Math.round(zoom * 100) }}%</span>
            <button @click="handleZoom(10)" class="p-2 hover:bg-gray-100 rounded-xl transition-colors" title="Zoom in">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
            </button>
            <div class="w-px h-5 bg-gray-200 mx-1"></div>
            <button @click="editorStore.fitToScreen()" class="p-2 hover:bg-gray-100 rounded-xl transition-colors" title="Fit to screen">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
            </button>
          </div>
        </div>
      </main>

      <!-- Right Sidebar (Properties + Layers) -->
      <aside class="w-72 xl:w-80 2xl:w-96 bg-[#0f1627] text-white border-l border-white/10 shrink-0 hidden lg:flex flex-col z-10 overflow-hidden">
        <!-- Properties Panel (Top Half) -->
        <div class="flex-1 flex flex-col min-h-0 border-b border-white/5">
          <div class="p-4 border-b border-white/5 shrink-0">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs uppercase tracking-[0.2em] text-white/60">Inspector</p>
                <h3 class="font-semibold text-lg">Properties</h3>
              </div>
              <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                {{ isDirty ? 'Unsaved' : 'Synced' }}
              </span>
            </div>
          </div>
          
          <div class="flex-1 overflow-y-auto space-y-4 p-4">
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
              
              <!-- Text Properties -->
              <template v-if="objectType === 'textbox'">
                <div class="space-y-4">
                  <div>
                    <label class="text-xs font-medium text-white/60 mb-1.5 block">Content</label>
                    <textarea 
                      v-model="textContent" 
                      rows="3"
                      class="w-full px-3 py-2 text-sm border border-white/10 rounded-xl bg-white/10 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                    ></textarea>
                  </div>
                  
                  <div>
                    <label class="text-xs font-medium text-white/60 mb-1.5 block">Font Family</label>
                    <FontPicker v-model="fontFamily" />
                  </div>
                  
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="text-xs font-medium text-white/60 mb-1.5 block">Size</label>
                      <input 
                        v-model.number="fontSize" 
                        type="number" 
                        min="8" 
                        max="200"
                        class="w-full px-3 py-2 text-sm border border-white/10 rounded-xl bg-white/10 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                      class="px-3 py-2 text-xs font-semibold bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                    >
                      Bring Front
                    </button>
                    <button 
                      @click="editorStore.sendToBack()"
                      class="px-3 py-2 text-xs font-semibold bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                    >
                      Send Back
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
        
        <!-- Layers Panel (Bottom Half) -->
        <div class="flex-1 flex flex-col min-h-0 bg-[#0b111d]">
          <div class="p-3 border-b border-white/10 shrink-0 flex items-center justify-between">
            <h3 class="font-semibold text-white text-sm uppercase tracking-[0.3em]">Layers</h3>
            <span class="text-xs text-white/50">{{ editorStore.canvas?.getObjects().length || 0 }}</span>
          </div>
          <div class="flex-1 overflow-y-auto">
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
