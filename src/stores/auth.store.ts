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
  // State
  const user = ref<User | null>(null)
  const firebaseUser = ref<FirebaseUser | null>(null)
  const loading = ref(true)
  const error = ref<string | null>(null)

  // Getters
  const isAuthenticated = computed(() => !!user.value)
  const subscriptionTier = computed(() => user.value?.subscription || 'free')
  const isPro = computed(() => ['pro', 'business', 'enterprise'].includes(subscriptionTier.value))
  const tierLimits = computed(() => TIER_LIMITS[subscriptionTier.value])

  // Demo mode users for testing
  const DEMO_USERS: Record<string, User> = {
    'demo@free.com': {
      id: 'demo-free-user',
      email: 'demo@free.com',
      displayName: 'Demo Free User',
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
    },
    'demo@pro.com': {
      id: 'demo-pro-user',
      email: 'demo@pro.com',
      displayName: 'Demo Pro User',
      role: 'user',
      subscription: 'pro',
      preferences: {
        theme: 'system',
        language: 'en',
        defaultCountry: 'ZA',
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
      preferences: {
        theme: 'system',
        language: 'en',
        defaultCountry: 'ZA',
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
      console.log('🎭 Running in DEMO MODE - Firebase auth disabled')
      loading.value = false
      return
    }

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

    // Build user object without undefined values (Firestore rejects undefined)
    const newUser: Record<string, any> = {
      email: fbUser.email!,
      displayName: data?.displayName || fbUser.displayName || 'User',
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
    isCreator: computed(() => 
      user.value?.role === 'creator' || user.value?.role === 'admin'
    ),
    isAdmin: computed(() => user.value?.role === 'admin'),
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
