import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import type { 
  ExportConfig, 
  PaperSize,
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
    void filename
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
   * Export from Fabric.js canvas directly
   */
  async exportFromFabricCanvas(
    fabricCanvas: any,
    config: ExportConfig,
    filename: string
  ): Promise<Blob> {
    void filename
    const { paperSize, bleed, cropMarks, quality } = config
    const width = typeof fabricCanvas?.getWidth === 'function' ? fabricCanvas.getWidth() : fabricCanvas?.width
    const height = typeof fabricCanvas?.getHeight === 'function' ? fabricCanvas.getHeight() : fabricCanvas?.height
    const inferredOrientation: 'portrait' | 'landscape' = width && height && width > height ? 'landscape' : 'portrait'
    const dimensions = this.getPaperDimensions(paperSize, inferredOrientation)
    const dpi = QUALITY_DPI[quality]
    const multiplier = dpi / 72

    // Get canvas data URL at high resolution
    const dataURL = fabricCanvas.toDataURL({
      format: 'png',
      multiplier: multiplier,
    })

    // Create PDF
    const pdf = new jsPDF({
      orientation: inferredOrientation === 'landscape' ? 'l' : 'p',
      unit: 'mm',
      format: [dimensions.width + (bleed * 2), dimensions.height + (bleed * 2)],
    })

    // Add image to PDF
    pdf.addImage(
      dataURL,
      'PNG',
      bleed, // Offset by bleed
      bleed,
      dimensions.width,
      dimensions.height
    )

    // Add crop marks if enabled
    if (cropMarks) {
      this.addCropMarks(pdf, dimensions, bleed)
    }

    // Add bleed/safe zone indicators
    if (config.safeZone) {
      this.addSafeZoneMarks(pdf, dimensions, bleed)
    }

    return pdf.output('blob')
  }

  createPDFDocument(config: ExportConfig): jsPDF {
    const { paperSize, orientation, bleed } = config
    const dimensions = this.getPaperDimensions(paperSize, orientation)

    return new jsPDF({
      orientation: orientation === 'landscape' ? 'l' : 'p',
      unit: 'mm',
      format: [dimensions.width + bleed * 2, dimensions.height + bleed * 2],
    })
  }

  appendFabricCanvasPage(pdf: jsPDF, fabricCanvas: any, config: ExportConfig, addPage: boolean): void {
    const { paperSize, orientation, bleed, cropMarks, quality } = config
    const dimensions = this.getPaperDimensions(paperSize, orientation)
    const dpi = QUALITY_DPI[quality]
    const multiplier = dpi / 72

    if (addPage) {
      pdf.addPage()
    }

    const dataURL = fabricCanvas.toDataURL({
      format: 'png',
      multiplier,
    })

    pdf.addImage(dataURL, 'PNG', bleed, bleed, dimensions.width, dimensions.height)

    if (cropMarks) {
      this.addCropMarks(pdf, dimensions, bleed)
    }

    if (config.safeZone) {
      this.addSafeZoneMarks(pdf, dimensions, bleed)
    }
  }

  /**
   * Export multi-page PDF (e.g., monthly calendar)
   */
  async exportMultiPagePDF(
    pages: HTMLElement[],
    config: ExportConfig,
    filename: string
  ): Promise<Blob> {
    void filename
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

      const page = pages[i]
      if (!page) continue

      const canvas = await html2canvas(page, {
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
