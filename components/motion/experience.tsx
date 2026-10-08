'use client'

import Lenis from 'lenis'
import { AnimatePresence, motion, MotionConfig, useMotionValue, useSpring } from 'motion/react'
import { usePathname } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import { CURTAIN, EASE } from './primitives'

/**
 * Site-wide experience layer: reduced-motion config, Lenis smooth scrolling, the custom cursor,
 * the ambient grain, and the first-visit preloader.
 */
export function Experience({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.95 })
    let raf = requestAnimationFrame(function loop(t) {
      lenis.raf(t)
      raf = requestAnimationFrame(loop)
    })
    ;(window as unknown as { __lenis?: Lenis }).__lenis = lenis
    return () => {
      cancelAnimationFrame(raf)
      lenis.destroy()
    }
  }, [])

  // New route: start at the top (Lenis keeps its own scroll position otherwise).
  useEffect(() => {
    ;(window as unknown as { __lenis?: Lenis }).__lenis?.scrollTo(0, { immediate: true })
  }, [pathname])

  return (
    <MotionConfig reducedMotion="user">
      <Preloader />
      <Cursor />
      <div aria-hidden className="grain-wrap">
        <div className="grain" />
      </div>
      {children}
    </MotionConfig>
  )
}

/* ───────── Preloader: once per session, ~2s, cinematic reveal ───────── */
function Preloader() {
  const [show, setShow] = useState(true)
  const [pct, setPct] = useState(0)

  useEffect(() => {
    let seen = false
    try {
      seen = sessionStorage.getItem('ps-intro') === '1'
    } catch {}
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (seen || reduce) {
      setShow(false)
      return
    }
    document.documentElement.style.overflow = 'hidden'
    const DURATION = 1700
    const start = performance.now()
    const finish = () => {
      setPct(100)
      setShow(false)
      document.documentElement.style.overflow = ''
      try {
        sessionStorage.setItem('ps-intro', '1')
      } catch {}
    }
    // Timers, not rAF alone: rAF pauses in background tabs and must never trap the page.
    const tick = setInterval(() => {
      const t = Math.min((performance.now() - start) / DURATION, 1)
      setPct(Math.round((1 - Math.pow(1 - t, 3)) * 100))
    }, 40)
    const done = setTimeout(finish, DURATION + 260)
    return () => {
      clearInterval(tick)
      clearTimeout(done)
      document.documentElement.style.overflow = ''
    }
  }, [])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="preloader"
          role="status"
          aria-label="Loading Price-Select"
          className="preloader fixed inset-0 z-[200] flex flex-col justify-between overflow-hidden bg-obsidian px-5 py-6 text-ivory md:px-12 md:py-10"
          exit={{ clipPath: 'inset(0% 0% 100% 0%)' }}
          transition={{ duration: 1.1, ease: CURTAIN }}
        >
          <motion.div
            aria-hidden
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=1600&q=60)' }}
            initial={{ opacity: 0, scale: 1.15 }}
            animate={{ opacity: pct > 40 ? 0.16 : 0, scale: 1 }}
            transition={{ duration: 2.4, ease: EASE }}
          />
          <div aria-hidden className="aurora opacity-60" />
          <div className="relative flex justify-between eyebrow text-ivory/50">
            <span>Jr-Procurement.com</span>
            <span>Selected commerce</span>
          </div>

          <div className="relative mx-auto flex flex-col items-center">
            <motion.div
              className="h-px bg-champagne"
              initial={{ width: 0 }}
              animate={{ width: 'min(42vw, 360px)' }}
              transition={{ duration: 0.9, ease: CURTAIN }}
            />
            <div className="overflow-hidden py-5">
              <motion.p
                className="font-display text-[clamp(2.6rem,9vw,7.5rem)] font-light leading-none"
                initial={{ y: '105%', letterSpacing: '0.18em', opacity: 0 }}
                animate={{ y: '0%', letterSpacing: '-0.02em', opacity: 1 }}
                transition={{ duration: 1.3, delay: 0.25, ease: EASE }}
              >
                Price<span className="text-champagne">—</span>Select
              </motion.p>
            </div>
            <motion.p className="eyebrow text-ivory/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7, duration: 0.8 }}>
              Just for you
            </motion.p>
          </div>

          <div className="relative">
            <div className="mb-4 flex items-end justify-between">
              <span className="eyebrow text-ivory/50">Opening the selection</span>
              <span className="font-display text-5xl font-light tabular-nums md:text-7xl">{String(pct).padStart(3, '0')}</span>
            </div>
            <div className="h-px w-full bg-ivory/15">
              <div className="h-full bg-champagne" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ───────── Cursor: refined dot + contextual label ring. Desktop / fine pointers only. ───────── */
function Cursor() {
  const x = useMotionValue(-100)
  const y = useMotionValue(-100)
  const rx = useSpring(x, { stiffness: 260, damping: 28, mass: 0.5 })
  const ry = useSpring(y, { stiffness: 260, damping: 28, mass: 0.5 })
  const [label, setLabel] = useState<string | null>(null)
  const [hover, setHover] = useState(false)
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!fine || reduce) return
    setEnabled(true)
    document.documentElement.classList.add('has-cursor')
    const move = (e: PointerEvent) => {
      x.set(e.clientX)
      y.set(e.clientY)
      const t = (e.target as HTMLElement).closest<HTMLElement>('[data-cursor], a, button, [role="button"], input, select, textarea, label')
      setLabel(t?.dataset.cursor ?? null)
      setHover(!!t && !t.dataset.cursor && !t.matches('input, select, textarea'))
    }
    const leave = () => {
      x.set(-100)
      y.set(-100)
    }
    window.addEventListener('pointermove', move)
    document.addEventListener('pointerleave', leave)
    return () => {
      window.removeEventListener('pointermove', move)
      document.removeEventListener('pointerleave', leave)
      document.documentElement.classList.remove('has-cursor')
    }
  }, [x, y])

  if (!enabled) return null
  return (
    <>
      <motion.div aria-hidden className="cursor-dot" style={{ x, y }}>
        <div className="-ml-[3px] -mt-[3px] size-1.5 rounded-full bg-champagne mix-blend-difference" />
      </motion.div>
      <motion.div aria-hidden className="cursor-ring" style={{ x: rx, y: ry }}>
        <motion.div
          className="flex items-center justify-center rounded-full border border-champagne/60 text-[9px] font-semibold uppercase tracking-[0.22em] text-obsidian"
          animate={{
            width: label ? 84 : hover ? 46 : 30,
            height: label ? 84 : hover ? 46 : 30,
            marginLeft: label ? -42 : hover ? -23 : -15,
            marginTop: label ? -42 : hover ? -23 : -15,
            backgroundColor: label ? 'rgba(242,139,130,0.95)' : 'rgba(242,139,130,0)',
            opacity: 1,
          }}
          transition={{ duration: 0.45, ease: EASE }}
        >
          <AnimatePresence>
            {label && (
              <motion.span initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }}>
                {label}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </>
  )
}
