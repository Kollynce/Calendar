/// <reference types="vite/client" />

export {}

interface ImportMetaEnv {
  readonly VITE_ENABLE_SERVER_EXPORTS?: string
  readonly VITE_PAYPAL_CLIENT_ID?: string
  readonly VITE_PAYSTACK_PUBLIC_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: {
        key: string
        email: string
        amount: number
        currency?: string
        ref?: string
        callback?: (response: { reference: string }) => void
        onClose?: () => void
      }) => { openIframe: () => void }
    }
  }
}
