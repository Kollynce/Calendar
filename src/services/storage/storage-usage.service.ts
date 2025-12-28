import { db } from '@/config/firebase'
import { doc, getDoc, updateDoc, increment, arrayUnion, collection, getDocs, query, where } from 'firebase/firestore'
import type { UserStats } from '@/types/user.types'

export const USAGE_LIMITS = {
  FREE_STORAGE: 50 * 1024 * 1024, // 50MB
}

export async function getUserStats(userId: string): Promise<UserStats | null> {
  const userDoc = await getDoc(doc(db, 'users', userId))
  if (!userDoc.exists()) return null
  const data = userDoc.data()
  if (!data.stats) return null
  return data.stats as UserStats
}

/**
 * Recalculate all stats for a user by scanning their data
 */
export async function recalculateUserStats(userId: string): Promise<UserStats> {
  const userRef = doc(db, 'users', userId)
  
  // 1. Calculate storage from uploads
  const uploadsRef = collection(db, 'users', userId, 'uploads')
  const uploadsSnap = await getDocs(uploadsRef)
  let totalStorage = 0
  uploadsSnap.forEach(doc => {
    totalStorage += Number(doc.data().size || 0)
  })

  // 2. Calculate project count
  const projectsRef = collection(db, 'projects')
  const projectsQuery = query(projectsRef, where('userId', '==', userId))
  const projectsSnap = await getDocs(projectsQuery)
  const projectCount = projectsSnap.size

  // 3. Get existing stats to preserve activeDays if any
  const userDoc = await getDoc(userRef)
  const currentStats = userDoc.exists() ? userDoc.data().stats as UserStats | undefined : null
  
  const stats: UserStats = {
    storageUsed: totalStorage,
    projectCount: projectCount,
    activeDays: currentStats?.activeDays || [new Date().toISOString().split('T')[0]],
    templateCount: currentStats?.templateCount || 0,
    totalDownloads: currentStats?.totalDownloads || 0
  } as UserStats

  await updateDoc(userRef, {
    stats,
    updatedAt: new Date().toISOString()
  })

  return stats
}

export async function updateStorageUsage(userId: string, sizeDelta: number): Promise<void> {
  const userRef = doc(db, 'users', userId)
  const userDoc = await getDoc(userRef)
  
  if (userDoc.exists() && !userDoc.data().stats) {
    // If stats don't exist, recalculate everything instead of just incrementing
    await recalculateUserStats(userId)
  } else {
    await updateDoc(userRef, {
      'stats.storageUsed': increment(sizeDelta),
      updatedAt: new Date().toISOString()
    })
  }
}

export async function trackActiveDay(userId: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0]
  const userRef = doc(db, 'users', userId)
  const userDoc = await getDoc(userRef)

  if (userDoc.exists() && !userDoc.data().stats) {
    await recalculateUserStats(userId)
  } else {
    await updateDoc(userRef, {
      'stats.activeDays': arrayUnion(today),
      updatedAt: new Date().toISOString()
    })
  }
}

export async function updateProjectCount(userId: string, delta: number): Promise<void> {
  const userRef = doc(db, 'users', userId)
  const userDoc = await getDoc(userRef)
  
  if (userDoc.exists() && !userDoc.data().stats) {
    await recalculateUserStats(userId)
  } else {
    await updateDoc(userRef, {
      'stats.projectCount': increment(delta),
      updatedAt: new Date().toISOString()
    })
  }
}

export async function checkStorageLimit(userId: string, incomingSize: number, limit: number): Promise<boolean> {
  const stats = await getUserStats(userId)
  // If stats are missing, we should probably allow the check but trigger a sync
  if (!stats || (stats.storageUsed === 0 && incomingSize > 0)) {
    const syncedStats = await recalculateUserStats(userId)
    return (syncedStats.storageUsed + incomingSize) <= limit
  }
  
  return (stats.storageUsed + incomingSize) <= limit
}

