import { defineStore } from 'pinia'
import { ref, computed, shallowRef, markRaw } from 'vue'
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
import { doc, getDoc, onSnapshot, setDoc, type Unsubscribe } from 'firebase/firestore'
import { auth, db } from '@/config/firebase'
import type { User, SubscriptionTier } from '@/types'
import { TIER_LIMITS } from '@/config/constants'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null)
  const firebaseUser = shallowRef<FirebaseUser | null>(null)
  const customClaims = ref<Record<string, any> | null>(null)
  const loading = ref(true)
  const error = ref<string | null>(null)

  let unsubscribeUserDoc: Unsubscribe | null = null

  // Getters
  const isAuthenticated = computed(() => !!user.value)
  const subscriptionTier = computed(() => {
    // Prefer custom claims for security, fall back to user doc
    const tokenSubscription = customClaims.value?.subscription as string
    return tokenSubscription || user.value?.subscription || 'free'
  })
  const isPro = computed(() => ['pro', 'business', 'enterprise'].includes(subscriptionTier.value))
  const isBusiness = computed(() => ['business', 'enterprise'].includes(subscriptionTier.value))
  const tierLimits = computed(() => TIER_LIMITS[subscriptionTier.value as SubscriptionTier])

  // Feature specific access
  const canUsePremiumTemplates = computed(() => tierLimits.value.canUsePremiumTemplates)
  const canExportPDF = computed(() => tierLimits.value.canExportPDF)
  const canExportSVG = computed(() => tierLimits.value.canExportSVG)
  const canExportTIFF = computed(() => tierLimits.value.canExportTIFF)
  const canUseTeamCollaboration = computed(() => tierLimits.value.canUseTeamCollaboration)
  const canUseAPI = computed(() => tierLimits.value.canUseAPI)
  const canUseWhiteLabel = computed(() => tierLimits.value.canUseWhiteLabel)
  const canUseAnalytics = computed(() => tierLimits.value.canUseAnalytics)
  const canCreateMoreProjects = computed(() => {
    const projectCount = user.value?.stats?.projectCount ?? 0
    const limit = tierLimits.value?.projects ?? 0
    return projectCount < limit
  })
  const canCreateMoreBrandKits = computed(() => {
    const currentKits = user.value?.brandKit ? 1 : 0
    const limit = tierLimits.value?.brandKits ?? 0
    return currentKits < limit
  })

  // Demo mode users for testing
  const DEMO_USERS: Record<string, User> = {
    'demo@free.com': {
      id: 'demo-free-user',
      email: 'demo@free.com',
      displayName: 'Demo Free User',
      role: 'user',
      subscription: 'free',
      stats: {
        storageUsed: 0,
        activeDays: [],
        projectCount: 0,
        templateCount: 0,
        totalDownloads: 0,
      },
      preferences: {
        theme: 'system',
        language: 'en',
        defaultCountry: 'KE',
        emailNotifications: true,
        marketingEmails: false,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    'demo@pro.com': {
      id: 'demo-pro-user',
      email: 'demo@pro.com',
      displayName: 'Demo Pro User',
      role: 'user',
      subscription: 'pro',
      stats: {
        storageUsed: 0,
        activeDays: [],
        projectCount: 0,
        templateCount: 0,
        totalDownloads: 0,
      },
      preferences: {
        theme: 'system',
        language: 'en',
        defaultCountry: 'KE',
        emailNotifications: true,
        marketingEmails: false,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    'demo@business.com': {
      id: 'demo-business-user',
      email: 'demo@business.com',
      displayName: 'Demo Business User',
      role: 'creator',
      subscription: 'business',
      stats: {
        storageUsed: 0,
        activeDays: [],
        projectCount: 0,
        templateCount: 0,
        totalDownloads: 0,
      },
      preferences: {
        theme: 'system',
        language: 'en',
        defaultCountry: 'KE',
        emailNotifications: true,
        marketingEmails: false,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  }

  const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true'

  /**
   * Initialize auth state listener
   */
  async function initialize(): Promise<void> {
    // In demo mode, skip Firebase auth listener
    if (isDemoMode) {
      console.log('Running in DEMO MODE - Firebase auth disabled')
      loading.value = false
      return
    }

    return new Promise((resolve) => {
      onAuthStateChanged(auth, async (fbUser) => {
        firebaseUser.value = fbUser ? markRaw(fbUser) : null

        if (unsubscribeUserDoc) {
          unsubscribeUserDoc()
          unsubscribeUserDoc = null
        }
        
        if (fbUser) {
          await ensureUserProfile(fbUser)
          await refreshAdminClaims(fbUser)

          // Get custom claims from token
          const tokenResult = await fbUser.getIdTokenResult()
          customClaims.value = tokenResult.claims

          unsubscribeUserDoc = onSnapshot(doc(db, 'users', fbUser.uid), (snap) => {
            if (!snap.exists()) return
            const data = snap.data()
            user.value = { 
              id: fbUser.uid, 
              ...data,
              stats: {
                storageUsed: 0,
                activeDays: [],
                projectCount: 0,
                templateCount: 0,
                totalDownloads: 0,
                ...(data.stats || {})
              }
            } as User
          })
        } else {
          user.value = null
          customClaims.value = null
        }
        
        loading.value = false
        resolve()
      })
    })
  }

  async function sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms))
  }

  async function getUserProfile(uid: string): Promise<User | null> {
    const userDoc = await getDoc(doc(db, 'users', uid))
    if (!userDoc.exists()) return null
    const data = userDoc.data()
    return { 
      id: uid, 
      ...data,
      stats: {
        storageUsed: 0,
        activeDays: [],
        projectCount: 0,
        templateCount: 0,
        totalDownloads: 0,
        ...(data.stats || {})
      }
    } as User
  }

  async function waitForUserProfile(uid: string): Promise<User | null> {
    const delays = [150, 300, 600, 900, 1200]
    for (const delay of delays) {
      const profile = await getUserProfile(uid)
      if (profile) return profile
      await sleep(delay)
    }
    return null
  }

  async function refreshAdminClaims(fbUser: FirebaseUser): Promise<void> {
    if (user.value?.role !== 'admin') return

    const delays = [0, 400, 800, 1200]
    for (const delay of delays) {
      if (delay) await sleep(delay)
      await fbUser.getIdToken(true)
      const tokenResult = await fbUser.getIdTokenResult()
      customClaims.value = tokenResult.claims
      if (tokenResult.claims.admin === true) return
    }
  }

  async function ensureUserProfile(
    fbUser: FirebaseUser,
    data?: Partial<User>
  ): Promise<void> {
    const uid = fbUser.uid
    const existing = await getUserProfile(uid)
    if (existing) {
      user.value = existing
      return
    }

    const provisioned = await waitForUserProfile(uid)
    if (provisioned) {
      user.value = provisioned
      return
    }

    await createUserProfile(uid, data)
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

    const existing = await getDoc(doc(db, 'users', uid))
    if (existing.exists()) {
      user.value = { id: uid, ...existing.data() } as User
      return
    }

    // Build user object without undefined values (Firestore rejects undefined)
    const newUser: Record<string, any> = {
      email: fbUser.email!,
      displayName: data?.displayName || fbUser.displayName || 'User',
      role: 'user',
      subscription: 'free',
      stats: {
        storageUsed: 0,
        activeDays: [],
        projectCount: 0,
        templateCount: 0,
        totalDownloads: 0,
      },
      preferences: {
        theme: 'system',
        language: 'en',
        defaultCountry: 'KE',
        emailNotifications: true,
        marketingEmails: false,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Only add photoURL if it exists (Firestore doesn't accept undefined)
    if (fbUser.photoURL) {
      newUser.photoURL = fbUser.photoURL
    }

    // Merge any additional data, filtering out undefined values
    if (data) {
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          newUser[key] = value
        }
      })
    }

    await setDoc(doc(db, 'users', uid), newUser)
    user.value = { id: uid, ...newUser } as User
  }

  async function updateLastLogin(uid: string): Promise<void> {
    const now = new Date().toISOString()
    await setDoc(
      doc(db, 'users', uid),
      {
        lastLoginAt: now,
        updatedAt: now,
      },
      { merge: true },
    )
  }

  /**
   * Sign in with email and password
   */
  async function signIn(emailInput: string, password: string): Promise<void> {
    loading.value = true
    error.value = null
    
    try {
      // Demo mode - use mock users
      if (isDemoMode) {
        const demoUser = DEMO_USERS[emailInput]
        if (demoUser) {
          user.value = demoUser
          customClaims.value = { subscription: demoUser.subscription }
          return
        }
        // Allow any email in demo mode with a default user
        const defaultUser = {
          id: 'demo-user-' + Date.now(),
          email: emailInput,
          displayName: emailInput.split('@')[0] ?? emailInput,
          role: 'user',
          subscription: 'pro', // Give pro access in demo
          stats: {
            storageUsed: 0,
            activeDays: [],
            projectCount: 0,
            templateCount: 0,
            totalDownloads: 0,
          },
          preferences: {
            theme: 'system',
            language: 'en',
            defaultCountry: 'KE',
            emailNotifications: true,
            marketingEmails: false,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        user.value = defaultUser as User
        customClaims.value = { subscription: defaultUser.subscription }
        return
      }

      const result = await signInWithEmailAndPassword(auth, emailInput, password)
      await ensureUserProfile(result.user)
      await refreshAdminClaims(result.user)
      await updateLastLogin(result.user.uid)
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
      await ensureUserProfile(result.user, { displayName })
      await refreshAdminClaims(result.user)
      await updateLastLogin(result.user.uid)
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
        await ensureUserProfile(result.user)
      } else {
        await ensureUserProfile(result.user)
      }

      await refreshAdminClaims(result.user)
      await updateLastLogin(result.user.uid)
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

    if (unsubscribeUserDoc) {
      unsubscribeUserDoc()
      unsubscribeUserDoc = null
    }
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
    isCreator: computed(() => 
      user.value?.role === 'creator' || user.value?.role === 'admin'
    ),
    isAdmin: computed(() => user.value?.role === 'admin'),
    subscriptionTier,
    tierLimits,
    isPro,
    isBusiness,
    canUsePremiumTemplates,
    canExportPDF,
    canExportSVG,
    canExportTIFF,
    canUseTeamCollaboration,
    canUseAPI,
    canUseWhiteLabel,
    canUseAnalytics,
    canCreateMoreProjects,
    canCreateMoreBrandKits,
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
