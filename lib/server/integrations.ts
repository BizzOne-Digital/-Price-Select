import 'server-only'
import { randomBytes } from 'node:crypto'
import { providerName } from './env'

// Typed adapters for external providers. No paid provider is selected yet, so in production every
// adapter reports "not configured" and dependent actions fail honestly (HTTP 503, code
// integration_not_configured). The `test` adapters are for automated tests and local development
// only and are refused when NODE_ENV=production (see env.providerName).
//
// Adding a real provider: implement the interface, select it in `payments()`/`email()`, and add a
// webhook route that (1) verifies the provider signature on the raw body, (2) records the event id
// in WebhookEvent (unique) to drop duplicates, (3) applies only forward state transitions
// (pending → authorized → captured → partially_refunded → refunded), and (4) retries via the outbox.

export type ChargeResult = { status: 'authorized' | 'captured' | 'failed' | 'pending'; providerRef?: string; error?: string }
export type RefundResult = { status: 'succeeded' | 'failed' | 'pending'; providerRef?: string; error?: string }

export interface PaymentAdapter {
  name: string
  charge(input: { amountCents: number; currency: string; idempotencyKey: string; description: string }): Promise<ChargeResult>
  void(input: { providerRef: string; idempotencyKey: string }): Promise<RefundResult>
  refund(input: { providerRef: string; amountCents: number; idempotencyKey: string }): Promise<RefundResult>
}

export interface EmailAdapter {
  name: string
  send(msg: { to: string; subject: string; html: string; idempotencyKey: string }): Promise<{ ok: boolean; error?: string }>
}

/** In-memory test payment adapter. Behaviour can be switched per test with `testPayments.mode`. */
export const testPayments = {
  mode: 'succeed' as 'succeed' | 'fail' | 'pending',
  charges: new Map<string, ChargeResult>(),
  refunds: new Map<string, RefundResult>(),
}
const testPaymentAdapter: PaymentAdapter = {
  name: 'test',
  async charge({ idempotencyKey }) {
    const prior = testPayments.charges.get(idempotencyKey)
    if (prior) return prior
    const r: ChargeResult =
      testPayments.mode === 'fail' ? { status: 'failed', error: 'Card declined (test)' } : testPayments.mode === 'pending' ? { status: 'pending', providerRef: `test_${randomBytes(6).toString('hex')}` } : { status: 'captured', providerRef: `test_${randomBytes(6).toString('hex')}` }
    testPayments.charges.set(idempotencyKey, r)
    return r
  },
  async void({ idempotencyKey }) {
    return testPayments.refunds.get(idempotencyKey) ?? { status: 'succeeded', providerRef: `void_${idempotencyKey}` }
  },
  async refund({ idempotencyKey }) {
    const prior = testPayments.refunds.get(idempotencyKey)
    if (prior) return prior
    const r: RefundResult = testPayments.mode === 'fail' ? { status: 'failed', error: 'Refund failed (test)' } : { status: 'succeeded', providerRef: `re_${randomBytes(6).toString('hex')}` }
    testPayments.refunds.set(idempotencyKey, r)
    return r
  },
}

export const testOutbox: { to: string; subject: string; html: string }[] = []
const testEmailAdapter: EmailAdapter = {
  name: 'test',
  async send(m) {
    testOutbox.push({ to: m.to, subject: m.subject, html: m.html })
    return { ok: true }
  },
}

export const payments = (): PaymentAdapter | null => (providerName('PAYMENT') === 'test' ? testPaymentAdapter : null)
export const email = (): EmailAdapter | null => (providerName('EMAIL') === 'test' ? testEmailAdapter : null)
