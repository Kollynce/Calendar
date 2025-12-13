# Phase 4: Export & Print Production System

## Current Implementation (Fabric-first)

The export pipeline is implemented end-to-end using the Fabric editor canvas as the source of truth.

- **UI**: `src/components/export/ExportModal.vue`
  - Format selection with tier gating
  - Print settings UI wiring: bleed, crop marks, safe zone
  - Pages selection for PDF:
    - current page
    - all months (Jan–Dec)
    - custom month range (e.g. Jan–Jun)
  - Multi-page option: include/exclude user-added objects across months
  - Live progress and status feedback during long-running exports

- **State / orchestration**: `src/stores/export.store.ts`
  - Central `ExportConfig` + tier enforcement
  - `exportProject()` drives real export and download
  - Multi-page PDF export renders template pages onto the Fabric canvas and appends them into a single PDF
  - Custom month selection uses `pages: number[]`

- **PDF rendering**: `src/services/export/pdf.service.ts`
  - Single-page export uses Fabric canvas rasterization
  - Multi-page export uses a single jsPDF document and appends pages per month
  - Export uses PNG rasterization to preserve thin/light strokes (e.g. photo frame)
  - Orientation is inferred from the Fabric canvas dimensions for the single-page export

Notes:
- Some sections below describe an earlier html2canvas/DOM-based approach and are kept for historical reference.
  The current implementation prefers Fabric-first export for correctness and consistency.

## 1. Export Service

```typescript
// src/services/export/pdf.service.ts
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { saveAs } from 'file-saver'
import type { 
  ExportConfig, 
  ExportFormat, 
  PaperSize,
  ExportQuality,
} from '@/types'
import { PAPER_DIMENSIONS, QUALITY_DPI } from '@/types/export.types'

class PDFExportService {
  /**
   * Export canvas to PDF
   */
  async exportToPDF(
    canvas: HTMLCanvasElement | HTMLElement,
    config: ExportConfig,
    filename: string
  ): Promise<Blob> {
    const { paperSize, orientation, bleed, cropMarks, quality } = config
    
    // Get paper dimensions
    const dimensions = this.getPaperDimensions(paperSize, orientation)
    const dpi = QUALITY_DPI[quality]
    
    // Calculate pixel dimensions
    const widthPx = this.mmToPixels(dimensions.width + (bleed * 2), dpi)
    const heightPx = this.mmToPixels(dimensions.height + (bleed * 2), dpi)

    // Create high-resolution canvas
    const exportCanvas = await html2canvas(canvas as HTMLElement, {
      scale: dpi / 72, // Scale for target DPI
      useCORS: true,
      allowTaint: false,
      backgroundColor: config.transparent ? null : '#ffffff',
      width: widthPx,
      height: heightPx,
    })

    // Create PDF
    const pdf = new jsPDF({
      orientation: orientation === 'landscape' ? 'l' : 'p',
      unit: 'mm',
      format: [dimensions.width + (bleed * 2), dimensions.height + (bleed * 2)],
    })

    // Add canvas image to PDF
    const imgData = exportCanvas.toDataURL('image/jpeg', 0.95)
    pdf.addImage(
      imgData,
      'JPEG',
      0,
      0,
      dimensions.width + (bleed * 2),
      dimensions.height + (bleed * 2)
    )

    // Add crop marks if enabled
    if (cropMarks) {
      this.addCropMarks(pdf, dimensions, bleed)
    }

    // Add bleed/safe zone indicators
    if (config.safeZone) {
      this.addSafeZoneMarks(pdf, dimensions, bleed)
    }

    // Generate blob
    const pdfBlob = pdf.output('blob')
    return pdfBlob
  }

  /**
   * Export multi-page PDF (e.g., monthly calendar)
   */
  async exportMultiPagePDF(
    pages: HTMLElement[],
    config: ExportConfig,
    filename: string
  ): Promise<Blob> {
    const { paperSize, orientation, bleed, cropMarks, quality } = config
    const dimensions = this.getPaperDimensions(paperSize, orientation)
    const dpi = QUALITY_DPI[quality]

    const pdf = new jsPDF({
      orientation: orientation === 'landscape' ? 'l' : 'p',
      unit: 'mm',
      format: [dimensions.width + (bleed * 2), dimensions.height + (bleed * 2)],
    })

    for (let i = 0; i < pages.length; i++) {
      if (i > 0) {
        pdf.addPage()
      }

      const canvas = await html2canvas(pages[i], {
        scale: dpi / 72,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
      })

      const imgData = canvas.toDataURL('image/jpeg', 0.95)
      pdf.addImage(
        imgData,
        'JPEG',
        0,
        0,
        dimensions.width + (bleed * 2),
        dimensions.height + (bleed * 2)
      )

      if (cropMarks) {
        this.addCropMarks(pdf, dimensions, bleed)
      }
    }

    return pdf.output('blob')
  }

  /**
   * Add crop marks to PDF
   */
  private addCropMarks(
    pdf: jsPDF,
    dimensions: { width: number; height: number },
    bleed: number
  ): void {
    const markLength = 5 // mm
    const markOffset = 2 // mm from bleed edge

    pdf.setDrawColor(0, 0, 0)
    pdf.setLineWidth(0.25)

    // Top-left corner
    pdf.line(bleed - markOffset - markLength, bleed, bleed - markOffset, bleed)
    pdf.line(bleed, bleed - markOffset - markLength, bleed, bleed - markOffset)

    // Top-right corner
    const right = bleed + dimensions.width
    pdf.line(right + markOffset, bleed, right + markOffset + markLength, bleed)
    pdf.line(right, bleed - markOffset - markLength, right, bleed - markOffset)

    // Bottom-left corner
    const bottom = bleed + dimensions.height
    pdf.line(bleed - markOffset - markLength, bottom, bleed - markOffset, bottom)
    pdf.line(bleed, bottom + markOffset, bleed, bottom + markOffset + markLength)

    // Bottom-right corner
    pdf.line(right + markOffset, bottom, right + markOffset + markLength, bottom)
    pdf.line(right, bottom + markOffset, right, bottom + markOffset + markLength)
  }

  /**
   * Add safe zone indicators
   */
  private addSafeZoneMarks(
    pdf: jsPDF,
    dimensions: { width: number; height: number },
    bleed: number
  ): void {
    const safeMargin = 5 // mm inside trim edge

    pdf.setDrawColor(255, 0, 0)
    pdf.setLineWidth(0.1)
    pdf.setLineDashPattern([2, 2], 0)

    pdf.rect(
      bleed + safeMargin,
      bleed + safeMargin,
      dimensions.width - (safeMargin * 2),
      dimensions.height - (safeMargin * 2)
    )

    pdf.setLineDashPattern([], 0)
  }

  /**
   * Get paper dimensions based on size and orientation
   */
  private getPaperDimensions(
    size: PaperSize,
    orientation: 'portrait' | 'landscape'
  ): { width: number; height: number } {
    if (size === 'custom') {
      return { width: 210, height: 297 } // Default to A4
    }

    const dims = PAPER_DIMENSIONS[size]
    let width = dims.unit === 'in' ? dims.width * 25.4 : dims.width
    let height = dims.unit === 'in' ? dims.height * 25.4 : dims.height

    if (orientation === 'landscape') {
      [width, height] = [height, width]
    }

    return { width, height }
  }

  /**
   * Convert mm to pixels at given DPI
   */
  private mmToPixels(mm: number, dpi: number): number {
    return Math.round((mm / 25.4) * dpi)
  }
}

export const pdfExportService = new PDFExportService()
```

---

## 2. Image Export Service

```typescript
// src/services/export/image.service.ts
import html2canvas from 'html2canvas'
import { saveAs } from 'file-saver'
import type { ExportConfig, ExportFormat } from '@/types'
import { QUALITY_DPI } from '@/types/export.types'

class ImageExportService {
  /**
   * Export to PNG
   */
  async exportToPNG(
    element: HTMLElement,
    config: ExportConfig,
    filename: string
  ): Promise<Blob> {
    const canvas = await this.renderToCanvas(element, config)
    
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to create PNG blob'))
          }
        },
        'image/png'
      )
    })
  }

  /**
   * Export to JPEG
   */
  async exportToJPEG(
    element: HTMLElement,
    config: ExportConfig,
    filename: string,
    quality: number = 0.92
  ): Promise<Blob> {
    const canvas = await this.renderToCanvas(element, config)
    
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to create JPEG blob'))
          }
        },
        'image/jpeg',
        quality
      )
    })
  }

  /**
   * Export to SVG (from Fabric.js canvas)
   */
  exportToSVG(fabricCanvas: any): string {
    return fabricCanvas.toSVG({
      suppressPreamble: false,
      viewBox: {
        x: 0,
        y: 0,
        width: fabricCanvas.width,
        height: fabricCanvas.height,
      },
    })
  }

  /**
   * Render element to canvas with configuration
   */
  private async renderToCanvas(
    element: HTMLElement,
    config: ExportConfig
  ): Promise<HTMLCanvasElement> {
    const dpi = QUALITY_DPI[config.quality]
    const scale = dpi / 72

    return html2canvas(element, {
      scale,
      useCORS: true,
      allowTaint: false,
      backgroundColor: config.transparent ? null : '#ffffff',
      logging: false,
      imageTimeout: 15000,
      onclone: (clonedDoc) => {
        // Remove any elements that shouldn't be exported
        const elementsToRemove = clonedDoc.querySelectorAll('.no-export')
        elementsToRemove.forEach((el) => el.remove())
      },
    })
  }

  /**
   * Download blob as file
   */
  downloadBlob(blob: Blob, filename: string): void {
    saveAs(blob, filename)
  }

  /**
   * Generate safe filename
   */
  generateFilename(
    baseName: string,
    format: ExportFormat,
    suffix?: string
  ): string {
    // Sanitize filename
    const sanitized = baseName
      .replace(/[^a-z0-9]/gi, '_')
      .replace(/_+/g, '_')
      .toLowerCase()

    const timestamp = new Date().toISOString().slice(0, 10)
    const suffixStr = suffix ? `_${suffix}` : ''

    return `${sanitized}${suffixStr}_${timestamp}.${format}`
  }
}

export const imageExportService = new ImageExportService()
```

---

## 3. Export Store

```typescript
// src/stores/export.store.ts
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
  PaperSize,
  ExportQuality,
} from '@/types'

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
          blob = await exportAsPDF(projectName)
          filename = imageExportService.generateFilename(projectName, 'pdf')
          break
        
        case 'png':
          blob = await exportAsPNG(projectName)
          filename = imageExportService.generateFilename(projectName, 'png')
          break
        
        case 'jpg':
          blob = await exportAsJPEG(projectName)
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
  async function exportAsPDF(projectName: string): Promise<Blob> {
    const canvasEl = editorStore.canvas?.wrapperEl?.querySelector('canvas')
    if (!canvasEl) throw new Error('Canvas not found')

    return pdfExportService.exportToPDF(
      canvasEl,
      config.value,
      projectName
    )
  }

  /**
   * Export as PNG
   */
  async function exportAsPNG(projectName: string): Promise<Blob> {
    const canvasEl = editorStore.canvas?.wrapperEl
    if (!canvasEl) throw new Error('Canvas not found')

    return imageExportService.exportToPNG(
      canvasEl as HTMLElement,
      config.value,
      projectName
    )
  }

  /**
   * Export as JPEG
   */
  async function exportAsJPEG(projectName: string): Promise<Blob> {
    const canvasEl = editorStore.canvas?.wrapperEl
    if (!canvasEl) throw new Error('Canvas not found')

    return imageExportService.exportToJPEG(
      canvasEl as HTMLElement,
      config.value,
      projectName
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
    const { quality, format, paperSize } = config.value
    const dpi = QUALITY_DPI[quality]
    
    // Rough estimates based on format and quality
    const baseSize = {
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
  }
})
```

---

## 4. Export Panel Component

```vue
<!-- src/components/export/ExportPanel.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useExportStore } from '@/stores/export.store'
import { useAuthStore } from '@/stores/auth.store'
import FormatSelector from './FormatSelector.vue'
import QualitySelector from './QualitySelector.vue'
import PrintSettings from './PrintSettings.vue'
import { 
  DocumentArrowDownIcon,
  LockClosedIcon,
  SparklesIcon,
} from '@heroicons/vue/24/outline'

const exportStore = useExportStore()
const authStore = useAuthStore()

const { 
  config, 
  exporting, 
  progress, 
  error,
  availableFormats,
  canExportHighRes,
  needsWatermark,
} = storeToRefs(exportStore)

const isPDF = computed(() => config.value.format === 'pdf')
const estimatedSize = computed(() => exportStore.getEstimatedSize())

function handleExport(): void {
  exportStore.exportProject()
}
</script>

<template>
  <div class="export-panel p-6 space-y-6">
    <header>
      <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
        Export Calendar
      </h2>
      <p class="mt-1 text-sm text-gray-500">
        Download your calendar in various formats
      </p>
    </header>

    <!-- Upgrade Banner (for free users) -->
    <div 
      v-if="needsWatermark"
      class="bg-gradient-to-r from-primary-500 to-accent-500 rounded-xl p-4 text-white"
    >
      <div class="flex items-start gap-3">
        <SparklesIcon class="w-6 h-6 flex-shrink-0" />
        <div>
          <h3 class="font-semibold">Upgrade to Pro</h3>
          <p class="text-sm opacity-90 mt-1">
            Remove watermarks, export in high resolution, and unlock PDF exports.
          </p>
          <router-link 
            to="/settings/billing"
            class="inline-block mt-2 px-4 py-1.5 bg-white text-primary-600 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
          >
            Upgrade Now
          </router-link>
        </div>
      </div>
    </div>

    <!-- Format Selection -->
    <div class="space-y-3">
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Format
      </label>
      <FormatSelector
        v-model="config.format"
        :available-formats="availableFormats"
      />
    </div>

    <!-- Quality Selection -->
    <div class="space-y-3">
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Quality
      </label>
      <QualitySelector
        v-model="config.quality"
        :can-export-high-res="canExportHighRes"
      />
    </div>

    <!-- PDF-specific Settings -->
    <PrintSettings 
      v-if="isPDF"
      v-model:paper-size="config.paperSize"
      v-model:orientation="config.orientation"
      v-model:bleed="config.bleed"
      v-model:crop-marks="config.cropMarks"
      v-model:safe-zone="config.safeZone"
    />

    <!-- Transparency (PNG only) -->
    <div 
      v-if="config.format === 'png'"
      class="flex items-center justify-between"
    >
      <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
        Transparent Background
      </label>
      <button
        type="button"
        role="switch"
        :aria-checked="config.transparent"
        class="toggle"
        :class="{ 'toggle-on': config.transparent }"
        @click="config.transparent = !config.transparent"
      >
        <span class="toggle-thumb" />
      </button>
    </div>

    <!-- Estimated Size -->
    <div class="flex items-center justify-between py-3 border-t border-gray-200 dark:border-gray-700">
      <span class="text-sm text-gray-500">Estimated file size</span>
      <span class="text-sm font-medium text-gray-900 dark:text-white">
        {{ estimatedSize }}
      </span>
    </div>

    <!-- Watermark Warning -->
    <div 
      v-if="needsWatermark"
      class="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-700 dark:text-amber-400"
    >
      <LockClosedIcon class="w-5 h-5 flex-shrink-0" />
      <span class="text-sm">
        Free exports include a watermark. 
        <router-link to="/settings/billing" class="underline">Upgrade</router-link> 
        to remove.
      </span>
    </div>

    <!-- Error Message -->
    <div 
      v-if="error"
      class="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-700 dark:text-red-400 text-sm"
    >
      {{ error }}
    </div>

    <!-- Export Button -->
    <button
      class="w-full btn btn-primary btn-lg flex items-center justify-center gap-2"
      :disabled="exporting"
      @click="handleExport"
    >
      <template v-if="exporting">
        <svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span>Exporting... {{ progress }}%</span>
      </template>
      <template v-else>
        <DocumentArrowDownIcon class="w-5 h-5" />
        <span>Export {{ config.format.toUpperCase() }}</span>
      </template>
    </button>

    <!-- Progress Bar -->
    <div 
      v-if="exporting"
      class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden"
    >
      <div 
        class="bg-primary-600 h-full transition-all duration-300"
        :style="{ width: `${progress}%` }"
      />
    </div>
  </div>
</template>

<style scoped>
.btn {
  @apply px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed;
}

.btn-primary {
  @apply bg-primary-600 text-white hover:bg-primary-700;
}

.btn-lg {
  @apply px-6 py-3 text-base;
}

.toggle {
  @apply relative inline-flex h-6 w-11 items-center rounded-full 
         bg-gray-200 dark:bg-gray-700 transition-colors;
}

.toggle-on {
  @apply bg-primary-600;
}

.toggle-thumb {
  @apply inline-block h-4 w-4 transform rounded-full bg-white 
         transition-transform translate-x-1;
}

.toggle-on .toggle-thumb {
  @apply translate-x-6;
}
</style>
```

---

## 5. Print Settings Component

```vue
<!-- src/components/export/PrintSettings.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import type { PaperSize } from '@/types'

const props = defineProps<{
  paperSize: PaperSize
  orientation: 'portrait' | 'landscape'
  bleed: number
  cropMarks: boolean
  safeZone: boolean
}>()

const emit = defineEmits<{
  (e: 'update:paperSize', value: PaperSize): void
  (e: 'update:orientation', value: 'portrait' | 'landscape'): void
  (e: 'update:bleed', value: number): void
  (e: 'update:cropMarks', value: boolean): void
  (e: 'update:safeZone', value: boolean): void
}>()

const paperSizes: { value: PaperSize; label: string; dimensions: string }[] = [
  { value: 'A4', label: 'A4', dimensions: '210 × 297 mm' },
  { value: 'A3', label: 'A3', dimensions: '297 × 420 mm' },
  { value: 'A2', label: 'A2', dimensions: '420 × 594 mm' },
  { value: 'Letter', label: 'Letter', dimensions: '8.5 × 11 in' },
  { value: 'Legal', label: 'Legal', dimensions: '8.5 × 14 in' },
  { value: 'Tabloid', label: 'Tabloid', dimensions: '11 × 17 in' },
]

const bleedOptions = [
  { value: 0, label: 'None' },
  { value: 3, label: '3mm (Standard)' },
  { value: 5, label: '5mm' },
  { value: 6, label: '6mm (0.25in)' },
]
</script>

<template>
  <div class="print-settings space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
    <h3 class="font-medium text-gray-900 dark:text-white flex items-center gap-2">
      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
      </svg>
      Print Settings
    </h3>

    <!-- Paper Size -->
    <div class="space-y-2">
      <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
        Paper Size
      </label>
      <select
        :value="paperSize"
        class="select-input"
        @change="emit('update:paperSize', ($event.target as HTMLSelectElement).value as PaperSize)"
      >
        <option 
          v-for="size in paperSizes" 
          :key="size.value" 
          :value="size.value"
        >
          {{ size.label }} ({{ size.dimensions }})
        </option>
      </select>
    </div>

    <!-- Orientation -->
    <div class="space-y-2">
      <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
        Orientation
      </label>
      <div class="flex gap-2">
        <button
          type="button"
          class="orientation-btn"
          :class="{ active: orientation === 'portrait' }"
          @click="emit('update:orientation', 'portrait')"
        >
          <svg class="w-6 h-8" viewBox="0 0 24 32" fill="currentColor">
            <rect x="2" y="2" width="20" height="28" rx="2" fill="none" stroke="currentColor" stroke-width="2" />
          </svg>
          <span>Portrait</span>
        </button>
        <button
          type="button"
          class="orientation-btn"
          :class="{ active: orientation === 'landscape' }"
          @click="emit('update:orientation', 'landscape')"
        >
          <svg class="w-8 h-6" viewBox="0 0 32 24" fill="currentColor">
            <rect x="2" y="2" width="28" height="20" rx="2" fill="none" stroke="currentColor" stroke-width="2" />
          </svg>
          <span>Landscape</span>
        </button>
      </div>
    </div>

    <!-- Bleed -->
    <div class="space-y-2">
      <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
        Bleed Area
      </label>
      <select
        :value="bleed"
        class="select-input"
        @change="emit('update:bleed', Number(($event.target as HTMLSelectElement).value))"
      >
        <option 
          v-for="option in bleedOptions" 
          :key="option.value" 
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
      <p class="text-xs text-gray-500">
        Extra area around the design for trimming tolerance
      </p>
    </div>

    <!-- Crop Marks -->
    <div class="flex items-center justify-between">
      <div>
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
          Crop Marks
        </label>
        <p class="text-xs text-gray-500">
          Show trim lines for cutting
        </p>
      </div>
      <button
        type="button"
        role="switch"
        :aria-checked="cropMarks"
        class="toggle"
        :class="{ 'toggle-on': cropMarks }"
        @click="emit('update:cropMarks', !cropMarks)"
      >
        <span class="toggle-thumb" />
      </button>
    </div>

    <!-- Safe Zone -->
    <div class="flex items-center justify-between">
      <div>
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
          Safe Zone Guide
        </label>
        <p class="text-xs text-gray-500">
          Show margin for important content
        </p>
      </div>
      <button
        type="button"
        role="switch"
        :aria-checked="safeZone"
        class="toggle"
        :class="{ 'toggle-on': safeZone }"
        @click="emit('update:safeZone', !safeZone)"
      >
        <span class="toggle-thumb" />
      </button>
    </div>

    <!-- Visual Preview -->
    <div class="mt-4 p-4 bg-white dark:bg-gray-900 rounded-lg">
      <div 
        class="relative mx-auto border-2 border-dashed border-gray-300 dark:border-gray-600"
        :class="orientation === 'portrait' ? 'w-20 h-28' : 'w-28 h-20'"
      >
        <!-- Bleed area -->
        <div 
          v-if="bleed > 0"
          class="absolute inset-0 bg-red-100 dark:bg-red-900/30"
          :style="{ margin: `-${bleed}px` }"
        />
        
        <!-- Safe zone -->
        <div 
          v-if="safeZone"
          class="absolute inset-2 border border-dashed border-blue-400"
        />

        <!-- Crop marks -->
        <template v-if="cropMarks">
          <div class="absolute -top-3 left-0 w-px h-2 bg-black dark:bg-white" />
          <div class="absolute -top-3 right-0 w-px h-2 bg-black dark:bg-white" />
          <div class="absolute -bottom-3 left-0 w-px h-2 bg-black dark:bg-white" />
          <div class="absolute -bottom-3 right-0 w-px h-2 bg-black dark:bg-white" />
          <div class="absolute top-0 -left-3 w-2 h-px bg-black dark:bg-white" />
          <div class="absolute top-0 -right-3 w-2 h-px bg-black dark:bg-white" />
          <div class="absolute bottom-0 -left-3 w-2 h-px bg-black dark:bg-white" />
          <div class="absolute bottom-0 -right-3 w-2 h-px bg-black dark:bg-white" />
        </template>

        <!-- Content area label -->
        <div class="absolute inset-0 flex items-center justify-center">
          <span class="text-2xs text-gray-400">Content</span>
        </div>
      </div>
      
      <div class="mt-2 flex justify-center gap-4 text-2xs text-gray-500">
        <span v-if="bleed > 0" class="flex items-center gap-1">
          <span class="w-2 h-2 bg-red-200 rounded" /> Bleed
        </span>
        <span v-if="safeZone" class="flex items-center gap-1">
          <span class="w-2 h-2 border border-blue-400 rounded" /> Safe
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.select-input {
  @apply w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 
         rounded-lg bg-white dark:bg-gray-700 
         focus:ring-2 focus:ring-primary-500 focus:border-transparent;
}

.orientation-btn {
  @apply flex-1 flex flex-col items-center gap-2 p-3 rounded-lg border-2 
         border-gray-200 dark:border-gray-600 
         text-gray-500 dark:text-gray-400
         hover:border-gray-300 dark:hover:border-gray-500
         transition-colors;
}

.orientation-btn.active {
  @apply border-primary-500 text-primary-600 dark:text-primary-400 
         bg-primary-50 dark:bg-primary-900/20;
}

.orientation-btn span {
  @apply text-xs font-medium;
}

.toggle {
  @apply relative inline-flex h-6 w-11 items-center rounded-full 
         bg-gray-200 dark:bg-gray-700 transition-colors;
}

.toggle-on {
  @apply bg-primary-600;
}

.toggle-thumb {
  @apply inline-block h-4 w-4 transform rounded-full bg-white 
         transition-transform translate-x-1;
}

.toggle-on .toggle-thumb {
  @apply translate-x-6;
}

.text-2xs {
  font-size: 0.625rem;
  line-height: 0.875rem;
}
</style>
```

---

## 6. Batch Export (Business Tier)

```typescript
// src/services/export/batch.service.ts
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { pdfExportService } from './pdf.service'
import { imageExportService } from './image.service'
import type { ExportConfig, Project } from '@/types'

interface BatchExportOptions {
  projects: Project[]
  config: ExportConfig
  onProgress?: (current: number, total: number) => void
}

class BatchExportService {
  /**
   * Export multiple projects as a ZIP file
   */
  async exportBatch(options: BatchExportOptions): Promise<void> {
    const { projects, config, onProgress } = options
    const zip = new JSZip()
    const total = projects.length

    for (let i = 0; i < projects.length; i++) {
      const project = projects[i]
      
      try {
        const filename = imageExportService.generateFilename(
          project.name,
          config.format,
          String(i + 1).padStart(2, '0')
        )

        // Generate export for each project
        // This would need access to render each project's canvas
        // Implementation depends on how projects are rendered
        
        onProgress?.(i + 1, total)
      } catch (error) {
        console.error(`Failed to export project ${project.id}:`, error)
      }
    }

    // Generate and download ZIP
    const content = await zip.generateAsync({ type: 'blob' })
    const timestamp = new Date().toISOString().slice(0, 10)
    saveAs(content, `calendar-export-${timestamp}.zip`)
  }

  /**
   * Export calendar with variable data (personalization)
   */
  async exportWithVariableData(
    template: Project,
    data: Record<string, string>[],
    config: ExportConfig,
    onProgress?: (current: number, total: number) => void
  ): Promise<void> {
    const zip = new JSZip()
    const total = data.length

    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      
      // Clone template and apply variable data
      const personalized = this.applyVariableData(template, row)
      
      // Generate filename from data (e.g., using name field)
      const name = row.name || row.Name || `export-${i + 1}`
      const filename = imageExportService.generateFilename(
        name,
        config.format
      )

      // Export would happen here
      
      onProgress?.(i + 1, total)
    }

    const content = await zip.generateAsync({ type: 'blob' })
    const timestamp = new Date().toISOString().slice(0, 10)
    saveAs(content, `personalized-calendars-${timestamp}.zip`)
  }

  /**
   * Apply variable data to template
   */
  private applyVariableData(
    template: Project,
    data: Record<string, string>
  ): Project {
    const cloned = JSON.parse(JSON.stringify(template)) as Project

    // Find text objects and replace placeholders
    cloned.canvas.objects = cloned.canvas.objects.map((obj) => {
      if (obj.type === 'text' && obj.properties) {
        const textProps = obj.properties as any
        let content = textProps.content || ''

        // Replace {{variable}} placeholders
        Object.entries(data).forEach(([key, value]) => {
          const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'gi')
          content = content.replace(placeholder, value)
        })

        textProps.content = content
      }
      return obj
    })

    return cloned
  }
}

export const batchExportService = new BatchExportService()
```

---

*Continue to [08-marketplace.md](./08-marketplace.md) for template marketplace implementation.*
