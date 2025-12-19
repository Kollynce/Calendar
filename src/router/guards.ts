import type { Router } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

export function setupRouterGuards(router: Router): void {
  router.beforeEach(async (to, from, next) => {
    const authStore = useAuthStore()
    void from

    // Wait for auth to initialize
    if (authStore.loading) {
      await authStore.initialize()
    }

    const requiresAuth = to.meta.requiresAuth
    const requiresCreator = to.meta.requiresCreator
    const requiresPro = to.meta.requiresPro
    const requiresAdmin = to.meta.requiresAdmin
    const guestOnly = to.meta.guest

    // Redirect authenticated users away from guest-only pages
    if (guestOnly && authStore.isAuthenticated) {
      return next({ name: 'dashboard' })
    }

    // Redirect unauthenticated users to login
    if (requiresAuth && !authStore.isAuthenticated) {
      return next({ 
        name: 'login', 
        query: { redirect: to.fullPath } 
      })
    }

    // Check creator role
    if (requiresCreator && !authStore.isCreator) {
      return next({ name: 'dashboard' })
    }

    // Check pro subscription
    if (requiresPro && !authStore.isPro) {
      return next({ name: 'billing' })
    }

    // Check admin role
    if (requiresAdmin && !authStore.isAdmin) {
      return next({ name: 'dashboard' })
    }

    next()
  })
}
