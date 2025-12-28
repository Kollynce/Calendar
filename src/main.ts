import { createApp, watch } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import AppTierBadge from '@/components/ui/AppTierBadge.vue'
import { initializeFirebase } from './config/firebase'
import { useThemeStore } from './stores/theme.store'
import { useAuthStore } from './stores/auth.store'
import { useCalendarStore } from './stores/calendar.store'

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
  const calendarStore = useCalendarStore()

  themeStore.initialize()
  await authStore.initialize()

  await calendarStore.syncCustomHolidays(authStore.user?.id ?? null)
  watch(
    () => authStore.user?.id ?? null,
    async (nextUserId) => {
      await calendarStore.syncCustomHolidays(nextUserId)
    },
  )

  // Mount app
  app.mount('#app')
}

bootstrap()
