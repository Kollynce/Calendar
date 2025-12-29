import { ref, computed, watch, nextTick } from 'vue'
import { useEditorStore } from '@/stores/editor.store'
import {
  calendarTemplates,
  type CalendarTemplate,
  buildTemplateInstance,
  getTemplateDefaultOptions,
  resolveTemplateOptions,
} from '@/data/templates/calendar-templates'
import { renderTemplateOnCanvas, generateTemplateThumbnail } from '@/services/editor/template-renderer'
import { DEFAULT_TEMPLATE_OPTIONS } from '@/config/editor-defaults'
import type { TemplateOptions } from '@/types'
import { PAPER_SIZES } from './useEditorState'

interface RenderOptions {
  recordHistory?: boolean
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

  function getCanvasSizeForTemplate(template: CalendarTemplate) {
    return template.config.layout === 'landscape'
      ? PAPER_SIZES.landscape
      : PAPER_SIZES.portrait
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

  async function applyTemplate(template: CalendarTemplate, applyPlannerPreset: (presetId: 'daily-pastel' | 'daily-minimal') => Promise<void>) {
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

  async function loadTemplateThumbnails(buildPlannerPresetThumbnail: (variant: 'pastel' | 'minimal') => string) {
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

  return {
    selectedTemplateCategory,
    templateThumbnails,
    thumbnailsLoading,
    activeTemplateId,
    templateOverrides,
    isApplyingTemplate,
    filteredTemplates,
    activeTemplate,
    templateSupportsPhoto,
    templateSupportsNotes,
    applyTemplate,
    loadTemplateThumbnails,
    resetTemplateOverrides,
    renderTemplateWithOverrides,
    setupTemplateWatchers,
    cleanupTemplateTimers,
  }
}
