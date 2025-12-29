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
      publishedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    console.log('[MarketplaceService] Publishing product:', id, data)

    try {
      await setDoc(docRef, data, { merge: true })
      return id
    } catch (error) {
      console.error('[MarketplaceService] Failed to publish template:', error)
      throw error
    }
  }

  async listTemplates(category?: string, max = 50): Promise<MarketplaceProduct[]> {
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
