'use client'

import Image from 'next/image'
import { AnimatePresence, motion, useScroll, useTransform } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { IMAGES } from '@/lib/img'
import { categories } from '@/lib/data/categories'
import { EASE, Magnetic, SplitText } from '@/components/motion/primitives'
import { ButtonLink, TextLink } from '@/components/site/ui'

const PLATES = [
  { src: IMAGES.heroWarehouse, alt: 'A long, quiet warehouse aisle with stocked shelving in cool light', label: 'Supply' },
  { src: IMAGES.heroTower, alt: 'Dark glass towers rising into an overcast sky', label: 'Precision' },
  { src: IMAGES.heroSolar, alt: 'Rooftop solar arrays at sunset above a forest', label: 'Selection' },
]

export function Hero() {
  const ref = useRef<HTMLElement>(null)
  const [plate, setPlate] = useState(0)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '28%'])
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0])
  const bgScale = useTransform(scrollYProgress, [0, 1], [1, 1.12])

  // Slow cinematic cycle between plates: the animated background.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => setPlate((p) => (p + 1) % PLATES.length), 7000)
    return () => clearInterval(t)
  }, [])

  return (
    <section ref={ref} className="relative isolate flex min-h-[100svh] items-end overflow-hidden bg-ivory text-obsidian" aria-label="Introduction">
      <motion.div className="absolute inset-0 -z-20 opacity-[0.07]" style={{ scale: bgScale }}>
        <AnimatePresence initial={false}>
          <motion.div
            key={plate}
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 1.18 }}
            animate={{ opacity: 1, scale: 1.04 }}
            exit={{ opacity: 0 }}
            transition={{ opacity: { duration: 2.2, ease: EASE }, scale: { duration: 9, ease: 'linear' } }}
          >
            <Image src={PLATES[plate].src} alt={PLATES[plate].alt} fill priority={plate === 0} sizes="100vw" className="object-cover saturate-[0.7]" />
          </motion.div>
        </AnimatePresence>
      </motion.div>
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-ivory via-ivory/90 to-ivory/60" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_85%_20%,#0f766e08,transparent_55%),radial-gradient(ellipse_at_65%_85%,#f28b8210,transparent_50%)]" />
      {/* A scanning hairline drifts down the frame: a quiet sign of precision. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-x-0 h-[40%] animate-scan bg-gradient-to-b from-transparent via-champagne/[0.05] to-transparent" />
      </div>

      <motion.div style={{ y, opacity: fade }} className="container-luxe relative w-full pb-28 pt-40 md:pb-36">
        <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 1, ease: EASE }} className="eyebrow flex items-center gap-4 text-obsidian/65">
          Jr-Procurement.com <span className="sel-mark hidden sm:inline-block" /> <span className="hidden sm:inline">Price / Select</span>
        </motion.p>

        <SplitText as="h1" immediate delay={0.45} stagger={0.09} text={'Price-Select.\nJust for you.'} italicWords={['Just', 'for', 'you']} className="mt-8 text-display-1" />

        <div className="mt-12 grid gap-10 md:grid-cols-12 md:items-end">
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1, duration: 1.1, ease: EASE }} className="max-w-md text-base leading-relaxed text-obsidian/75 md:col-span-5 md:text-[1.05rem]">
            A curated marketplace connecting you with approved suppliers across everyday essentials, industrial products, mobility, technology, energy, home and more. A smarter way to discover, compare and order.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.3, duration: 1.1, ease: EASE }} className="flex flex-wrap items-center gap-x-10 gap-y-6 md:col-span-6 md:col-start-7 md:justify-end">
            <Magnetic>
              <ButtonLink href="/shop">Shop the selection</ButtonLink>
            </Magnetic>
            <TextLink href="/categories">
              Explore categories
            </TextLink>
          </motion.div>
        </div>
      </motion.div>

      {/* Bottom rail: scroll cue, plate index, department ticker */}
      <div className="container-luxe absolute inset-x-0 bottom-0 flex items-center justify-between gap-6 pb-7 text-obsidian/65">
        <a href="#premise" className="group flex items-center gap-4 eyebrow" aria-label="Scroll to discover">
          <span className="relative block h-10 w-px overflow-hidden bg-obsidian/20">
            <motion.span className="absolute inset-x-0 top-0 h-1/2 bg-champagne" animate={{ y: ['-100%', '200%'] }} transition={{ duration: 2.2, repeat: Infinity, ease: EASE }} />
          </span>
          <span className="hidden whitespace-nowrap sm:inline">Scroll to discover</span>
        </a>
        <div className="hidden min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_15%,#000_85%,transparent)] md:block">
          <motion.div className="flex gap-8 meta" animate={{ x: ['0%', '-50%'] }} transition={{ duration: 36, repeat: Infinity, ease: 'linear' }}>
            {[...categories, ...categories].map((c, i) => (
              <span key={i} className="whitespace-nowrap">
                {c.short} <span className="text-teal/60">·</span>
              </span>
            ))}
          </motion.div>
        </div>
        <div className="flex items-center gap-3 meta tabular-nums" aria-hidden>
          <span className="text-teal">{String(plate + 1).padStart(2, '0')}</span>
          <span className="relative h-px w-14 bg-obsidian/20">
            <motion.span key={plate} className="absolute inset-y-0 left-0 bg-champagne" initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 7, ease: 'linear' }} />
          </span>
          <span>{String(PLATES.length).padStart(2, '0')}</span>
          <span className="ml-2 hidden w-20 lg:inline">{PLATES[plate].label}</span>
        </div>
      </div>
    </section>
  )
}
