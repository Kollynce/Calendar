import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { pdfExportService } from '@/services/export/pdf.service'
import { imageExportService } from '@/services/export/image.service'
import { useEditorStore } from './editor.store'
import { useAuthStore } from './auth.store'
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
    pages: 'all',
  })

  const exporting = ref(false)
  const progress = ref(0)
  const error = ref<string | null>(null)
  const recentExports = ref<ExportJob[]>([])

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

  // ═══════════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Update export configuration
   */
  function updateConfig(updates: Partial<ExportConfig>): void {
    config.value = { ...config.value, ...updates }
  }

  /**
   * Export current project
   */
  async function exportProject(): Promise<void> {
    if (!editorStore.canvas || !editorStore.project) {
      error.value = 'No project to export'
      return
    }

    exporting.value = true
    progress.value = 0
    error.value = null

    try {
      const projectName = editorStore.project.name || 'calendar'
      const format = config.value.format
      
      let blob: Blob
      let filename: string

      progress.value = 20

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
      trackExport(filename, format, blob.size)

      progress.value = 100
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

    return pdfExportService.exportFromFabricCanvas(
      editorStore.canvas,
      config.value,
      editorStore.project?.name || 'calendar'
    )
  }

  /**
   * Export as PNG
   */
  async function exportAsPNG(): Promise<Blob> {
    if (!editorStore.canvas) throw new Error('Canvas not found')

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
  function trackExport(filename: string, format: string, size: number): void {
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
    error.value = null
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
    error,
    recentExports,
    // Getters
    canExportCMYK,
    canExportHighRes,
    maxDPI,
    needsWatermark,
    availableFormats,
    // Actions
    updateConfig,
    exportProject,
    getEstimatedSize,
    resetState,
    setFormat,
  }
})
