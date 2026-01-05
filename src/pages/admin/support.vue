<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppLayout from '@/layouts/AppLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { supportService } from '@/services/support.service'
import { useAuthStore } from '@/stores'
import type {
  SupportTicket,
  SupportTicketPriority,
  SupportTicketStatus,
} from '@/types'
import {
  ArrowPathIcon,
  BoltIcon,
  EnvelopeIcon,
  ExclamationCircleIcon,
  UserIcon,
} from '@heroicons/vue/24/outline'

const authStore = useAuthStore()

const loading = ref(false)
const error = ref<string | null>(null)
const tickets = ref<SupportTicket[]>([])
const search = ref('')
const statusFilter = ref<'all' | SupportTicketStatus>('open')
const priorityFilter = ref<'all' | SupportTicketPriority>('all')
const updatingTicketId = ref<string | null>(null)

const statusOptions: { value: SupportTicketStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

const priorityOptions: { value: SupportTicketPriority; label: string }[] = [
  { value: 'priority', label: 'Priority' },
  { value: 'standard', label: 'Standard' },
]

function formatDate(value: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return `${d.toLocaleDateString()} • ${d.toLocaleTimeString()}`
}

const stats = computed(() => {
  const total = tickets.value.length
  const open = tickets.value.filter((t) => t.status === 'open').length
  const inProgress = tickets.value.filter((t) => t.status === 'in_progress').length
  const priority = tickets.value.filter((t) => t.priority === 'priority' && t.status !== 'closed').length
  return {
    total,
    open,
    inProgress,
    priority,
  }
})

const filteredTickets = computed(() => {
  const query = search.value.trim().toLowerCase()
  return tickets.value.filter((ticket) => {
    const matchesStatus = statusFilter.value === 'all' ? true : ticket.status === statusFilter.value
    const matchesPriority = priorityFilter.value === 'all' ? true : ticket.priority === priorityFilter.value
    const matchesQuery = query
      ? [ticket.subject, ticket.message, ticket.email, ticket.tier]
          .filter(Boolean)
          .some((field) => field!.toLowerCase().includes(query))
      : true
    return matchesStatus && matchesPriority && matchesQuery
  })
})

async function loadTickets(): Promise<void> {
  if (!authStore.isAdmin) return

  loading.value = true
  error.value = null

  try {
    tickets.value = await supportService.listRecentTickets()
  } catch (e: any) {
    console.error('[AdminSupport] Failed to load tickets', e)
    error.value = e?.message || 'Failed to load tickets'
  } finally {
    loading.value = false
  }
}

async function onStatusChange(ticket: SupportTicket, newStatus: SupportTicketStatus): Promise<void> {
  if (ticket.status === newStatus || !authStore.isAdmin) return
  updatingTicketId.value = ticket.id
  try {
    await supportService.updateTicketStatus(ticket.id, newStatus)
    tickets.value = tickets.value.map((t) =>
      t.id === ticket.id
        ? {
            ...t,
            status: newStatus,
            updatedAt: new Date().toISOString(),
          }
        : t,
    )
  } catch (e: any) {
    console.error('[AdminSupport] Failed to update status', e)
    error.value = e?.message || 'Failed to update ticket status'
  } finally {
    updatingTicketId.value = null
  }
}

onMounted(async () => {
  await loadTickets()
})
</script>

<template>
  <AppLayout>
    <div class="space-y-6">
      <header class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Admin: Support</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Monitor incoming tickets, triage priority customers, and follow progress.
          </p>
        </div>
        <div class="flex items-center gap-3">
          <AppButton
            variant="secondary"
            :disabled="loading"
            class="flex items-center gap-2"
            @click="loadTickets"
          >
            <ArrowPathIcon class="w-4 h-4" />
            Refresh
          </AppButton>
        </div>
      </header>

      <div v-if="!authStore.isAdmin">
        <AppCard variant="glass">
          <p class="text-sm text-gray-600 dark:text-gray-300">You do not have access to this page.</p>
        </AppCard>
      </div>

      <div v-else class="space-y-6">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
          <AppCard variant="outline" p="4">
            <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Total tickets</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ stats.total }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Last 100 tickets</p>
          </AppCard>

          <AppCard variant="outline" p="4">
            <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Open</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ stats.open }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
              <ExclamationCircleIcon class="w-4 h-4 text-amber-500" />
              Waiting for reply
            </p>
          </AppCard>

          <AppCard variant="outline" p="4">
            <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">In progress</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ stats.inProgress }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
              <UserIcon class="w-4 h-4 text-primary-500" />
              Assigned to team
            </p>
          </AppCard>

          <AppCard variant="outline" p="4">
            <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Priority lane</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ stats.priority }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
              <BoltIcon class="w-4 h-4 text-primary-500" />
              Pro &amp; above
            </p>
          </AppCard>
        </div>

        <div class="grid gap-4 md:grid-cols-3">
          <AppCard variant="outline" p="4" class="md:col-span-2">
            <div class="flex flex-col gap-4 lg:flex-row lg:items-end">
              <div class="flex-1">
                <label class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Search
                </label>
                <input
                  v-model="search"
                  type="text"
                  class="input mt-2"
                  placeholder="Search subject, email, tier"
                />
              </div>
              <div class="flex gap-4 flex-1">
                <div class="flex-1">
                  <label class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Status
                  </label>
                  <select v-model="statusFilter" class="input mt-2">
                    <option value="all">All statuses</option>
                    <option v-for="option in statusOptions" :key="option.value" :value="option.value">
                      {{ option.label }}
                    </option>
                  </select>
                </div>
                <div class="flex-1">
                  <label class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Priority
                  </label>
                  <select v-model="priorityFilter" class="input mt-2">
                    <option value="all">All</option>
                    <option v-for="option in priorityOptions" :key="option.value" :value="option.value">
                      {{ option.label }}
                    </option>
                  </select>
                </div>
              </div>
            </div>
          </AppCard>

          <AppCard variant="outline" p="4">
            <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
              Filters overview
            </p>
            <ul class="text-sm text-gray-600 dark:text-gray-300 space-y-2">
              <li>
                Showing
                <span class="font-semibold text-gray-900 dark:text-white">{{ filteredTickets.length }}</span>
                of {{ tickets.length }} tickets
              </li>
              <li>Current status: <span class="capitalize">{{ statusFilter }}</span></li>
              <li>Priority filter: <span class="capitalize">{{ priorityFilter }}</span></li>
            </ul>
          </AppCard>
        </div>

        <AppCard variant="outline" class="overflow-hidden p-0!">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead class="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Ticket
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Customer
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Priority
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Status
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Created
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Updated
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-950">
                <tr v-if="loading">
                  <td colspan="6" class="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                    Loading tickets…
                  </td>
                </tr>
                <tr v-else-if="filteredTickets.length === 0">
                  <td colspan="6" class="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                    No tickets match those filters.
                  </td>
                </tr>
                <tr
                  v-for="ticket in filteredTickets"
                  :key="ticket.id"
                  class="hover:bg-gray-50 dark:hover:bg-gray-900/40 align-top"
                >
                  <td class="px-4 py-4">
                    <p class="text-sm font-medium text-gray-900 dark:text-white">{{ ticket.subject }}</p>
                    <p class="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                      {{ ticket.message }}
                    </p>
                  </td>
                  <td class="px-4 py-4 text-sm text-gray-700 dark:text-gray-300 space-y-1">
                    <div class="flex items-center gap-2">
                      <EnvelopeIcon class="w-4 h-4 text-gray-400" />
                      <span>{{ ticket.email || '—' }}</span>
                    </div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">
                      Tier: {{ ticket.tier || 'unknown' }}
                    </div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">
                      UID: {{ ticket.userId || '—' }}
                    </div>
                  </td>
                  <td class="px-4 py-4">
                    <span
                      class="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold"
                      :class="
                        ticket.priority === 'priority'
                          ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/20 dark:text-primary-300'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-300'
                      "
                    >
                      <BoltIcon v-if="ticket.priority === 'priority'" class="w-4 h-4" />
                      {{ ticket.priority }}
                    </span>
                  </td>
                  <td class="px-4 py-4">
                    <select
                      class="input"
                      :value="ticket.status"
                      :disabled="updatingTicketId === ticket.id"
                      @change="
                        (event) =>
                          onStatusChange(ticket, (event.target as HTMLSelectElement).value as SupportTicketStatus)
                      "
                    >
                      <option v-for="option in statusOptions" :key="option.value" :value="option.value">
                        {{ option.label }}
                      </option>
                    </select>
                  </td>
                  <td class="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {{ formatDate(ticket.createdAt) }}
                  </td>
                  <td class="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {{ formatDate(ticket.updatedAt) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </AppCard>

        <div v-if="error" class="text-sm text-red-600 dark:text-red-400">
          {{ error }}
        </div>
      </div>
    </div>
  </AppLayout>
</template>
