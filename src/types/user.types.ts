import type { LanguageCode, CountryCode, WatermarkConfig } from './calendar.types'

export interface User {
  id: string
  email: string
  displayName: string
  photoURL?: string
  role: UserRole
  subscription: SubscriptionTier
  /**
   * Deprecated: legacy single-brand field kept for backwards compatibility/migrations.
   * Use brandKits + defaultBrandKitId for new functionality.
   */
  brandKit?: BrandKit | null
  brandKits?: BrandKit[]
  defaultBrandKitId?: string | null
  preferences: UserPreferences
  stats: UserStats
  createdAt: string
  updatedAt: string
  lastLoginAt?: string
}

export interface UserStats {
  storageUsed: number // in bytes
  activeDays: string[] // ISO dates YYYY-MM-DD
  projectCount: number
  templateCount: number
  totalDownloads: number
}

export type UserRole = 'user' | 'creator' | 'admin'

export type SubscriptionTier = 'free' | 'pro' | 'business' | 'enterprise'

export interface BrandAssetLink {
  id: string
  label: string
  url: string
  type?: 'logo' | 'guideline' | 'font' | 'other'
}

export interface BrandKit {
  id: string
  name: string
  description?: string
  logo?: string
  colors: BrandColors
  fonts: BrandFonts
  fontLibrary?: BrandFontSetting[]
  watermark?: WatermarkConfig
  tags?: string[]
  usageNotes?: string
  voiceTone?: string
  assetLinks?: BrandAssetLink[]
  lastUsedAt?: string
  createdAt: string
  updatedAt: string
}

export interface BrandColorRole {
  id: string
  label: string
  value: string
  usage?: string
}

export type BrandColors = BrandColorRole[]

export type BrandFontSource = 'system' | 'google' | 'upload'

export interface BrandFontSetting {
  id?: string
  label?: string
  family: string
  weight?: string
  fallback?: string
  source?: BrandFontSource
  fileUrl?: string
  storagePath?: string
}

export interface BrandFonts {
  heading: BrandFontSetting
  body: BrandFontSetting
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  language: LanguageCode
  defaultCountry: CountryCode
  emailNotifications: boolean
  marketingEmails: boolean
}

export interface Subscription {
  id: string
  userId: string
  tier: SubscriptionTier
  status: SubscriptionStatus
  paypalCustomerId?: string
  paypalSubscriptionId: string
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
}

export type SubscriptionStatus = 
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'trialing'
