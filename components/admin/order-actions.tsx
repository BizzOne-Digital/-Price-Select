'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ActionButton, StatusBadge } from '@/components/dashboard/kit'
import { useToast } from '@/components/ui/toast'
import { api, ApiError, errorText, idempotencyKey } from '@/lib/client/api'
import { money } from '@/lib/format'
import type { Order } from '@/lib/types'
import { inputCls } from './ui'

const SHIPPED = ['shipped', 'delivered', 'returned']

/** Status badges and cancel. Cancel is blocked once any item has shipped (server enforces the same). */
export function OrderActions({ order }: { order: Pick<Order, 'id' | 'status' | 'payment' | 'fulfillments'> }) {
  const toast = useToast()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const shipped = order.fulfillments.some((f) => SHIPPED.includes(f.status))
  const blocked = order.status === 'canceled' || shipped

  const cancel = async () => {
    setBusy(true)
    setError('')
    try {
      await api(`/api/admin/orders/${encodeURIComponent(order.id)}/cancel`, { body: { reason: reason.trim() } })
      toast({ title: `${order.id} canceled`, body: order.payment === 'captured' ? 'Captured funds were not refunded automatically. Issue a refund if one is due.' : 'Suppliers and the customer have been notified.' })
      setOpen(false)
      setReason('')
      router.refresh()
    } catch (e) {
      setError(e instanceof ApiError && e.unavailable ? `Unavailable: payment provider not connected. ${e.message}` : errorText(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={order.status} label={`Order · ${order.status.replace('_', ' ')}`} />
        <StatusBadge status={order.payment} label={`Payment · ${order.payment.replace('_', ' ')}`} />
        <ActionButton tone="danger" disabled={blocked} title={shipped ? 'Part of this order has shipped — use a return or cancellation case instead.' : undefined} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          Cancel order
        </ActionButton>
      </div>
      {open && !blocked && (
        <form
          className="w-full max-w-md border border-danger/20 bg-danger/[0.03] p-4"
          onSubmit={(e) => {
            e.preventDefault()
            void cancel()
          }}
        >
          <label className="block">
            <span className="meta text-[0.6rem] text-slate">Reason (sent to the customer)</span>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} required minLength={3} maxLength={300} rows={2} className="mt-1 w-full border border-obsidian/15 bg-ivory/60 p-3 text-sm focus:border-gold focus:outline-none" />
          </label>
          {order.payment === 'authorized' && <p className="mt-2 text-xs text-slate">The payment authorization will be voided through the provider (administrators only).</p>}
          {error && <p role="alert" className="mt-2 text-xs text-danger">{error}</p>}
          <div className="mt-3 flex gap-2">
            <ActionButton type="submit" tone="danger" disabled={busy || reason.trim().length < 3}>
              {busy ? 'Canceling' : 'Confirm cancellation'}
            </ActionButton>
            <ActionButton type="button" tone="ghost" onClick={() => setOpen(false)}>
              Keep order
            </ActionButton>
          </div>
        </form>
      )}
    </div>
  )
}

/** Partial or full refund of captured funds. Administrators only; one idempotency key per attempt. */
export function RefundForm({ order, paymentsConnected }: { order: Pick<Order, 'id' | 'payment' | 'refundable' | 'refunded'>; paymentsConnected: boolean }) {
  const toast = useToast()
  const router = useRouter()
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [key, setKey] = useState(idempotencyKey)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const refundable = order.refundable ?? 0
  const value = Number(amount)
  const valid = value > 0 && Math.round(value * 100) <= Math.round(refundable * 100) && reason.trim().length >= 3
  const eligible = ['captured', 'partially_refunded'].includes(order.payment) && refundable > 0

  const submit = async () => {
    setBusy(true)
    setError('')
    try {
      const r = await api<{ status: string; amount: number; error?: string }>(`/api/admin/orders/${encodeURIComponent(order.id)}/refund`, { body: { amount: Math.round(value * 100) / 100, reason: reason.trim(), idempotencyKey: key } })
      if (r.status === 'failed') setError(r.error ?? 'The payment provider declined the refund.')
      else {
        toast({ title: r.status === 'succeeded' ? `Refund of ${money(r.amount)} confirmed` : `Refund of ${money(r.amount)} submitted`, body: r.status === 'succeeded' ? 'Confirmed by the payment provider.' : 'Awaiting confirmation from the payment provider.' })
        setAmount('')
        setReason('')
      }
      setKey(idempotencyKey())
      router.refresh()
    } catch (e) {
      // Keep the same key so a retry after a network error cannot double-refund.
      setError(e instanceof ApiError && e.unavailable ? 'Unavailable: payment provider not connected. No refund was issued.' : errorText(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      className="mt-5 space-y-3 border-t border-obsidian/10 pt-5"
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      <p className="flex items-center justify-between text-sm">
        <span className="meta text-[0.6rem] text-slate">Refundable balance</span>
        <span className="tabular-nums">{money(refundable)}</span>
      </p>
      {!paymentsConnected && <p className="text-xs text-[#9a6a24]">Payment provider not connected — refunds cannot be issued.</p>}
      {paymentsConnected && !eligible && <p className="text-xs text-slate">Nothing to refund: the payment is not captured or is already fully refunded.</p>}
      <label className="block">
        <span className="meta text-[0.6rem] text-slate">Amount (USD)</span>
        <input type="number" step="0.01" min="0.01" max={refundable} value={amount} onChange={(e) => setAmount(e.target.value)} disabled={!eligible || !paymentsConnected} className={`${inputCls} mt-1`} />
      </label>
      <label className="block">
        <span className="meta text-[0.6rem] text-slate">Reason</span>
        <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} disabled={!eligible || !paymentsConnected} className={`${inputCls} mt-1`} />
      </label>
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
      <ActionButton type="submit" disabled={busy || !valid || !eligible || !paymentsConnected}>
        {busy ? 'Submitting' : 'Issue refund'}
      </ActionButton>
    </form>
  )
}
