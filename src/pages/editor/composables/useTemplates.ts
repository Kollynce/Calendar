import { ref, computed, watch, nextTick } from 'vue'
import { useEditorStore } from '@/stores/editor.store'
import {
  type CalendarTemplate,
  buildTemplateInstance,
  getTemplateDefaultOptions,
  resolveTemplateOptions,
} from '@/data/templates/calendar-templates'
import { renderTemplateOnCanvas, generateTemplateThumbnail } from '@/services/editor/template-renderer'
import { DEFAULT_TEMPLATE_OPTIONS } from '@/config/editor-defaults'
import type { CanvasState, TemplateOptions } from '@/types'
import { PAPER_SIZES } from './useEditorState'
import { marketplaceService, type MarketplaceProduct } from '@/services/marketplace.service'
import { projectsService } from '@/services/projects/projects.service'

interface RenderOptions {
  recordHistory?: boolean
}

function marketplaceToCalendarTemplate(product: MarketplaceProduct): CalendarTemplate {
  const templateData = product.templateData || {}
  return {
    id: product.id || '',
    name: product.name,
    description: product.description,
    category: (product.category as CalendarTemplate['category']) || 'monthly',
    preview: {
      hasPhotoArea: templateData.preview?.hasPhotoArea ?? false,
      photoPosition: templateData.preview?.photoPosition,
      hasNotesArea: templateData.preview?.hasNotesArea ?? false,
      notesPosition: templateData.preview?.notesPosition,
      gridStyle: templateData.preview?.gridStyle ?? 'full',
      colorScheme: templateData.preview?.colorScheme ?? ['#3b82f6'],
    },
    config: {
      layout: templateData.config?.layout ?? 'portrait',
      monthsPerPage: templateData.config?.monthsPerPage ?? 1,
      showWeekNumbers: templateData.config?.showWeekNumbers ?? false,
      weekStartsOn: templateData.config?.weekStartsOn ?? 0,
      fontSize: templateData.config?.fontSize ?? 'medium',
      fontFamily: templateData.config?.fontFamily ?? 'Inter',
      headerStyle: templateData.config?.headerStyle ?? 'bold',
      gridBorders: templateData.config?.gridBorders ?? true,
      highlightToday: templateData.config?.highlightToday ?? true,
      highlightWeekends: templateData.config?.highlightWeekends ?? false,
      monthGrid: templateData.config?.monthGrid,
    },
    rating: 4.5,
    popular: product.isPopular,
    requiredTier: product.requiredTier === 'free' ? undefined : product.requiredTier,
    _marketplaceProduct: product,
  } as CalendarTemplate & { _marketplaceProduct: MarketplaceProduct }
}

export function useTemplates(
  activeMonth: () => number,
  canvasSize: () => { width: number; height: number }
) {
  const editorStore = useEditorStore()

  const selectedTemplateCategory = ref('all')
  const templateThumbnails = ref<Record<string, string>>({})
  const thumbnailsLoading = ref(false)
  const activeTemplateId = ref<string | null>(null)
  const templateOverrides = ref<TemplateOptions>({ ...DEFAULT_TEMPLATE_OPTIONS })
  const isApplyingTemplate = ref(false)
  const isSyncingTemplateUiFromProject = ref(false)
  let overridesRenderTimer: ReturnType<typeof setTimeout> | null = null

  const marketplaceTemplates = ref<MarketplaceProduct[]>([])
  const marketplaceLoading = ref(false)
  const marketplaceError = ref<string | null>(null)

  const allTemplates = computed<CalendarTemplate[]>(() => {
    return marketplaceTemplates.value
      .filter(p => p.isPublished !== false)
      .map(marketplaceToCalendarTemplate)
  })

  const filteredTemplates = computed(() => {
    if (selectedTemplateCategory.value === 'all') return allTemplates.value
    return allTemplates.value.filter((t) => t.category === selectedTemplateCategory.value)
  })

  const activeTemplate = computed(() => {
    if (!activeTemplateId.value) return null
    return allTemplates.value.find((t) => t.id === activeTemplateId.value) || null
  })

  const templateSupportsPhoto = computed(() => !!activeTemplate.value?.preview.photoPosition)
  const templateSupportsNotes = computed(() => !!activeTemplate.value?.preview.notesPosition)

  async function loadMarketplaceTemplates() {
    marketplaceLoading.value = true
    marketplaceError.value = null
    try {
      const templates = await marketplaceService.listTemplates(undefined, 100)
      marketplaceTemplates.value = templates.filter(t => t.isPublished !== false)
    } catch (error) {
      console.error('[useTemplates] Failed to load marketplace templates:', error)
      marketplaceError.value = 'Failed to load templates'
    } finally {
      marketplaceLoading.value = false
    }
  }

  function getCanvasSizeForTemplate(template: CalendarTemplate) {
    return template.config.layout === 'landscape'
      ? PAPER_SIZES.landscape
      : PAPER_SIZES.portrait
  }

  async function applyCanvasStateSnapshot(state: CanvasState | null | undefined): Promise<boolean> {
    if (!editorStore.canvas || !state) return false
    try {
      if (state.width && state.height) {
        editorStore.setCanvasSize(state.width, state.height)
      }
      editorStore.canvas.clear()
      editorStore.canvas.backgroundColor = state.backgroundColor ?? '#ffffff'

      await new Promise<void>((resolve) => {
        editorStore.canvas?.loadFromJSON(state as any, () => {
          editorStore.canvas?.getObjects().forEach((obj) => {
            if ((obj as any).data?.watermark) {
              editorStore.canvas?.remove(obj)
            }
          })
          editorStore.canvas?.renderAll()
          resolve()
        })
      })

      if (editorStore.project) {
        editorStore.project.canvas = JSON.parse(JSON.stringify(state))
      }
      editorStore.snapshotCanvasState()
      return true
    } catch (error) {
      console.error('[useTemplates] Failed to apply canvas snapshot', error)
      return false
    }
  }

  async function renderTemplateWithOverrides(
    template: CalendarTemplate,
    options: RenderOptions = {},
  ) {
    const { recordHistory = true } = options

    if (!editorStore.canvas) return

    const customizedTemplate = buildTemplateInstance(template, templateOverrides.value)

    let renderWidth = canvasSize().width
    let renderHeight = canvasSize().height
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
        month: activeMonth(),
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

  async function syncTemplateUiFromProject(): Promise<void> {
    const templateId = editorStore.project?.templateId
    if (!templateId) return

    // First ensure marketplace templates are loaded
    if (marketplaceTemplates.value.length === 0) {
      await loadMarketplaceTemplates()
    }

    const template = allTemplates.value.find((t) => t.id === templateId) || null
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

  async function applyTemplate(template: CalendarTemplate) {
    if (!editorStore.canvas) return
    isApplyingTemplate.value = true
    activeTemplateId.value = template.id
    editorStore.setProjectTemplateId(template.id)
    
    const marketplaceProduct = (template as any)._marketplaceProduct as MarketplaceProduct | undefined
    if (marketplaceProduct && editorStore.project) {
      editorStore.setProjectName(marketplaceProduct.name)
    }

    let appliedStoredState = false
    let storedTemplateOptions: TemplateOptions | null = null

    if (marketplaceProduct?.canvasState) {
      appliedStoredState = await applyCanvasStateSnapshot(marketplaceProduct.canvasState)
    }

    if (!appliedStoredState && marketplaceProduct?.sourceProjectId) {
      try {
        const sourceProject = await projectsService.getById(marketplaceProduct.sourceProjectId)
        if (sourceProject?.canvas) {
          appliedStoredState = await applyCanvasStateSnapshot(sourceProject.canvas)
          if (appliedStoredState && sourceProject.config?.templateOptions) {
            storedTemplateOptions = resolveTemplateOptions(template, sourceProject.config.templateOptions)
            if (editorStore.project) {
              editorStore.project.config = {
                ...editorStore.project.config,
                ...sourceProject.config,
                templateOptions: storedTemplateOptions,
              }
            }
          }
        }
      } catch (error) {
        console.warn('[useTemplates] Failed to load source project for template', error)
      }
    }

    if (
      !appliedStoredState &&
      marketplaceProduct?.canvasObjects &&
      Array.isArray(marketplaceProduct.canvasObjects) &&
      marketplaceProduct.canvasObjects.length > 0
    ) {
      const fallbackState: CanvasState = {
        width: editorStore.project?.canvas.width ?? PAPER_SIZES.portrait.width,
        height: editorStore.project?.canvas.height ?? PAPER_SIZES.portrait.height,
        unit: editorStore.project?.canvas.unit ?? 'px',
        dpi: editorStore.project?.canvas.dpi ?? 72,
        backgroundColor: editorStore.project?.canvas.backgroundColor ?? '#ffffff',
        objects: JSON.parse(JSON.stringify(marketplaceProduct.canvasObjects)),
      } as CanvasState
      appliedStoredState = await applyCanvasStateSnapshot(fallbackState)
    }

    if (appliedStoredState) {
      templateOverrides.value = storedTemplateOptions ?? getTemplateDefaultOptions(template)
      editorStore.updateTemplateOptions({ ...templateOverrides.value })
      await nextTick()
      isApplyingTemplate.value = false
      return
    }

    templateOverrides.value = getTemplateDefaultOptions(template)
    editorStore.updateTemplateOptions({ ...templateOverrides.value })

    // Clear canvas before applying generated template
    editorStore.canvas.clear()
    editorStore.canvas.backgroundColor = '#ffffff'

    await renderTemplateWithOverrides(template)
    await nextTick()
    isApplyingTemplate.value = false
  }

  async function loadTemplateThumbnails() {
    thumbnailsLoading.value = true
    
    // First load marketplace templates if not already loaded
    if (marketplaceTemplates.value.length === 0) {
      await loadMarketplaceTemplates()
    }
    
    const entries = await Promise.all(
      allTemplates.value.map(async (template) => {
        // Check if this is a marketplace template with a thumbnail URL
        const marketplaceProduct = (template as any)._marketplaceProduct as MarketplaceProduct | undefined
        if (marketplaceProduct?.thumbnail) {
          return [template.id, marketplaceProduct.thumbnail] as const
        }
        
        // Generate thumbnail for templates without one
        const dataUrl = await generateTemplateThumbnail(template, { multiplier: 0.28 })
        return [template.id, dataUrl] as const
      })
    )
    templateThumbnails.value = Object.fromEntries(entries)
    thumbnailsLoading.value = false
  }

  function setupTemplateWatchers() {
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
  }

  function cleanupTemplateTimers() {
    if (overridesRenderTimer) {
      clearTimeout(overridesRenderTimer)
    }
  }

  const templateCategories = [
    { id: 'all', name: 'All', icon: 'Squares2X2Icon' },
    { id: 'monthly', name: 'Monthly', icon: 'CalendarDaysIcon' },
    { id: 'photo', name: 'Photo', icon: 'PhotoIcon' },
    { id: 'planner', name: 'Planner', icon: 'DocumentTextIcon' },
    { id: 'year-grid', name: 'Year Grid', icon: 'Squares2X2Icon' },
    { id: 'minimal', name: 'Minimal', icon: 'Squares2X2Icon' },
    { id: 'decorative', name: 'Decorative', icon: 'Squares2X2Icon' },
  ]

  return {
    selectedTemplateCategory,
    templateThumbnails,
    thumbnailsLoading,
    activeTemplateId,
    templateOverrides,
    isApplyingTemplate,
    allTemplates,
    filteredTemplates,
    activeTemplate,
    templateSupportsPhoto,
    templateSupportsNotes,
    marketplaceTemplates,
    marketplaceLoading,
    marketplaceError,
    templateCategories,
    applyTemplate,
    loadTemplateThumbnails,
    loadMarketplaceTemplates,
    resetTemplateOverrides,
    renderTemplateWithOverrides,
    setupTemplateWatchers,
    cleanupTemplateTimers,
  }
}
