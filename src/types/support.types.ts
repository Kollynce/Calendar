export type SupportTicketPriority = 'standard' | 'priority'

export type SupportTicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'

export interface SupportTicketInput {
  subject: string
  message: string
  priority: SupportTicketPriority
  userId?: string | null
  email?: string | null
  tier?: string | null
}

export interface SupportTicket {
  id: string
  subject: string
  message: string
  priority: SupportTicketPriority
  status: SupportTicketStatus
  userId: string | null
  email: string | null
  tier: string | null
  createdAt: string | null
  updatedAt: string | null
}
