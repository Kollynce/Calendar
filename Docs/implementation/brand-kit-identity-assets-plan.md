# Brand Kit Identity Assets — Implementation Plan

## 1. Objective
Transform `/settings/brand-kit` into a full brand system workspace where agencies can curate, preview, and export logo, typography, palette, and watermark assets for every client. The plan below decomposes the enhancements we discussed into actionable engineering steps.

## 2. Current State Assessment
- **UI & Logic** — The page is rendered from `src/pages/settings/brand-kit.vue`, with the Identity Assets card covering kit name, logo URL, description, fonts, and a fixed five-color palette, and the Default Watermark card controlling visibility, mode, scale, opacity, and placement via computed setters @/src/pages/settings/brand-kit.vue#571-710, @/src/pages/settings/brand-kit.vue#134-342.
- **State Management** — Brand kits live inside the auth store: creation/updating/deleting uses `createBrandKit`, `updateBrandKit`, etc., persisting to Firestore/local storage via `persistBrandKitState` @/src/stores/auth.store.ts#587-629.
- **Data Shape** — `BrandKit` only stores `name`, `description`, `logo`, `colors` (primary/secondary/accent/background/text), `fonts` (heading/body), optional `watermark`, tags, timestamps @/src/types/user.types.ts#36-56.

## 3. Feature & Functionality Enhancements

### 3.1 Richer Asset Metadata & Previews
**Goal**: Make kits feel like tangible libraries with usage guidance and live previews.

- **UX**  
  - Replace plain inputs with preview blocks (logo render, sample heading/body text, palette swatches labelled with use cases).  
  - Add structured fields: “Usage Notes”, “Voice/Tone”, “Asset Attachments”.
- **Implementation**  
  - Extend `BrandKit` with optional `notes`, `tone`, `assets: Array<{id,name,url,type}>`.  
  - Introduce `IdentityPreviewCard` component referencing `editingKit` data for real-time rendering.  
  - Add `AppFileUpload` (existing pattern from watermark uploads) for attachment handling; reuse Firebase storage helpers if available, otherwise add new storage service.
- **Dependencies**: Need storage bucket permissions and CDN URLs for attachments. Update serialization in auth store when persisting new fields.
- **Risks**: Upload quotas and storage billing; plan throttling/validation.

### 3.2 Dynamic Palette Management + Accessibility Guardrails
**Goal**: Support arbitrary palette roles and ensure AA/AAA compliance.

- **UX**  
  - Replace hard-coded color loop with a sortable list (role name + hex). Provide add/remove buttons and quick role presets.  
  - Show contrast ratio between text/background and flag warnings when below thresholds.
- **Implementation**  
  - Change `BrandColors` to `Record<string, string>` or `{ id, label, value }[]`. Provide migration helper to map legacy five colors.  
  - Build `ColorRoleList` component with inputs for label + color picker, calling `editingKit.colors`.  
  - Add utility (WCAG contrast algorithm) and display ratio badges inside each row.  
  - Persist colors as array/object; ensure watchers in `brand-kit.vue` deep clone correctly when saving @/src/pages/settings/brand-kit.vue#279-284.
- **Dependencies**: Potential schema migration for existing kits (run on load).  
- **Risks**: Backwards compatibility; guard by defaulting to legacy map when array absent.

### 3.3 Typography Toolkit & Font Picker
**Goal**: Provide guided font selection with previews and fallbacks.

- **UX**  
  - Replace text inputs with searchable font dropdown (Google Fonts API) plus fallback selector.  
  - Show live preview paragraphs (headline, paragraph, button) reflecting selected fonts and weights.  
  - Support custom font upload (WOFF/TTF) stored alongside kit.
- **Implementation**  
  - Extend fonts model to `{ heading: { family, weight, fallback?, source }, body: ... }`.  
  - Create `useGoogleFonts` composable to fetch list/cached metadata.  
  - Lazy-load font files using `<link rel="stylesheet">` injection or CSS `@font-face`.  
  - Add upload handler storing file, returning URL for `source: 'upload'`.
- **Dependencies**: Google Fonts API key (if required) or static metadata JSON.  
- **Risks**: Flash of unstyled text; mitigate via preload + skeleton states.

### 3.4 Asset Syncing & Export Packages
**Goal**: Turn Identity Assets into a delivery hub for designers/clients.

- **UX**  
  - Add “Upload Logo” (PNG/SVG) with preview + cropper, plus derived assets (favicons, social icons).  
  - Provide “Export Kit” CTA to download ZIP containing JSON (palette, fonts), CSS tokens, watermark config, and binary assets.
- **Implementation**  
  - Introduce storage helper (Firebase Storage) to upload logo/derivatives; store URLs inside `BrandKit`.  
  - Build `generateBrandKitExport(kit: BrandKit)` utility that:  
    1. Serializes data to JSON.  
    2. Builds CSS file with `--brand-color-*`, font-face declarations.  
    3. Copies linked assets into temp folder.  
    4. Compresses via JSZip (client) or cloud function.  
  - Add API endpoint (Cloud Function) if server-side zip needed; otherwise perform client-side packaging.
- **Dependencies**: Storage rules updates (`storage.rules`) to allow asset uploads per user.  
- **Risks**: Large files; enforce size limits and progress indicators.

### 3.5 Collaboration & History
**Goal**: Enable multi-user teams to coordinate changes.

- **UX**  
  - Display “Last updated by X at time Y” using `updatedAt` + future `updatedBy`.  
  - Add comment sidebar per kit with mention support and approval toggle.  
  - Provide “Change log” modal listing previous versions with revert option.
- **Implementation**  
  - Extend `BrandKit` with `updatedBy`, `history: BrandKitRevision[]`.  
  - On save, push diff snapshot to history (limit length).  
  - Comments: leverage existing Firestore collections (`brandKitComments/{kitId}`) with listeners in `brand-kit.vue`.  
  - Revert action clones revision into editing state before save.
- **Dependencies**: Authentication info for `updatedBy`.  
- **Risks**: History growth—prune or paginate.

### 3.6 Guided Automation Helpers
**Goal**: Reduce manual setup via AI/logic.

- **UX**  
  - Add “Generate palette from logo” button near color section, “Suggest font pairing” near typography, and “Auto-position watermark” controls.  
  - Provide result preview with accept/adjust actions.
- **Implementation**  
  - Palette generation: sample colors from uploaded logo using canvas, cluster via k-means, map to roles.  
  - Font pairing suggestions: curated JSON or external AI call returning recommended combos.  
  - Watermark suggestion: rule-based (e.g., if primary palette dark -> lighten watermark), hooking into existing `updateWatermark` flow @/src/pages/settings/brand-kit.vue#212-242.  
  - Add `useIdentityAssistant` composable orchestrating async helpers and progress states.
- **Dependencies**: If AI APIs used, need keys + secure proxy.  
- **Risks**: Non-deterministic outputs; provide undo + manual override.

## 4. Implementation Phases & Tasks

| Phase | Focus | Key Tasks | Owners |
| --- | --- | --- | --- |
| **P1 — Data & Infrastructure (1 sprint)** | Extend models/storage | Update `BrandKit` interface & store, add migration for colors/fonts, update Firestore rules, storage helper for uploads. | Frontend + backend |
| **P2 — UX Foundations (1–2 sprints)** | Build new Identity Assets UI | Create preview components, dynamic palette list, font picker, new upload widgets, integrate watchers/computed states. | Frontend |
| **P3 — Export & Collaboration (1 sprint)** | Export pipelines + history/comments | JSZip utility or Cloud Function, comments sidebar, revision log, UI surfacing metadata. | Full-stack |
| **P4 — Automation Enhancements (1 sprint)** | AI/logic helpers | Implement palette sampler, font suggestions, watermark presets, toggles. | Frontend w/ ML support |
| **P5 — Polish & QA (0.5 sprint)** | Accessibility, perf, docs | a11y tests, responsive tweaks, update README/help docs, release toggles. | QA + Docs |

## 5. Testing & Validation
- **Unit Tests**:  
  - Color contrast calculations, font picker helpers, export generator, watermark updates.  
- **Component Tests** (Vue Test Utils):  
  - Dynamic palette list interactions, preview cards reacting to state changes, automation helper flows.  
- **E2E Tests** (Cypress/Playwright):  
  - Create kit → upload logo → generate palette → export ZIP.  
  - Collaboration scenario: two users editing/comments.  
- **Manual QA Checklist**:  
  - Upload limits & error states, offline handling, accessibility (tab order, ARIA), responsiveness down to mobile widths.

## 6. Risks & Mitigations
1. **Schema drift for existing kits** — Add migration util that runs inside `hydrateEditingKit` to map legacy structures, plus background job to persist normalized data.  
2. **Large asset uploads** — Enforce client-side validation (type/size) and show progress; optionally resize/crop before upload.  
3. **Export performance** — For very large kits, offload ZIP generation to a Cloud Function triggered via HTTPS to keep UI responsive.  
4. **AI helper reliability** — Gate behind beta flag, offer deterministic fallbacks (preset palettes/fonts).  

## 7. Deliverables
- Updated Vue components with previews, dynamic palettes, font picker, automation controls.
- New composables/utilities: `useIdentityAssistant`, `useGoogleFonts`, `generateBrandKitExport`.
- Extended data models & store methods with migration scripts.
- Docs & help center updates explaining new workflows plus onboarding tooltips within the UI.

This plan keeps enhancements modular so we can ship value incrementally while converging on a cohesive Identity Assets experience.
