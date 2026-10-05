'use client'

import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown, EyeOff, MapPin, Package } from 'lucide-react'
import { useState } from 'react'
import type { Fulfillment, OrderStatus } from '@/lib/types'
import { money } from '@/lib/format'
import { cn } from '@/lib/utils'
import { EASE } from '@/components/motion/primitives'
import { ActionButton, DemoBanner, Field, PageHeader, StatusBadge, Tabs } from '@/components/dashboard/kit'
import { useToast } from '@/components/ui/toast'
import { DEMO_NOW, TARGET_HOURS, hoursBetween, myFulfillments, type MyFulfillment } from './data'
import { Err, dateTime, day, dur } from './ui'

const FLOW: OrderStatus[] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered']
const CARRIERS = ['Parcel carrier', 'Express courier', 'National postal service', 'LTL / freight']
type View = 'all' | 'action' | 'progress' | 'closed'

const needsAction = (f: Fulfillment) => f.status === 'pending' || (['confirmed', 'processing'].includes(f.status) && !f.tracking)

export function SupplierOrders() {
  const [items, setItems] = useState<MyFulfillment[]>(myFulfillments)
  const [view, setView] = useState<View>('all')
  const toast = useToast()

  const update = (id: string, patch: Partial<Fulfillment>, note: string) =>
    setItems((s) =>
      s.map((x) =>
        x.fulfillment.id !== id
          ? x
          : { ...x, fulfillment: { ...x.fulfillment, ...patch, history: [...x.fulfillment.history, { status: patch.status ?? x.fulfillment.status, at: new Date().toISOString(), note: `${note} (demo)` }] } },
      ),
    )

  const filtered = items.filter(({ fulfillment: f }) =>
    view === 'all' ? true : view === 'action' ? needsAction(f) : view === 'progress' ? ['confirmed', 'processing', 'shipped'].includes(f.status) : ['delivered', 'canceled', 'returned'].includes(f.status),
  )

  return (
    <>
      <PageHeader eyebrow="Fulfillment" title="Orders" description="Acknowledge routed items, move them through fulfillment and submit carrier tracking." />
      <DemoBanner>Sample fulfillments. Actions update this page only and are not sent to customers or carriers.</DemoBanner>

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
        {filtered.length === 0 && <li className="border border-obsidian/10 bg-ivory/70 px-5 py-14 text-center text-sm text-slate">Nothing in this view.</li>}
        {filtered.map((x) => (
          <FulfillmentCard
            key={x.fulfillment.id}
            item={x}
            onAck={() => {
              update(x.fulfillment.id, { status: 'confirmed' }, 'Supplier acknowledged the order.')
              toast({ title: `${x.fulfillment.id} acknowledged`, body: 'Demo only — the customer was not notified.' })
            }}
            onStatus={(s) => {
              update(x.fulfillment.id, { status: s }, `Status updated to ${s}.`)
              toast({ title: `${x.fulfillment.id} → ${s}`, body: 'Status updated (demo).' })
            }}
            onTracking={(carrier, tracking) => {
              update(x.fulfillment.id, { carrier, tracking, status: ['delivered'].includes(x.fulfillment.status) ? x.fulfillment.status : 'shipped' }, `Tracking submitted: ${carrier} ${tracking}.`)
              toast({ title: 'Tracking submitted (demo)', body: `${carrier} · ${tracking}` })
            }}
          />
        ))}
      </ul>
    </>
  )
}

function FulfillmentCard({ item, onAck, onStatus, onTracking }: { item: MyFulfillment; onAck: () => void; onStatus: (s: OrderStatus) => void; onTracking: (carrier: string, tracking: string) => void }) {
  const f = item.fulfillment
  const [history, setHistory] = useState(false)
  const [carrier, setCarrier] = useState(f.carrier ?? CARRIERS[0])
  const [tracking, setTracking] = useState('')
  const [err, setErr] = useState<string>()
  const value = f.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0)
  const ack = f.history.find((h) => h.status === 'confirmed')?.at
  const ackH = ack ? hoursBetween(item.placedAt, ack) : hoursBetween(item.placedAt, DEMO_NOW)
  const closed = ['delivered', 'canceled', 'returned'].includes(f.status)
  const step = FLOW.indexOf(f.status)

  return (
    <motion.li layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }} className="border border-obsidian/10 bg-ivory/70">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-obsidian/10 px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h2 className="font-display text-2xl tabular-nums">{f.id}</h2>
          <StatusBadge status={f.status} />
          {f.blindShip ? (
            <StatusBadge status="blind" tone="gold" label="Blind ship · neutral packaging" />
          ) : (
            <StatusBadge status="standard" tone="muted" label="Standard packaging" />
          )}
        </div>
        <p className="meta text-[0.6rem] text-slate">Placed {dateTime(item.placedAt)}</p>
      </div>

      {/* Progress line */}
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
        {/* Lines */}
        <div className="lg:col-span-5">
          <p className="meta text-[0.6rem] text-slate">Items</p>
          <ul className="mt-3 space-y-2">
            {f.lines.map((l) => (
              <li key={l.productSlug} className="flex items-baseline justify-between gap-4 text-sm">
                <span className="flex items-baseline gap-2"><Package className="size-3.5 shrink-0 translate-y-0.5 text-slate" strokeWidth={1.4} aria-hidden />{l.name}</span>
                <span className="shrink-0 tabular-nums text-slate">× {l.qty}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-obsidian/[0.06] pt-3 text-xs text-slate">Line value {money(value)}</p>
        </div>

        {/* Facts */}
        <dl className="grid grid-cols-2 gap-4 text-sm lg:col-span-3 lg:grid-cols-1">
          <div>
            <dt className="meta text-[0.6rem] text-slate">Ship to</dt>
            <dd className="mt-1 flex items-center gap-1.5"><MapPin className="size-3.5 text-gold-deep" strokeWidth={1.4} aria-hidden />{item.shipTo.city}, {item.shipTo.region}</dd>
          </div>
          <div>
            <dt className="meta text-[0.6rem] text-slate">Est. delivery</dt>
            <dd className="mt-1 tabular-nums">{day(f.estimatedDelivery)}</dd>
          </div>
          <div>
            <dt className="meta text-[0.6rem] text-slate">{ack ? 'Acknowledged in' : 'Waiting'}</dt>
            <dd className={cn('mt-1 tabular-nums', ackH > TARGET_HOURS.acknowledgment ? 'text-danger' : 'text-success')}>{dur(ackH)} <span className="text-xs text-slate">/ 1 business day</span></dd>
          </div>
          {f.tracking && (
            <div>
              <dt className="meta text-[0.6rem] text-slate">Tracking</dt>
              <dd className="mt-1 break-all tabular-nums">{f.carrier} · {f.tracking}</dd>
            </div>
          )}
        </dl>

        {/* Actions */}
        <div className="lg:col-span-4 lg:border-l lg:border-obsidian/10 lg:pl-6">
          {f.status === 'pending' ? (
            <div>
              <p className="text-sm text-slate">Confirm you can fulfil this order within your handling time.</p>
              <ActionButton tone="primary" className="mt-4 w-full" onClick={onAck}>Accept & acknowledge</ActionButton>
            </div>
          ) : closed ? (
            <p className="text-sm text-slate">This fulfillment is closed. No action needed.</p>
          ) : (
            <div className="space-y-5">
              <Field label="Fulfillment status">
                <select className="field" value={f.status} onChange={(e) => onStatus(e.target.value as OrderStatus)}>
                  {FLOW.slice(1).map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
                </select>
              </Field>
              <form
                noValidate
                onSubmit={(e) => {
                  e.preventDefault()
                  const t = tracking.trim().toUpperCase()
                  if (!/^[A-Z0-9-]{6,40}$/.test(t)) return setErr('6–40 letters, numbers or dashes.')
                  setErr(undefined)
                  setTracking('')
                  onTracking(carrier, t)
                }}
                className="space-y-3"
              >
                <p className="meta text-[0.6rem] text-slate">{f.tracking ? 'Replace tracking' : 'Submit tracking'} <span className="normal-case tracking-normal text-slate/70">· within 24 h of dispatch</span></p>
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
                <ActionButton type="submit" className="w-full">Submit tracking</ActionButton>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* History */}
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
