export interface ExportConfig {
  format: ExportFormat
  quality: ExportQuality
  colorProfile: ColorProfile
  paperSize: PaperSize
  orientation: 'portrait' | 'landscape'
  bleed: number
  cropMarks: boolean
  safeZone: boolean
  transparent: boolean
  pages: 'all' | 'current' | number[]
  includeUserObjectsAllMonths?: boolean
}

export type ExportFormat = 'pdf' | 'png' | 'jpg' | 'svg' | 'tiff'

export type ExportQuality = 'screen' | 'print' | 'press'

export const QUALITY_DPI: Record<ExportQuality, number> = {
  screen: 72,
  print: 300,
  press: 300,
}

export type ColorProfile = 'sRGB' | 'Adobe RGB' | 'CMYK'

export type PaperSize = 
  | 'A4' | 'A3' | 'A2' | 'A1' | 'A0'
  | 'Letter' | 'Legal' | 'Tabloid'
  | 'custom'

export interface PaperDimensions {
  width: number
  height: number
  unit: 'mm' | 'in'
}

export const PAPER_DIMENSIONS: Record<Exclude<PaperSize, 'custom'>, PaperDimensions> = {
  A4: { width: 210, height: 297, unit: 'mm' },
  A3: { width: 297, height: 420, unit: 'mm' },
  A2: { width: 420, height: 594, unit: 'mm' },
  A1: { width: 594, height: 841, unit: 'mm' },
  A0: { width: 841, height: 1189, unit: 'mm' },
  Letter: { width: 8.5, height: 11, unit: 'in' },
  Legal: { width: 8.5, height: 14, unit: 'in' },
  Tabloid: { width: 11, height: 17, unit: 'in' },
}

export interface ExportJob {
  id: string
  projectId: string
  userId: string
  config: ExportConfig
  status: ExportJobStatus
  progress: number
  outputUrl?: string
  error?: string
  createdAt: string
  completedAt?: string
}

export type ExportJobStatus = 
  | 'queued'
  | 'running'
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
