'use client'

import Image from 'next/image'
import Link from 'next/link'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowUpRight } from 'lucide-react'
import { useState } from 'react'
import { categories } from '@/lib/data/categories'
import { cn } from '@/lib/utils'
import { EASE } from '@/components/motion/primitives'
import { ButtonLink } from '@/components/site/ui'

/**
 * Cinematic department browser: the copy stays put while the photography behind it changes.
 * Hover, focus or tap selects a department; the CTA enters it.
 */
export function CategoryShowcase() {
  const [active, setActive] = useState(0)
  const c = categories[active]

  return (
    <div className="relative isolate min-h-[100svh] overflow-hidden bg-midnight text-ivory">
      {/* Stacked photography; only the active plate is visible. */}
      <AnimatePresence initial={false}>
        <motion.div
          key={c.slug}
          className="absolute inset-0 -z-10"
          initial={{ opacity: 0, scale: 1.12, filter: 'blur(12px)' }}
          animate={{ opacity: 1, scale: 1.02, filter: 'blur(0px)' }}
          exit={{ opacity: 0, scale: 1, filter: 'blur(6px)' }}
          transition={{ duration: 1.4, ease: EASE }}
        >
          <Image src={c.image} alt={c.imageAlt} fill sizes="100vw" className="object-cover" />
        </motion.div>
      </AnimatePresence>
      {/* Preload the rest so the swap is instant. */}
      <div aria-hidden className="hidden">
        {categories.map((x) => (
          <Image key={x.slug} src={x.image} alt="" width={16} height={16} />
        ))}
      </div>
      <div aria-hidden className="absolute inset-0 -z-10 scrim-l" />
      <div aria-hidden className="absolute inset-0 -z-10 scrim-b" />

      <div className="container-luxe relative grid min-h-[100svh] grid-cols-[minmax(0,1fr)] grid-rows-[1fr_auto] gap-10 py-24 lg:grid-cols-12 lg:grid-rows-1 lg:items-end lg:py-28">
        {/* Stable copy block */}
        <div className="min-w-0 self-end lg:col-span-7">
          <p className="eyebrow flex items-center gap-4 text-ivory/60">
            <span className="tabular-nums text-champagne">{String(active + 1).padStart(2, '0')} / {String(categories.length).padStart(2, '0')}</span>
            <span className="sel-mark" />
            Department
          </p>
          <div className="mt-6 min-h-[2.1em] overflow-hidden text-display-2">
            <AnimatePresence mode="wait" initial={false}>
              <motion.h3
                key={c.slug}
                initial={{ y: '100%' }}
                animate={{ y: '0%' }}
                exit={{ y: '-100%' }}
                transition={{ duration: 0.8, ease: EASE }}
                className="max-w-[12ch]"
              >
                {c.name}
              </motion.h3>
            </AnimatePresence>
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={c.slug} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.6, delay: 0.15, ease: EASE }}>
              <p className="mt-6 max-w-md text-base leading-relaxed text-ivory/75">{c.description}</p>
              <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2" aria-label={`${c.name} includes`}>
                {c.includes.map((i) => (
                  <li key={i} className="meta text-ivory/50">
                    {i}
                  </li>
                ))}
              </ul>
            </motion.div>
          </AnimatePresence>
          <div className="mt-10">
            <ButtonLink href={`/categories/${c.slug}`} variant="gold" data-cursor="Explore">
              Enter {c.short.toLowerCase()}
            </ButtonLink>
          </div>
        </div>

        {/* Department index */}
        <nav aria-label="Departments" className="min-w-0 lg:col-span-4 lg:col-start-9">
          <ul className="no-scrollbar -mx-5 flex snap-x gap-2 overflow-x-auto px-5 lg:mx-0 lg:block lg:overflow-visible lg:px-0">
            {categories.map((x, i) => (
              <li key={x.slug} className="shrink-0 snap-start lg:border-b lg:border-ivory/15">
                <Link
                  href={`/categories/${x.slug}`}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onClick={(e) => {
                    // Touch: first tap previews the department, second tap enters it.
                    if (window.matchMedia('(hover: none)').matches && active !== i) {
                      e.preventDefault()
                      setActive(i)
                    }
                  }}
                  aria-current={active === i ? 'true' : undefined}
                  className={cn(
                    'group flex items-center justify-between gap-6 border border-ivory/20 px-4 py-3 transition-all duration-500 ease-[var(--ease-luxe)] lg:border-0 lg:px-0 lg:py-4',
                    active === i ? 'border-champagne bg-ivory/5 text-ivory lg:bg-transparent lg:pl-4' : 'text-ivory/50 hover:text-ivory/80',
                  )}
                >
                  <span className="whitespace-nowrap font-display text-xl font-light lg:text-[1.65rem]">{x.name}</span>
                  <span className="hidden items-center gap-3 lg:flex">
                    <span className={cn('meta tabular-nums', active === i ? 'text-champagne' : 'text-ivory/30')}>{String(i + 1).padStart(2, '0')}</span>
                    <ArrowUpRight className={cn('size-4 transition-all duration-500', active === i ? 'text-champagne opacity-100' : 'opacity-0')} strokeWidth={1.3} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  )
}
