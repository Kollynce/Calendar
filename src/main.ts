import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { initializeFirebase } from './config/firebase'
import { useThemeStore } from './stores/theme.store'
import { useAuthStore } from './stores/auth.store'

// Styles
import './style.css'
import './assets/main.css'

async function bootstrap() {
  // Initialize Firebase
  initializeFirebase()

  // Create Vue app
  const app = createApp(App)
  const pinia = createPinia()

  app.use(pinia)
  app.use(router)

  // Initialize stores
  const themeStore = useThemeStore()
  const authStore = useAuthStore()

  themeStore.initialize()
  await authStore.initialize()

  // Mount app
  app.mount('#app')
}

bootstrap()
