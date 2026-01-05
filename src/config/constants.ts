import type { SubscriptionTier } from '@/types'

// Subscription tier limits
export const TIER_LIMITS: Record<SubscriptionTier, {
  projects: number
  customHolidays: number
  exportDpi: number
  brandKits: number
  watermark: boolean
  storageLimit: number // in bytes
  canUsePremiumTemplates: boolean
  canExportPDF: boolean
  canExportSVG: boolean
  canExportTIFF: boolean
  canUseTeamCollaboration: boolean
  canUseAPI: boolean
  canUseWhiteLabel: boolean
  canUseAnalytics: boolean
  hasPrioritySupport: boolean
}> = {
  free: {
    projects: 3,
    customHolidays: 10,
    exportDpi: 72,
    brandKits: 0,
    watermark: true,
    storageLimit: 50 * 1024 * 1024, // 50MB
    canUsePremiumTemplates: false,
    canExportPDF: false,
    canExportSVG: false,
    canExportTIFF: false,
    canUseTeamCollaboration: false,
    canUseAPI: false,
    canUseWhiteLabel: false,
    canUseAnalytics: false,
    hasPrioritySupport: false,
  },
  pro: {
    projects: Infinity,
    customHolidays: 100,
    exportDpi: 300,
    brandKits: 1,
    watermark: false,
    storageLimit: 1024 * 1024 * 1024, // 1GB
    canUsePremiumTemplates: true,
    canExportPDF: true,
    canExportSVG: true,
    canExportTIFF: false,
    canUseTeamCollaboration: false,
    canUseAPI: false,
    canUseWhiteLabel: false,
    canUseAnalytics: false,
    hasPrioritySupport: true,
  },
  business: {
    projects: Infinity,
    customHolidays: Infinity,
    exportDpi: 300,
    brandKits: Infinity,
    watermark: false,
    storageLimit: 5 * 1024 * 1024 * 1024, // 5GB
    canUsePremiumTemplates: true,
    canExportPDF: true,
    canExportSVG: true,
    canExportTIFF: true,
    canUseTeamCollaboration: true,
    canUseAPI: true,
    canUseWhiteLabel: true,
    canUseAnalytics: true,
    hasPrioritySupport: true,
  },
  enterprise: {
    projects: Infinity,
    customHolidays: Infinity,
    exportDpi: 300,
    brandKits: Infinity,
    watermark: false,
    storageLimit: 5 * 1024 * 1024 * 1024, // 5GB
    canUsePremiumTemplates: true,
    canExportPDF: true,
    canExportSVG: true,
    canExportTIFF: true,
    canUseTeamCollaboration: true,
    canUseAPI: true,
    canUseWhiteLabel: true,
    canUseAnalytics: true,
    hasPrioritySupport: true,
  },
}

// Export formats
export const EXPORT_FORMATS = ['png', 'jpg', 'pdf', 'svg'] as const

// Paper sizes (in mm)
export const PAPER_SIZES = {
  A4: { width: 210, height: 297 },
  A3: { width: 297, height: 420 },
  A2: { width: 420, height: 594 },
  Letter: { width: 215.9, height: 279.4 },
  Legal: { width: 215.9, height: 355.6 },
} as const

// Rate limits
export const RATE_LIMITS = {
  exports: { count: 10, windowMs: 60000 },
  uploads: { count: 20, windowMs: 60000 },
} as const

// Feature flags
export const FEATURES = {
  marketplace: import.meta.env.VITE_ENABLE_MARKETPLACE === 'true',
  analytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  batchExport: import.meta.env.VITE_ENABLE_BATCH_EXPORT === 'true',
} as const
