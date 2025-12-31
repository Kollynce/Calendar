import type { LanguageCode, CountryCode, WatermarkConfig } from './calendar.types'

export interface User {
  id: string
  email: string
  displayName: string
  photoURL?: string
  role: UserRole
  subscription: SubscriptionTier
  brandKit?: BrandKit
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

export interface BrandKit {
  id: string
  name: string
  logo?: string
  colors: BrandColors
  fonts: BrandFonts
  watermark?: WatermarkConfig
  createdAt: string
  updatedAt: string
}

export interface BrandColors {
  primary: string
  secondary: string
  accent: string
  background: string
  text: string
}

export interface BrandFonts {
  heading: string
  body: string
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
