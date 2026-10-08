'use client'

import { motion, useScroll, useTransform, type MotionValue } from 'motion/react'
import { useRef } from 'react'
import { cn } from '@/lib/utils'
import { EASE } from '@/components/motion/primitives'

/* ─────────────────────────────────────────────────────────────────────────────
   A. PRICE · VALUE · QUALITY · SELECTION  →  PRICE—SELECT
   Pinned for ~2.5 viewports. Four scattered words drift, the supporting words
   dissolve, and PRICE and SELECT lock together around the selection line.
   ───────────────────────────────────────────────────────────────────────────── */
export function PriceSelectAssembly() {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start start', 'end end'] })

  const priceX = useTransform(p, [0, 0.55], ['-30vw', '0vw'])
  const priceY = useTransform(p, [0, 0.55], ['-22vh', '0vh'])
  const selX = useTransform(p, [0, 0.55], ['24vw', '0vw'])
  const selY = useTransform(p, [0, 0.55], ['24vh', '0vh'])
  const ionW = useTransform(p, [0.35, 0.55], ['1em', '0em'])
  const ionO = useTransform(p, [0.3, 0.5], [1, 0])
  const dashW = useTransform(p, [0.5, 0.7], ['0em', '0.9em'])
  const valueO = useTransform(p, [0.1, 0.4], [1, 0])
  const valueX = useTransform(p, [0, 0.4], ['18vw', '34vw'])
  const qualO = useTransform(p, [0.12, 0.42], [1, 0])
  const qualX = useTransform(p, [0, 0.42], ['-20vw', '-36vw'])
  const tagO = useTransform(p, [0.68, 0.82], [0, 1])
  const tagY = useTransform(p, [0.68, 0.82], [24, 0])
  const glow = useTransform(p, [0.5, 0.8], [0, 1])
  const index = useTransform(p, (v) => String(Math.min(4, Math.floor(v * 5) + 1)).padStart(2, '0'))

  return (
    <section ref={ref} className="relative h-[260vh] bg-obsidian text-ivory" aria-labelledby="assembly-title">
      <h2 id="assembly-title" className="sr-only">
        Price, value, quality and selection come together as Price-Select.
      </h2>
      <div className="sticky top-0 flex h-svh items-center justify-center overflow-hidden">
        <div aria-hidden className="aurora opacity-50" />
        <motion.div aria-hidden className="absolute left-1/2 top-1/2 size-[60vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-champagne/10 blur-[100px]" style={{ opacity: glow }} />

        <div aria-hidden className="container-luxe absolute inset-x-0 top-28 flex justify-between eyebrow text-ivory/40">
          <span>The philosophy</span>
          <motion.span className="tabular-nums text-champagne">{index}</motion.span>
        </div>

        <div aria-hidden className="relative font-display text-[clamp(3.2rem,12vw,12rem)] font-light leading-none tracking-[-0.04em]">
          <Word x={valueX} y="-34vh" o={valueO} className="text-ivory/30 italic">Value</Word>
          <Word x={qualX} y="30vh" o={qualO} className="text-ivory/30 italic">Quality</Word>
          <div className="flex items-center">
            <motion.span style={{ x: priceX, y: priceY }} className="inline-block">
              Price
            </motion.span>
            <motion.span style={{ width: dashW }} className="mx-[0.06em] inline-block h-[0.04em] translate-y-[0.06em] bg-champagne" />
            <motion.span style={{ x: selX, y: selY }} className="inline-flex">
              Select
              <motion.span style={{ width: ionW, opacity: ionO }} className="inline-block overflow-hidden italic text-ivory/50">
                ion
              </motion.span>
            </motion.span>
          </div>
        </div>

        <motion.p style={{ opacity: tagO, y: tagY }} className="absolute bottom-[16vh] text-center">
          <span className="block font-display text-3xl font-light italic text-champagne md:text-5xl">Just for you.</span>
          <span className="mt-5 block eyebrow text-ivory/50">Intelligent selection, without the noise</span>
        </motion.p>
      </div>
    </section>
  )
}

function Word({ x, y, o, className, children }: { x: MotionValue<string>; y: string; o: MotionValue<number>; className?: string; children: React.ReactNode }) {
  return (
    <motion.span style={{ x, y, opacity: o }} className={cn('absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap', className)}>
      {children}
    </motion.span>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Horizontal storytelling: the marketplace in five movements.
   Desktop pins and scrolls sideways; touch devices get a vertical sequence.
   ───────────────────────────────────────────────────────────────────────────── */
const STEPS = [
  { n: '01', t: 'Approved suppliers', d: 'Suppliers apply with business, contact, tax and shipping information, and are reviewed before they can list.' },
  { n: '02', t: 'Reviewed listings', d: 'Every product carries a SKU, specifications, imagery and, where required, safety and compliance documents.' },
  { n: '03', t: 'One considered order', d: 'Customers browse every department in one place and check out once, with taxes and shipping shown separately.' },
  { n: '04', t: 'Routed fulfillment', d: 'Each item is routed to the supplier responsible for it. Multi-supplier orders ship as separate, tracked fulfillments.' },
  { n: '05', t: 'Tracked to the door', d: 'Suppliers upload tracking after dispatch. Customers follow every shipment and can request help at any point.' },
]

export function MarketplaceStory() {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const x = useTransform(scrollYProgress, [0, 1], ['0%', '-62%'])
  const bar = useTransform(scrollYProgress, [0, 1], [0, 1])

  return (
    <section ref={ref} className="relative overflow-x-clip bg-midnight text-ivory lg:h-[380vh]" aria-labelledby="story-title">
      <div className="lg:sticky lg:top-0 lg:flex lg:h-svh lg:flex-col lg:justify-center lg:overflow-hidden">
        <div aria-hidden className="aurora opacity-50" />
        <div className="container-luxe relative pt-28 lg:pt-0">
          <p className="eyebrow flex items-center gap-4 text-ivory/55">
            <span className="text-champagne">05</span>
            <span className="sel-mark" />
            The marketplace
          </p>
          <h2 id="story-title" className="mt-6 text-display-3">
            From supply <em className="text-champagne">to selection.</em>
          </h2>
        </div>

        <motion.ol style={{ x }} className="relative mt-14 hidden gap-[6vw] pl-[max(1.25rem,5vw)] lg:flex" aria-label="How the marketplace works">
          {STEPS.map((s) => (
            <li key={s.n} className="w-[34vw] shrink-0 border-t border-ivory/15 pt-8">
              <span className="font-display text-[9rem] font-light leading-none text-ivory/[0.08]">{s.n}</span>
              <h3 className="-mt-10 font-display text-5xl font-light">{s.t}</h3>
              <p className="mt-6 max-w-sm text-base leading-relaxed text-ivory/65">{s.d}</p>
            </li>
          ))}
          <li className="w-[20vw] shrink-0" aria-hidden />
        </motion.ol>

        <ol className="container-luxe relative mt-12 space-y-12 pb-24 lg:hidden">
          {STEPS.map((s) => (
            <motion.li key={s.n} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 1, ease: EASE }} className="border-t border-ivory/15 pt-6">
              <span className="meta text-champagne">{s.n}</span>
              <h3 className="mt-3 font-display text-4xl font-light">{s.t}</h3>
              <p className="mt-4 text-sm leading-relaxed text-ivory/65">{s.d}</p>
            </motion.li>
          ))}
        </ol>

        <div className="container-luxe relative mt-16 hidden lg:block">
          <div className="h-px bg-ivory/10">
            <motion.div className="h-full origin-left bg-champagne" style={{ scaleX: bar }} />
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Fulfillment diagram: one order, routed to two suppliers, arriving as tracked shipments.
   Lines draw as the section enters the viewport.
   ───────────────────────────────────────────────────────────────────────────── */
export function FulfillmentDiagram() {
  const draw = (delay: number) => ({
    initial: { pathLength: 0, opacity: 0 },
    whileInView: { pathLength: 1, opacity: 1 },
    viewport: { once: true, margin: '0px 0px -20% 0px' },
    transition: { duration: 1.6, delay, ease: EASE },
  })
  const node = (delay: number) => ({
    initial: { opacity: 0, y: 10 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '0px 0px -20% 0px' },
    transition: { duration: 0.9, delay, ease: EASE },
  })
  return (
    <figure className="relative">
      <svg viewBox="0 0 800 420" className="w-full" role="img" aria-labelledby="ff-title ff-desc">
        <title id="ff-title">Order routing</title>
        <desc id="ff-desc">One customer order with three items is split: items A and C route to Supplier A, item B to Supplier B. Each supplier ships separately with tracking.</desc>
        <defs>
          <linearGradient id="ffg" x1="0" x2="1">
            <stop offset="0" stopColor="#0f766e" />
            <stop offset="1" stopColor="#1f2937" stopOpacity="0.5" />
          </linearGradient>
        </defs>
        {/* order → suppliers */}
        <motion.path d="M170 210 C 290 210, 300 110, 410 110" fill="none" stroke="url(#ffg)" strokeWidth="1" {...draw(0.3)} />
        <motion.path d="M170 210 C 290 210, 300 310, 410 310" fill="none" stroke="url(#ffg)" strokeWidth="1" {...draw(0.45)} />
        {/* suppliers → customer */}
        <motion.path d="M560 110 C 650 110, 640 200, 700 205" fill="none" stroke="#1f2937" strokeOpacity="0.35" strokeWidth="1" strokeDasharray="3 5" {...draw(1.1)} />
        <motion.path d="M560 310 C 650 310, 640 220, 700 215" fill="none" stroke="#1f2937" strokeOpacity="0.35" strokeWidth="1" strokeDasharray="3 5" {...draw(1.25)} />

        <motion.g {...node(0)}>
          <rect x="20" y="150" width="150" height="120" fill="#1f2937" />
          <text x="40" y="182" fill="#f28b82" fontSize="10" letterSpacing="2.4" fontFamily="var(--font-sans)">ORDER PS-240135</text>
          <text x="40" y="214" fill="#faf7f2" fontSize="13" fontFamily="var(--font-sans)">Item A</text>
          <text x="40" y="234" fill="#faf7f2" fontSize="13" fontFamily="var(--font-sans)">Item B</text>
          <text x="40" y="254" fill="#faf7f2" fontSize="13" fontFamily="var(--font-sans)">Item C</text>
        </motion.g>
        {[
          { y: 70, label: 'SUPPLIER A', items: 'Items A + C', d: 0.8 },
          { y: 270, label: 'SUPPLIER B', items: 'Item B', d: 0.95 },
        ].map((s) => (
          <motion.g key={s.label} {...node(s.d)}>
            <rect x="410" y={s.y} width="150" height="80" fill="none" stroke="#1f2937" strokeOpacity="0.25" />
            <text x="428" y={s.y + 30} fill="#0f766e" fontSize="10" letterSpacing="2.4" fontFamily="var(--font-sans)">{s.label}</text>
            <text x="428" y={s.y + 56} fill="#1f2937" fontSize="13" fontFamily="var(--font-sans)">{s.items}</text>
          </motion.g>
        ))}
        <motion.g {...node(1.6)}>
          <circle cx="720" cy="210" r="22" fill="none" stroke="#0f766e" />
          <circle cx="720" cy="210" r="3" fill="#0f766e" />
          <text x="720" y="262" textAnchor="middle" fill="#1f2937" fontSize="10" letterSpacing="2.4" fontFamily="var(--font-sans)">YOU</text>
        </motion.g>
      </svg>
      <figcaption className="mt-6 grid grid-cols-3 gap-4 meta text-slate">
        <span>One order</span>
        <span className="text-center">Routed by supplier</span>
        <span className="text-right">Separate tracking</span>
      </figcaption>
    </figure>
  )
}
