import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  type DocumentData,
} from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { CustomHoliday } from '@/types'

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

function coerceIsoDate(value: unknown): string {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') {
    const maybe = value as any
    if (typeof maybe.toDate === 'function') {
      const d = maybe.toDate() as Date
      if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10)
    }
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10)
  }
  return ''
}

function normalizeHolidayDoc(id: string, data: DocumentData): CustomHoliday | null {
  const date = coerceIsoDate(data?.date)
  if (!date) return null

  const createdAt = typeof data?.createdAt === 'string' ? data.createdAt : new Date().toISOString()
  const updatedAt = typeof data?.updatedAt === 'string' ? data.updatedAt : createdAt

  return {
    id,
    date,
    name: String(data?.name || 'Custom'),
    localName: typeof data?.localName === 'string' ? data.localName : undefined,
    type: 'custom',
    isPublic: Boolean(data?.isPublic ?? false),
    country: data?.country as any,
    color: typeof data?.color === 'string' ? data.color : '#2563eb',
    recurrence: (data?.recurrence ?? null) as any,
    notes: typeof data?.notes === 'string' ? data.notes : undefined,
    createdBy: typeof data?.createdBy === 'string' ? data.createdBy : '',
    createdAt,
    updatedAt,
  }
}

class CustomHolidaysService {
  private readonly isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true'

  async list(userId: string): Promise<CustomHoliday[]> {
    if (this.isDemoMode) return []
    if (!userId) return []

    const snap = await getDocs(collection(db, 'users', userId, 'customHolidays'))
    const out: CustomHoliday[] = []
    for (const docSnap of snap.docs) {
      const normalized = normalizeHolidayDoc(docSnap.id, docSnap.data())
      if (normalized) out.push(normalized)
    }

    out.sort((a, b) => a.date.localeCompare(b.date))
    return out
  }

  async upsert(userId: string, holiday: CustomHoliday): Promise<void> {
    if (this.isDemoMode) return
    if (!userId) return
    if (!holiday?.id) return

    const cleaned = stripUndefinedDeep({
      date: holiday.date,
      name: holiday.name,
      localName: holiday.localName,
      type: 'custom',
      color: holiday.color,
      recurrence: holiday.recurrence ?? null,
      notes: holiday.notes,
      createdBy: holiday.createdBy || userId,
      createdAt: holiday.createdAt,
      updatedAt: holiday.updatedAt,
    })

    await setDoc(doc(db, 'users', userId, 'customHolidays', holiday.id), cleaned, { merge: true })
  }

  async remove(userId: string, holidayId: string): Promise<void> {
    if (this.isDemoMode) return
    if (!userId) return
    if (!holidayId) return

    await deleteDoc(doc(db, 'users', userId, 'customHolidays', holidayId))
  }
}

export const customHolidaysService = new CustomHolidaysService()
