import type { RouteRecordRaw } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  // ═══════════════════════════════════════════════════════════════
  // PUBLIC ROUTES
  // ═══════════════════════════════════════════════════════════════
  {
    path: '/',
    name: 'home',
    component: () => import('@/pages/index.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/marketplace',
    name: 'marketplace',
    component: () => import('@/pages/marketplace/index.vue'),
    meta: { layout: 'marketplace' },
  },
  {
    path: '/marketplace/:id',
    name: 'template-detail',
    component: () => import('@/pages/marketplace/[id].vue'),
    meta: { layout: 'marketplace' },
  },

  // ═══════════════════════════════════════════════════════════════
  // AUTH ROUTES
  // ═══════════════════════════════════════════════════════════════
  {
    path: '/auth/login',
    name: 'login',
    component: () => import('@/pages/auth/login.vue'),
    meta: { layout: 'auth', guest: true },
  },
  {
    path: '/auth/register',
    name: 'register',
    component: () => import('@/pages/auth/register.vue'),
    meta: { layout: 'auth', guest: true },
  },
  {
    path: '/auth/reset-password',
    name: 'reset-password',
    component: () => import('@/pages/auth/reset-password.vue'),
    meta: { layout: 'auth', guest: true },
  },

  // ═══════════════════════════════════════════════════════════════
  // PROTECTED ROUTES
  // ═══════════════════════════════════════════════════════════════
  {
    path: '/editor',
    name: 'editor-new',
    component: () => import('@/pages/editor/index.vue'),
    meta: { layout: 'editor', requiresAuth: true },
  },
  {
    path: '/editor/:id',
    name: 'editor',
    component: () => import('@/pages/editor/index.vue'),
    meta: { layout: 'editor', requiresAuth: true },
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('@/pages/dashboard/index.vue'),
    meta: { layout: 'default', requiresAuth: true },
  },
  {
    path: '/dashboard/projects',
    name: 'projects',
    component: () => import('@/pages/dashboard/projects.vue'),
    meta: { layout: 'default', requiresAuth: true },
  },
  {
    path: '/dashboard/templates',
    name: 'my-templates',
    component: () => import('@/pages/dashboard/templates.vue'),
    meta: { layout: 'default', requiresAuth: true, requiresCreator: true },
  },
  {
    path: '/dashboard/analytics',
    name: 'analytics',
    component: () => import('@/pages/dashboard/analytics.vue'),
    meta: { layout: 'default', requiresAuth: true, requiresCreator: true },
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/pages/settings/index.vue'),
    meta: { layout: 'default', requiresAuth: true },
  },
  {
    path: '/settings/billing',
    name: 'billing',
    component: () => import('@/pages/settings/billing.vue'),
    meta: { layout: 'default', requiresAuth: true },
  },
  {
    path: '/settings/brand-kit',
    name: 'brand-kit',
    component: () => import('@/pages/settings/brand-kit.vue'),
    meta: { layout: 'default', requiresAuth: true, requiresPro: true },
  },
  {
    path: '/settings/preferences',
    name: 'preferences',
    component: () => import('@/pages/settings/preferences.vue'),
    meta: { layout: 'default', requiresAuth: true },
  },
  {
    path: '/help',
    name: 'help',
    component: () => import('@/pages/help.vue'),
    meta: { layout: 'default', requiresAuth: true },
  },

  // ═══════════════════════════════════════════════════════════════
  // ADMIN
  // ═══════════════════════════════════════════════════════════════
  {
    path: '/admin/users',
    name: 'admin-users',
    component: () => import('@/pages/admin/users.vue'),
    meta: { layout: 'default', requiresAuth: true, requiresAdmin: true },
  },

  // ═══════════════════════════════════════════════════════════════
  // LEGAL
  // ═══════════════════════════════════════════════════════════════
  {
    path: '/terms',
    name: 'terms',
    component: () => import('@/pages/legal/terms.vue'),
    meta: { layout: 'default' },
  },
  {
    path: '/privacy',
    name: 'privacy',
    component: () => import('@/pages/legal/privacy.vue'),
    meta: { layout: 'default' },
  },

  // ═══════════════════════════════════════════════════════════════
  // CATCH-ALL
  // ═══════════════════════════════════════════════════════════════
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/pages/404.vue'),
    meta: { layout: 'default' },
  },
]
