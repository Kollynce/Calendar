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

  addTiledImages(pdf: jsPDF, dataUrls: string[], config: ExportConfig, addPage: boolean): void {
    const { paperSize, orientation, bleed, cropMarks, layoutPreset, itemsPerSheet } = config
    const dimensions = this.getPaperDimensions(paperSize, orientation)

    if (addPage) {
      pdf.addPage()
    }

    const targetTiles = Math.max(1, itemsPerSheet ?? dataUrls.length)

    // Choose grid based on preset when available (A5 two-up = 2x1 landscape or 1x2 portrait; A6 four-up = 2x2)
    let cols: number
    let rows: number
    switch (layoutPreset) {
      case 'A5-2up':
        if (orientation === 'portrait') {
          cols = 1
          rows = 2
        } else {
          cols = 2
          rows = 1
        }
        break
      case 'A6-4up':
        cols = 2
        rows = 2
        break
      default: {
        cols = Math.ceil(Math.sqrt(targetTiles))
        rows = Math.ceil(targetTiles / cols)
      }
    }

    const cellWidth = dimensions.width / cols
    const cellHeight = dimensions.height / rows
    const padding = Math.min(cellWidth, cellHeight) * 0.03

    dataUrls.forEach((url, idx) => {
      const col = idx % cols
      const row = Math.floor(idx / cols)
      const x = bleed + col * cellWidth + padding
      const y = bleed + row * cellHeight + padding
      const availableW = cellWidth - padding * 2
      const availableH = cellHeight - padding * 2

      // Fit while preserving aspect ratio
      // We don't know intrinsic size here; let jsPDF scale by provided target keeping aspect.
      // Provide max dimensions, letting pdf.addImage preserve ratio.
      // For PDF, we use the already-rotated image data from buildRotatedDataUrl
      // So we don't need to swap dimensions or use jsPDF's rotation parameter
      const targetW = availableW
      const targetH = availableH
      
      // Use the rotated image data directly, no jsPDF rotation needed
      pdf.addImage(url, 'PNG', x, y, targetW, targetH, undefined, 'FAST')
    })

    if (cropMarks) {
      if (layoutPreset && (layoutPreset === 'A5-2up' || layoutPreset === 'A6-4up')) {
        this.addCropMarksForLayout(pdf, dimensions, bleed, cols, rows)
      } else {
        this.addCropMarks(pdf, dimensions, bleed)
      }
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
   * Add crop marks for tiled layouts (A5-2up, A6-4up) around each tile
   */
  private addCropMarksForLayout(
    pdf: jsPDF,
    dimensions: { width: number; height: number },
    bleed: number,
    cols: number,
    rows: number
  ): void {
    const markLength = 4 // mm
    const markOffset = 1.5 // mm from tile edge
    const padding = Math.min(dimensions.width / cols, dimensions.height / rows) * 0.03

    pdf.setDrawColor(0, 0, 0)
    pdf.setLineWidth(0.2)

    const cellWidth = dimensions.width / cols
    const cellHeight = dimensions.height / rows

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = bleed + col * cellWidth + padding
        const y = bleed + row * cellHeight + padding
        const tileW = cellWidth - padding * 2
        const tileH = cellHeight - padding * 2

        // Top-left
        pdf.line(x - markOffset - markLength, y, x - markOffset, y)
        pdf.line(x, y - markOffset - markLength, x, y - markOffset)

        // Top-right
        const right = x + tileW
        pdf.line(right + markOffset, y, right + markOffset + markLength, y)
        pdf.line(right, y - markOffset - markLength, right, y - markOffset)

        // Bottom-left
        const bottom = y + tileH
        pdf.line(x - markOffset - markLength, bottom, x - markOffset, bottom)
        pdf.line(x, bottom + markOffset, x, bottom + markOffset + markLength)

        // Bottom-right
        pdf.line(right + markOffset, bottom, right + markOffset + markLength, bottom)
        pdf.line(right, bottom + markOffset, right, bottom + markOffset + markLength)
      }
    }
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
