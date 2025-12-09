import { initializeApp, type FirebaseApp } from 'firebase/app'
import { 
  getAuth, 
  connectAuthEmulator, 
  type Auth 
} from 'firebase/auth'
import { 
  getFirestore, 
  connectFirestoreEmulator, 
  type Firestore 
} from 'firebase/firestore'
import { 
  getStorage, 
  connectStorageEmulator, 
  type FirebaseStorage 
} from 'firebase/storage'
import { 
  getFunctions, 
  connectFunctionsEmulator, 
  type Functions 
} from 'firebase/functions'
import { getAnalytics, type Analytics } from 'firebase/analytics'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

let app: FirebaseApp
let auth: Auth
let db: Firestore
let storage: FirebaseStorage
let functions: Functions
let analytics: Analytics | null = null

export function initializeFirebase() {
  app = initializeApp(firebaseConfig)
  auth = getAuth(app)
  db = getFirestore(app)
  storage = getStorage(app)
  functions = getFunctions(app)

  // Initialize analytics only in production
  if (import.meta.env.PROD) {
    analytics = getAnalytics(app)
  }

  // Connect to emulators in development
  if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true') {
    connectAuthEmulator(auth, 'http://localhost:9099')
    connectFirestoreEmulator(db, 'localhost', 8080)
    connectStorageEmulator(storage, 'localhost', 9199)
    connectFunctionsEmulator(functions, 'localhost', 5001)
    console.log('🔧 Connected to Firebase emulators')
  }

  return { app, auth, db, storage, functions, analytics }
}

// Initialize immediately for exports
initializeFirebase()

export { app, auth, db, storage, functions, analytics }
