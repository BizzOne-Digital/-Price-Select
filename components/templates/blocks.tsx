'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { MEMBERSHIPS } from '@/lib/site'
import { money0 as money } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ButtonLink } from '@/components/site/ui'

// From the Terms & Conditions, section 3.
export const DISCOUNT_NOTE = 'Discounts associated with membership tiers apply only to the base price of products and do not reduce shipping costs, taxes, or duties.'

const TIERS = MEMBERSHIPS.map(([name, price, perk], i) => ({ name, price, perk, fee: i ? 25 : 10, rate: i ? 0.25 : 0.1, plus: i === 1 }))

export function PlanCards({ dark }: { dark?: boolean }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {TIERS.map((t) => (
        <div
          key={t.name}
          className={cn(
            'relative flex flex-col border p-8 md:p-10',
            t.plus ? 'border-champagne' : dark ? 'border-ivory/15' : 'border-obsidian/15',
            t.plus && (dark ? 'bg-champagne/[0.06]' : 'bg-obsidian text-ivory'),
          )}
        >
          {t.plus && <span className="absolute -top-3 left-8 bg-champagne px-3 py-1 text-[0.6rem] font-bold uppercase tracking-[0.2em] text-obsidian">Best value</span>}
          <p className={cn('meta', t.plus || dark ? 'text-champagne' : 'text-gold-deep')}>{t.name}</p>
          <p className="mt-5 font-display text-6xl font-light leading-none">
            {Math.round(t.rate * 100)}% <span className="text-2xl">off</span>
          </p>
          <p className={cn('mt-3 text-sm', t.plus || dark ? 'text-ivory/60' : 'text-slate')}>{t.price}</p>
          <p className={cn('mt-8 flex gap-3 text-base leading-relaxed', t.plus || dark ? 'text-ivory/85' : 'text-obsidian/80')}>
            <Check className="mt-1 size-4 shrink-0 text-champagne" strokeWidth={2} aria-hidden />
            {t.perk}
          </p>
          <ButtonLink href="/sign-in/members" variant={t.plus ? 'light' : dark ? 'outline-light' : 'outline-dark'} className="mt-10 self-start">
            Join {t.name}
          </ButtonLink>
        </div>
      ))}
    </div>
  )
}

/** Illustration only: yearly discount on eligible spend, less the membership fee. */
export function SavingsEstimator() {
  const [spend, setSpend] = useState(1500)
  return (
    <div className="border border-ivory/15 p-8 md:p-12">
      <label htmlFor="spend" className="meta text-ivory/60">
        Your yearly spend on eligible products
      </label>
      <p className="mt-4 font-display text-6xl font-light tabular-nums md:text-7xl">{money(spend)}</p>
      <input
        id="spend"
        type="range"
        min={100}
        max={10000}
        step={100}
        value={spend}
        onChange={(e) => setSpend(Number(e.target.value))}
        className="mt-8 w-full accent-[var(--color-champagne)]"
      />
      <div className="mt-10 grid gap-px bg-ivory/10 sm:grid-cols-2">
        {TIERS.map((t) => {
          const net = spend * t.rate - t.fee
          return (
            <div key={t.name} className="bg-obsidian p-6">
              <p className="meta text-champagne">{t.name}</p>
              <p className="mt-3 font-display text-4xl font-light tabular-nums">{net > 0 ? money(net) : money(0)}</p>
              <p className="mt-2 text-xs text-ivory/50">
                {money(spend * t.rate)} discount − {money(t.fee)} membership
              </p>
            </div>
          )
        })}
      </div>
      <p className="mt-6 text-xs leading-relaxed text-ivory/45">Estimated yearly savings, for illustration only. {DISCOUNT_NOTE}</p>
    </div>
  )
}
