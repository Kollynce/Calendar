import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  type UploadTaskSnapshot,
  type UploadMetadata,
} from 'firebase/storage'
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
  type DocumentData,
} from 'firebase/firestore'
import { db, storage } from '@/config/firebase'

export type UploadCategory = 'sticker' | 'background'

export interface UserUploadAsset {
  id: string
  name: string
  url: string
  storagePath: string
  contentType: string
  size: number
  category: UploadCategory
  createdAt: number
  updatedAt?: number
}

export interface UploadUserAssetOptions {
  folder?: string
  category?: UploadCategory
  onProgress?: (progress: number, snapshot: UploadTaskSnapshot) => void
}

const DEFAULT_UPLOAD_FOLDER = 'uploads'

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_\.]/g, '_')
}

function generateAssetId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `asset-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  }
}

function buildUserAssetPath(userId: string, assetId: string, fileName: string, folder?: string): string {
  const safeFolder = folder?.trim() ? folder.trim() : DEFAULT_UPLOAD_FOLDER
  const safeName = sanitizeFileName(fileName)
  return `users/${userId}/${safeFolder}/${assetId}-${safeName}`
}

async function persistMetadata(userId: string, asset: UserUploadAsset): Promise<void> {
  const uploadsCollection = collection(db, 'users', userId, 'uploads')
  await setDoc(doc(uploadsCollection, asset.id), asset)
}

import { checkStorageLimit, updateStorageUsage, trackActiveDay } from './storage-usage.service'
import { useAuthStore } from '@/stores/auth.store'

export async function uploadUserAsset(
  userId: string,
  file: File,
  options: UploadUserAssetOptions = {},
): Promise<UserUploadAsset> {
  if (!userId) throw new Error('User ID is required to upload assets')

  // Track active day on upload
  await trackActiveDay(userId).catch(console.error)

  // Check storage limit
  const authStore = useAuthStore()
  const limit = authStore.tierLimits?.storageLimit || 0
  const canUpload = await checkStorageLimit(userId, file.size, limit)
  
  if (!canUpload) {
    throw new Error(`Storage limit reached. Your limit is ${Math.round(limit / (1024 * 1024))}MB.`)
  }

  const assetId = generateAssetId()
  const storagePath = buildUserAssetPath(userId, assetId, file.name, options.folder)
  const fileRef = storageRef(storage, storagePath)

  const metadata: UploadMetadata = {
    contentType: file.type,
    customMetadata: {
      assetId,
      category: options.category ?? 'sticker',
      originalName: file.name,
    },
  }

  const uploadTask = uploadBytesResumable(fileRef, file, metadata)

  return new Promise<UserUploadAsset>((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (options.onProgress) {
          const progress = snapshot.totalBytes
            ? snapshot.bytesTransferred / snapshot.totalBytes
            : 0
          options.onProgress(progress, snapshot)
        }
      },
      (error) => {
        reject(error)
      },
      async () => {
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref)
          const now = Date.now()
          const asset: UserUploadAsset = {
            id: assetId,
            name: file.name,
            url,
            storagePath,
            contentType: file.type || 'application/octet-stream',
            size: file.size,
            category: options.category ?? 'sticker',
            createdAt: now,
            updatedAt: now,
          }

          await persistMetadata(userId, asset)
          await updateStorageUsage(userId, file.size)
          resolve(asset)
        } catch (error) {
          reject(error)
        }
      },
    )
  })
}

export async function listUserAssets(userId: string): Promise<UserUploadAsset[]> {
  if (!userId) return []

  const uploadsCollection = collection(db, 'users', userId, 'uploads')
  const q = query(uploadsCollection, orderBy('createdAt', 'desc'))

  try {
    const snapshot = await getDocs(q)
    return snapshot.docs
      .map((docSnap) => {
        const data = docSnap.data() as DocumentData
        return {
          id: docSnap.id,
          name: String(data.name || 'Asset'),
          url: String(data.url || ''),
          storagePath: String(data.storagePath || ''),
          contentType: String(data.contentType || 'application/octet-stream'),
          size: Number(data.size || 0),
          category: (data.category as UploadCategory) || 'sticker',
          createdAt: Number(data.createdAt || Date.now()),
          updatedAt: data.updatedAt ? Number(data.updatedAt) : undefined,
        } satisfies UserUploadAsset
      })
      .filter((asset) => !!asset.url && !!asset.storagePath)
  } catch (error) {
    console.error('Failed to list user uploads', error)
    throw error
  }
}

export async function deleteUserAsset(userId: string, asset: Pick<UserUploadAsset, 'id' | 'storagePath' | 'size'>): Promise<void> {
  if (!userId || !asset.storagePath) return

  const uploadsCollection = collection(db, 'users', userId, 'uploads')
  const fileRef = storageRef(storage, asset.storagePath)

  await Promise.all([
    deleteObject(fileRef).catch((error) => {
      console.error('Failed to delete storage object', error)
      throw error
    }),
    deleteDoc(doc(uploadsCollection, asset.id)).catch((error) => {
      console.error('Failed to delete metadata document', error)
      throw error
    }),
    updateStorageUsage(userId, -(asset.size || 0)).catch(err => {
      console.error('Failed to update storage usage on delete', err)
    })
  ])
}
