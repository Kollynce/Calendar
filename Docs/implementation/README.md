# Calendar Product Creator - Implementation Documentation

> Professional calendar design platform for creators and stationary printing shops

## Quick Links

| Document | Description |
|----------|-------------|
| [01-overview.md](./01-overview.md) | Project vision, revenue model, success metrics |
| [02-tech-stack.md](./02-tech-stack.md) | Vue 3, Tailwind, Firebase stack details |
| [03-project-structure.md](./03-project-structure.md) | Directory organization and naming conventions |
| [04-foundation.md](./04-foundation.md) | Core infrastructure, stores, routing |
| [05-calendar-engine.md](./05-calendar-engine.md) | Holiday service, calendar generation, localization |
| [06-design-editor.md](./06-design-editor.md) | Fabric.js canvas editor implementation |
| [07-export-system.md](./07-export-system.md) | PDF/image export, print settings |
| [10-database-schema.md](./10-database-schema.md) | Firestore collections, security rules |
| [12-deployment.md](./12-deployment.md) | CI/CD, GitHub Actions, monitoring |

---

## Current Implementation Status _(updated 8 Dec 2025)_

### Completed
- **Documentation refresh** – All tech/deployment/foundation docs updated to PayPal + Firebase stack with the current architecture.
- **Environment scaffolding** – `.env.example`, PayPal + Firebase config files, and shared constants/types created.
- **Core stores & router** – `auth` store with Firestore profile bootstrap, `theme` store, Pinia wiring in `main.ts`, and guarded routes for dashboard/editor/settings.
- **UI shell** – Home, Auth (Login/Register), Dashboard, Editor placeholder, Marketplace, Settings, and 404 pages implemented with Tailwind styling for initial navigation flows.
- **Tooling config** – `package.json`, `vite.config.ts`, `tsconfig`, Tailwind entry CSS, and alias setup ready for dependency install.

### Next Up
- Provision Firestore + Storage in Firebase and deploy the dev security rules from `10-database-schema.md`.
- Hook up real Editor canvas (Fabric.js) and bridge the marketplace/services described in `05-07` docs.
- Implement subscription + PayPal billing flows once the Firebase backend is stable.

---

## Development Phases

Phase 1: Foundation (Weeks 1-2)
├── Project scaffolding
├── Firebase setup
├── Core stores & routing
└── Base components

Phase 2: Calendar Engine (Weeks 3-4)
├── Holiday service
├── Calendar generator
├── Localization (8 languages)
└── Custom holidays

Phase 3: Design Editor (Weeks 5-7)
├── Fabric.js integration
├── Object manipulation
├── Layer management
└── Undo/redo history

Phase 4: Export System (Weeks 8-9)
├── PNG/JPG export
├── PDF generation
├── Print settings (bleed, crop marks)
└── Batch export

Phase 5: Marketplace (Weeks 10-12)
├── Template CRUD
├── Purchase flow
├── Creator dashboard
└── Reviews & ratings

Phase 6: User Management (Weeks 13-14)
├── Authentication
├── Subscriptions (Stripe)
├── Brand kits
└── Admin dashboard

Phase 7: Launch (Weeks 15-16)
├── Performance optimization
├── Security hardening
├── Documentation
└── Production deployment
```

---

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm 8+
- Firebase CLI
- Stripe CLI (for local webhook testing)

### Installation

```bash
# Clone repository
git clone https://github.com/your-org/calendar-creator.git
cd calendar-creator

# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env.local

# Start Firebase emulators
pnpm dev:emulators

# Start development server
pnpm dev
```

### Key Commands

```bash
# Development
pnpm dev              # Start Vite dev server
pnpm dev:emulators    # Start Firebase emulators
pnpm dev:full         # Start both concurrently

# Testing
pnpm test             # Run unit tests (watch mode)
pnpm test:unit        # Run unit tests once
pnpm test:e2e         # Run Playwright E2E tests

# Build
pnpm build            # Production build
pnpm build:staging    # Staging build
pnpm preview          # Preview production build

# Code Quality
pnpm lint             # Run ESLint
pnpm format           # Run Prettier
pnpm typecheck        # TypeScript check

# Deployment
pnpm deploy:staging   # Deploy to staging
pnpm deploy:production # Deploy to production
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Vue 3)                         │
├─────────────────────────────────────────────────────────────────┤
│  Pages          │  Components      │  Composables               │
│  ├── Home       │  ├── Calendar    │  ├── useAuth               │
│  ├── Editor     │  ├── Editor      │  ├── useCalendar           │
│  ├── Marketplace│  ├── Export      │  ├── useEditor             │
│  ├── Dashboard  │  ├── Marketplace │  ├── useExport             │
│  └── Settings   │  └── Settings    │  └── useMarketplace        │
├─────────────────────────────────────────────────────────────────┤
│                     STATE (Pinia Stores)                        │
│  auth.store │ calendar.store │ editor.store │ export.store      │
├─────────────────────────────────────────────────────────────────┤
│                     SERVICES                                    │
│  Holiday │ Calendar Generator │ Canvas │ PDF Export │ Payments  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FIREBASE BACKEND                           │
├─────────────────────────────────────────────────────────────────┤
│  Auth          │  Firestore       │  Storage    │  Functions    │
│  ├── Email     │  ├── users       │  ├── assets │  ├── auth     │
│  ├── Google    │  ├── projects    │  ├── exports│  ├── payments │
│  └── Apple     │  ├── templates   │  └── uploads│  ├── exports  │
│                │  └── orders      │             │  └── scheduled│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    THIRD-PARTY SERVICES                         │
├─────────────────────────────────────────────────────────────────┤
│  Stripe (Payments)  │  SendGrid (Email)  │  Sentry (Errors)     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Subscription Tiers

| Feature | Free | Pro ($12/mo) | Business ($39/mo) | Enterprise |
|---------|------|--------------|-------------------|------------|
| Projects | 3 | Unlimited | Unlimited | Unlimited |
| Export DPI | 72 | 300 | 300 | 300 |
| Formats | PNG, JPG | + PDF, SVG | + CMYK | + TIFF |
| Watermark | Yes | No | No | No |
| Brand Kits | - | 1 | 5 | Unlimited |
| Batch Export | - | - | ✓ | ✓ |
| API Access | - | - | - | ✓ |

---

## Support

- **Documentation**: This folder
- **Issues**: GitHub Issues
- **Email**: support@calendarcreator.com

---

*Last updated: December 2024*
