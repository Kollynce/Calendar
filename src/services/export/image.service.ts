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
    _filename: string
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
    _filename: string,
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
   * Export from Fabric.js canvas to PNG
   */
  async exportFabricToPNG(
    fabricCanvas: any,
    config: ExportConfig
  ): Promise<Blob> {
    const dpi = QUALITY_DPI[config.quality]
    const multiplier = dpi / 72

    const dataURL = fabricCanvas.toDataURL({
      format: 'png',
      multiplier: multiplier,
    })

    return this.dataURLToBlob(dataURL)
  }

  /**
   * Export from Fabric.js canvas to JPEG
   */
  async exportFabricToJPEG(
    fabricCanvas: any,
    config: ExportConfig,
    quality: number = 0.92
  ): Promise<Blob> {
    const dpi = QUALITY_DPI[config.quality]
    const multiplier = dpi / 72

    const dataURL = fabricCanvas.toDataURL({
      format: 'jpeg',
      quality: quality,
      multiplier: multiplier,
    })

    return this.dataURLToBlob(dataURL)
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
   * Convert data URL to Blob
   */
  private dataURLToBlob(dataURL: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        const parts = dataURL.split(',')
        if (!parts[1]) throw new Error('Invalid data URL')
        const byteString = atob(parts[1])
        const mimeParts = parts[0]?.split(':')[1]?.split(';')
        if (!mimeParts?.[0]) throw new Error('Invalid MIME type')
        const mimeString = mimeParts[0]
        const ab = new ArrayBuffer(byteString.length)
        const ia = new Uint8Array(ab)
        
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i)
        }
        
        resolve(new Blob([ab], { type: mimeString }))
      } catch (error) {
        reject(error)
      }
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

  /**
   * Get file extension for format
   */
  getExtension(format: ExportFormat): string {
    const extensions: Record<ExportFormat, string> = {
      pdf: 'pdf',
      png: 'png',
      jpg: 'jpg',
      svg: 'svg',
      tiff: 'tiff',
    }
    return extensions[format] || format
  }
}

export const imageExportService = new ImageExportService()
