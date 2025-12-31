import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyDLQIXzx3ixx4Z32EJuUz0OFrkCw5X5m0A",
  authDomain: "calendardesigners.firebaseapp.com",
  projectId: "calendardesigners",
  storageBucket: "calendardesigners.firebisestorage.app",
  messagingSenderId: "28378963724",
  appId: "1:28378963724:web:4a59127137149fe730f329",
  measurementId: "G-EJZWHC9L5J"
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

async function testMarketplacePublish() {
  try {
    // Sign in (you'll need to replace with actual credentials)
    console.log('Attempting to sign in...')
    const userCredential = await signInWithEmailAndPassword(auth, 'your-email@example.com', 'your-password')
    console.log('Signed in successfully:', userCredential.user.uid)

    // Test minimal marketplace template data
    const testData = {
      name: 'Test Template',
      description: 'This is a test template description that is at least 10 characters long.',
      category: 'monthly',
      price: 0,
      creatorId: userCredential.user.uid,
      creatorName: 'Test User',
      downloads: 0,
      features: [],
      isPopular: false,
      isNew: true,
      requiredTier: 'free',
      templateData: null,
      thumbnail: null,
      publishedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    console.log('Attempting to write to marketplace_templates...')
    const docRef = doc(db, 'marketplace_templates', 'test-template-' + Date.now())
    await setDoc(docRef, testData)
    console.log('✅ Successfully published to marketplace!')

  } catch (error) {
    console.error('❌ Error:', error)
    console.error('Error code:', error.code)
    console.error('Error message:', error.message)
  }
}

testMarketplacePublish()
