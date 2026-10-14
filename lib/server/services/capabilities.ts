import 'server-only'
import { email, payments } from '../integrations'
import { getSettings } from './settings'
import type { Capabilities } from '@/lib/types'

/** What the storefront and consoles can honestly offer right now. */
export async function capabilities(): Promise<Capabilities> {
  const s = await getSettings().catch(() => null)
  return {
    payments: !!payments(),
    email: !!email(),
    shippingConfigured: s?.shipping.mode === 'flat_per_shipment' && s.shipping.flatRate != null,
    taxConfigured: s ? s.tax.mode !== 'not_configured' : false,
    labels: false,
  }
}
