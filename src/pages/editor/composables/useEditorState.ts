import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useEditorStore } from '@/stores/editor.store'
import { useCalendarStore } from '@/stores/calendar.store'
import { useAuthStore } from '@/stores/auth.store'
import { storeToRefs } from 'pinia'
import { getPresetByCanvasSize } from '@/config/canvas-presets'
import type AdobeCanvas from '@/components/editor/AdobeCanvas.vue'

export const PAPER_SIZES = {
  portrait: { width: 744, height: 1052 },
  landscape: { width: 1052, height: 744 },
}

export function useEditorState() {
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
  const canvasRef = ref<HTMLCanvasElement | null>(null)
  const adobeCanvasRef = ref<InstanceType<typeof AdobeCanvas> | null>(null)
  const canvasKey = ref(0)
  const isExportModalOpen = ref(false)
  const isCanvasSetupModalOpen = ref(false)
  const alignTarget = ref<'canvas' | 'selection'>('canvas')

  // Panel visibility state
  const isRightSidebarVisible = ref(true)
  const isPropertiesCollapsed = ref(false)
  const isLayersCollapsed = ref(false)

  const isAuthenticated = computed(() => !!authStore.user?.id)

  const paperWidth = computed(() => canvasSize.value.width || PAPER_SIZES.portrait.width)
  
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

  function handleAlign(action: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') {
    editorStore.alignSelection(action, alignTarget.value)
  }

  function handleDistribute(axis: 'horizontal' | 'vertical') {
    editorStore.distributeSelection?.(axis)
  }

  return {
    // Stores
    router,
    route,
    editorStore,
    calendarStore,
    authStore,
    // Store refs
    hasSelection,
    selectedObjects,
    isDirty,
    saving,
    canUndo,
    canRedo,
    canvasSize,
    // Local state
    activeTool,
    canvasRef,
    adobeCanvasRef,
    canvasKey,
    isExportModalOpen,
    isCanvasSetupModalOpen,
    alignTarget,
    isRightSidebarVisible,
    isPropertiesCollapsed,
    isLayersCollapsed,
    // Computed
    isAuthenticated,
    paperWidth,
    canvasOrientation,
    canvasPreset,
    activeMonth,
    canvasSizeLabel,
    projectName,
    routeProjectId,
    // Methods
    handleSaveProject,
    handleAlign,
    handleDistribute,
    // Constants
    PAPER_SIZES,
  }
}
