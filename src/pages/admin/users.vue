<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  collection,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore'
import { db } from '@/config/firebase'
import { useAuthStore } from '@/stores'
import AppLayout from '@/layouts/AppLayout.vue'
import type { SubscriptionTier, User, UserRole } from '@/types'

type AdminUserRow = User & {
  projectCount: number
}

const authStore = useAuthStore()

const loading = ref(false)
const error = ref<string | null>(null)
const search = ref('')

const users = ref<AdminUserRow[]>([])

const filteredUsers = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return users.value

  return users.value.filter((u) => {
    const email = (u.email || '').toLowerCase()
    const name = (u.displayName || '').toLowerCase()
    return email.includes(q) || name.includes(q)
  })
})

const totals = computed(() => {
  const totalUsers = users.value.length
  const freeUsers = users.value.filter((u) => u.subscription === 'free').length
  const proUsers = users.value.filter((u) => u.subscription === 'pro').length
  const businessUsers = users.value.filter((u) => u.subscription === 'business').length
  const enterpriseUsers = users.value.filter((u) => u.subscription === 'enterprise').length
  const totalProjects = users.value.reduce((sum, u) => sum + (u.projectCount || 0), 0)

  return {
    totalUsers,
    freeUsers,
    proUsers,
    businessUsers,
    enterpriseUsers,
    totalProjects,
  }
})

function formatDate(value?: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString()
}

function safeRole(value: unknown): UserRole {
  if (value === 'admin' || value === 'creator' || value === 'user') return value
  return 'user'
}

function safeTier(value: unknown): SubscriptionTier {
  if (value === 'free' || value === 'pro' || value === 'business' || value === 'enterprise') return value
  return 'free'
}

async function loadUsers(): Promise<void> {
  if (!authStore.isAdmin) return

  loading.value = true
  error.value = null

  try {
    const usersQuery = query(
      collection(db, 'users'),
      orderBy('createdAt', 'desc'),
      limit(50),
    )

    const snapshot = await getDocs(usersQuery)

    const baseUsers: User[] = snapshot.docs.map((docSnap) => {
      const data = docSnap.data() as Record<string, unknown>

      return {
        id: docSnap.id,
        email: String(data.email || ''),
        displayName: String(data.displayName || ''),
        photoURL: typeof data.photoURL === 'string' ? data.photoURL : undefined,
        role: safeRole(data.role),
        subscription: safeTier(data.subscription),
        preferences: (data.preferences || {
          theme: 'system',
          language: 'en',
          defaultCountry: 'KE',
          emailNotifications: true,
          marketingEmails: false,
        }) as any,
        createdAt: String(data.createdAt || ''),
        updatedAt: String(data.updatedAt || ''),
        lastLoginAt: typeof data.lastLoginAt === 'string' ? data.lastLoginAt : undefined,
      }
    })

    const counts = await Promise.all(
      baseUsers.map(async (u) => {
        const countSnap = await getCountFromServer(
          query(collection(db, 'projects'), where('userId', '==', u.id)),
        )
        return countSnap.data().count
      }),
    )

    users.value = baseUsers.map((u, idx) => ({
      ...u,
      projectCount: counts[idx] ?? 0,
    }))
  } catch (e: any) {
    error.value = e?.message || 'Failed to load users'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadUsers()
})
</script>

<template>
  <AppLayout>
    <div class="space-y-6">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Admin: Users</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            User management overview (accounts, logins, subscriptions, project counts).
          </p>
        </div>

        <div class="flex items-center gap-2">
          <button class="btn btn-secondary" :disabled="loading" @click="loadUsers">
            Refresh
          </button>
        </div>
      </div>

      <div v-if="!authStore.isAdmin" class="card p-4">
        <p class="text-sm text-gray-600 dark:text-gray-300">You do not have access to this page.</p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="card p-4">
          <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Users</p>
          <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ totals.totalUsers }}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Free: {{ totals.freeUsers }} | Pro: {{ totals.proUsers }} | Business: {{ totals.businessUsers }} | Enterprise: {{ totals.enterpriseUsers }}
          </p>
        </div>
        <div class="card p-4">
          <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Projects</p>
          <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ totals.totalProjects }}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Total projects across listed users</p>
        </div>
        <div class="card p-4">
          <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Search</p>
          <input v-model="search" type="text" class="input mt-2" placeholder="Search by name or email" />
        </div>
      </div>

      <div v-if="error" class="card p-4 border-red-200 dark:border-red-800">
        <p class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
      </div>

      <div class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead class="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">User</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Role</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Subscription</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Projects</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Created</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Last Login</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-950">
              <tr v-if="loading">
                <td class="px-4 py-4 text-sm text-gray-500 dark:text-gray-400" colspan="6">Loading…</td>
              </tr>
              <tr v-else-if="filteredUsers.length === 0">
                <td class="px-4 py-4 text-sm text-gray-500 dark:text-gray-400" colspan="6">No users found.</td>
              </tr>
              <tr v-for="u in filteredUsers" :key="u.id" class="hover:bg-gray-50 dark:hover:bg-gray-900/40">
                <td class="px-4 py-4">
                  <div class="flex flex-col">
                    <p class="text-sm font-medium text-gray-900 dark:text-white">{{ u.displayName || '—' }}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">{{ u.email || '—' }}</p>
                    <p class="text-xs text-gray-400 mt-1">UID: {{ u.id }}</p>
                  </div>
                </td>
                <td class="px-4 py-4 text-sm text-gray-700 dark:text-gray-300 capitalize">{{ u.role }}</td>
                <td class="px-4 py-4 text-sm text-gray-700 dark:text-gray-300 capitalize">{{ u.subscription }}</td>
                <td class="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">{{ u.projectCount }}</td>
                <td class="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">{{ formatDate(u.createdAt) }}</td>
                <td class="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">{{ formatDate(u.lastLoginAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
