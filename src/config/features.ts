export const features = {
  marketplace: import.meta.env.VITE_ENABLE_MARKETPLACE === 'true',
  analytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  batchExport: import.meta.env.VITE_ENABLE_BATCH_EXPORT === 'true',
  cmykExport: import.meta.env.VITE_ENABLE_CMYK_EXPORT === 'true',
  serverExports: import.meta.env.VITE_ENABLE_SERVER_EXPORTS === 'true',
} as const

export function isFeatureEnabled(feature: keyof typeof features): boolean {
  return features[feature] ?? false
}
