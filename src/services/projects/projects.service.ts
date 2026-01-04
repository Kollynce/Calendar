import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  where,
} from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { Project } from '@/types'

function stripUndefinedDeep<T>(value: T): T {
  if (value === undefined) return undefined as unknown as T
  if (value === null) return value

  if (Array.isArray(value)) {
    return value
      .map((v) => stripUndefinedDeep(v))
      .filter((v) => v !== undefined) as unknown as T
  }

  if (typeof value === 'object') {
    const input = value as Record<string, unknown>
    const out: Record<string, unknown> = {}
    Object.entries(input).forEach(([k, v]) => {
      if (v === undefined) return
      const cleaned = stripUndefinedDeep(v)
      if (cleaned === undefined) return
      out[k] = cleaned
    })
    return out as T
  }

  return value
}

class ProjectsService {
  private readonly isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true'

  async getById(id: string): Promise<Project | null> {
    if (this.isDemoMode) return null
    const snapshot = await getDoc(doc(db, 'projects', id))
    if (!snapshot.exists()) return null
    return { id: snapshot.id, ...(snapshot.data() as Omit<Project, 'id'>) }
  }

  async save(project: Project): Promise<void> {
    if (this.isDemoMode) return
    const cleaned = stripUndefinedDeep(project)
    await setDoc(doc(db, 'projects', project.id), cleaned, { merge: true })
  }

  async delete(projectId: string): Promise<void> {
    if (this.isDemoMode) return
    await deleteDoc(doc(db, 'projects', projectId))
  }

  async listForUser(userId: string, max = 20): Promise<Project[]> {
    if (this.isDemoMode) return []
    const q = query(
      collection(db, 'projects'),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc'),
      limit(max),
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<Project, 'id'>),
    }))
  }
}

export const projectsService = new ProjectsService()
