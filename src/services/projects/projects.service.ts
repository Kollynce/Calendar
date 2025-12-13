import {
  collection,
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
    await setDoc(doc(db, 'projects', project.id), project, { merge: true })
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
