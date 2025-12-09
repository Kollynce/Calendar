# Project Structure

## Directory Organization

```
calendar-creator/
│
├── .github/                          # GitHub configuration
│   └── workflows/
│       ├── ci.yml                    # Lint, test, build on PR
│       ├── deploy-staging.yml        # Deploy to staging on merge
│       └── deploy-production.yml     # Deploy to production on release
│
├── .husky/                           # Git hooks
│   ├── pre-commit                    # Run lint-staged
│   └── commit-msg                    # Validate commit messages
│
├── docs/                             # Documentation
│   ├── api/                          # API documentation
│   ├── architecture/                 # Architecture decisions (ADRs)
│   └── user-guides/                  # End-user documentation
│
├── functions/                        # Firebase Cloud Functions
│   ├── src/
│   │   ├── index.ts                  # Function exports
│   │   ├── auth/                     # Auth triggers
│   │   │   └── onCreate.ts           # New user setup
│   │   ├── exports/                  # Export generation
│   │   │   ├── generatePdf.ts        # Server-side PDF
│   │   │   └── batchExport.ts        # Batch processing
│   │   ├── marketplace/              # Template transactions
│   │   │   ├── purchase.ts           # Handle purchases
│   │   │   └── payout.ts             # Creator payouts
│   │   ├── payments/                 # Stripe webhooks
│   │   │   ├── webhook.ts            # Stripe event handler
│   │   │   └── subscription.ts       # Subscription management
│   │   └── scheduled/                # Cron jobs
│   │       └── cleanup.ts            # Cleanup old exports
│   ├── package.json
│   └── tsconfig.json
│
├── public/                           # Static assets (copied as-is)
│   ├── fonts/                        # Self-hosted fonts
│   │   ├── inter-var.woff2
│   │   └── cal-sans.woff2
│   ├── icons/                        # App icons
│   │   ├── favicon.ico
│   │   ├── apple-touch-icon.png
│   │   └── icon-192.png
│   └── images/                       # Static images
│       ├── logo.svg
│       └── og-image.png
│
├── src/                              # Application source
│   │
│   ├── assets/                       # Processed assets
│   │   ├── styles/
│   │   │   ├── base.css              # Reset, variables, typography
│   │   │   ├── components.css        # Reusable component styles
│   │   │   └── utilities.css         # Custom utility classes
│   │   └── images/
│   │       └── patterns/             # Background patterns
│   │
│   ├── components/                   # Vue components
│   │   │
│   │   ├── common/                   # Shared UI components
│   │   │   ├── AppButton.vue         # Button variants
│   │   │   ├── AppModal.vue          # Modal dialog
│   │   │   ├── AppDropdown.vue       # Dropdown menu
│   │   │   ├── AppToast.vue          # Toast notifications
│   │   │   ├── AppLoader.vue         # Loading spinner
│   │   │   ├── AppBadge.vue          # Status badges
│   │   │   ├── AppCard.vue           # Card container
│   │   │   ├── AppInput.vue          # Form input
│   │   │   ├── AppSelect.vue         # Select dropdown
│   │   │   ├── AppToggle.vue         # Toggle switch
│   │   │   ├── AppTabs.vue           # Tab navigation
│   │   │   ├── AppTooltip.vue        # Tooltip
│   │   │   ├── AppAvatar.vue         # User avatar
│   │   │   ├── AppEmptyState.vue     # Empty state placeholder
│   │   │   └── index.ts              # Barrel export
│   │   │
│   │   ├── calendar/                 # Calendar components
│   │   │   ├── CalendarGrid.vue      # Main calendar container
│   │   │   ├── CalendarMonth.vue     # Single month display
│   │   │   ├── CalendarDay.vue       # Day cell
│   │   │   ├── CalendarWeek.vue      # Week row (for weekly view)
│   │   │   ├── HolidayBadge.vue      # Holiday indicator
│   │   │   ├── HolidayTooltip.vue    # Holiday details popup
│   │   │   ├── MonthNavigation.vue   # Month prev/next controls
│   │   │   └── index.ts
│   │   │
│   │   ├── editor/                   # Design editor components
│   │   │   ├── EditorCanvas.vue      # Fabric.js canvas wrapper
│   │   │   ├── EditorToolbar.vue     # Top toolbar
│   │   │   ├── EditorSidebar.vue     # Left sidebar container
│   │   │   ├── EditorLayers.vue      # Layer panel
│   │   │   ├── EditorProperties.vue  # Properties panel
│   │   │   ├── EditorHistory.vue     # Undo/redo controls
│   │   │   ├── EditorZoom.vue        # Zoom controls
│   │   │   ├── EditorRulers.vue      # Measurement rulers
│   │   │   ├── EditorGrid.vue        # Snap grid overlay
│   │   │   ├── ImageUploader.vue     # Image upload widget
│   │   │   ├── TextEditor.vue        # Rich text editing
│   │   │   ├── ShapeLibrary.vue      # Shape picker
│   │   │   ├── ColorPicker.vue       # Color selection
│   │   │   ├── FontPicker.vue        # Font selection
│   │   │   └── index.ts
│   │   │
│   │   ├── export/                   # Export components
│   │   │   ├── ExportPanel.vue       # Export settings panel
│   │   │   ├── ExportPreview.vue     # Export preview
│   │   │   ├── PrintSettings.vue     # Print-specific options
│   │   │   ├── FormatSelector.vue    # Format dropdown
│   │   │   ├── QualitySelector.vue   # Quality/DPI options
│   │   │   ├── BatchExport.vue       # Batch export UI
│   │   │   └── index.ts
│   │   │
│   │   ├── marketplace/              # Marketplace components
│   │   │   ├── TemplateCard.vue      # Template preview card
│   │   │   ├── TemplateGallery.vue   # Template grid
│   │   │   ├── TemplateFilters.vue   # Filter sidebar
│   │   │   ├── TemplateSearch.vue    # Search bar
│   │   │   ├── TemplateDetail.vue    # Full template view
│   │   │   ├── PurchaseModal.vue     # Purchase flow
│   │   │   ├── ReviewList.vue        # Template reviews
│   │   │   ├── ReviewForm.vue        # Write review
│   │   │   ├── CreatorCard.vue       # Creator profile card
│   │   │   └── index.ts
│   │   │
│   │   ├── settings/                 # Settings components
│   │   │   ├── SettingsPanel.vue     # Main settings container
│   │   │   ├── ThemeSelector.vue     # Theme picker
│   │   │   ├── LanguageSelector.vue  # Language dropdown
│   │   │   ├── CountrySelector.vue   # Country picker
│   │   │   ├── HolidayManager.vue    # Custom holiday CRUD
│   │   │   ├── HolidayForm.vue       # Add/edit holiday
│   │   │   ├── BrandKitManager.vue   # Brand kit settings
│   │   │   ├── BrandKitForm.vue      # Brand kit editor
│   │   │   └── index.ts
│   │   │
│   │   ├── dashboard/                # Dashboard components
│   │   │   ├── ProjectCard.vue       # Project preview
│   │   │   ├── ProjectGrid.vue       # Projects list
│   │   │   ├── StatsCard.vue         # Analytics stat card
│   │   │   ├── RecentActivity.vue    # Activity feed
│   │   │   ├── QuickActions.vue      # Action shortcuts
│   │   │   └── index.ts
│   │   │
│   │   ├── auth/                     # Auth components
│   │   │   ├── LoginForm.vue         # Login form
│   │   │   ├── RegisterForm.vue      # Registration form
│   │   │   ├── ForgotPassword.vue    # Password reset
│   │   │   ├── SocialLogin.vue       # OAuth buttons
│   │   │   └── index.ts
│   │   │
│   │   └── layout/                   # Layout components
│   │       ├── AppHeader.vue         # Top navigation
│   │       ├── AppSidebar.vue        # Side navigation
│   │       ├── AppFooter.vue         # Footer
│   │       ├── AppBreadcrumb.vue     # Breadcrumb nav
│   │       ├── UserMenu.vue          # User dropdown
│   │       └── index.ts
│   │
│   ├── composables/                  # Composition functions
│   │   ├── useAuth.ts                # Authentication logic
│   │   ├── useCalendar.ts            # Calendar generation
│   │   ├── useCustomHolidays.ts      # Custom holiday management
│   │   ├── useEditor.ts              # Editor state & actions
│   │   ├── useExport.ts              # Export functionality
│   │   ├── useMarketplace.ts         # Marketplace operations
│   │   ├── useSubscription.ts        # Subscription status
│   │   ├── useTheme.ts               # Theme switching
│   │   ├── useToast.ts               # Toast notifications
│   │   ├── useBreakpoints.ts         # Responsive utilities
│   │   ├── useLocalStorage.ts        # Persistent storage
│   │   └── useDebounce.ts            # Debounce utility
│   │
│   ├── config/                       # Configuration
│   │   ├── firebase.ts               # Firebase initialization
│   │   ├── stripe.ts                 # Stripe configuration
│   │   ├── constants.ts              # App constants
│   │   └── features.ts               # Feature flags
│   │
│   ├── data/                         # Static data
│   │   ├── countries.ts              # African countries list
│   │   ├── holidays/                 # Static holiday fallbacks
│   │   │   ├── index.ts
│   │   │   ├── za.ts                 # South Africa
│   │   │   ├── ng.ts                 # Nigeria
│   │   │   ├── ke.ts                 # Kenya
│   │   │   └── ...                   # Other countries
│   │   ├── templates/                # Default templates
│   │   │   ├── wall-calendar.json
│   │   │   ├── desk-calendar.json
│   │   │   └── planner.json
│   │   ├── themes.ts                 # Theme presets
│   │   ├── translations/             # i18n strings
│   │   │   ├── index.ts
│   │   │   ├── en.ts                 # English
│   │   │   ├── sw.ts                 # Swahili
│   │   │   ├── fr.ts                 # French
│   │   │   ├── ar.ts                 # Arabic
│   │   │   ├── pt.ts                 # Portuguese
│   │   │   ├── am.ts                 # Amharic
│   │   │   ├── yo.ts                 # Yoruba
│   │   │   └── zu.ts                 # Zulu
│   │   └── fonts.ts                  # Available fonts
│   │
│   ├── layouts/                      # Page layouts
│   │   ├── DefaultLayout.vue         # Standard layout
│   │   ├── EditorLayout.vue          # Full-screen editor
│   │   ├── AuthLayout.vue            # Auth pages layout
│   │   └── PrintLayout.vue           # Print preview layout
│   │
│   ├── pages/                        # Route pages
│   │   ├── index.vue                 # Landing / Dashboard
│   │   ├── editor/
│   │   │   ├── index.vue             # New project
│   │   │   └── [id].vue              # Edit project
│   │   ├── marketplace/
│   │   │   ├── index.vue             # Browse templates
│   │   │   └── [id].vue              # Template detail
│   │   ├── dashboard/
│   │   │   ├── index.vue             # Overview
│   │   │   ├── projects.vue          # My projects
│   │   │   ├── templates.vue         # My templates (sellers)
│   │   │   └── analytics.vue         # Creator analytics
│   │   ├── settings/
│   │   │   ├── index.vue             # Account settings
│   │   │   ├── billing.vue           # Subscription
│   │   │   ├── brand-kit.vue         # Brand assets
│   │   │   └── preferences.vue       # App preferences
│   │   ├── auth/
│   │   │   ├── login.vue
│   │   │   ├── register.vue
│   │   │   └── reset-password.vue
│   │   └── legal/
│   │       ├── terms.vue
│   │       └── privacy.vue
│   │
│   ├── router/                       # Vue Router
│   │   ├── index.ts                  # Router instance
│   │   ├── routes.ts                 # Route definitions
│   │   └── guards.ts                 # Navigation guards
│   │
│   ├── services/                     # Business logic
│   │   ├── api/                      # API services
│   │   │   ├── auth.service.ts
│   │   │   ├── projects.service.ts
│   │   │   ├── templates.service.ts
│   │   │   ├── exports.service.ts
│   │   │   └── payments.service.ts
│   │   ├── calendar/                 # Calendar services
│   │   │   ├── holiday.service.ts    # Holiday data fetching
│   │   │   ├── generator.service.ts  # Calendar generation
│   │   │   └── localization.service.ts
│   │   ├── editor/                   # Editor services
│   │   │   ├── canvas.service.ts     # Fabric.js wrapper
│   │   │   ├── history.service.ts    # Undo/redo
│   │   │   └── assets.service.ts     # Asset management
│   │   └── export/                   # Export services
│   │       ├── pdf.service.ts        # PDF generation
│   │       ├── image.service.ts      # Image export
│   │       └── print.service.ts      # Print settings
│   │
│   ├── stores/                       # Pinia stores
│   │   ├── auth.store.ts             # User authentication
│   │   ├── calendar.store.ts         # Calendar state
│   │   ├── editor.store.ts           # Editor state
│   │   ├── theme.store.ts            # Theme settings
│   │   ├── marketplace.store.ts      # Marketplace state
│   │   ├── subscription.store.ts     # Subscription state
│   │   └── toast.store.ts            # Toast notifications
│   │
│   ├── types/                        # TypeScript definitions
│   │   ├── calendar.types.ts
│   │   ├── editor.types.ts
│   │   ├── export.types.ts
│   │   ├── marketplace.types.ts
│   │   ├── user.types.ts
│   │   ├── api.types.ts
│   │   └── index.ts                  # Barrel export
│   │
│   ├── utils/                        # Utility functions
│   │   ├── date.utils.ts             # Date helpers
│   │   ├── color.utils.ts            # Color manipulation
│   │   ├── file.utils.ts             # File handling
│   │   ├── validation.utils.ts       # Form validation
│   │   ├── security.utils.ts         # Sanitization
│   │   ├── format.utils.ts           # Formatting helpers
│   │   └── analytics.utils.ts        # Analytics helpers
│   │
│   ├── App.vue                       # Root component
│   └── main.ts                       # Application entry
│
├── tests/                            # Test files
│   ├── unit/                         # Unit tests
│   │   ├── components/
│   │   ├── composables/
│   │   ├── services/
│   │   └── utils/
│   ├── integration/                  # Integration tests
│   │   ├── auth.test.ts
│   │   ├── calendar.test.ts
│   │   └── export.test.ts
│   └── e2e/                          # End-to-end tests
│       ├── auth.spec.ts
│       ├── editor.spec.ts
│       └── marketplace.spec.ts
│
├── .env.example                      # Environment template
├── .eslintrc.cjs                     # ESLint config
├── .prettierrc                       # Prettier config
├── .gitignore
├── firebase.json                     # Firebase config
├── firestore.rules                   # Firestore security
├── firestore.indexes.json            # Firestore indexes
├── storage.rules                     # Storage security
├── index.html                        # HTML entry
├── package.json
├── pnpm-lock.yaml
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── README.md
```

---

## Component Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Pages | PascalCase, descriptive | `ProjectsPage.vue` |
| Components | PascalCase, prefixed | `AppButton.vue`, `CalendarGrid.vue` |
| Composables | camelCase, `use` prefix | `useAuth.ts`, `useCalendar.ts` |
| Services | camelCase, `.service` suffix | `holiday.service.ts` |
| Stores | camelCase, `.store` suffix | `auth.store.ts` |
| Types | PascalCase, `.types` suffix | `calendar.types.ts` |
| Utils | camelCase, `.utils` suffix | `date.utils.ts` |

---

## Import Aliases

```typescript
// tsconfig.json paths
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/components/*": ["src/components/*"],
      "@/composables/*": ["src/composables/*"],
      "@/services/*": ["src/services/*"],
      "@/stores/*": ["src/stores/*"],
      "@/types/*": ["src/types/*"],
      "@/utils/*": ["src/utils/*"],
      "@/data/*": ["src/data/*"],
      "@/config/*": ["src/config/*"]
    }
  }
}
```

---

*Continue to [04-foundation.md](./04-foundation.md) for Phase 1 implementation details.*
