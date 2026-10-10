'use client'

import Image from 'next/image'
import { useState } from 'react'
import { StatusBadge } from '@/components/dashboard/kit'
import { useToast } from '@/components/ui/toast'
import { categories } from '@/lib/data/categories'
import { products } from '@/lib/data/products'
import { cn } from '@/lib/utils'
import type { Category } from '@/lib/types'

/** Attribute set per category: spec labels used by its products, plus listing basics (demo). */
const attributesFor = (slug: string) => {
  const specs = new Set(products.filter((p) => p.category === slug).flatMap((p) => p.specs.map((s) => s.label)))
  return ['Brand', 'Model / SKU', 'UPC', 'Weight', 'Dimensions', ...[...specs].filter((s) => !['Weight', 'Dimensions'].includes(s))]
}

export function CategoryBoard() {
  const toast = useToast()
  const [levels, setLevels] = useState<Record<string, Category['reviewLevel']>>(Object.fromEntries(categories.map((c) => [c.slug, c.reviewLevel])))

  return (
    <ul className="grid gap-px border border-obsidian/10 bg-obsidian/10 md:grid-cols-2">
      {categories.map((c, i) => {
        const inCat = products.filter((p) => p.category === c.slug)
        const live = inCat.filter((p) => p.status === 'published').length
        const level = levels[c.slug]
        return (
          <li key={c.slug} className="flex flex-col bg-ivory sm:flex-row">
            <div className="relative aspect-[16/9] shrink-0 overflow-hidden sm:aspect-auto sm:w-40">
              <Image src={c.image} alt={c.imageAlt} fill sizes="(min-width: 640px) 160px, 100vw" className="object-cover" />
              <span className="absolute left-3 top-3 font-display text-lg text-obsidian">{String(i + 1).padStart(2, '0')}</span>
            </div>
            <div className="flex-1 p-5 md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="font-display text-2xl font-light leading-tight">{c.name}</h2>
                <p className="meta text-[0.6rem] text-slate tabular-nums">
                  {live} live · {inCat.length - live} in review
                </p>
              </div>
              <fieldset className="mt-4">
                <legend className="meta text-[0.6rem] text-slate">Review level</legend>
                <div className="mt-2 inline-grid grid-cols-2 border border-obsidian/15">
                  {(['standard', 'enhanced'] as const).map((l) => (
                    <button
                      key={l}
                      aria-pressed={level === l}
                      onClick={() => {
                        setLevels((s) => ({ ...s, [c.slug]: l }))
                        toast({ title: `${c.short}: ${l} review (demo)`, body: l === 'enhanced' ? 'New listings will require document sign-off before publishing.' : 'Listings follow the standard review checklist.' })
                      }}
                      className={cn('min-h-10 px-4 text-[0.62rem] font-semibold uppercase tracking-[0.14em] transition-colors', level === l ? (l === 'enhanced' ? 'bg-gold/15 text-gold-deep' : 'bg-teal text-white') : 'text-slate hover:text-obsidian')}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </fieldset>
              {level === 'enhanced' && c.reviewNote && <p className="mt-3 text-xs leading-relaxed text-slate">{c.reviewNote}</p>}
              <div className="mt-4">
                <p className="meta text-[0.6rem] text-slate">Listing attributes</p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {attributesFor(c.slug).map((a) => (
                    <li key={a}>
                      <StatusBadge status="attr" tone="muted" label={a} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
