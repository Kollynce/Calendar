# Technology Stack & Dependencies

## 1. Frontend Stack

### 1.1 Core Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| **Vue 3** | 3.4+ | Composition API, reactive state management |
| **TypeScript** | 5.3+ | Type safety, better developer experience |
| **Vite** | 5.0+ | Fast build tool, HMR, optimized production builds |

### 1.2 Styling & UI

| Technology | Version | Purpose |
|------------|---------|---------|
| **Tailwind CSS** | 3.4+ | Utility-first CSS framework |
| **Headless UI** | 1.7+ | Unstyled, accessible UI primitives |
| **Heroicons** | 2.1+ | SVG icon library |
| **@tailwindcss/forms** | 0.5+ | Form element styling |
| **@tailwindcss/typography** | 0.5+ | Prose content styling |

### 1.3 State Management & Utilities

| Technology | Version | Purpose |
|------------|---------|---------|
| **Pinia** | 2.1+ | Vue 3 state management |
| **VueUse** | 10.7+ | Collection of composition utilities |
| **Vue Router** | 4.2+ | Client-side routing |

### 1.4 Design Editor

| Technology | Version | Purpose |
|------------|---------|---------|
| **Fabric.js** | 6.0+ | Canvas-based design editor |
| **html2canvas** | 1.4+ | DOM to canvas conversion |
| **jsPDF** | 2.5+ | PDF generation |
| **file-saver** | 2.0+ | Client-side file downloads |

### 1.5 Date & Calendar

| Technology | Version | Purpose |
|------------|---------|---------|
| **date-fns** | 3.0+ | Date manipulation and formatting |
| **date-holidays** | 3.23+ | Holiday data for all countries |

---

## 2. Backend Stack (Firebase)

### 2.1 Firebase Services

| Service | Purpose |
|---------|---------|
| **Firebase Auth** | User authentication (email, Google, Apple) |
| **Cloud Firestore** | NoSQL database for users, templates, orders |
| **Cloud Storage** | Asset storage (images, exports, templates) |
| **Cloud Functions** | Server-side logic, PDF generation, webhooks |
| **Firebase Hosting** | Static site hosting with global CDN |
| **Firebase Analytics** | Usage tracking, conversion funnels |

### 2.2 Cloud Functions Runtime

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 20 LTS | Functions runtime |
| **TypeScript** | 5.3+ | Type-safe function code |
| **Express** | 4.18+ | HTTP routing (optional) |

### 2.3 Third-Party Integrations

| Service | Purpose | Package |
|---------|---------|---------|
| PayPal | Payments & Subscriptions | `@paypal/paypal-js` |
| SendGrid | Transactional emails | Cloud Functions |
| Cloudinary | Image optimization & CDN | Client + Functions |
| Sentry | Error tracking & monitoring | Client + Functions |
| Algolia | Full-text search (marketplace) | Cloud Functions |

---

## 3. Development Tools

### 3.1 Code Quality

```bash
# Linting & Formatting
eslint                    # JavaScript/TypeScript linting
@typescript-eslint/parser # TypeScript parser for ESLint
prettier                  # Code formatting
eslint-plugin-vue         # Vue-specific linting rules

# Git Hooks
husky                     # Git hooks manager
lint-staged               # Run linters on staged files
commitlint                # Conventional commit enforcement
```

### 3.2 Testing

```bash
# Unit & Integration Testing
vitest                    # Vite-native test runner
@vue/test-utils           # Vue component testing utilities
@testing-library/vue      # DOM testing utilities
msw                       # API mocking

# E2E Testing
playwright                # Cross-browser E2E testing
@playwright/test          # Playwright test runner
```

### 3.3 Build & Deploy

```bash
# Build Tools
vite                      # Development server & bundler
vite-plugin-vue           # Vue 3 support for Vite
@vitejs/plugin-legacy     # Legacy browser support

# Deployment
firebase-tools            # Firebase CLI
```

---

## 4. Package.json Dependencies

```json
{
  "name": "calendar-creator",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:e2e": "playwright test",
    "lint": "eslint . --ext .vue,.js,.jsx,.cjs,.mjs,.ts,.tsx --fix",
    "format": "prettier --write src/",
    "typecheck": "vue-tsc --noEmit",
    "prepare": "husky install"
  },
  "dependencies": {
    "vue": "^3.4.0",
    "vue-router": "^4.2.0",
    "pinia": "^2.1.0",
    "@vueuse/core": "^10.7.0",
    "@headlessui/vue": "^1.7.0",
    "@heroicons/vue": "^2.1.0",
    
    "firebase": "^10.7.0",
    
    "fabric": "^6.0.0",
    "jspdf": "^2.5.0",
    "html2canvas": "^1.4.0",
    "file-saver": "^2.0.0",
    
    "date-fns": "^3.0.0",
    "date-holidays": "^3.23.0",
    
    "@paypal/paypal-js": "^2.2.0",
    
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^4.5.0",
    "vite": "^5.0.0",
    "vue-tsc": "^1.8.0",
    "typescript": "^5.3.0",
    
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "@tailwindcss/forms": "^0.5.0",
    "@tailwindcss/typography": "^0.5.0",
    "@tailwindcss/aspect-ratio": "^0.4.0",
    
    "eslint": "^8.55.0",
    "@typescript-eslint/eslint-plugin": "^6.13.0",
    "@typescript-eslint/parser": "^6.13.0",
    "eslint-plugin-vue": "^9.19.0",
    "prettier": "^3.1.0",
    "prettier-plugin-tailwindcss": "^0.5.0",
    
    "vitest": "^1.0.0",
    "@vue/test-utils": "^2.4.0",
    "@testing-library/vue": "^8.0.0",
    "playwright": "^1.40.0",
    "@playwright/test": "^1.40.0",
    "msw": "^2.0.0",
    
    "husky": "^8.0.0",
    "lint-staged": "^15.2.0",
    "@commitlint/cli": "^18.4.0",
    "@commitlint/config-conventional": "^18.4.0",
    
    "@types/node": "^20.10.0",
    "@types/file-saver": "^2.0.0"
  }
}
```

---

## 5. Tailwind Configuration

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'
import defaultTheme from 'tailwindcss/defaultTheme'

export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Dynamic brand colors via CSS variables
        primary: {
          50: 'rgb(var(--color-primary-50) / <alpha-value>)',
          100: 'rgb(var(--color-primary-100) / <alpha-value>)',
          200: 'rgb(var(--color-primary-200) / <alpha-value>)',
          300: 'rgb(var(--color-primary-300) / <alpha-value>)',
          400: 'rgb(var(--color-primary-400) / <alpha-value>)',
          500: 'rgb(var(--color-primary-500) / <alpha-value>)',
          600: 'rgb(var(--color-primary-600) / <alpha-value>)',
          700: 'rgb(var(--color-primary-700) / <alpha-value>)',
          800: 'rgb(var(--color-primary-800) / <alpha-value>)',
          900: 'rgb(var(--color-primary-900) / <alpha-value>)',
          950: 'rgb(var(--color-primary-950) / <alpha-value>)',
        },
        accent: {
          50: 'rgb(var(--color-accent-50) / <alpha-value>)',
          500: 'rgb(var(--color-accent-500) / <alpha-value>)',
          600: 'rgb(var(--color-accent-600) / <alpha-value>)',
        },
        surface: {
          DEFAULT: 'rgb(var(--color-surface) / <alpha-value>)',
          elevated: 'rgb(var(--color-surface-elevated) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Inter var', ...defaultTheme.fontFamily.sans],
        display: ['Cal Sans', 'Inter var', ...defaultTheme.fontFamily.sans],
        mono: ['JetBrains Mono', ...defaultTheme.fontFamily.mono],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      spacing: {
        '4.5': '1.125rem',
        '18': '4.5rem',
        '88': '22rem',
        '112': '28rem',
        '128': '32rem',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        'elevation-1': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'elevation-2': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'elevation-3': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      screens: {
        print: { raw: 'print' },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
  ],
} satisfies Config
```

---

## 6. Environment Variables

```bash
# .env.example

# ═══════════════════════════════════════════════════════════════
# FIREBASE CONFIGURATION
# ═══════════════════════════════════════════════════════════════
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=

# ═══════════════════════════════════════════════════════════════
# PAYPAL
# ═══════════════════════════════════════════════════════════════
VITE_PAYPAL_CLIENT_ID=your-paypal-client-id
VITE_PAYPAL_MODE=sandbox

# ═══════════════════════════════════════════════════════════════
# DEVELOPMENT
# ═══════════════════════════════════════════════════════════════
VITE_USE_EMULATORS=false
VITE_API_BASE_URL=http://localhost:5001

# ═══════════════════════════════════════════════════════════════
# FEATURE FLAGS
# ═══════════════════════════════════════════════════════════════
VITE_ENABLE_MARKETPLACE=true
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_BATCH_EXPORT=false

# ═══════════════════════════════════════════════════════════════
# THIRD-PARTY SERVICES
# ═══════════════════════════════════════════════════════════════
VITE_CLOUDINARY_CLOUD_NAME=
VITE_SENTRY_DSN=
```

---

## 8. Browser Support

```javascript
// .browserslistrc
> 1%
last 2 versions
not dead
not ie 11
```

**Supported Browsers:**
- Chrome 90+
- Firefox 90+
- Safari 14+
- Edge 90+

---

*Continue to [03-project-structure.md](./03-project-structure.md) for directory organization.*
