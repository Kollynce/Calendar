import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  where,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { CalendarTemplate } from '@/data/templates/calendar-templates'

// Debug: Check if we're in demo mode
const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true'
console.log('[MarketplaceService] Demo mode:', isDemoMode)
console.log('[MarketplaceService] Firebase config:', {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
})

export interface MarketplaceProduct {
  id?: string
  name: string
  description: string
  category: string
  price: number
  creatorId: string
  creatorName: string
  downloads: number
  features: string[]
  isPopular: boolean
  isNew: boolean
  requiredTier: 'free' | 'pro' | 'business'
  templateData: Partial<CalendarTemplate>
  thumbnail?: string
  publishedAt?: any
  updatedAt?: any
}

class MarketplaceService {
  private readonly collectionName = 'marketplace_templates'

  async publishTemplate(productData: MarketplaceProduct): Promise<string> {
    // Check if we're in demo mode
    if (isDemoMode) {
      console.log('[MarketplaceService] Demo mode detected, simulating publish...')
      // Simulate a successful publish in demo mode
      const fakeId = 'demo-template-' + Date.now()
      console.log('[MarketplaceService] Simulated publish with ID:', fakeId)
      return fakeId
    }

    const id = productData.id || doc(collection(db, this.collectionName)).id
    const docRef = doc(db, this.collectionName, id)
    
    // Comprehensive recursive function to remove undefined values for Firestore
    const sanitizeForFirestore = (obj: any): any => {
      // Handle null/undefined
      if (obj === null || obj === undefined) return null
      
      // Handle non-objects (primitives)
      if (typeof obj !== 'object') return obj
      
      // Handle arrays
      if (Array.isArray(obj)) {
        return obj.map(v => sanitizeForFirestore(v)).filter(v => v !== null)
      }
      
      // Handle Firestore specific types or class instances (except plain Objects)
      // Check for constructor name to avoid stripping out Timestamp, FieldValue, etc.
      if (obj.constructor && obj.constructor.name !== 'Object') {
        return obj
      }
      
      // Handle plain objects
      const sanitized: any = {}
      for (const [key, value] of Object.entries(obj)) {
        const cleaned = sanitizeForFirestore(value)
        if (cleaned !== null && cleaned !== undefined) {
          sanitized[key] = cleaned
        }
      }
      return sanitized
    }

    const data = sanitizeForFirestore({
      ...productData,
      id,
      downloads: productData.downloads || 0,
      // Temporarily simplify templateData and thumbnail for testing
      templateData: null, // TODO: Fix this to properly handle complex template data
      thumbnail: null, // TODO: Handle large base64 thumbnails properly
      publishedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    console.log('[MarketplaceService] Publishing product:', id, data)
    console.log('[MarketplaceService] Data validation check:', {
      name: data.name,
      nameLength: data.name?.length,
      description: data.description,
      descriptionLength: data.description?.length,
      category: data.category,
      price: data.price,
      requiredTier: data.requiredTier,
      features: data.features,
      featuresLength: data.features?.length,
      templateData: data.templateData,
      templateDataType: typeof data.templateData,
      thumbnail: data.thumbnail,
      downloads: data.downloads,
      creatorId: data.creatorId,
      creatorName: data.creatorName,
      creatorNameLength: data.creatorName?.length,
    })

    // Log the complete data object for debugging
    console.log('[MarketplaceService] Complete data object:', JSON.stringify(data, null, 2))

    // Debug: Check if creatorId matches authenticated user
    try {
      const auth = import('@/config/firebase').then(module => module.auth)
      const currentUser = (await auth).currentUser
      console.log('[MarketplaceService] Current auth user:', {
        uid: currentUser?.uid,
        email: currentUser?.email,
        isAnonymous: currentUser?.isAnonymous,
      })
      console.log('[MarketplaceService] Product creatorId:', data.creatorId)
      console.log('[MarketplaceService] UID match:', currentUser?.uid === data.creatorId)
    } catch (e) {
      console.log('[MarketplaceService] Could not check auth state:', e)
    }

    try {
      await setDoc(docRef, data, { merge: true })
      return id
    } catch (error) {
      console.error('[MarketplaceService] Failed to publish template:', error)
      throw error
    }
  }

  async listTemplates(category?: string, max = 50): Promise<MarketplaceProduct[]> {
    // Check if we're in demo mode
    if (isDemoMode) {
      console.log('[MarketplaceService] Demo mode detected, returning mock templates...')
      // Return mock data for demo mode
      return [
        {
          id: 'demo-template-1',
          name: 'Demo Travel Journal',
          description: 'A beautiful travel journal template for documenting your adventures.',
          category: 'monthly',
          price: 0,
          creatorId: 'demo-user',
          creatorName: 'Demo Creator',
          downloads: 42,
          features: ['Monthly layout', 'Travel themed', 'Customizable'],
          isPopular: true,
          isNew: false,
          requiredTier: 'free',
          templateData: {},
          thumbnail: undefined,
        }
      ]
    }

    let q = query(
      collection(db, this.collectionName),
      orderBy('publishedAt', 'desc'),
      limit(max)
    )

    if (category && category !== 'all') {
      q = query(q, where('category', '==', category))
    }

    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as MarketplaceProduct))
  }
}

export const marketplaceService = new MarketplaceService()
