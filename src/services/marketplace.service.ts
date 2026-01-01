import {
  collection,
  doc,
  getDoc,
  getDocs,
  deleteDoc,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  serverTimestamp,
} from 'firebase/firestore'
import { ref as storageRef, uploadString, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { db, storage } from '@/config/firebase'
import type { CalendarTemplate } from '@/data/templates/calendar-templates'
import type { CanvasState } from '@/types'

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
  isPublished: boolean
  requiredTier: 'free' | 'pro' | 'business'
  sourceProjectId?: string
  templateData: Partial<CalendarTemplate>
  canvasObjects?: any[] // Legacy support
  canvasState?: CanvasState | null
  thumbnail?: string | null
  publishedAt?: any
  updatedAt?: any
}

class MarketplaceService {
  private readonly collectionName = 'marketplace_templates'

  private async uploadThumbnailDataUrl(thumbnail: string, path: string, contentType?: string): Promise<string> {
    const ref = storageRef(storage, path)
    const metadata = contentType ? { contentType } : undefined
    await uploadString(ref, thumbnail, 'data_url', metadata)
    return await getDownloadURL(ref)
  }

  async uploadThumbnailFile(file: File, creatorId: string, templateId: string): Promise<string> {
    const extension = file.name.split('.').pop() || 'png'
    const path = `marketplace-thumbnails/${creatorId}/${templateId}-${Date.now()}.${extension}`
    const ref = storageRef(storage, path)
    await uploadBytes(ref, file, { contentType: file.type || `image/${extension}` })
    return await getDownloadURL(ref)
  }

  private async deleteThumbnailFromStorage(thumbnailUrl: string): Promise<void> {
    if (!thumbnailUrl || !thumbnailUrl.includes('marketplace-thumbnails')) return
    try {
      const decodedUrl = decodeURIComponent(thumbnailUrl)
      const pathMatch = decodedUrl.match(/marketplace-thumbnails\/[^?]+/)
      if (pathMatch) {
        const ref = storageRef(storage, pathMatch[0])
        await deleteObject(ref)
        console.log('[MarketplaceService] Deleted thumbnail from storage:', pathMatch[0])
      }
    } catch (error) {
      console.warn('[MarketplaceService] Failed to delete thumbnail from storage:', error)
    }
  }

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

    let thumbnail = productData.thumbnail
    if (thumbnail?.startsWith('data:')) {
      try {
        const mimeStart = thumbnail.indexOf(':') + 1
        const mimeEnd = thumbnail.indexOf(';')
        const mimeType = mimeStart > 0 && mimeEnd > mimeStart
          ? thumbnail.substring(mimeStart, mimeEnd)
          : 'image/png'
        const extension =
          mimeType.split('/')[1] ||
          thumbnail.substring(thumbnail.indexOf('/') + 1, thumbnail.indexOf(';')) ||
          'png'
        const path = `marketplace-thumbnails/${productData.creatorId}/${id}-${Date.now()}.${extension}`
        thumbnail = await this.uploadThumbnailDataUrl(thumbnail, path, mimeType)
      } catch (error) {
        console.warn('[MarketplaceService] Failed to upload thumbnail, defaulting to null', error)
        thumbnail = null
      }
    }

    const data = sanitizeForFirestore({
      ...productData,
      id,
      downloads: productData.downloads || 0,
      thumbnail,
      // Temporarily simplify templateData for now
      templateData: null, // TODO: Fix this to properly handle complex template data
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

    const isUpdatingExisting = Boolean(productData.id)

    try {
      if (isUpdatingExisting) {
        await setDoc(docRef, data, { merge: true })
      } else {
        await setDoc(docRef, data)
      }
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
          isPublished: true,
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

  async getTemplateById(id: string): Promise<MarketplaceProduct | null> {
    if (isDemoMode) {
      return {
        id,
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
        isPublished: true,
        requiredTier: 'free',
        templateData: {},
        thumbnail: undefined,
      }
    }

    const docRef = doc(db, this.collectionName, id)
    const snapshot = await getDoc(docRef)
    if (!snapshot.exists()) return null
    return { id: snapshot.id, ...snapshot.data() } as unknown as MarketplaceProduct
  }

  async listTemplatesByCreator(creatorId: string, max = 4): Promise<MarketplaceProduct[]> {
    if (isDemoMode) {
      return [{
        id: 'demo-template-related',
        name: 'Demo Related Template',
        description: 'Another demo template.',
        category: 'monthly',
        price: 0,
        creatorId,
        creatorName: 'Demo Creator',
        downloads: 21,
        features: ['Demo'],
        isPopular: false,
        isNew: true,
        isPublished: true,
        requiredTier: 'free',
        templateData: {},
        thumbnail: undefined,
      }]
    }

    const q = query(
      collection(db, this.collectionName),
      where('creatorId', '==', creatorId),
      orderBy('publishedAt', 'desc'),
      limit(max)
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as MarketplaceProduct))
  }

  async updateTemplate(id: string, data: Partial<MarketplaceProduct>): Promise<void> {
    if (isDemoMode) {
      console.log('[MarketplaceService] Demo mode: simulating update for', id)
      return
    }

    const docRef = doc(db, this.collectionName, id)
    
    const sanitizeForFirestore = (obj: any): any => {
      if (obj === null || obj === undefined) return null
      if (typeof obj !== 'object') return obj
      if (Array.isArray(obj)) {
        return obj.map(v => sanitizeForFirestore(v)).filter(v => v !== null)
      }
      if (obj.constructor && obj.constructor.name !== 'Object') {
        return obj
      }
      const sanitized: any = {}
      for (const [key, value] of Object.entries(obj)) {
        const cleaned = sanitizeForFirestore(value)
        if (cleaned !== null && cleaned !== undefined) {
          sanitized[key] = cleaned
        }
      }
      return sanitized
    }

    const updateData = sanitizeForFirestore({
      ...data,
      updatedAt: serverTimestamp(),
    })

    delete updateData.id
    delete updateData.creatorId
    delete updateData.publishedAt

    console.log('[MarketplaceService] Updating template:', id, updateData)
    await updateDoc(docRef, updateData)
  }

  async deleteTemplate(id: string): Promise<void> {
    if (isDemoMode) {
      console.log('[MarketplaceService] Demo mode: simulating delete for', id)
      return
    }

    const template = await this.getTemplateById(id)
    if (template?.thumbnail) {
      await this.deleteThumbnailFromStorage(template.thumbnail)
    }

    const docRef = doc(db, this.collectionName, id)
    await deleteDoc(docRef)
    console.log('[MarketplaceService] Deleted template:', id)
  }

  async incrementDownloads(id: string): Promise<void> {
    if (isDemoMode) return
    
    const template = await this.getTemplateById(id)
    if (!template) return
    
    const docRef = doc(db, this.collectionName, id)
    await updateDoc(docRef, {
      downloads: (template.downloads || 0) + 1,
      updatedAt: serverTimestamp(),
    })
  }
}

export const marketplaceService = new MarketplaceService()
