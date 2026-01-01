# Dashboard Marketplace Templates Management

## Overview
This document outlines the implementation plan for managing marketplace templates from the dashboard. The goal is to create a one-stop shop where admins can manage templates and users can download/edit templates directly in the editor.

## Current State
- **Dashboard templates page**: Minimal placeholder (6 lines)
- **Marketplace service**: Has basic CRUD but missing `updateTemplate`, `deleteTemplate`
- **Storage**: Thumbnails currently stored as data URLs or external URLs
- **Firestore rules**: Already support admin/owner CRUD operations

## Goals
1. Replace hardcoded templates with actual `marketplace_templates` from Firestore
2. Enable admin CRUD operations (create, read, update, delete)
3. Store thumbnails/images in Firebase Storage for efficiency
4. Allow users to download and edit templates in the editor
5. Maintain best practices for image storage and retrieval

---

## Implementation Phases

### Phase 1: Extend Marketplace Service ✅
**File**: `src/services/marketplace.service.ts`

**New Methods:**
- [x] `updateTemplate(id, data)` - Update template metadata
- [x] `deleteTemplate(id)` - Delete template and associated storage files
- [x] `uploadThumbnailFile(file, creatorId, templateId)` - Upload thumbnail to Firebase Storage
- [x] `deleteThumbnailFromStorage(url)` - Clean up storage on template delete
- [x] `incrementDownloads(id)` - Track template usage

**Storage Structure:**
```
marketplace-thumbnails/
  └── {creatorId}/
      └── {templateId}-{timestamp}.{ext}
```

---

### Phase 2: Dashboard Templates Page ✅
**File**: `src/pages/dashboard/templates.vue`

**Features:**
- [x] Template grid displaying all marketplace templates
- [x] Search by name, creator, description
- [x] Filter by category, tier
- [x] Sort by downloads, date, name
- [x] Admin/Owner actions: Edit, Delete, View, Use Template
- [x] Loading/error states
- [x] Empty state
- [x] Delete confirmation modal

**UI Components:**
- Template card with thumbnail, name, category, tier badge, downloads
- Action buttons (Use, View, Edit, Delete) on hover overlay
- Filter toolbar with search, category, tier, sort

---

### Phase 3: Template Edit Modal ✅
**File**: `src/components/dashboard/TemplateEditModal.vue`

**Editable Fields:**
- [x] `name` (string, 3-200 chars)
- [x] `description` (string, 10-2000 chars)
- [x] `category` (select: monthly, photo, planner, year-grid, minimal, decorative)
- [x] `price` (number, >= 0, in cents)
- [x] `requiredTier` (select: free, pro, business)
- [x] `features` (array of strings, max 20)
- [x] `isPopular` (boolean toggle)
- [x] `isNew` (boolean toggle)
- [x] `thumbnail` (file upload to Storage)

**Validation:**
- [x] Match Firestore rules validation
- [x] Client-side validation before submit
- [x] File size limit (2MB)
- [x] Image type validation

---

### Phase 4: Download & Apply Template ✅
**Integration Points:**
- [x] Dashboard templates: "Use Template" action creates new project
- [ ] Marketplace detail page: "Use Template" button (future enhancement)
- [x] Editor: Loads project with templateId reference

**Flow:**
1. User clicks "Use Template" button on template card
2. System increments download count
3. System creates new project with template reference
4. Redirect to editor with project ID
5. Editor loads and applies template configuration

---

### Phase 5: Storage Best Practices

**Thumbnail Upload:**
1. Accept image file (PNG, JPG, WebP)
2. Validate file size (max 2MB)
3. Generate unique path: `marketplace-thumbnails/{creatorId}/{templateId}-{timestamp}.{ext}`
4. Upload to Firebase Storage
5. Get download URL
6. Store URL in Firestore document

**Cleanup on Delete:**
1. Get thumbnail URL from document
2. Parse storage path from URL
3. Delete file from Storage
4. Delete Firestore document

---

## File Changes Summary

| File | Action | Status |
|------|--------|--------|
| `src/services/marketplace.service.ts` | Add update/delete/storage methods | ✅ Complete |
| `src/pages/dashboard/templates.vue` | Complete rewrite with management UI | ✅ Complete |
| `src/components/dashboard/TemplateEditModal.vue` | New file | ✅ Complete |
| `storage.rules` | Add marketplace-thumbnails rules | ✅ Complete |
| `src/pages/marketplace/[id].vue` | Add "Use Template" button | ⏳ Future |

---

## Firestore Rules (Already Configured)
```javascript
match /marketplace_templates/{templateId} {
  allow read: if true;
  allow create: if isAuthenticated() && request.resource.data.creatorId == request.auth.uid;
  allow update: if (isOwner(resource.data.creatorId) || isAdmin()) && validMarketplaceTemplate(request.resource.data);
  allow delete: if isAdmin() || isOwner(resource.data.creatorId);
}
```

---

## Storage Rules (To Verify)
```javascript
match /marketplace-thumbnails/{creatorId}/{fileName} {
  allow read: if true;
  allow write: if request.auth.uid == creatorId || request.auth.token.admin == true;
  allow delete: if request.auth.uid == creatorId || request.auth.token.admin == true;
}
```

---

## Data Model

### MarketplaceProduct Interface
```typescript
interface MarketplaceProduct {
  id?: string
  name: string                              // 3-200 chars
  description: string                       // 10-2000 chars
  category: string                          // monthly, photo, planner, etc.
  price: number                             // in cents, >= 0
  creatorId: string                         // Firebase Auth UID
  creatorName: string                       // 1-100 chars
  downloads: number                         // >= 0
  features: string[]                        // max 20 items
  isPopular: boolean
  isNew: boolean
  requiredTier: 'free' | 'pro' | 'business'
  templateData: Partial<CalendarTemplate>   // Actual template configuration
  thumbnail?: string                        // Storage URL
  publishedAt?: Timestamp
  updatedAt?: Timestamp
}
```

---

## Testing Checklist
- [ ] Create new template with thumbnail upload
- [ ] Edit template metadata
- [ ] Update template thumbnail
- [ ] Delete template (verify storage cleanup)
- [ ] Filter and search templates
- [ ] Download template to editor
- [ ] Apply template in editor
- [ ] Permission checks (admin vs owner vs regular user)

---

## Notes
- Thumbnails should be optimized before upload (consider client-side compression)
- Consider adding image preview before upload
- Template data should be validated before saving
- Consider adding template versioning for future updates
