import { loadScript, type PayPalNamespace } from '@paypal/paypal-js'

let paypal: PayPalNamespace | null = null

export async function initPayPal(): Promise<PayPalNamespace | null> {
  if (paypal) return paypal

  const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID
  
  if (!clientId) {
    console.warn('PayPal client ID not configured')
    return null
  }

  try {
    paypal = await loadScript({
      clientId,
      currency: 'USD',
      intent: 'subscription',
      vault: true, // Enable vault for subscriptions
      components: 'buttons',
    })
    
    console.log('✅ PayPal SDK loaded')
    return paypal
  } catch (error) {
    console.error('Failed to load PayPal SDK:', error)
    return null
  }
}

export function getPayPal(): PayPalNamespace | null {
  return paypal
}

// PayPal plan IDs (configure in PayPal dashboard)
export const PAYPAL_PLANS = {
  pro_monthly: import.meta.env.VITE_PAYPAL_PLAN_PRO_MONTHLY || '',
  pro_yearly: import.meta.env.VITE_PAYPAL_PLAN_PRO_YEARLY || '',
  business_monthly: import.meta.env.VITE_PAYPAL_PLAN_BUSINESS_MONTHLY || '',
  business_yearly: import.meta.env.VITE_PAYPAL_PLAN_BUSINESS_YEARLY || '',
} as const
