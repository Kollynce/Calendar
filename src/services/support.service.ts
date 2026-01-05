import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db } from '@/config/firebase'
import type {
  SupportTicket,
  SupportTicketInput,
  SupportTicketStatus,
} from '@/types'

class SupportService {
  private readonly collectionRef = collection(db, 'supportTickets')
  private readonly isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true'

  async submitTicket(payload: SupportTicketInput): Promise<void> {
    const ticket = {
      subject: payload.subject,
      message: payload.message,
      priority: payload.priority,
      userId: payload.userId ?? null,
      email: payload.email ?? null,
      tier: payload.tier ?? null,
      status: 'open' as SupportTicketStatus,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    if (this.isDemoMode) {
      console.info('[SupportService] Demo mode – ticket not saved:', ticket)
      return
    }

    await addDoc(this.collectionRef, ticket)
  }

  async listRecentTickets(limitCount = 100): Promise<SupportTicket[]> {
    const ticketsQuery = query(this.collectionRef, orderBy('createdAt', 'desc'), limit(limitCount))

    if (this.isDemoMode) {
      console.info('[SupportService] Demo mode – returning empty ticket list')
      return []
    }

    const snapshot = await getDocs(ticketsQuery)
    return snapshot.docs.map((docSnap) => this.mapDocToTicket(docSnap))
  }

  async updateTicketStatus(ticketId: string, status: SupportTicketStatus): Promise<void> {
    if (this.isDemoMode) {
      console.info('[SupportService] Demo mode – status not updated', { ticketId, status })
      return
    }

    const ticketDoc = doc(this.collectionRef, ticketId)
    await updateDoc(ticketDoc, {
      status,
      updatedAt: serverTimestamp(),
    })
  }

  private mapDocToTicket(docSnap: QueryDocumentSnapshot): SupportTicket {
    const data = docSnap.data() as Record<string, any>
    const toIsoString = (value: unknown): string | null => {
      if (!value) return null
      if (typeof value === 'string') return value
      if (typeof value === 'object' && value && 'toDate' in value && typeof value.toDate === 'function') {
        const d = value.toDate()
        return d instanceof Date ? d.toISOString() : null
      }
      return null
    }

    return {
      id: docSnap.id,
      subject: String(data.subject || ''),
      message: String(data.message || ''),
      priority: (data.priority === 'priority' ? 'priority' : 'standard'),
      status: (data.status === 'in_progress' || data.status === 'resolved' || data.status === 'closed') ? data.status : 'open',
      userId: typeof data.userId === 'string' ? data.userId : null,
      email: typeof data.email === 'string' ? data.email : null,
      tier: typeof data.tier === 'string' ? data.tier : null,
      createdAt: toIsoString(data.createdAt),
      updatedAt: toIsoString(data.updatedAt),
    }
  }
}

export const supportService = new SupportService()
