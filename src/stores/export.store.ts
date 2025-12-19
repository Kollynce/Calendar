import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { pdfExportService } from '@/services/export/pdf.service'
import { imageExportService } from '@/services/export/image.service'
import { exportJobsService } from '@/services/export/export-jobs.service'
import { renderTemplateOnCanvas } from '@/services/editor/template-renderer'
import { calendarTemplates, type CalendarTemplate } from '@/data/templates/calendar-templates'
import { useEditorStore } from './editor.store'
import { useAuthStore } from './auth.store'
import { isFeatureEnabled } from '@/config/features'
import type { 
  ExportConfig, 
  ExportFormat, 
  ExportJob,
} from '@/types'
import { QUALITY_DPI } from '@/types/export.types'

export const useExportStore = defineStore('export', () => {
  const editorStore = useEditorStore()
  const authStore = useAuthStore()

  // ═══════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════
  const config = ref<ExportConfig>({
    format: 'pdf',
    quality: 'print',
    colorProfile: 'sRGB',
    paperSize: 'A4',
    orientation: 'portrait',
    bleed: 3,
    cropMarks: false,
    safeZone: false,
    transparent: false,
    pages: 'current',
    includeUserObjectsAllMonths: true,
  })

  const exporting = ref(false)
  const progress = ref(0)
  const statusText = ref<string | null>(null)
  const error = ref<string | null>(null)
  const recentExports = ref<ExportJob[]>([])

  const lastServerPdfJobId = ref<string | null>(null)

  async function yieldToUI(): Promise<void> {
    await new Promise<void>((resolve) => {
      const raf = typeof window !== 'undefined' ? window.requestAnimationFrame : undefined
      if (raf) {
        raf(() => resolve())
        return
      }
      setTimeout(resolve, 0)
    })
  }

  function normalizeMonthList(months: number[]): number[] {
    const normalized = months
      .filter((m) => Number.isFinite(m))
      .map((m) => Math.round(m))
      .filter((m) => m >= 1 && m <= 12)

    return Array.from(new Set(normalized)).sort((a, b) => a - b)
  }

  // ═══════════════════════════════════════════════════════════════
  // GETTERS
  // ═══════════════════════════════════════════════════════════════
  const canExportCMYK = computed(() => {
    const tier = authStore.subscriptionTier
    return tier === 'business' || tier === 'enterprise'
  })

  const canExportHighRes = computed(() => {
    return authStore.isPro
  })

  const maxDPI = computed(() => {
    if (!authStore.isAuthenticated) return 72
    return authStore.tierLimits.exportDpi
  })

  const needsWatermark = computed(() => {
    return authStore.tierLimits.watermark
  })

  const availableFormats = computed<ExportFormat[]>(() => {
    const formats: ExportFormat[] = ['png', 'jpg']
    
    if (authStore.isPro) {
      formats.push('pdf', 'svg')
    }
    
    if (canExportCMYK.value) {
      formats.push('tiff')
    }
    
    return formats
  })

  const canRetryLastServerExport = computed(() => {
    if (import.meta.env.VITE_DEMO_MODE === 'true') return false
    if (!isFeatureEnabled('serverExports')) return false
    if (!authStore.isAuthenticated) return false
    if (config.value.format !== 'pdf') return false
    if (config.value.pages !== 'current') return false
    if (!editorStore.project?.id) return false
    if (!lastServerPdfJobId.value) return false
    return Boolean(error.value)
  })

  // ═══════════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Update export configuration
   */
  function updateConfig(updates: Partial<ExportConfig>): void {
    const next = { ...config.value, ...updates }

    if (typeof next.bleed === 'number' && next.bleed < 0) {
      next.bleed = 0
    }

    if (!availableFormats.value.includes(next.format)) {
      const fallback = availableFormats.value[0]
      if (fallback) next.format = fallback
    }

    const dpi = QUALITY_DPI[next.quality]
    if (dpi > maxDPI.value) {
      next.quality = 'screen'
    }

    if (next.format !== 'pdf' && next.pages !== 'current') {
      next.pages = 'current'
    }

    if (next.format === 'pdf' && Array.isArray(next.pages)) {
      const normalized = normalizeMonthList(next.pages)
      next.pages = normalized.length ? normalized : 'current'
    }

    config.value = next
  }

  /**
   * Export current project
   */
  async function exportProject(): Promise<void> {
    if (!editorStore.canvas || !editorStore.project) {
      error.value = 'No project to export'
      return
    }

    if (!availableFormats.value.includes(config.value.format)) {
      error.value = 'This export format is not available on your current plan'
      return
    }

    const requestedDpi = QUALITY_DPI[config.value.quality]
    if (requestedDpi > maxDPI.value) {
      error.value = 'Upgrade your plan to export at this quality'
      return
    }

    exporting.value = true
    progress.value = 0
    statusText.value = 'Preparing export…'
    error.value = null

    try {
      const projectName = editorStore.project.name || 'calendar'
      const format = config.value.format
      
      let blob: Blob
      let filename: string

      progress.value = 20
      statusText.value = 'Starting export…'
      await yieldToUI()

      switch (format) {
        case 'pdf':
          blob = await exportAsPDF()
          filename = imageExportService.generateFilename(projectName, 'pdf')
          break
        
        case 'png':
          blob = await exportAsPNG()
          filename = imageExportService.generateFilename(projectName, 'png')
          break
        
        case 'jpg':
          blob = await exportAsJPEG()
          filename = imageExportService.generateFilename(projectName, 'jpg')
          break
        
        case 'svg':
          const svgString = exportAsSVG()
          blob = new Blob([svgString], { type: 'image/svg+xml' })
          filename = imageExportService.generateFilename(projectName, 'svg')
          break
        
        default:
          throw new Error(`Unsupported format: ${format}`)
      }

      progress.value = 80

      // Add watermark if needed
      if (needsWatermark.value && format !== 'svg') {
        blob = await addWatermark(blob, format)
      }

      progress.value = 90

      // Download file
      imageExportService.downloadBlob(blob, filename)

      // Track export
      trackExport(filename)

      progress.value = 100
      statusText.value = null
    } catch (e: any) {
      error.value = e.message || 'Export failed'
      console.error('Export error:', e)
    } finally {
      exporting.value = false
    }
  }

  /**
   * Export as PDF
   */
  async function exportAsPDF(): Promise<Blob> {
    if (!editorStore.canvas) throw new Error('Canvas not found')

    const canUseServerExports =
      import.meta.env.VITE_DEMO_MODE !== 'true' &&
      isFeatureEnabled('serverExports') &&
      authStore.isAuthenticated &&
      Boolean(editorStore.project?.id)

    if (canUseServerExports && config.value.pages === 'current') {
      const projectId = editorStore.project!.id
      statusText.value = 'Queued server export…'
      progress.value = 10
      await yieldToUI()

      const jobId = await exportJobsService.createPdfExportJob(projectId)
      lastServerPdfJobId.value = jobId

      const { downloadUrl } = await exportJobsService.waitForJobCompletion(jobId, {
        onProgress: (jobProgress, status, stage) => {
          const normalized = Math.max(0, Math.min(100, Math.round(jobProgress)))
          progress.value = Math.max(progress.value, normalized)
          statusText.value =
            stage === 'load_project'
              ? 'Loading project…'
              : stage === 'prepare_data'
                ? 'Preparing export…'
                : stage === 'render_pdf'
                  ? 'Rendering PDF…'
                  : stage === 'upload'
                    ? 'Uploading PDF…'
                    : stage === 'finalize'
                      ? 'Finalizing export…'
                      : status === 'queued'
                        ? 'Queued server export…'
                        : status === 'running'
                          ? 'Generating PDF on server…'
                          : status === 'completed'
                            ? 'Downloading PDF…'
                            : status === 'failed'
                              ? 'Export failed'
                              : 'Exporting…'
        },
      })

      statusText.value = 'Downloading PDF…'
      progress.value = Math.max(progress.value, 90)
      await yieldToUI()

      const response = await fetch(downloadUrl)
      if (!response.ok) {
        throw new Error('Failed to download exported PDF')
      }
      return await response.blob()
    }

    if (config.value.pages === 'all') {
      return exportAsYearPDF()
    }

    if (Array.isArray(config.value.pages)) {
      const months = normalizeMonthList(config.value.pages)
      if (!months.length) {
        throw new Error('Select at least one month to export')
      }
      return exportAsYearPDF(months)
    }

    return pdfExportService.exportFromFabricCanvas(
      editorStore.canvas,
      config.value,
      editorStore.project?.name || 'calendar'
    )
  }

  function getTemplateForExport(): CalendarTemplate {
    const templateId = editorStore.project?.templateId
    if (!templateId) {
      throw new Error('Select a template to export all months')
    }
    const template = calendarTemplates.find((t) => t.id === templateId)
    if (!template) {
      throw new Error('Selected template not found')
    }
    return template
  }

  function buildCustomizedTemplate(template: CalendarTemplate): CalendarTemplate {
    const options = editorStore.project?.config.templateOptions
    return {
      ...template,
      preview: {
        ...template.preview,
        hasPhotoArea: options?.hasPhotoArea ?? template.preview.hasPhotoArea,
        hasNotesArea: options?.hasNotesArea ?? template.preview.hasNotesArea,
      },
      config: {
        ...template.config,
        highlightToday: options?.highlightToday ?? template.config.highlightToday,
        highlightWeekends: options?.highlightWeekends ?? template.config.highlightWeekends,
      },
    }
  }

  async function exportAsYearPDF(months?: number[]): Promise<Blob> {
    if (!editorStore.canvas || !editorStore.project) throw new Error('Canvas not found')

    const year = editorStore.project.config.year ?? new Date().getFullYear()
    const baseTemplate = getTemplateForExport()
    const template = buildCustomizedTemplate(baseTemplate)

    const exportConfig: ExportConfig = {
      ...config.value,
      orientation: baseTemplate.config.layout === 'landscape' ? 'landscape' : 'portrait',
    }

    const originalState = editorStore.getCanvasState()
    if (!originalState) throw new Error('Canvas state not found')

    const pdf = pdfExportService.createPDFDocument(exportConfig)
    const preserveUserObjects = config.value.includeUserObjectsAllMonths !== false
    const monthList = months?.length ? normalizeMonthList(months) : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    const total = monthList.length

    try {
      for (let i = 0; i < total; i++) {
        const month = monthList[i]
        if (!month) continue
        statusText.value = `Rendering month ${i + 1}/${total}…`
        progress.value = 20 + Math.round((i / total) * 60)
        await yieldToUI()
        await renderTemplateOnCanvas(
          editorStore.canvas,
          template,
          { year, month },
          { preserveUserObjects },
        )

        statusText.value = `Generating PDF page ${i + 1}/${total}…`
        await yieldToUI()
        pdfExportService.appendFabricCanvasPage(pdf, editorStore.canvas, exportConfig, i > 0)
        await yieldToUI()
      }

      progress.value = 80
      statusText.value = 'Finalizing PDF…'
      await yieldToUI()
      return pdf.output('blob')
    } finally {
      statusText.value = 'Restoring editor…'
      await yieldToUI()
      await editorStore.canvas.loadFromJSON(originalState).then(() => {
        editorStore.canvas?.renderAll()
      })
      statusText.value = null
    }
  }

  /**
   * Export as PNG
   */
  async function exportAsPNG(): Promise<Blob> {
    if (!editorStore.canvas) throw new Error('Canvas not found')

    const canUseServerExports =
      import.meta.env.VITE_DEMO_MODE !== 'true' &&
      isFeatureEnabled('serverExports') &&
      authStore.isAuthenticated &&
      Boolean(editorStore.project?.id)

    if (canUseServerExports) {
      const projectId = editorStore.project!.id
      statusText.value = 'Queued server PNG export…'
      progress.value = 10
      await yieldToUI()

      const jobId = await exportJobsService.createPngExportJob(projectId)

      const { downloadUrl } = await exportJobsService.waitForJobCompletion(jobId, {
        onProgress: (jobProgress, status, stage) => {
          const normalized = Math.max(0, Math.min(100, Math.round(jobProgress)))
          progress.value = Math.max(progress.value, normalized)
          statusText.value =
            stage === 'load_project'
              ? 'Loading project…'
              : stage === 'prepare_data'
                ? 'Preparing export…'
                : stage === 'render_pdf'
                  ? 'Rendering PNG…'
                  : stage === 'upload'
                    ? 'Uploading PNG…'
                    : stage === 'finalize'
                      ? 'Finalizing export…'
                      : status === 'queued'
                        ? 'Queued server PNG export…'
                        : status === 'running'
                          ? 'Generating PNG on server…'
                          : status === 'completed'
                            ? 'Downloading PNG…'
                            : status === 'failed'
                              ? 'Export failed'
                              : 'Exporting…'
        },
      })

      statusText.value = 'Downloading PNG…'
      progress.value = Math.max(progress.value, 90)
      await yieldToUI()

      const response = await fetch(downloadUrl)
      if (!response.ok) {
        throw new Error('Failed to download exported PNG')
      }
      return await response.blob()
    }

    return imageExportService.exportFabricToPNG(
      editorStore.canvas,
      config.value
    )
  }

  /**
   * Export as JPEG
   */
  async function exportAsJPEG(): Promise<Blob> {
    if (!editorStore.canvas) throw new Error('Canvas not found')

    const canUseServerExports =
      import.meta.env.VITE_DEMO_MODE !== 'true' &&
      isFeatureEnabled('serverExports') &&
      authStore.isAuthenticated &&
      Boolean(editorStore.project?.id)

    if (canUseServerExports) {
      const projectId = editorStore.project!.id
      statusText.value = 'Queued server JPG export…'
      progress.value = 10
      await yieldToUI()

      const jobId = await exportJobsService.createJpgExportJob(projectId)

      const { downloadUrl } = await exportJobsService.waitForJobCompletion(jobId, {
        onProgress: (jobProgress, status, stage) => {
          const normalized = Math.max(0, Math.min(100, Math.round(jobProgress)))
          progress.value = Math.max(progress.value, normalized)
          statusText.value =
            stage === 'load_project'
              ? 'Loading project…'
              : stage === 'prepare_data'
                ? 'Preparing export…'
                : stage === 'render_pdf'
                  ? 'Rendering JPG…'
                  : stage === 'upload'
                    ? 'Uploading JPG…'
                    : stage === 'finalize'
                      ? 'Finalizing export…'
                      : status === 'queued'
                        ? 'Queued server JPG export…'
                        : status === 'running'
                          ? 'Generating JPG on server…'
                          : status === 'completed'
                            ? 'Downloading JPG…'
                            : status === 'failed'
                              ? 'Export failed'
                              : 'Exporting…'
        },
      })

      statusText.value = 'Downloading JPG…'
      progress.value = Math.max(progress.value, 90)
      await yieldToUI()

      const response = await fetch(downloadUrl)
      if (!response.ok) {
        throw new Error('Failed to download exported JPG')
      }
      return await response.blob()
    }

    return imageExportService.exportFabricToJPEG(
      editorStore.canvas,
      config.value
    )
  }

  /**
   * Export as SVG
   */
  function exportAsSVG(): string {
    if (!editorStore.canvas) throw new Error('Canvas not found')
    return imageExportService.exportToSVG(editorStore.canvas)
  }

  /**
   * Add watermark to exported image
   */
  async function addWatermark(blob: Blob, format: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }

        // Draw original image
        ctx.drawImage(img, 0, 0)

        // Add watermark
        ctx.globalAlpha = 0.3
        ctx.fillStyle = '#000000'
        ctx.font = `${Math.max(img.width / 20, 24)}px Arial`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        // Rotate and draw watermark diagonally
        ctx.save()
        ctx.translate(img.width / 2, img.height / 2)
        ctx.rotate(-Math.PI / 4)
        ctx.fillText('CALENDAR CREATOR', 0, 0)
        ctx.restore()

        // Convert back to blob
        canvas.toBlob(
          (newBlob) => {
            if (newBlob) {
              resolve(newBlob)
            } else {
              reject(new Error('Failed to create watermarked blob'))
            }
          },
          format === 'png' ? 'image/png' : 'image/jpeg',
          0.92
        )
      }
      img.onerror = () => reject(new Error('Failed to load image for watermark'))
      img.src = URL.createObjectURL(blob)
    })
  }

  /**
   * Track export for analytics
   */
  function trackExport(filename: string): void {
    const job: ExportJob = {
      id: `export-${Date.now()}`,
      projectId: editorStore.project?.id || '',
      userId: authStore.user?.id || '',
      config: { ...config.value },
      status: 'completed',
      progress: 100,
      outputUrl: filename,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    }

    recentExports.value.unshift(job)
    
    // Keep only last 10 exports
    if (recentExports.value.length > 10) {
      recentExports.value.pop()
    }

    // Analytics event (implement with Firebase Analytics)
    // analytics.logEvent('export_completed', { format, size, quality: config.value.quality })
  }

  /**
   * Get estimated file size
   */
  function getEstimatedSize(): string {
    const { quality, format } = config.value
    
    // Rough estimates based on format and quality
    const baseSize: Record<ExportFormat, number> = {
      pdf: 500,
      png: 2000,
      jpg: 800,
      svg: 100,
      tiff: 5000,
    }

    const qualityMultiplier = {
      screen: 1,
      print: 4,
      press: 6,
    }

    const sizeKB = (baseSize[format] || 1000) * qualityMultiplier[quality]
    
    if (sizeKB > 1024) {
      return `~${(sizeKB / 1024).toFixed(1)} MB`
    }
    return `~${sizeKB} KB`
  }

  /**
   * Reset export state
   */
  function resetState(): void {
    exporting.value = false
    progress.value = 0
    statusText.value = null
    error.value = null
  }

  async function retryLastServerPdfExport(): Promise<void> {
    if (!editorStore.project) {
      error.value = 'No project to export'
      return
    }

    const jobId = String(lastServerPdfJobId.value || '').trim()
    if (!jobId) {
      error.value = 'No server export job to retry'
      return
    }

    exporting.value = true
    progress.value = 0
    statusText.value = 'Retrying server export…'
    error.value = null

    try {
      await exportJobsService.retryExportJob(jobId)

      const { downloadUrl } = await exportJobsService.waitForJobCompletion(jobId, {
        onProgress: (jobProgress, status, stage) => {
          const normalized = Math.max(0, Math.min(100, Math.round(jobProgress)))
          progress.value = Math.max(progress.value, normalized)
          statusText.value =
            stage === 'load_project'
              ? 'Loading project…'
              : stage === 'prepare_data'
                ? 'Preparing export…'
                : stage === 'render_pdf'
                  ? 'Rendering PDF…'
                  : stage === 'upload'
                    ? 'Uploading PDF…'
                    : stage === 'finalize'
                      ? 'Finalizing export…'
                      : status === 'queued'
                        ? 'Queued server export…'
                        : status === 'running'
                          ? 'Generating PDF on server…'
                          : status === 'completed'
                            ? 'Downloading PDF…'
                            : status === 'failed'
                              ? 'Export failed'
                              : 'Exporting…'
        },
      })

      statusText.value = 'Downloading PDF…'
      progress.value = Math.max(progress.value, 90)
      await yieldToUI()

      const response = await fetch(downloadUrl)
      if (!response.ok) {
        throw new Error('Failed to download exported PDF')
      }

      const blob = await response.blob()
      const filename = imageExportService.generateFilename(editorStore.project.name || 'calendar', 'pdf')
      imageExportService.downloadBlob(blob, filename)
      trackExport(filename)

      progress.value = 100
      statusText.value = null
    } catch (e: any) {
      error.value = e.message || 'Export failed'
      console.error('Export retry error:', e)
    } finally {
      exporting.value = false
    }
  }

  /**
   * Set format and adjust quality if needed
   */
  function setFormat(format: ExportFormat): void {
    config.value.format = format
    
    // Disable transparency for non-PNG formats
    if (format !== 'png') {
      config.value.transparent = false
    }
  }

  return {
    // State
    config,
    exporting,
    progress,
    statusText,
    error,
    recentExports,
    // Getters
    canExportCMYK,
    canExportHighRes,
    maxDPI,
    needsWatermark,
    availableFormats,
    canRetryLastServerExport,
    // Actions
    updateConfig,
    exportProject,
    getEstimatedSize,
    resetState,
    setFormat,
    retryLastServerPdfExport,
  }
})
