import { httpsCallable } from 'firebase/functions'
import { functions } from '@/config/firebase'

interface RegisterPayPalSubscriptionResponse {
  ok: boolean
  tier: string
  status: string
}

export class PayPalSubscriptionsService {
  async registerPayPalSubscription(paypalSubscriptionId: string): Promise<RegisterPayPalSubscriptionResponse> {
    const id = String(paypalSubscriptionId || '').trim()
    if (!id) {
      throw new Error('paypalSubscriptionId is required')
    }

    const callable = httpsCallable(functions, 'registerPayPalSubscription')
    const result = await callable({ paypalSubscriptionId: id })
    const data = (result.data || {}) as Partial<RegisterPayPalSubscriptionResponse>

    return {
      ok: Boolean(data.ok),
      tier: String(data.tier || ''),
      status: String(data.status || ''),
    }
  }
}

export const paypalSubscriptionsService = new PayPalSubscriptionsService()
