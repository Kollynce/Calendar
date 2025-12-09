# Phase 1: Foundation & Core Infrastructure

## 1. Project Initialization

### 1.1 Create Project

```bash
# Create Vue 3 + TypeScript project
pnpm create vite calendar-creator --template vue-ts
cd calendar-creator

# Install core dependencies
pnpm add vue-router@4 pinia @vueuse/core
pnpm add @headlessui/vue @heroicons/vue

# Tailwind CSS
pnpm add -D tailwindcss postcss autoprefixer
pnpm add -D @tailwindcss/forms @tailwindcss/typography @tailwindcss/aspect-ratio

# Firebase
pnpm add firebase

# Design & Export
pnpm add fabric jspdf html2canvas file-saver
pnpm add date-fns date-holidays

# Validation
pnpm add zod

# Development tools
pnpm add -D vitest @vue/test-utils @testing-library/vue
pnpm add -D playwright @playwright/test
pnpm add -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
pnpm add -D eslint-plugin-vue prettier prettier-plugin-tailwindcss
pnpm add -D husky lint-staged @commitlint/cli @commitlint/config-conventional

# Type definitions
pnpm add -D @types/node @types/file-saver
```

### 1.2 Initialize Tailwind

```bash
npx tailwindcss init -p
```

---

## 2. Firebase Configuration

### 2.1 Firebase Initialization

```typescript
// src/config/firebase.ts
import { initializeApp, type FirebaseApp } from 'firebase/app'
import { 
  getAuth, 
  connectAuthEmulator, 
  type Auth 
} from 'firebase/auth'
import { 
  getFirestore, 
  connectFirestoreEmulator, 
  type Firestore 
} from 'firebase/firestore'
import { 
  getStorage, 
  connectStorageEmulator, 
  type FirebaseStorage 
} from 'firebase/storage'
import { 
  getFunctions, 
  connectFunctionsEmulator, 
  type Functions 
} from 'firebase/functions'
import { getAnalytics, type Analytics } from 'firebase/analytics'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

let app: FirebaseApp
let auth: Auth
let db: Firestore
let storage: FirebaseStorage
let functions: Functions
let analytics: Analytics | null = null

export function initializeFirebase() {
  app = initializeApp(firebaseConfig)
  auth = getAuth(app)
  db = getFirestore(app)
  storage = getStorage(app)
  functions = getFunctions(app)

  // Initialize analytics only in production
  if (import.meta.env.PROD) {
    analytics = getAnalytics(app)
  }

  // Connect to emulators in development
  if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true') {
    connectAuthEmulator(auth, 'http://localhost:9099')
    connectFirestoreEmulator(db, 'localhost', 8080)
    connectStorageEmulator(storage, 'localhost', 9199)
    connectFunctionsEmulator(functions, 'localhost', 5001)
    console.log('🔧 Connected to Firebase emulators')
  }

  return { app, auth, db, storage, functions, analytics }
}

export { app, auth, db, storage, functions, analytics }
```

### 2.2 Feature Flags

```typescript
// src/config/features.ts
export const features = {
  marketplace: import.meta.env.VITE_ENABLE_MARKETPLACE === 'true',
  analytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  batchExport: import.meta.env.VITE_ENABLE_BATCH_EXPORT === 'true',
  cmykExport: import.meta.env.VITE_ENABLE_CMYK_EXPORT === 'true',
} as const

export function isFeatureEnabled(feature: keyof typeof features): boolean {
  return features[feature] ?? false
}
```

### 2.3 Constants

```typescript
// src/config/constants.ts
export const APP_NAME = 'Calendar Creator'
export const APP_VERSION = '1.0.0'

// Subscription tiers
export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  PRO: 'pro',
  BUSINESS: 'business',
  ENTERPRISE: 'enterprise',
} as const

// Tier limits
export const TIER_LIMITS = {
  free: {
    projects: 3,
    customHolidays: 10,
    exportDpi: 72,
    brandKits: 0,
    watermark: true,
  },
  pro: {
    projects: Infinity,
    customHolidays: 100,
    exportDpi: 300,
    brandKits: 1,
    watermark: false,
  },
  business: {
    projects: Infinity,
    customHolidays: Infinity,
    exportDpi: 300,
    brandKits: 5,
    watermark: false,
  },
  enterprise: {
    projects: Infinity,
    customHolidays: Infinity,
    exportDpi: 300,
    brandKits: Infinity,
    watermark: false,
  },
} as const

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
  exports: { count: 10, windowMs: 60000 }, // 10 per minute
  uploads: { count: 20, windowMs: 60000 }, // 20 per minute
} as const
```

---

## 3. Core Type Definitions

### 3.1 Calendar Types

```typescript
// src/types/calendar.types.ts
export interface CalendarConfig {
  year: number
  country: CountryCode
  language: LanguageCode
  layout: CalendarLayout
  startDay: WeekDay
  showHolidays: boolean
  showCustomHolidays: boolean
  showWeekNumbers: boolean
  currentMonth?: number // For monthly view navigation
}

export type CalendarLayout = 
  | 'year-grid'      // All 12 months on one page
  | 'monthly'        // One month per page
  | 'weekly'         // Weekly planner view
  | 'daily'          // Daily planner view

export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6 // Sunday = 0

// All 54 African countries
export type CountryCode = 
  | 'DZ' | 'AO' | 'BJ' | 'BW' | 'BF' | 'BI' | 'CV' | 'CM' | 'CF' | 'TD'
  | 'KM' | 'CG' | 'CD' | 'CI' | 'DJ' | 'EG' | 'GQ' | 'ER' | 'SZ' | 'ET'
  | 'GA' | 'GM' | 'GH' | 'GN' | 'GW' | 'KE' | 'LS' | 'LR' | 'LY' | 'MG'
  | 'MW' | 'ML' | 'MR' | 'MU' | 'MA' | 'MZ' | 'NA' | 'NE' | 'NG' | 'RW'
  | 'ST' | 'SN' | 'SC' | 'SL' | 'SO' | 'ZA' | 'SS' | 'SD' | 'TZ' | 'TG'
  | 'TN' | 'UG' | 'ZM' | 'ZW'

export type LanguageCode = 
  | 'en'  // English
  | 'sw'  // Swahili
  | 'am'  // Amharic
  | 'yo'  // Yoruba
  | 'zu'  // Zulu
  | 'ar'  // Arabic
  | 'fr'  // French
  | 'pt'  // Portuguese
  | 'ha'  // Hausa
  | 'ig'  // Igbo

export interface Holiday {
  id: string
  date: string // ISO date string YYYY-MM-DD
  name: string
  localName?: string
  type: HolidayType
  isPublic: boolean
  country: CountryCode
}

export type HolidayType = 
  | 'public'
  | 'bank'
  | 'school'
  | 'optional'
  | 'observance'
  | 'custom'

export interface CustomHoliday extends Holiday {
  type: 'custom'
  color: string
  recurrence: RecurrenceRule | null
  notes?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface RecurrenceRule {
  frequency: 'yearly' | 'monthly' | 'weekly'
  interval: number
  endDate?: string
}

// Calendar generation output
export interface CalendarDay {
  date: Date
  dayOfMonth: number
  isCurrentMonth: boolean
  isToday: boolean
  isWeekend: boolean
  weekNumber: number
  holidays: Holiday[]
}

export interface CalendarMonth {
  year: number
  month: number // 1-12
  name: string
  shortName: string
  days: CalendarDay[]
  weeks: CalendarDay[][]
}

export interface CalendarYear {
  year: number
  months: CalendarMonth[]
}
```

### 3.2 User Types

```typescript
// src/types/user.types.ts
export interface User {
  id: string
  email: string
  displayName: string
  photoURL?: string
  role: UserRole
  subscription: SubscriptionTier
  brandKit?: BrandKit
  preferences: UserPreferences
  createdAt: string
  updatedAt: string
}

export type UserRole = 'user' | 'creator' | 'admin'

export type SubscriptionTier = 'free' | 'pro' | 'business' | 'enterprise'

export interface BrandKit {
  id: string
  name: string
  logo?: string
  colors: BrandColors
  fonts: BrandFonts
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
```

### 3.3 Editor Types

```typescript
// src/types/editor.types.ts
export interface Project {
  id: string
  userId: string
  name: string
  description?: string
  templateId?: string
  config: CalendarConfig
  canvas: CanvasState
  thumbnail?: string
  status: ProjectStatus
  createdAt: string
  updatedAt: string
}

export type ProjectStatus = 'draft' | 'published' | 'archived'

export interface CanvasState {
  width: number
  height: number
  unit: 'px' | 'mm' | 'in'
  dpi: number
  backgroundColor: string
  objects: CanvasObject[]
}

export interface CanvasObject {
  id: string
  type: ObjectType
  x: number
  y: number
  width: number
  height: number
  rotation: number
  opacity: number
  locked: boolean
  visible: boolean
  zIndex: number
  name?: string
  properties: ObjectProperties
}

export type ObjectType = 
  | 'calendar-grid'
  | 'text'
  | 'image'
  | 'shape'
  | 'logo'

export type ObjectProperties = 
  | CalendarGridProperties
  | TextProperties
  | ImageProperties
  | ShapeProperties

export interface CalendarGridProperties {
  month?: number // 1-12, undefined = full year
  theme: string
  showHeader: boolean
  showWeekdays: boolean
  cellPadding: number
}

export interface TextProperties {
  content: string
  fontFamily: string
  fontSize: number
  fontWeight: number
  fontStyle: 'normal' | 'italic'
  textAlign: 'left' | 'center' | 'right'
  color: string
  lineHeight: number
  letterSpacing: number
}

export interface ImageProperties {
  src: string
  fit: 'cover' | 'contain' | 'fill'
  filters?: ImageFilters
}

export interface ImageFilters {
  brightness: number
  contrast: number
  saturation: number
  blur: number
}

export interface ShapeProperties {
  shapeType: 'rectangle' | 'circle' | 'line' | 'polygon'
  fill: string
  stroke: string
  strokeWidth: number
  cornerRadius?: number
}
```

### 3.4 Export Types

```typescript
// src/types/export.types.ts
export interface ExportConfig {
  format: ExportFormat
  quality: ExportQuality
  colorProfile: ColorProfile
  paperSize: PaperSize
  orientation: 'portrait' | 'landscape'
  bleed: number // in mm
  cropMarks: boolean
  safeZone: boolean
  transparent: boolean
  pages: 'all' | 'current' | number[]
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
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
```

---

## 4. Pinia Stores

### 4.1 Auth Store

```typescript
// src/stores/auth.store.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  type User as FirebaseUser
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '@/config/firebase'
import type { User, SubscriptionTier } from '@/types'
import { TIER_LIMITS } from '@/config/constants'

export const useAuthStore = defineStore('auth', () => {
  // ═══════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════
  const user = ref<User | null>(null)
  const firebaseUser = ref<FirebaseUser | null>(null)
  const loading = ref(true)
  const error = ref<string | null>(null)

  // ═══════════════════════════════════════════════════════════════
  // GETTERS
  // ═══════════════════════════════════════════════════════════════
  const isAuthenticated = computed(() => !!user.value)
  
  const isCreator = computed(() => 
    user.value?.role === 'creator' || user.value?.role === 'admin'
  )
  
  const isAdmin = computed(() => user.value?.role === 'admin')
  
  const subscriptionTier = computed<SubscriptionTier>(() => 
    user.value?.subscription ?? 'free'
  )
  
  const tierLimits = computed(() => 
    TIER_LIMITS[subscriptionTier.value]
  )
  
  const isPro = computed(() => {
    const tier = subscriptionTier.value
    return tier === 'pro' || tier === 'business' || tier === 'enterprise'
  })

  // ═══════════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Initialize auth state listener
   */
  async function initialize(): Promise<void> {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
        firebaseUser.value = fbUser
        
        if (fbUser) {
          await fetchUserProfile(fbUser.uid)
        } else {
          user.value = null
        }
        
        loading.value = false
        resolve()
      })
    })
  }

  /**
   * Fetch user profile from Firestore
   */
  async function fetchUserProfile(uid: string): Promise<void> {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid))
      
      if (userDoc.exists()) {
        user.value = { id: uid, ...userDoc.data() } as User
      } else {
        // User exists in Auth but not Firestore - create profile
        await createUserProfile(uid)
      }
    } catch (e) {
      console.error('Error fetching user profile:', e)
      error.value = 'Failed to load user profile'
    }
  }

  /**
   * Create new user profile in Firestore
   */
  async function createUserProfile(
    uid: string, 
    data?: Partial<User>
  ): Promise<void> {
    const fbUser = firebaseUser.value
    if (!fbUser) return

    const newUser: Omit<User, 'id'> = {
      email: fbUser.email!,
      displayName: data?.displayName || fbUser.displayName || 'User',
      photoURL: fbUser.photoURL || undefined,
      role: 'user',
      subscription: 'free',
      preferences: {
        theme: 'system',
        language: 'en',
        defaultCountry: 'ZA',
        emailNotifications: true,
        marketingEmails: false,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...data,
    }

    await setDoc(doc(db, 'users', uid), newUser)
    user.value = { id: uid, ...newUser }
  }

  /**
   * Sign in with email and password
   */
  async function signIn(email: string, password: string): Promise<void> {
    loading.value = true
    error.value = null
    
    try {
      const result = await signInWithEmailAndPassword(auth, email, password)
      await fetchUserProfile(result.user.uid)
    } catch (e: any) {
      error.value = getAuthErrorMessage(e.code)
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Sign up with email and password
   */
  async function signUp(
    email: string, 
    password: string, 
    displayName: string
  ): Promise<void> {
    loading.value = true
    error.value = null
    
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password)
      await createUserProfile(result.user.uid, { displayName })
    } catch (e: any) {
      error.value = getAuthErrorMessage(e.code)
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Sign in with Google
   */
  async function signInWithGoogle(): Promise<void> {
    loading.value = true
    error.value = null
    
    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      
      // Check if user profile exists
      const userDoc = await getDoc(doc(db, 'users', result.user.uid))
      
      if (!userDoc.exists()) {
        await createUserProfile(result.user.uid)
      } else {
        await fetchUserProfile(result.user.uid)
      }
    } catch (e: any) {
      error.value = getAuthErrorMessage(e.code)
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Send password reset email
   */
  async function resetPassword(email: string): Promise<void> {
    error.value = null
    
    try {
      await sendPasswordResetEmail(auth, email)
    } catch (e: any) {
      error.value = getAuthErrorMessage(e.code)
      throw e
    }
  }

  /**
   * Sign out
   */
  async function logout(): Promise<void> {
    await signOut(auth)
    user.value = null
    firebaseUser.value = null
  }

  /**
   * Update user profile
   */
  async function updateProfile(updates: Partial<User>): Promise<void> {
    if (!user.value) return
    
    try {
      const updateData = {
        ...updates,
        updatedAt: new Date().toISOString(),
      }
      
      await setDoc(doc(db, 'users', user.value.id), updateData, { merge: true })
      user.value = { ...user.value, ...updateData }
    } catch (e: any) {
      error.value = e.message
      throw e
    }
  }

  /**
   * Convert Firebase auth error codes to user-friendly messages
   */
  function getAuthErrorMessage(code: string): string {
    const messages: Record<string, string> = {
      'auth/email-already-in-use': 'This email is already registered',
      'auth/invalid-email': 'Invalid email address',
      'auth/operation-not-allowed': 'Operation not allowed',
      'auth/weak-password': 'Password is too weak',
      'auth/user-disabled': 'This account has been disabled',
      'auth/user-not-found': 'No account found with this email',
      'auth/wrong-password': 'Incorrect password',
      'auth/too-many-requests': 'Too many attempts. Please try again later',
      'auth/popup-closed-by-user': 'Sign-in popup was closed',
    }
    return messages[code] || 'An error occurred. Please try again.'
  }

  return {
    // State
    user,
    firebaseUser,
    loading,
    error,
    // Getters
    isAuthenticated,
    isCreator,
    isAdmin,
    subscriptionTier,
    tierLimits,
    isPro,
    // Actions
    initialize,
    signIn,
    signUp,
    signInWithGoogle,
    resetPassword,
    logout,
    updateProfile,
  }
})
```

### 4.2 Theme Store

```typescript
// src/stores/theme.store.ts
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useLocalStorage } from '@vueuse/core'

export interface Theme {
  id: string
  name: string
  colors: ThemeColors
}

export interface ThemeColors {
  primary: string
  primaryForeground: string
  accent: string
  accentForeground: string
  background: string
  foreground: string
  muted: string
  mutedForeground: string
  border: string
  holiday: string
  custom: string
  weekend: string
}

// Predefined themes
export const THEMES: Theme[] = [
  {
    id: 'indigo',
    name: 'Indigo',
    colors: {
      primary: '#4f46e5',
      primaryForeground: '#ffffff',
      accent: '#06b6d4',
      accentForeground: '#ffffff',
      background: '#ffffff',
      foreground: '#1f2937',
      muted: '#f3f4f6',
      mutedForeground: '#6b7280',
      border: '#e5e7eb',
      holiday: '#ef4444',
      custom: '#8b5cf6',
      weekend: '#f3f4f6',
    },
  },
  {
    id: 'emerald',
    name: 'Emerald',
    colors: {
      primary: '#059669',
      primaryForeground: '#ffffff',
      accent: '#f59e0b',
      accentForeground: '#ffffff',
      background: '#ffffff',
      foreground: '#1f2937',
      muted: '#f3f4f6',
      mutedForeground: '#6b7280',
      border: '#e5e7eb',
      holiday: '#dc2626',
      custom: '#7c3aed',
      weekend: '#ecfdf5',
    },
  },
  {
    id: 'rose',
    name: 'Rose',
    colors: {
      primary: '#e11d48',
      primaryForeground: '#ffffff',
      accent: '#f97316',
      accentForeground: '#ffffff',
      background: '#ffffff',
      foreground: '#1f2937',
      muted: '#f3f4f6',
      mutedForeground: '#6b7280',
      border: '#e5e7eb',
      holiday: '#7c3aed',
      custom: '#0891b2',
      weekend: '#fff1f2',
    },
  },
  {
    id: 'slate',
    name: 'Slate',
    colors: {
      primary: '#475569',
      primaryForeground: '#ffffff',
      accent: '#0ea5e9',
      accentForeground: '#ffffff',
      background: '#ffffff',
      foreground: '#1e293b',
      muted: '#f1f5f9',
      mutedForeground: '#64748b',
      border: '#e2e8f0',
      holiday: '#ef4444',
      custom: '#8b5cf6',
      weekend: '#f8fafc',
    },
  },
  {
    id: 'night',
    name: 'Night',
    colors: {
      primary: '#6366f1',
      primaryForeground: '#ffffff',
      accent: '#22d3ee',
      accentForeground: '#0f172a',
      background: '#0f172a',
      foreground: '#f8fafc',
      muted: '#1e293b',
      mutedForeground: '#94a3b8',
      border: '#334155',
      holiday: '#f87171',
      custom: '#a78bfa',
      weekend: '#1e293b',
    },
  },
]

export const useThemeStore = defineStore('theme', () => {
  // ═══════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════
  const currentThemeId = useLocalStorage('calendar-theme', 'indigo')
  const customColors = useLocalStorage<Partial<ThemeColors>>('calendar-custom-colors', {})
  const darkMode = useLocalStorage('calendar-dark-mode', false)

  // ═══════════════════════════════════════════════════════════════
  // GETTERS
  // ═══════════════════════════════════════════════════════════════
  const currentTheme = computed<Theme>(() => {
    const theme = THEMES.find(t => t.id === currentThemeId.value) || THEMES[0]
    
    // Merge custom colors if any
    if (Object.keys(customColors.value).length > 0) {
      return {
        ...theme,
        colors: { ...theme.colors, ...customColors.value },
      }
    }
    
    return theme
  })

  const availableThemes = computed(() => THEMES)

  // ═══════════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════════
  function setTheme(themeId: string): void {
    currentThemeId.value = themeId
    customColors.value = {} // Reset custom colors when changing theme
    applyThemeToDOM()
  }

  function setCustomColor(key: keyof ThemeColors, value: string): void {
    customColors.value = { ...customColors.value, [key]: value }
    applyThemeToDOM()
  }

  function resetCustomColors(): void {
    customColors.value = {}
    applyThemeToDOM()
  }

  function toggleDarkMode(): void {
    darkMode.value = !darkMode.value
    applyDarkMode()
  }

  function applyThemeToDOM(): void {
    const root = document.documentElement
    const colors = currentTheme.value.colors

    // Apply CSS custom properties
    Object.entries(colors).forEach(([key, value]) => {
      // Convert hex to RGB for Tailwind alpha support
      const rgb = hexToRgb(value)
      if (rgb) {
        root.style.setProperty(`--color-${kebabCase(key)}`, `${rgb.r} ${rgb.g} ${rgb.b}`)
      }
    })
  }

  function applyDarkMode(): void {
    if (darkMode.value) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  // Initialize on store creation
  function initialize(): void {
    applyThemeToDOM()
    applyDarkMode()
  }

  return {
    // State
    currentThemeId,
    customColors,
    darkMode,
    // Getters
    currentTheme,
    availableThemes,
    // Actions
    setTheme,
    setCustomColor,
    resetCustomColors,
    toggleDarkMode,
    initialize,
  }
})

// ═══════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null
}

function kebabCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
}
```

---

## 5. Router Setup

```typescript
// src/router/routes.ts
import type { RouteRecordRaw } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  // ═══════════════════════════════════════════════════════════════
  // PUBLIC ROUTES
  // ═══════════════════════════════════════════════════════════════
  {
    path: '/',
    name: 'home',
    component: () => import('@/pages/index.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/marketplace',
    name: 'marketplace',
    component: () => import('@/pages/marketplace/index.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/marketplace/:id',
    name: 'template-detail',
    component: () => import('@/pages/marketplace/[id].vue'),
    meta: { layout: 'default' },
  },

  // ═══════════════════════════════════════════════════════════════
  // AUTH ROUTES
  // ═══════════════════════════════════════════════════════════════
  {
    path: '/auth/login',
    name: 'login',
    component: () => import('@/pages/auth/login.vue'),
    meta: { layout: 'auth', guest: true },
  },
  {
    path: '/auth/register',
    name: 'register',
    component: () => import('@/pages/auth/register.vue'),
    meta: { layout: 'auth', guest: true },
  },
  {
    path: '/auth/reset-password',
    name: 'reset-password',
    component: () => import('@/pages/auth/reset-password.vue'),
    meta: { layout: 'auth', guest: true },
  },

  // ═══════════════════════════════════════════════════════════════
  // PROTECTED ROUTES
  // ═══════════════════════════════════════════════════════════════
  {
    path: '/editor',
    name: 'editor-new',
    component: () => import('@/pages/editor/index.vue'),
    meta: { layout: 'editor', requiresAuth: true },
  },
  {
    path: '/editor/:id',
    name: 'editor',
    component: () => import('@/pages/editor/[id].vue'),
    meta: { layout: 'editor', requiresAuth: true },
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('@/pages/dashboard/index.vue'),
    meta: { layout: 'default', requiresAuth: true },
  },
  {
    path: '/dashboard/projects',
    name: 'projects',
    component: () => import('@/pages/dashboard/projects.vue'),
    meta: { layout: 'default', requiresAuth: true },
  },
  {
    path: '/dashboard/templates',
    name: 'my-templates',
    component: () => import('@/pages/dashboard/templates.vue'),
    meta: { layout: 'default', requiresAuth: true, requiresCreator: true },
  },
  {
    path: '/dashboard/analytics',
    name: 'analytics',
    component: () => import('@/pages/dashboard/analytics.vue'),
    meta: { layout: 'default', requiresAuth: true, requiresCreator: true },
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/pages/settings/index.vue'),
    meta: { layout: 'default', requiresAuth: true },
  },
  {
    path: '/settings/billing',
    name: 'billing',
    component: () => import('@/pages/settings/billing.vue'),
    meta: { layout: 'default', requiresAuth: true },
  },
  {
    path: '/settings/brand-kit',
    name: 'brand-kit',
    component: () => import('@/pages/settings/brand-kit.vue'),
    meta: { layout: 'default', requiresAuth: true, requiresPro: true },
  },

  // ═══════════════════════════════════════════════════════════════
  // LEGAL
  // ═══════════════════════════════════════════════════════════════
  {
    path: '/terms',
    name: 'terms',
    component: () => import('@/pages/legal/terms.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/privacy',
    name: 'privacy',
    component: () => import('@/pages/legal/privacy.vue'),
    meta: { layout: 'default' },
  },

  // ═══════════════════════════════════════════════════════════════
  // CATCH-ALL
  // ═══════════════════════════════════════════════════════════════
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/pages/404.vue'),
    meta: { layout: 'default' },
  },
]
```

```typescript
// src/router/guards.ts
import type { Router } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

export function setupRouterGuards(router: Router): void {
  router.beforeEach(async (to, from, next) => {
    const authStore = useAuthStore()

    // Wait for auth to initialize
    if (authStore.loading) {
      await authStore.initialize()
    }

    const requiresAuth = to.meta.requiresAuth
    const requiresCreator = to.meta.requiresCreator
    const requiresPro = to.meta.requiresPro
    const guestOnly = to.meta.guest

    // Redirect authenticated users away from guest-only pages
    if (guestOnly && authStore.isAuthenticated) {
      return next({ name: 'dashboard' })
    }

    // Redirect unauthenticated users to login
    if (requiresAuth && !authStore.isAuthenticated) {
      return next({ 
        name: 'login', 
        query: { redirect: to.fullPath } 
      })
    }

    // Check creator role
    if (requiresCreator && !authStore.isCreator) {
      return next({ name: 'dashboard' })
    }

    // Check pro subscription
    if (requiresPro && !authStore.isPro) {
      return next({ name: 'billing' })
    }

    next()
  })
}
```

```typescript
// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import { routes } from './routes'
import { setupRouterGuards } from './guards'

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    return { top: 0 }
  },
})

setupRouterGuards(router)

export default router
```

---

## 6. Application Entry

```typescript
// src/main.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { initializeFirebase } from './config/firebase'
import { useThemeStore } from './stores/theme.store'
import { useAuthStore } from './stores/auth.store'

// Styles
import './assets/styles/base.css'

async function bootstrap() {
  // Initialize Firebase
  initializeFirebase()

  // Create Vue app
  const app = createApp(App)
  const pinia = createPinia()

  app.use(pinia)
  app.use(router)

  // Initialize stores
  const themeStore = useThemeStore()
  const authStore = useAuthStore()

  themeStore.initialize()
  await authStore.initialize()

  // Mount app
  app.mount('#app')
}

bootstrap()
```

---

*Continue to [05-calendar-engine.md](./05-calendar-engine.md) for calendar rendering implementation.*
