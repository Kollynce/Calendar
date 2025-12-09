# Deployment & CI/CD Strategy

## 1. Environment Configuration

### 1.1 Environment Files

```bash
# .env.development
VITE_FIREBASE_API_KEY=dev-api-key
VITE_FIREBASE_AUTH_DOMAIN=calendar-creator-dev.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=calendar-creator-dev
VITE_FIREBASE_STORAGE_BUCKET=calendar-creator-dev.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
VITE_USE_EMULATORS=true
VITE_PAYPAL_CLIENT_ID=sandbox-client-id
VITE_PAYPAL_MODE=sandbox
VITE_ENABLE_MARKETPLACE=true
VITE_ENABLE_ANALYTICS=false

# .env.staging
VITE_FIREBASE_API_KEY=staging-api-key
VITE_FIREBASE_AUTH_DOMAIN=calendar-creator-staging.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=calendar-creator-staging
VITE_FIREBASE_STORAGE_BUCKET=calendar-creator-staging.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=987654321
VITE_FIREBASE_APP_ID=1:987654321:web:def456
VITE_USE_EMULATORS=false
VITE_PAYPAL_CLIENT_ID=sandbox-client-id
VITE_PAYPAL_MODE=sandbox
VITE_ENABLE_MARKETPLACE=true
VITE_ENABLE_ANALYTICS=true

# .env.production
VITE_FIREBASE_API_KEY=prod-api-key
VITE_FIREBASE_AUTH_DOMAIN=calendar-creator.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=calendar-creator-prod
VITE_FIREBASE_STORAGE_BUCKET=calendar-creator-prod.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=111222333
VITE_FIREBASE_APP_ID=1:111222333:web:ghi789
VITE_USE_EMULATORS=false
VITE_PAYPAL_CLIENT_ID=live-client-id
VITE_PAYPAL_MODE=live
VITE_ENABLE_MARKETPLACE=true
VITE_ENABLE_ANALYTICS=true
```

### 1.2 Firebase Project Configuration

```json
// firebase.json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      },
      {
        "source": "**/*.@(jpg|jpeg|gif|png|svg|webp|ico)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      },
      {
        "source": "**/*.@(woff|woff2|ttf|otf)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      },
      {
        "source": "**",
        "headers": [
          {
            "key": "X-Content-Type-Options",
            "value": "nosniff"
          },
          {
            "key": "X-Frame-Options",
            "value": "DENY"
          },
          {
            "key": "X-XSS-Protection",
            "value": "1; mode=block"
          },
          {
            "key": "Referrer-Policy",
            "value": "strict-origin-when-cross-origin"
          },
          {
            "key": "Content-Security-Policy",
            "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://apis.google.com https://js.stripe.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://api.stripe.com wss://*.firebaseio.com; frame-src https://js.stripe.com https://hooks.stripe.com;"
          }
        ]
      }
    ]
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "storage": {
    "rules": "storage.rules"
  },
  "functions": {
    "source": "functions",
    "runtime": "nodejs20",
    "predeploy": [
      "npm --prefix \"$RESOURCE_DIR\" run lint",
      "npm --prefix \"$RESOURCE_DIR\" run build"
    ]
  },
  "emulators": {
    "auth": {
      "port": 9099
    },
    "functions": {
      "port": 5001
    },
    "firestore": {
      "port": 8080
    },
    "storage": {
      "port": 9199
    },
    "hosting": {
      "port": 5000
    },
    "ui": {
      "enabled": true,
      "port": 4000
    }
  }
}
```

---

## 2. GitHub Actions Workflows

### 2.1 CI Pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  NODE_VERSION: '20'
  PNPM_VERSION: '8'

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Run ESLint
        run: pnpm lint
      
      - name: Run TypeScript check
        run: pnpm typecheck

  test:
    name: Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Run unit tests
        run: pnpm test:unit --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: false

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Build
        run: pnpm build
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.FIREBASE_API_KEY_STAGING }}
          VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.FIREBASE_AUTH_DOMAIN_STAGING }}
          VITE_FIREBASE_PROJECT_ID: ${{ secrets.FIREBASE_PROJECT_ID_STAGING }}
          VITE_FIREBASE_STORAGE_BUCKET: ${{ secrets.FIREBASE_STORAGE_BUCKET_STAGING }}
          VITE_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.FIREBASE_MESSAGING_SENDER_ID_STAGING }}
          VITE_FIREBASE_APP_ID: ${{ secrets.FIREBASE_APP_ID_STAGING }}
          VITE_STRIPE_PUBLISHABLE_KEY: ${{ secrets.STRIPE_PUBLISHABLE_KEY_STAGING }}
      
      - name: Upload build artifact
        uses: actions/upload-artifact@v3
        with:
          name: dist
          path: dist
          retention-days: 7

  e2e:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Install Playwright browsers
        run: pnpm exec playwright install --with-deps chromium
      
      - name: Download build artifact
        uses: actions/download-artifact@v3
        with:
          name: dist
          path: dist
      
      - name: Run E2E tests
        run: pnpm test:e2e
      
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report
          retention-days: 7
```

### 2.2 Deploy to Staging

```yaml
# .github/workflows/deploy-staging.yml
name: Deploy to Staging

on:
  push:
    branches: [develop]

env:
  NODE_VERSION: '20'
  PNPM_VERSION: '8'

jobs:
  deploy:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    environment: staging
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Build
        run: pnpm build
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.FIREBASE_API_KEY }}
          VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.FIREBASE_AUTH_DOMAIN }}
          VITE_FIREBASE_PROJECT_ID: ${{ secrets.FIREBASE_PROJECT_ID }}
          VITE_FIREBASE_STORAGE_BUCKET: ${{ secrets.FIREBASE_STORAGE_BUCKET }}
          VITE_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.FIREBASE_MESSAGING_SENDER_ID }}
          VITE_FIREBASE_APP_ID: ${{ secrets.FIREBASE_APP_ID }}
          VITE_STRIPE_PUBLISHABLE_KEY: ${{ secrets.STRIPE_PUBLISHABLE_KEY }}
          VITE_ENABLE_ANALYTICS: 'true'
      
      - name: Build Functions
        run: |
          cd functions
          npm ci
          npm run build
      
      - name: Deploy to Firebase
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT_STAGING }}
          projectId: ${{ secrets.FIREBASE_PROJECT_ID }}
          channelId: live
      
      - name: Deploy Firestore Rules
        run: |
          npm install -g firebase-tools
          firebase deploy --only firestore:rules --project ${{ secrets.FIREBASE_PROJECT_ID }} --token ${{ secrets.FIREBASE_TOKEN }}
      
      - name: Deploy Storage Rules
        run: |
          firebase deploy --only storage:rules --project ${{ secrets.FIREBASE_PROJECT_ID }} --token ${{ secrets.FIREBASE_TOKEN }}
      
      - name: Deploy Functions
        run: |
          firebase deploy --only functions --project ${{ secrets.FIREBASE_PROJECT_ID }} --token ${{ secrets.FIREBASE_TOKEN }}
      
      - name: Notify Slack
        if: always()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          fields: repo,message,commit,author,action,eventName,ref,workflow
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### 2.3 Deploy to Production

```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production

on:
  release:
    types: [published]

env:
  NODE_VERSION: '20'
  PNPM_VERSION: '8'

jobs:
  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest
    environment: production
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Run tests
        run: pnpm test:unit
      
      - name: Build
        run: pnpm build
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.FIREBASE_API_KEY }}
          VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.FIREBASE_AUTH_DOMAIN }}
          VITE_FIREBASE_PROJECT_ID: ${{ secrets.FIREBASE_PROJECT_ID }}
          VITE_FIREBASE_STORAGE_BUCKET: ${{ secrets.FIREBASE_STORAGE_BUCKET }}
          VITE_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.FIREBASE_MESSAGING_SENDER_ID }}
          VITE_FIREBASE_APP_ID: ${{ secrets.FIREBASE_APP_ID }}
          VITE_FIREBASE_MEASUREMENT_ID: ${{ secrets.FIREBASE_MEASUREMENT_ID }}
          VITE_STRIPE_PUBLISHABLE_KEY: ${{ secrets.STRIPE_PUBLISHABLE_KEY }}
          VITE_SENTRY_DSN: ${{ secrets.SENTRY_DSN }}
          VITE_ENABLE_ANALYTICS: 'true'
      
      - name: Build Functions
        run: |
          cd functions
          npm ci
          npm run build
      
      - name: Deploy to Firebase Hosting
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT_PROD }}
          projectId: ${{ secrets.FIREBASE_PROJECT_ID }}
          channelId: live
      
      - name: Deploy Firestore Rules & Indexes
        run: |
          npm install -g firebase-tools
          firebase deploy --only firestore --project ${{ secrets.FIREBASE_PROJECT_ID }} --token ${{ secrets.FIREBASE_TOKEN }}
      
      - name: Deploy Storage Rules
        run: |
          firebase deploy --only storage:rules --project ${{ secrets.FIREBASE_PROJECT_ID }} --token ${{ secrets.FIREBASE_TOKEN }}
      
      - name: Deploy Functions
        run: |
          firebase deploy --only functions --project ${{ secrets.FIREBASE_PROJECT_ID }} --token ${{ secrets.FIREBASE_TOKEN }}
      
      - name: Create Sentry Release
        uses: getsentry/action-release@v1
        env:
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
          SENTRY_ORG: ${{ secrets.SENTRY_ORG }}
          SENTRY_PROJECT: ${{ secrets.SENTRY_PROJECT }}
        with:
          environment: production
          version: ${{ github.ref_name }}
      
      - name: Notify Slack
        if: always()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          fields: repo,message,commit,author,action,eventName,ref,workflow
          text: 'Production deployment ${{ job.status }}: ${{ github.ref_name }}'
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

---

## 3. Local Development Setup

### 3.1 Development Scripts

```json
// package.json scripts
{
  "scripts": {
    "dev": "vite",
    "dev:emulators": "firebase emulators:start --import=./emulator-data --export-on-exit",
    "dev:full": "concurrently \"pnpm dev\" \"pnpm dev:emulators\"",
    "build": "vue-tsc && vite build",
    "build:staging": "vue-tsc && vite build --mode staging",
    "build:production": "vue-tsc && vite build --mode production",
    "preview": "vite preview",
    "test": "vitest",
    "test:unit": "vitest run",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "lint": "eslint . --ext .vue,.js,.jsx,.cjs,.mjs,.ts,.tsx --fix",
    "format": "prettier --write src/",
    "typecheck": "vue-tsc --noEmit",
    "prepare": "husky install",
    "deploy:staging": "firebase deploy --project staging",
    "deploy:production": "firebase deploy --project production",
    "functions:dev": "cd functions && npm run serve",
    "functions:deploy": "firebase deploy --only functions"
  }
}
```

### 3.2 Emulator Data Seeding

```typescript
// scripts/seed-emulators.ts
import * as admin from 'firebase-admin'

// Initialize with emulator settings
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080'
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099'
process.env.FIREBASE_STORAGE_EMULATOR_HOST = 'localhost:9199'

admin.initializeApp({ projectId: 'demo-calendar-creator' })

const db = admin.firestore()
const auth = admin.auth()

async function seedData() {
  console.log('🌱 Seeding emulator data...')

  // Create test users
  const testUsers = [
    {
      uid: 'test-user-1',
      email: 'user@test.com',
      password: 'password123',
      displayName: 'Test User',
      role: 'user',
      subscription: 'free',
    },
    {
      uid: 'test-creator-1',
      email: 'creator@test.com',
      password: 'password123',
      displayName: 'Test Creator',
      role: 'creator',
      subscription: 'pro',
    },
    {
      uid: 'test-admin-1',
      email: 'admin@test.com',
      password: 'password123',
      displayName: 'Test Admin',
      role: 'admin',
      subscription: 'enterprise',
    },
  ]

  for (const user of testUsers) {
    try {
      await auth.createUser({
        uid: user.uid,
        email: user.email,
        password: user.password,
        displayName: user.displayName,
      })

      await db.collection('users').doc(user.uid).set({
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        subscription: user.subscription,
        preferences: {
          theme: 'system',
          language: 'en',
          defaultCountry: 'ZA',
          emailNotifications: true,
          marketingEmails: false,
        },
        projectCount: 0,
        templateCount: 0,
        totalDownloads: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      console.log(`✅ Created user: ${user.email}`)
    } catch (error) {
      console.log(`⚠️ User ${user.email} may already exist`)
    }
  }

  // Create sample templates
  const sampleTemplates = [
    {
      id: 'template-1',
      creatorId: 'test-creator-1',
      creatorName: 'Test Creator',
      name: 'Modern Wall Calendar',
      description: 'A clean, modern wall calendar template perfect for homes and offices.',
      category: 'wall-calendar',
      tags: ['modern', 'minimal', 'professional'],
      price: 0,
      license: 'free',
      status: 'approved',
      downloads: 150,
      rating: 4.5,
      reviewCount: 12,
    },
    {
      id: 'template-2',
      creatorId: 'test-creator-1',
      creatorName: 'Test Creator',
      name: 'Corporate Desk Calendar',
      description: 'Professional desk calendar with space for notes and branding.',
      category: 'desk-calendar',
      tags: ['corporate', 'business', 'professional'],
      price: 999, // $9.99
      license: 'commercial',
      status: 'approved',
      downloads: 45,
      rating: 4.8,
      reviewCount: 8,
    },
  ]

  for (const template of sampleTemplates) {
    await db.collection('templates').doc(template.id).set({
      ...template,
      thumbnail: 'https://via.placeholder.com/400x300',
      previewImages: [
        'https://via.placeholder.com/800x600',
        'https://via.placeholder.com/800x600',
      ],
      canvasData: JSON.stringify({ width: 800, height: 600, objects: [] }),
      config: { year: 2025, country: 'ZA', language: 'en' },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      publishedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    console.log(`✅ Created template: ${template.name}`)
  }

  console.log('🎉 Seeding complete!')
  process.exit(0)
}

seedData().catch(console.error)
```

---

## 4. Monitoring & Observability

### 4.1 Error Tracking (Sentry)

```typescript
// src/config/sentry.ts
import * as Sentry from '@sentry/vue'
import type { App } from 'vue'
import type { Router } from 'vue-router'

export function initializeSentry(app: App, router: Router): void {
  if (!import.meta.env.VITE_SENTRY_DSN) {
    console.warn('Sentry DSN not configured')
    return
  }

  Sentry.init({
    app,
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    release: `calendar-creator@${import.meta.env.VITE_APP_VERSION}`,
    
    integrations: [
      Sentry.browserTracingIntegration({ router }),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    
    // Performance monitoring
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    
    // Session replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    
    // Filter out noisy errors
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
    ],
    
    beforeSend(event) {
      // Don't send events in development
      if (import.meta.env.DEV) {
        return null
      }
      return event
    },
  })
}
```

### 4.2 Analytics Events

```typescript
// src/utils/analytics.utils.ts
import { analytics } from '@/config/firebase'
import { logEvent } from 'firebase/analytics'

export const AnalyticsEvents = {
  // Auth events
  SIGN_UP: 'sign_up',
  LOGIN: 'login',
  LOGOUT: 'logout',
  
  // Project events
  PROJECT_CREATED: 'project_created',
  PROJECT_SAVED: 'project_saved',
  PROJECT_DELETED: 'project_deleted',
  
  // Editor events
  OBJECT_ADDED: 'object_added',
  IMAGE_UPLOADED: 'image_uploaded',
  
  // Export events
  EXPORT_STARTED: 'export_started',
  EXPORT_COMPLETED: 'export_completed',
  EXPORT_FAILED: 'export_failed',
  
  // Marketplace events
  TEMPLATE_VIEWED: 'template_viewed',
  TEMPLATE_PURCHASED: 'template_purchased',
  TEMPLATE_DOWNLOADED: 'template_downloaded',
  
  // Subscription events
  SUBSCRIPTION_STARTED: 'subscription_started',
  SUBSCRIPTION_UPGRADED: 'subscription_upgraded',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
} as const

export function trackEvent(
  eventName: string,
  params?: Record<string, any>
): void {
  if (!analytics) return
  
  try {
    logEvent(analytics, eventName, {
      ...params,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.warn('Analytics event failed:', error)
  }
}

export function trackPageView(pageName: string, pageLocation: string): void {
  trackEvent('page_view', {
    page_title: pageName,
    page_location: pageLocation,
  })
}

export function trackExport(format: string, quality: string, success: boolean): void {
  trackEvent(success ? AnalyticsEvents.EXPORT_COMPLETED : AnalyticsEvents.EXPORT_FAILED, {
    format,
    quality,
  })
}

export function trackPurchase(templateId: string, amount: number): void {
  trackEvent(AnalyticsEvents.TEMPLATE_PURCHASED, {
    template_id: templateId,
    value: amount / 100, // Convert cents to dollars
    currency: 'USD',
  })
}
```

---

## 5. Performance Optimization

### 5.1 Vite Build Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig(({ mode }) => ({
  plugins: [
    vue(),
    mode === 'analyze' && visualizer({
      open: true,
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
    }),
  ].filter(Boolean),
  
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  
  build: {
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
          'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          'editor-vendor': ['fabric'],
          'export-vendor': ['jspdf', 'html2canvas', 'file-saver'],
          'ui-vendor': ['@headlessui/vue', '@heroicons/vue'],
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
  
  optimizeDeps: {
    include: ['vue', 'vue-router', 'pinia', 'firebase/app'],
  },
}))
```

### 5.2 Lazy Loading Routes

```typescript
// src/router/routes.ts
export const routes = [
  {
    path: '/',
    component: () => import('@/pages/index.vue'),
  },
  {
    path: '/editor/:id?',
    component: () => import('@/pages/editor/[id].vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/marketplace',
    component: () => import('@/pages/marketplace/index.vue'),
  },
  // ... other routes
]
```

---

## 6. Checklist for Production Launch

### Pre-Launch
- [ ] All environment variables configured
- [ ] Firebase security rules reviewed and tested
- [ ] PayPal webhooks configured and tested
- [ ] Error tracking (Sentry) configured
- [ ] Analytics events verified
- [ ] Performance audit passed (Lighthouse > 90)
- [ ] Accessibility audit passed (WCAG 2.1 AA)
- [ ] Security headers configured
- [ ] SSL certificate active
- [ ] Custom domain configured
- [ ] Backup strategy documented

### Launch Day
- [ ] Deploy to production
- [ ] Verify all features working
- [ ] Monitor error rates
- [ ] Monitor performance metrics
- [ ] Test payment flows
- [ ] Verify email delivery

### Post-Launch
- [ ] Set up uptime monitoring
- [ ] Configure alerting thresholds
- [ ] Document runbooks for common issues
- [ ] Schedule regular security audits
- [ ] Plan for scaling

---

*This completes the implementation guide. Return to [01-overview.md](./01-overview.md) for the full table of contents.*
