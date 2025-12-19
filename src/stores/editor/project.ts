import type { Ref } from 'vue'
import type { Canvas } from 'fabric'
import type { CalendarConfig, CanvasState, Project, TemplateOptions } from '@/types'

type MergeTemplateOptions = (options?: Partial<TemplateOptions>) => TemplateOptions

type ProjectsService = {
  getById: (id: string) => Promise<Project | null>
  save: (project: Project) => Promise<void>
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
  historyIndex: Ref<number>
  selectedObjectIds: Ref<string[]>
  clipboard: Ref<unknown | null>
  loading: Ref<boolean>
  saving: Ref<boolean>
  isDirty: Ref<boolean>
  authStore: AuthStore
  calendarStore: CalendarStore
  projectsService: ProjectsService
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
    historyIndex,
    selectedObjectIds,
    clipboard,
    loading,
    saving,
    isDirty,
    authStore,
    calendarStore,
    projectsService,
    mergeTemplateOptions,
    normalizeCanvasSize,
    generateObjectId,
  } = params

  function ensureTemplateOptions(options?: Partial<TemplateOptions>): TemplateOptions {
    return mergeTemplateOptions(options)
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
    })
    calendarStore.generateCalendar()
  }

  function createNewProject(config: CalendarConfig): void {
    config.templateOptions = ensureTemplateOptions(config.templateOptions)

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
    historyIndex.value = -1
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

      loadProject(found)
    } finally {
      loading.value = false
    }
  }

  function loadProject(loadedProject: Project): void {
    const normalized = normalizeCanvasSize(loadedProject?.canvas)
    project.value = {
      ...loadedProject,
      config: {
        ...loadedProject.config,
        templateOptions: ensureTemplateOptions(loadedProject.config.templateOptions),
      },
      canvas: {
        ...loadedProject.canvas,
        width: normalized.width,
        height: normalized.height,
      },
    }

    history.value = []
    historyIndex.value = -1
    isDirty.value = false

    selectedObjectIds.value = []
    clipboard.value = null

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
    return {
      ...json,
      width: canvas.value.width,
      height: canvas.value.height,
      backgroundColor: canvas.value.backgroundColor?.toString(),
    } as unknown as CanvasState
  }

  async function saveProject(): Promise<void> {
    if (!project.value || !canvas.value) return

    saving.value = true

    try {
      project.value.canvas = getCanvasState() as CanvasState
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
