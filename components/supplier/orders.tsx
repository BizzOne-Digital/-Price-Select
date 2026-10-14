'use client'

import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown, EyeOff, MapPin, Package } from 'lucide-react'
import { useState } from 'react'
import type { Fulfillment, SupplierFulfillment } from '@/lib/types'
import { money } from '@/lib/format'
import { cn } from '@/lib/utils'
import { EASE } from '@/components/motion/primitives'
import { ActionButton, PageHeader, StatusBadge, Tabs } from '@/components/dashboard/kit'
import { useToast } from '@/components/ui/toast'
import { api, errorText } from '@/lib/client/api'
import { hoursBetween, targetText, type Targets } from './data'
import type { AckDeadlines } from './server'
import { Err, dateTime, day, dur } from './ui'

const FLOW: Fulfillment['status'][] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered']
/** Status moves a supplier may make directly. 'shipped' happens by submitting tracking. */
const NEXT: Partial<Record<Fulfillment['status'], { status: 'processing' | 'delivered'; label: string }>> = {
  confirmed: { status: 'processing', label: 'Mark processing' },
  shipped: { status: 'delivered', label: 'Mark delivered' },
}
const CARRIERS = ['Parcel carrier', 'Express courier', 'National postal service', 'LTL / freight']
type View = 'all' | 'action' | 'progress' | 'closed'
type Body = { action: 'acknowledge' } | { action: 'status'; status: 'processing' | 'delivered' } | { action: 'tracking'; carrier: string; tracking: string }

const needsAction = (f: Fulfillment) => f.status === 'pending' || (['confirmed', 'processing'].includes(f.status) && !f.tracking)

export function SupplierOrders({ initial, ack, targets, asOf }: { initial: SupplierFulfillment[]; ack: AckDeadlines; targets: Targets; asOf: string }) {
  const [items, setItems] = useState<SupplierFulfillment[]>(initial)
  const [view, setView] = useState<View>('all')
  const toast = useToast()

  /** Persist an action; the card is replaced with the server's copy only after success. */
  const run = async (id: string, body: Body, title: string) => {
    try {
      const r = await api<SupplierFulfillment>(`/api/supplier/orders/${encodeURIComponent(id)}`, { body })
      setItems((s) => s.map((x) => (x.fulfillment.id === id ? r : x)))
      toast({ title, body: `Status: ${r.fulfillment.status}` })
    } catch (e) {
      toast({ title: 'Not saved', body: errorText(e), tone: 'error' })
      throw e
    }
  }

  const filtered = items.filter(({ fulfillment: f }) =>
    view === 'all' ? true : view === 'action' ? needsAction(f) : view === 'progress' ? ['confirmed', 'processing', 'shipped'].includes(f.status) : ['delivered', 'canceled', 'returned'].includes(f.status),
  )

  return (
    <>
      <PageHeader eyebrow="Fulfillment" title="Orders" description="Acknowledge routed items, move them through fulfillment and submit carrier tracking. Customers are notified when tracking is submitted." />

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0 flex-1">
          <Tabs
            value={view}
            onChange={setView}
            options={[
              { value: 'all', label: 'All', count: items.length },
              { value: 'action', label: 'Action required', count: items.filter((x) => needsAction(x.fulfillment)).length },
              { value: 'progress', label: 'In progress', count: items.filter((x) => ['confirmed', 'processing', 'shipped'].includes(x.fulfillment.status)).length },
              { value: 'closed', label: 'Closed', count: items.filter((x) => ['delivered', 'canceled', 'returned'].includes(x.fulfillment.status)).length },
            ]}
          />
        </div>
        <p className="flex items-center gap-2 pb-3 meta text-[0.6rem] text-slate">
          <EyeOff className="size-3.5" strokeWidth={1.4} aria-hidden /> You only see items routed to you
        </p>
      </div>

      <ul className="mt-8 space-y-6">
        {filtered.length === 0 && <li className="border border-obsidian/10 bg-ivory/70 px-5 py-14 text-center text-sm text-slate">{items.length ? 'Nothing in this view.' : 'No paid orders have been routed to you yet.'}</li>}
        {filtered.map((x) => (
          <FulfillmentCard key={x.fulfillment.id} item={x} ack={ack[x.fulfillment.id]} ackTarget={targetText(targets.ack)} trackingTarget={targetText(targets.tracking)} asOf={asOf} onAction={(body, title) => run(x.fulfillment.id, body, title)} />
        ))}
      </ul>
    </>
  )
}

function FulfillmentCard({ item, ack, ackTarget, trackingTarget, asOf, onAction }: { item: SupplierFulfillment; ack?: { routed: string; due: string }; ackTarget: string; trackingTarget: string; asOf: string; onAction: (b: Body, title: string) => Promise<void> }) {
  const f = item.fulfillment
  const [history, setHistory] = useState(false)
  const [carrier, setCarrier] = useState(f.carrier ?? CARRIERS[0])
  const [tracking, setTracking] = useState('')
  const [err, setErr] = useState<string>()
  const [busy, setBusy] = useState<string | null>(null)
  const value = f.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0)
  const routed = ack?.routed ?? item.placedAt
  const ackAt = f.acknowledgedAt
  const late = ack ? (ackAt ?? asOf) > ack.due : false
  const closed = ['delivered', 'canceled', 'returned'].includes(f.status)
  const step = FLOW.indexOf(f.status)
  const next = NEXT[f.status]
  const canTrack = ['confirmed', 'processing', 'shipped'].includes(f.status)

  const act = async (key: string, body: Body, title: string) => {
    setBusy(key)
    try {
      await onAction(body, title)
      return true
    } catch {
      return false
    } finally {
      setBusy(null)
    }
  }

  return (
    <motion.li layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }} className="border border-obsidian/10 bg-ivory/70">
      <div className="flex flex-col gap-4 border-b border-obsidian/10 px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h2 className="font-display text-2xl tabular-nums">{f.id}</h2>
          <StatusBadge status={f.status} />
          {f.blindShip ? <StatusBadge status="blind" tone="gold" label="Blind ship · neutral packaging" /> : <StatusBadge status="standard" tone="muted" label="Standard packaging" />}
        </div>
        <p className="meta text-[0.6rem] text-slate">Order {item.orderId} · placed {dateTime(item.placedAt)}</p>
      </div>

      {step >= 0 && (
        <div className="px-5 pt-5">
          <div className="grid grid-cols-5 gap-1" aria-label={`Progress: ${f.status}`}>
            {FLOW.map((s, i) => (
              <div key={s}>
                <div className={cn('h-px', i <= step ? 'bg-gold' : 'bg-obsidian/10')} />
                <p className={cn('mt-2 hidden meta text-[0.55rem] sm:block', i <= step ? 'text-obsidian' : 'text-slate/60')}>{s}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-6 px-5 py-5 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="meta text-[0.6rem] text-slate">Items</p>
          <ul className="mt-3 space-y-2">
            {f.lines.map((l) => (
              <li key={l.lineId} className="flex items-baseline justify-between gap-4 text-sm">
                <span className="flex items-baseline gap-2">
                  <Package className="size-3.5 shrink-0 translate-y-0.5 text-slate" strokeWidth={1.4} aria-hidden />
                  {l.name}
                  {l.sku && <span className="text-xs tabular-nums text-slate">{l.sku}</span>}
                </span>
                <span className="shrink-0 tabular-nums text-slate">× {l.qty}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-obsidian/[0.06] pt-3 text-xs text-slate">Line value {money(value)}</p>
        </div>

        <dl className="grid grid-cols-2 gap-4 text-sm lg:col-span-3 lg:grid-cols-1">
          <div>
            <dt className="meta text-[0.6rem] text-slate">Ship to</dt>
            <dd className="mt-1 flex items-start gap-1.5">
              <MapPin className="mt-0.5 size-3.5 shrink-0 text-gold-deep" strokeWidth={1.4} aria-hidden />
              <span>
                {item.shipTo.name && <span className="block">{item.shipTo.name}</span>}
                {[item.shipTo.line1, item.shipTo.line2].filter(Boolean).map((l) => <span key={l} className="block">{l}</span>)}
                <span className="block">{[item.shipTo.city, item.shipTo.region, item.shipTo.postal].filter(Boolean).join(', ')}</span>
                {item.shipTo.country && <span className="block">{item.shipTo.country}</span>}
              </span>
            </dd>
          </div>
          <div>
            <dt className="meta text-[0.6rem] text-slate">Est. delivery</dt>
            <dd className="mt-1 tabular-nums">{f.estimatedDelivery ? day(f.estimatedDelivery) : '—'}</dd>
          </div>
          <div>
            <dt className="meta text-[0.6rem] text-slate">{ackAt ? 'Acknowledged in' : 'Waiting'}</dt>
            <dd className={cn('mt-1 tabular-nums', late ? 'text-danger' : 'text-success')}>
              {dur(Math.max(0, hoursBetween(routed, ackAt ?? asOf)))} <span className="text-xs text-slate">/ {ackTarget}</span>
            </dd>
          </div>
          {f.tracking && (
            <div>
              <dt className="meta text-[0.6rem] text-slate">Tracking</dt>
              <dd className="mt-1 break-all tabular-nums">{f.carrier} · {f.tracking}</dd>
            </div>
          )}
        </dl>

        <div className="lg:col-span-4 lg:border-l lg:border-obsidian/10 lg:pl-6">
          {f.status === 'pending' ? (
            <div>
              <p className="text-sm text-slate">Confirm you can fulfil this order within your handling time.</p>
              <ActionButton tone="primary" className="mt-4 w-full" disabled={!!busy} onClick={() => act('ack', { action: 'acknowledge' }, `${f.id} acknowledged`)}>
                {busy === 'ack' ? 'Acknowledging…' : 'Accept & acknowledge'}
              </ActionButton>
            </div>
          ) : closed ? (
            <p className="text-sm text-slate">This fulfillment is closed. No action needed.</p>
          ) : (
            <div className="space-y-5">
              {next && (
                <ActionButton className="w-full" disabled={!!busy} onClick={() => act('status', { action: 'status', status: next.status }, `${f.id} → ${next.status}`)}>
                  {busy === 'status' ? 'Saving…' : next.label}
                </ActionButton>
              )}
              {canTrack && (
                <form
                  noValidate
                  onSubmit={async (e) => {
                    e.preventDefault()
                    const t = tracking.trim().toUpperCase()
                    if (!/^[A-Z0-9_-]{4,60}$/.test(t)) return setErr('4–60 letters, numbers or dashes.')
                    setErr(undefined)
                    if (await act('tracking', { action: 'tracking', carrier, tracking: t }, 'Tracking submitted')) setTracking('')
                  }}
                  className="space-y-3"
                >
                  <p className="meta text-[0.6rem] text-slate">
                    {f.tracking ? 'Replace tracking' : 'Submit tracking & mark shipped'} <span className="normal-case tracking-normal text-slate/70">· within {trackingTarget} of dispatch</span>
                  </p>
                  <div className="grid gap-1">
                    <label>
                      <span className="sr-only">Carrier</span>
                      <select className="field text-sm" value={carrier} onChange={(e) => setCarrier(e.target.value)}>
                        {[...new Set([...(f.carrier ? [f.carrier] : []), ...CARRIERS])].map((c) => <option key={c}>{c}</option>)}
                      </select>
                    </label>
                    <label>
                      <span className="sr-only">Tracking number</span>
                      <input className="field text-sm uppercase tabular-nums placeholder:normal-case" placeholder="Tracking number" value={tracking} onChange={(e) => setTracking(e.target.value)} aria-invalid={!!err} />
                    </label>
                  </div>
                  <Err msg={err} />
                  <ActionButton type="submit" className="w-full" disabled={!!busy}>
                    {busy === 'tracking' ? 'Submitting…' : 'Submit tracking'}
                  </ActionButton>
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-obsidian/10">
        <button onClick={() => setHistory((h) => !h)} aria-expanded={history} className="flex min-h-11 w-full items-center justify-between px-5 meta text-[0.6rem] text-slate hover:text-obsidian">
          History · {f.history.length} events
          <ChevronDown className={cn('size-3.5 transition-transform', history && 'rotate-180')} aria-hidden />
        </button>
        <AnimatePresence initial={false}>
          {history && (
            <motion.ol initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.45, ease: EASE }} className="overflow-hidden px-5">
              {[...f.history].reverse().map((h, i) => (
                <li key={h.at + i} className="grid grid-cols-[8rem_1fr] gap-4 border-t border-obsidian/[0.06] py-3 text-sm sm:grid-cols-[11rem_7rem_1fr]">
                  <span className="text-xs tabular-nums text-slate">{dateTime(h.at)}</span>
                  <span className="hidden sm:block"><StatusBadge status={h.status} /></span>
                  <span>{h.note}</span>
                </li>
              ))}
            </motion.ol>
          )}
        </AnimatePresence>
      </div>
    </motion.li>
  )
}
