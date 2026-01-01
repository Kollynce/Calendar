import type { Ref } from 'vue'
import type { Canvas } from 'fabric'
import type { CalendarConfig, CanvasState, Project, TemplateOptions, WatermarkConfig } from '@/types'
import { DEFAULT_WATERMARK_CONFIG, normalizeWatermarkConfig } from '@/config/watermark-defaults'

type MergeTemplateOptions = (options?: Partial<TemplateOptions>) => TemplateOptions

type ProjectsService = {
  getById: (id: string) => Promise<Project | null>
  save: (project: Project) => Promise<void>
}

type StorageUsageService = {
  updateProjectCount: (userId: string, delta: number) => Promise<void>
}

type AuthStore = {
  user?: { id?: string | null } | null
}

type CalendarStore = {
  updateConfig: (partial: Partial<CalendarConfig>) => void
  generateCalendar: () => void
  config?: CalendarConfig
}

export function createProjectModule(params: {
  project: Ref<Project | null>
  canvas: Ref<Canvas | null>
  history: Ref<CanvasState[]>
  redoHistory: Ref<CanvasState[]>
  selectedObjectIds: Ref<string[]>
  clipboard: Ref<unknown | null>
  loading: Ref<boolean>
  saving: Ref<boolean>
  isDirty: Ref<boolean>
  authStore: AuthStore
  calendarStore: CalendarStore
  projectsService: ProjectsService
  storageUsageService: StorageUsageService
  mergeTemplateOptions: MergeTemplateOptions
  normalizeCanvasSize: (input: { width?: number; height?: number } | null | undefined) => {
    width: number
    height: number
  }
  generateObjectId: (prefix: string) => string
}) {
  const {
    project,
    canvas,
    history,
    redoHistory,
    selectedObjectIds,
    clipboard,
    loading,
    saving,
    isDirty,
    authStore,
    calendarStore,
    projectsService,
    storageUsageService,
    mergeTemplateOptions,
    normalizeCanvasSize,
    generateObjectId,
  } = params

  function ensureTemplateOptions(options?: Partial<TemplateOptions>): TemplateOptions {
    return mergeTemplateOptions(options)
  }

  function ensureWatermarkConfig(config: CalendarConfig): WatermarkConfig {
    const visible = config.showWatermark === false ? false : true
    const fallback: WatermarkConfig = {
      ...DEFAULT_WATERMARK_CONFIG,
      visible,
    }
    const incoming: Partial<WatermarkConfig> | undefined = config.watermark
      ? { ...config.watermark }
      : { visible }
    const next = normalizeWatermarkConfig(incoming, fallback)
    config.showWatermark = next.visible
    config.watermark = next
    return next
  }

  function syncCalendarStoreConfig(next: CalendarConfig): void {
    calendarStore.updateConfig({
      year: next.year,
      country: next.country,
      language: next.language,
      layout: next.layout,
      startDay: next.startDay,
      showHolidays: next.showHolidays,
      showCustomHolidays: next.showCustomHolidays,
      showWeekNumbers: next.showWeekNumbers,
      watermark: next.watermark,
    })
    calendarStore.generateCalendar()
  }

  function createNewProject(config: CalendarConfig): void {
    config.templateOptions = ensureTemplateOptions(config.templateOptions)
    ensureWatermarkConfig(config)

    const normalized = normalizeCanvasSize(null)
    project.value = {
      id: generateObjectId('project'),
      userId: authStore.user?.id || '',
      name: 'Untitled Calendar',
      config,
      canvas: {
        width: normalized.width,
        height: normalized.height,
        unit: 'px',
        dpi: 72,
        backgroundColor: '#ffffff',
        objects: [],
      },
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    history.value = []
    redoHistory.value = []
    isDirty.value = false

    selectedObjectIds.value = []
    clipboard.value = null

    syncCalendarStoreConfig(config)
  }

  function setProjectName(name: string): void {
    if (!project.value) return
    project.value.name = name
    project.value.updatedAt = new Date().toISOString()
    isDirty.value = true
  }

  function setProjectTemplateId(templateId: string | undefined): void {
    if (!project.value) return
    project.value.templateId = templateId
    project.value.updatedAt = new Date().toISOString()
    isDirty.value = true
  }

  async function loadProjectById(id: string): Promise<void> {
    loading.value = true
    try {
      const found = await projectsService.getById(id)
      if (!found) {
        createNewProject({
          year: new Date().getFullYear(),
          country: 'KE',
          language: 'en',
          layout: 'monthly',
          startDay: 0,
          showHolidays: true,
          showCustomHolidays: false,
          showWeekNumbers: false,
        })
        if (project.value) project.value.id = id
        return
      }

      console.log('[loadProjectById] Loaded project from Firebase:', id)
      console.log('[loadProjectById] Canvas has', found.canvas?.objects?.length || 0, 'objects')
      console.log('[loadProjectById] First object:', JSON.stringify(found.canvas?.objects?.[0], null, 2))
      
      loadProject(found)
    } finally {
      loading.value = false
    }
  }

  function loadProject(loadedProject: Project): void {
    const normalized = normalizeCanvasSize(loadedProject?.canvas)
    
    // Deep clone the canvas state to prevent reference issues
    const canvasClone = JSON.parse(JSON.stringify(loadedProject.canvas))
    
    project.value = {
      ...loadedProject,
      config: {
        ...loadedProject.config,
        templateOptions: ensureTemplateOptions(loadedProject.config.templateOptions),
      },
      canvas: {
        ...canvasClone,
        width: normalized.width,
        height: normalized.height,
      },
    }

    history.value = []
    redoHistory.value = []
    isDirty.value = false

    selectedObjectIds.value = []
    clipboard.value = null

    ensureWatermarkConfig(project.value.config)
    syncCalendarStoreConfig(project.value.config)
  }

  function getCanvasState(): CanvasState | null {
    if (!canvas.value) return null
    
    const json = (canvas.value as any).toJSON([
      'id',
      'name',
      'data',
      'visible',
      'selectable',
      'evented',
      'width',
      'height',
      'backgroundColor',
    ])
    
    // Manually inject id and data properties from the actual objects
    const objects = canvas.value.getObjects() as any[]
    
    function injectDataIntoJSON(fabricObj: any, jsonObj: any, depth = 0): void {
      // Inject id and data from the Fabric object into the JSON object
      if (fabricObj.id) {
        jsonObj.id = fabricObj.id
      }
      if (fabricObj.data) {
        jsonObj.data = fabricObj.data
        if (depth === 0) {
          console.log(`[injectData] Object ${fabricObj.id} has data:`, !!fabricObj.data, 'metadata:', fabricObj.data?.elementMetadata?.kind)
        }
      }
      
      // Process nested objects in groups
      if (fabricObj.type === 'group' && Array.isArray(fabricObj._objects) && Array.isArray(jsonObj.objects)) {
        for (let i = 0; i < fabricObj._objects.length; i++) {
          if (jsonObj.objects[i]) {
            injectDataIntoJSON(fabricObj._objects[i], jsonObj.objects[i], depth + 1)
          }
        }
      }
    }
    
    // Inject data for all top-level objects
    if (Array.isArray(json.objects)) {
      for (let i = 0; i < objects.length; i++) {
        if (json.objects[i]) {
          injectDataIntoJSON(objects[i], json.objects[i])
        }
      }
    }
    
    // Remove watermark objects before persisting/snapshotting
    if (Array.isArray(json.objects)) {
      json.objects = json.objects.filter((obj: any) => !obj?.data?.watermark)
    }

    // Log what we're saving
    console.log('[getCanvasState] Serialized', json.objects?.length || 0, 'objects')
    if (json.objects?.[0]) {
      console.log('[getCanvasState] First object has id:', json.objects[0].id, 'data:', !!json.objects[0].data)
      if (json.objects[0].data?.elementMetadata) {
        console.log('[getCanvasState] First object metadata:', json.objects[0].data.elementMetadata.kind)
      }
    }
    
    return {
      ...json,
      width: canvas.value.width,
      height: canvas.value.height,
      backgroundColor: canvas.value.backgroundColor?.toString(),
    } as unknown as CanvasState
  }

  async function saveProject(): Promise<void> {
    console.log('[saveProject] Save triggered')
    if (!project.value || !canvas.value) {
      console.log('[saveProject] Aborted - no project or canvas')
      return
    }

    const isNewProject = !project.value.updatedAt || project.value.createdAt === project.value.updatedAt
    saving.value = true

    try {
      console.log('[saveProject] Getting canvas state...')
      project.value.canvas = getCanvasState() as CanvasState
      console.log('[saveProject] Canvas state captured')
      project.value.updatedAt = new Date().toISOString()

      const canvasWidth = canvas.value.getWidth?.() ?? canvas.value.width ?? 0
      const targetThumbWidth = 720
      const multiplier = canvasWidth > 0 ? Math.min(Math.max(targetThumbWidth / canvasWidth, 0.35), 1.25) : 0.75

      const thumbnail = canvas.value.toDataURL({
        format: 'jpeg',
        quality: 0.85,
        multiplier,
      })
      project.value.thumbnail = thumbnail

      if (!project.value.userId) {
        project.value.userId = authStore.user?.id || ''
      }

      await projectsService.save(project.value)
      
      // If it's a new project, increment project count
      if (isNewProject && authStore.user?.id) {
        await storageUsageService.updateProjectCount(authStore.user.id, 1).catch(console.error)
      }

      isDirty.value = false
    } finally {
      saving.value = false
    }
  }

  function updateTemplateOptions(partial: Partial<TemplateOptions>): void {
    if (!project.value) return

    project.value.config.templateOptions = ensureTemplateOptions({
      ...project.value.config.templateOptions,
      ...partial,
    })
    isDirty.value = true
  }

  return {
    createNewProject,
    loadProject,
    loadProjectById,
    setProjectName,
    setProjectTemplateId,
    saveProject,
    getCanvasState,
    updateTemplateOptions,
  }
}
