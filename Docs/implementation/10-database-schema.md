# Database Schema & Security Rules

## 1. Firestore Collections

### 1.1 Users Collection

```typescript
// Collection: users/{userId}
interface UserDocument {
  // Profile
  email: string
  displayName: string
  photoURL?: string
  
  // Role & Subscription
  role: 'user' | 'creator' | 'admin'
  subscription: 'free' | 'pro' | 'business' | 'enterprise'
  
  // PayPal Integration
  paypalCustomerId?: string
  
  // Preferences
  preferences: {
    theme: 'light' | 'dark' | 'system'
    language: string
    defaultCountry: string
    emailNotifications: boolean
    marketingEmails: boolean
  }
  
  // Stats
  projectCount: number
  templateCount: number
  totalDownloads: number
  
  // Timestamps
  createdAt: Timestamp
  updatedAt: Timestamp
  lastLoginAt: Timestamp
}

// Subcollection: users/{userId}/brandKits/{brandKitId}
interface BrandKitDocument {
  name: string
  logo?: string
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    text: string
  }
  fonts: {
    heading: string
    body: string
  }
  createdAt: Timestamp
  updatedAt: Timestamp
}

// Subcollection: users/{userId}/customHolidays/{holidayId}
interface CustomHolidayDocument {
  date: string // YYYY-MM-DD
  name: string
  color: string
  type: 'custom'
  recurrence?: {
    frequency: 'yearly' | 'monthly' | 'weekly'
    interval: number
    endDate?: string
  }
  notes?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### 1.2 Projects Collection

```typescript
// Collection: projects/{projectId}
interface ProjectDocument {
  // Ownership
  userId: string
  
  // Metadata
  name: string
  description?: string
  templateId?: string
  
  // Calendar Configuration
  config: {
    year: number
    country: string
    language: string
    layout: string
    startDay: number
    showHolidays: boolean
    showCustomHolidays: boolean
    showWeekNumbers: boolean
  }
  
  // Canvas State (stored as JSON string for large objects)
  canvasData: string // JSON stringified CanvasState
  
  // Preview
  thumbnail?: string // Base64 or Storage URL
  
  // Status
  status: 'draft' | 'published' | 'archived'
  
  // Timestamps
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### 1.3 Templates Collection (Marketplace)

```typescript
// Collection: templates/{templateId}
interface TemplateDocument {
  // Creator
  creatorId: string
  creatorName: string
  creatorAvatar?: string
  
  // Metadata
  name: string
  description: string
  category: string
  tags: string[]
  
  // Media
  thumbnail: string
  previewImages: string[]
  
  // Pricing
  price: number // in cents, 0 = free
  currency: 'USD'
  license: 'free' | 'personal' | 'commercial' | 'extended'
  
  // Template Data
  canvasData: string // JSON stringified CanvasState
  config: Partial<CalendarConfig>
  
  // Stats
  downloads: number
  rating: number // 1-5 average
  reviewCount: number
  
  // Status
  status: 'draft' | 'pending' | 'approved' | 'rejected'
  rejectionReason?: string
  
  // Timestamps
  createdAt: Timestamp
  updatedAt: Timestamp
  publishedAt?: Timestamp
}

// Subcollection: templates/{templateId}/reviews/{reviewId}
interface ReviewDocument {
  userId: string
  userName: string
  userAvatar?: string
  rating: number // 1-5
  comment?: string
  createdAt: Timestamp
}

// Subcollection: templates/{templateId}/purchases/{purchaseId}
interface PurchaseDocument {
  userId: string
  amount: number
  currency: string
  stripePaymentId: string
  createdAt: Timestamp
}
```

### 1.4 Subscriptions Collection

```typescript
// Collection: subscriptions/{subscriptionId}
interface SubscriptionDocument {
  userId: string
  tier: 'free' | 'pro' | 'business' | 'enterprise'
  status: 'active' | 'past_due' | 'canceled' | 'incomplete' | 'trialing'
  
  // PayPal
  paypalCustomerId: string
  paypalSubscriptionId: string
  paypalPlanId: string
  
  // Billing Period
  currentPeriodStart: Timestamp
  currentPeriodEnd: Timestamp
  cancelAtPeriodEnd: boolean
  
  // Timestamps
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### 1.5 Orders Collection

```typescript
// Collection: orders/{orderId}
interface OrderDocument {
  // Parties
  buyerId: string
  sellerId: string
  
  // Item
  templateId: string
  templateName: string
  
  // Payment
  amount: number
  platformFee: number // 15%
  sellerPayout: number // 85%
  currency: 'USD'
  
  // PayPal
  paypalOrderId: string
  paypalPayoutId?: string // For seller payout
  
  // Status
  status: 'pending' | 'completed' | 'refunded' | 'failed'
  
  // Timestamps
  createdAt: Timestamp
  completedAt?: Timestamp
}
```

### 1.6 Feedback Collection

```typescript
// Collection: feedback/{feedbackId}
interface FeedbackDocument {
  userId?: string
  email?: string
  type: 'bug' | 'feature' | 'general'
  message: string
  page?: string
  userAgent?: string
  status: 'new' | 'reviewed' | 'resolved'
  createdAt: Timestamp
}
```

---

## 2. Firestore Security Rules

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ═══════════════════════════════════════════════════════════════
    // HELPER FUNCTIONS
    // ═══════════════════════════════════════════════════════════════
    
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    function isAdmin() {
      return isAuthenticated() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    function isCreator() {
      return isAuthenticated() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['creator', 'admin'];
    }
    
    function getUserSubscription() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.subscription;
    }
    
    function isPro() {
      return getUserSubscription() in ['pro', 'business', 'enterprise'];
    }
    
    function isBusiness() {
      return getUserSubscription() in ['business', 'enterprise'];
    }
    
    // Validate string length
    function validString(field, min, max) {
      return field is string && field.size() >= min && field.size() <= max;
    }
    
    // Rate limiting helper (checks recent writes)
    function rateLimitOk(collection, limit, windowSeconds) {
      let recentDocs = getAfter(/databases/$(database)/documents/$(collection))
        .where('userId', '==', request.auth.uid)
        .where('createdAt', '>', request.time - duration.value(windowSeconds, 's'))
        .limit(limit + 1);
      return recentDocs.size() <= limit;
    }
    
    // ═══════════════════════════════════════════════════════════════
    // USERS COLLECTION
    // ═══════════════════════════════════════════════════════════════
    
    match /users/{userId} {
      // Anyone can read basic profile info
      allow read: if isAuthenticated();
      
      // Users can only create their own profile
      allow create: if isOwner(userId) && 
        validString(request.resource.data.displayName, 1, 100) &&
        request.resource.data.role == 'user' &&
        request.resource.data.subscription == 'free';
      
      // Users can update their own profile (except role/subscription)
      allow update: if isOwner(userId) && 
        request.resource.data.role == resource.data.role &&
        request.resource.data.subscription == resource.data.subscription;
      
      // Only admins can delete users
      allow delete: if isAdmin();
      
      // Brand Kits subcollection
      match /brandKits/{brandKitId} {
        allow read: if isOwner(userId);
        allow create: if isOwner(userId) && isPro();
        allow update, delete: if isOwner(userId);
      }
      
      // Custom Holidays subcollection
      match /customHolidays/{holidayId} {
        allow read: if isOwner(userId);
        allow create: if isOwner(userId);
        allow update, delete: if isOwner(userId);
      }
    }
    
    // ═══════════════════════════════════════════════════════════════
    // PROJECTS COLLECTION
    // ═══════════════════════════════════════════════════════════════
    
    match /projects/{projectId} {
      // Users can read their own projects
      allow read: if isOwner(resource.data.userId);
      
      // Users can create projects (with limits based on subscription)
      allow create: if isAuthenticated() && 
        request.resource.data.userId == request.auth.uid &&
        validString(request.resource.data.name, 1, 200);
      
      // Users can update their own projects
      allow update: if isOwner(resource.data.userId) &&
        request.resource.data.userId == resource.data.userId;
      
      // Users can delete their own projects
      allow delete: if isOwner(resource.data.userId);
    }
    
    // ═══════════════════════════════════════════════════════════════
    // TEMPLATES COLLECTION (MARKETPLACE)
    // ═══════════════════════════════════════════════════════════════
    
    match /templates/{templateId} {
      // Anyone can read approved templates
      allow read: if resource.data.status == 'approved' || 
        isOwner(resource.data.creatorId) ||
        isAdmin();
      
      // Creators can create templates
      allow create: if isCreator() && 
        request.resource.data.creatorId == request.auth.uid &&
        request.resource.data.status == 'draft' &&
        validString(request.resource.data.name, 1, 200) &&
        validString(request.resource.data.description, 10, 2000);
      
      // Creators can update their own templates (except status)
      allow update: if isOwner(resource.data.creatorId) &&
        request.resource.data.creatorId == resource.data.creatorId &&
        (request.resource.data.status == resource.data.status || 
         request.resource.data.status == 'pending');
      
      // Only admins can approve/reject templates
      allow update: if isAdmin();
      
      // Creators can delete their own draft templates
      allow delete: if isOwner(resource.data.creatorId) && 
        resource.data.status == 'draft';
      
      // Reviews subcollection
      match /reviews/{reviewId} {
        // Anyone can read reviews
        allow read: if true;
        
        // Authenticated users can create reviews (one per user per template)
        allow create: if isAuthenticated() && 
          request.resource.data.userId == request.auth.uid &&
          request.resource.data.rating >= 1 &&
          request.resource.data.rating <= 5;
        
        // Users can update their own reviews
        allow update: if isOwner(resource.data.userId);
        
        // Users can delete their own reviews
        allow delete: if isOwner(resource.data.userId);
      }
      
      // Purchases subcollection (read-only for users)
      match /purchases/{purchaseId} {
        allow read: if isOwner(resource.data.userId) || 
          isOwner(get(/databases/$(database)/documents/templates/$(templateId)).data.creatorId);
        // Purchases are created by Cloud Functions only
        allow write: if false;
      }
    }
    
    // ═══════════════════════════════════════════════════════════════
    // SUBSCRIPTIONS COLLECTION
    // ═══════════════════════════════════════════════════════════════
    
    match /subscriptions/{subscriptionId} {
      // Users can read their own subscription
      allow read: if isOwner(resource.data.userId);
      
      // Subscriptions are managed by Cloud Functions only
      allow write: if false;
    }
    
    // ═══════════════════════════════════════════════════════════════
    // ORDERS COLLECTION
    // ═══════════════════════════════════════════════════════════════
    
    match /orders/{orderId} {
      // Buyers and sellers can read their orders
      allow read: if isOwner(resource.data.buyerId) || 
        isOwner(resource.data.sellerId) ||
        isAdmin();
      
      // Orders are created by Cloud Functions only
      allow write: if false;
    }
    
    // ═══════════════════════════════════════════════════════════════
    // FEEDBACK COLLECTION
    // ═══════════════════════════════════════════════════════════════
    
    match /feedback/{feedbackId} {
      // Only admins can read feedback
      allow read: if isAdmin();
      
      // Anyone can create feedback (with rate limiting)
      allow create: if validString(request.resource.data.message, 10, 5000) &&
        request.resource.data.type in ['bug', 'feature', 'general'];
      
      // No updates or deletes
      allow update, delete: if false;
    }
  }
}
```

---

## 3. Firestore Indexes

```json
// firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "projects",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "updatedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "projects",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "templates",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "category", "order": "ASCENDING" },
        { "fieldPath": "downloads", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "templates",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "price", "order": "ASCENDING" },
        { "fieldPath": "rating", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "templates",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "creatorId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "orders",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "sellerId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "orders",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "buyerId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "reviews",
      "queryScope": "COLLECTION_GROUP",
      "fields": [
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": [
    {
      "collectionGroup": "templates",
      "fieldPath": "tags",
      "indexes": [
        { "order": "ASCENDING", "queryScope": "COLLECTION" },
        { "arrayConfig": "CONTAINS", "queryScope": "COLLECTION" }
      ]
    }
  ]
}
```

---

## 4. Cloud Storage Rules

```javascript
// storage.rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    function isValidImage() {
      return request.resource.contentType.matches('image/.*') &&
        request.resource.size < 10 * 1024 * 1024; // 10MB max
    }
    
    function isValidPDF() {
      return request.resource.contentType == 'application/pdf' &&
        request.resource.size < 50 * 1024 * 1024; // 50MB max
    }
    
    // ═══════════════════════════════════════════════════════════════
    // USER UPLOADS
    // ═══════════════════════════════════════════════════════════════
    
    // User profile images
    match /users/{userId}/avatar/{fileName} {
      allow read: if true;
      allow write: if isOwner(userId) && isValidImage();
    }
    
    // User brand kit assets
    match /users/{userId}/brandKits/{brandKitId}/{fileName} {
      allow read: if isOwner(userId);
      allow write: if isOwner(userId) && isValidImage();
    }
    
    // ═══════════════════════════════════════════════════════════════
    // PROJECT ASSETS
    // ═══════════════════════════════════════════════════════════════
    
    // Project images and assets
    match /projects/{projectId}/{fileName} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && isValidImage();
    }
    
    // Project thumbnails
    match /projects/{projectId}/thumbnail {
      allow read: if true;
      allow write: if isAuthenticated() && isValidImage();
    }
    
    // ═══════════════════════════════════════════════════════════════
    // TEMPLATE ASSETS (MARKETPLACE)
    // ═══════════════════════════════════════════════════════════════
    
    // Template preview images
    match /templates/{templateId}/previews/{fileName} {
      allow read: if true;
      allow write: if isAuthenticated() && isValidImage();
    }
    
    // Template thumbnail
    match /templates/{templateId}/thumbnail {
      allow read: if true;
      allow write: if isAuthenticated() && isValidImage();
    }
    
    // ═══════════════════════════════════════════════════════════════
    // EXPORTS (TEMPORARY)
    // ═══════════════════════════════════════════════════════════════
    
    // Exported files (auto-deleted after 24 hours via lifecycle policy)
    match /exports/{userId}/{exportId}/{fileName} {
      allow read: if isOwner(userId);
      allow write: if isOwner(userId) && (isValidImage() || isValidPDF());
    }
  }
}
```

---

## 5. Data Migration Scripts

```typescript
// functions/src/migrations/index.ts
import * as admin from 'firebase-admin'

const db = admin.firestore()

/**
 * Add new field to all user documents
 */
export async function addFieldToUsers(
  fieldName: string,
  defaultValue: any
): Promise<void> {
  const batch = db.batch()
  const users = await db.collection('users').get()
  
  let count = 0
  for (const doc of users.docs) {
    if (doc.data()[fieldName] === undefined) {
      batch.update(doc.ref, { [fieldName]: defaultValue })
      count++
      
      // Firestore batch limit is 500
      if (count % 500 === 0) {
        await batch.commit()
      }
    }
  }
  
  if (count % 500 !== 0) {
    await batch.commit()
  }
  
  console.log(`Updated ${count} user documents`)
}

/**
 * Migrate template schema
 */
export async function migrateTemplateSchema(): Promise<void> {
  const templates = await db.collection('templates').get()
  
  for (const doc of templates.docs) {
    const data = doc.data()
    
    // Example: Rename field
    if (data.oldFieldName !== undefined) {
      await doc.ref.update({
        newFieldName: data.oldFieldName,
        oldFieldName: admin.firestore.FieldValue.delete(),
      })
    }
  }
}

/**
 * Recalculate template statistics
 */
export async function recalculateTemplateStats(): Promise<void> {
  const templates = await db.collection('templates').get()
  
  for (const doc of templates.docs) {
    const reviews = await doc.ref.collection('reviews').get()
    const purchases = await doc.ref.collection('purchases').get()
    
    let totalRating = 0
    reviews.forEach((review) => {
      totalRating += review.data().rating
    })
    
    const avgRating = reviews.size > 0 ? totalRating / reviews.size : 0
    
    await doc.ref.update({
      rating: avgRating,
      reviewCount: reviews.size,
      downloads: purchases.size,
    })
  }
}
```

---

*Continue to [11-api-specs.md](./11-api-specs.md) for Cloud Functions API specifications.*
