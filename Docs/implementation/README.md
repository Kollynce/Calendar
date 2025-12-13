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

## Current Implementation Status _(updated 14 Dec 2025)_

Status legend:
- **Done**: implemented and wired end-to-end
- **Partial**: implemented but incomplete, not wired, or not production-ready
- **Not started**: not implemented

### Phase 1: Foundation (Weeks 1-2)
- **Done**: Project scaffolding (Vue 3 + TypeScript + Vite)
- **Done**: Tailwind + base styling
- **Partial**: Firebase setup (Auth/Firestore/Storage/Functions initialized; full app persistence rules/collections not yet fully in use)
- **Done**: Core Pinia stores present (`auth`, `calendar`, `editor`, `export`, `theme`)
- **Done**: Routing + protected route metadata (dashboard/editor/settings)
- **Partial**: “Base components” (UI shell exists; several settings pages are placeholders)

### Phase 2: Calendar Engine (Weeks 3-4)
- **Partial**: Holiday service (implemented via `date-holidays` + static fallback; not an external HTTP API)
- **Done**: Calendar generator service (`src/services/calendar/generator.service.ts`)
- **Optional (hybrid approach)**: `CalendarGrid`, `CalendarMonth`, `CalendarDay` Vue components for non-editor previews (the editor/export pipeline renders calendars via Fabric smart elements)
- **Done**: Localization system (translations + localization service)
- **Partial**: Custom holiday management (store logic exists; UI integration is incomplete)

### Phase 3: Design Editor (Weeks 5-7)
- **Done**: Fabric.js canvas integration (editor store + `/editor` route)
- **Partial**: Toolbar/tools (core tools exist; advanced manipulation polish TBD)
- **Done**: Layer panel exists and is used (`EditorLayers`)
- **Done**: Properties panel exists and is used (`EditorProperties`)
- **Partial**: Image upload & asset management (local uploads working; Firebase Storage-backed asset library not implemented)
- **Done**: Undo/redo history (store-level history with UI controls)
- **Done**: Unified editor routes (`/editor` and `/editor/:id` share the same editor page/store)

### Phase 4: Export System (Weeks 8-9)
- **Done (services)**: PNG/JPG export support (`image.service.ts` + store)
- **Done (services)**: PDF generation support (`pdf.service.ts` + store)
- **Done**: Export modal wired to export store (real export, tier gating, progress/errors)
- **Done**: Print-ready settings UI wiring (bleed/crop marks/safe zone)
- **Done**: Batch export end-to-end (multi-page PDF)
- **Done**: PDF pages selection (current page vs all months)
- **Done**: Custom month range selection (e.g. Jan–Jun) via `pages: number[]`
- **Done**: Long-running export progress + status feedback
- **Done**: Multi-page export toggle to include/exclude user-added objects per month
- **Partial**: Download works via export store; cloud storage upload/export history persistence not implemented

### Next Milestones (to complete Phases 1–4 end-to-end)
- **Project persistence**: implement Firestore CRUD for projects (and Storage for assets if needed).
- **Project persistence**: complete Firestore CRUD end-to-end in the editor (create/load/update/list) and ensure the dashboard uses real project data.
- **Editor reliability**: refactor layer actions (select/hide/lock/delete) through editor store so history + dirty state stay consistent.
- **Optional batch export add-ons**: zip images, month selection UI (checkbox grid), cover page / inserts.
- **Optional**: upload exports to Storage and write export records to Firestore for download history.

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
