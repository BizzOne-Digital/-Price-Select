'use client'

import Image from 'next/image'
import { animate, motion, useInView, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react'
import { useEffect, useRef, type ElementType, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** One easing language for the whole site. */
export const EASE = [0.22, 1, 0.36, 1] as const
export const CURTAIN = [0.77, 0, 0.18, 1] as const

/* ───────── Reveal: the default entrance (opacity + rise + slight blur) ───────── */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 28,
  blur = true,
  as = 'div',
}: {
  children: ReactNode
  className?: string
  delay?: number
  y?: number
  blur?: boolean
  as?: 'div' | 'section' | 'li' | 'p' | 'span' | 'article' | 'header'
}) {
  const M = motion[as] as typeof motion.div
  return (
    <M
      className={className}
      initial={{ opacity: 0, y, filter: blur ? 'blur(8px)' : 'blur(0px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      transition={{ duration: 1.1, delay, ease: EASE }}
    >
      {children}
    </M>
  )
}

/* ───────── SplitText: masked word-by-word rise. Screen readers get the plain string. ───────── */
export function SplitText({
  text,
  as: Tag = 'h2',
  className,
  delay = 0,
  stagger = 0.06,
  italicWords = [],
  immediate = false,
  id,
}: {
  id?: string
  text: string
  as?: ElementType
  className?: string
  delay?: number
  stagger?: number
  /** Words (exact match, case-sensitive) rendered in italic champagne. */
  italicWords?: string[]
  /** Animate on mount instead of on scroll (for heroes). */
  immediate?: boolean
}) {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -10% 0px' })
  const show = immediate || inView
  const lines = text.split('\n')
  let i = 0
  return (
    <Tag ref={ref} id={id} className={className} aria-label={text.replace(/\n/g, ' ')}>
      {lines.map((ln, li) => (
        <span key={li} className="block" aria-hidden>
          {ln.split(' ').map((w, wi) => {
            const idx = i++
            const italic = italicWords.includes(w.replace(/[.,]/g, ''))
            return (
              <span key={wi} className="inline-block overflow-hidden pb-[0.12em] -mb-[0.12em] align-bottom">
                <motion.span
                  className={cn('inline-block', italic && 'italic text-(--accent)')}
                  initial={{ y: '110%', rotate: 4 }}
                  animate={show ? { y: '0%', rotate: 0 } : undefined}
                  transition={{ duration: 1.15, delay: delay + idx * stagger, ease: EASE }}
                >
                  {w}
                  {wi < ln.split(' ').length - 1 ? ' ' : ''}
                </motion.span>
              </span>
            )
          })}
        </span>
      ))}
    </Tag>
  )
}

/* ───────── ImageReveal: clip-path masks + settle-in scale ───────── */
const CLIPS = {
  up: ['inset(100% 0% 0% 0%)', 'inset(0% 0% 0% 0%)'],
  down: ['inset(0% 0% 100% 0%)', 'inset(0% 0% 0% 0%)'],
  left: ['inset(0% 100% 0% 0%)', 'inset(0% 0% 0% 0%)'],
  right: ['inset(0% 0% 0% 100%)', 'inset(0% 0% 0% 0%)'],
  split: ['inset(0% 50% 0% 50%)', 'inset(0% 0% 0% 0%)'],
  diagonal: ['polygon(0% 0%, 0% 0%, 0% 0%)', 'polygon(0% 0%, 200% 0%, 0% 200%)'],
} as const

export function ImageReveal({
  src,
  alt,
  className,
  imgClassName,
  direction = 'up',
  sizes = '100vw',
  priority = false,
  delay = 0,
  parallax = 0,
  cursor = 'View',
  children,
}: {
  /** Custom-cursor label on hover; false for decorative backgrounds. */
  cursor?: string | false
  src: string
  alt: string
  className?: string
  imgClassName?: string
  direction?: keyof typeof CLIPS
  sizes?: string
  priority?: boolean
  delay?: number
  /** Percent of vertical drift while the image crosses the viewport. */
  parallax?: number
  children?: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [`-${parallax}%`, `${parallax}%`])
  const [from, to] = CLIPS[direction]
  const isDiag = direction === 'diagonal'
  return (
    <motion.div
      ref={ref}
      data-cursor={cursor || undefined}
      className={cn('relative overflow-hidden bg-ivory', className)}
      initial={{ clipPath: from }}
      whileInView={{ clipPath: to }}
      viewport={{ once: true, margin: '0px 0px -8% 0px' }}
      transition={{ duration: isDiag ? 1.6 : 1.4, delay, ease: CURTAIN }}
    >
      <motion.div
        className="absolute inset-[-8%]"
        style={parallax ? { y } : undefined}
        initial={{ scale: 1.22 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 2.2, delay, ease: EASE }}
      >
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={cn('object-cover', imgClassName)} />
      </motion.div>
      {children}
    </motion.div>
  )
}

/* ───────── Parallax: drift any child on scroll ───────── */
export function Parallax({ children, className, speed = 12 }: { children: ReactNode; className?: string; speed?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [speed, -speed])
  const ys = useSpring(y, { stiffness: 80, damping: 20, mass: 0.4 })
  return (
    <motion.div ref={ref} className={className} style={{ y: ys }}>
      {children}
    </motion.div>
  )
}

/* ───────── ScrollMarquee: oversized type sliding horizontally with scroll ───────── */
export function ScrollMarquee({ children, className, from = 8, to = -28 }: { children: ReactNode; className?: string; from?: number; to?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const x = useTransform(scrollYProgress, [0, 1], [`${from}%`, `${to}%`])
  return (
    <div ref={ref} className={cn('overflow-hidden', className)}>
      <motion.div style={{ x }} className="whitespace-nowrap will-change-transform">
        {children}
      </motion.div>
    </div>
  )
}

/* ───────── LineReveal: the signature selection line drawing in ───────── */
export function LineReveal({ className, gold = false, delay = 0, origin = 'left' }: { className?: string; gold?: boolean; delay?: number; origin?: 'left' | 'center' | 'right' }) {
  return (
    <motion.div
      aria-hidden
      className={cn('sel-line', gold && 'sel-line--gold', className)}
      style={{ transformOrigin: origin }}
      initial={{ scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true, margin: '0px 0px -5% 0px' }}
      transition={{ duration: 1.6, delay, ease: CURTAIN }}
    />
  )
}

/* ───────── Counter: numbers count up once in view ───────── */
export function Counter({ to, decimals = 0, prefix = '', suffix = '', className }: { to: number; decimals?: number; prefix?: string; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const reduce = useReducedMotion()
  useEffect(() => {
    const el = ref.current
    if (!el || !inView) return
    const fmt = (v: number) => prefix + v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix
    if (reduce) {
      el.textContent = fmt(to)
      return
    }
    const c = animate(0, to, { duration: 1.8, ease: EASE, onUpdate: (v) => (el.textContent = fmt(v)) })
    return () => c.stop()
  }, [inView, to, decimals, prefix, suffix, reduce])
  return (
    <span ref={ref} className={cn('tabular-nums', className)}>
      {prefix}0{suffix}
    </span>
  )
}

/* ───────── Magnetic: subtle pull toward the pointer ───────── */
export function Magnetic({ children, strength = 0.28, className }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 180, damping: 16, mass: 0.3 })
  const sy = useSpring(y, { stiffness: 180, damping: 16, mass: 0.3 })
  return (
    <motion.div
      ref={ref}
      className={cn('inline-block', className)}
      style={{ x: sx, y: sy }}
      onPointerMove={(e) => {
        if (e.pointerType !== 'mouse') return
        const r = ref.current!.getBoundingClientRect()
        x.set((e.clientX - (r.left + r.width / 2)) * strength)
        y.set((e.clientY - (r.top + r.height / 2)) * strength)
      }}
      onPointerLeave={() => {
        x.set(0)
        y.set(0)
      }}
    >
      {children}
    </motion.div>
  )
}

/* ───────── Stagger group: children rise in sequence ───────── */
export function Stagger({ children, className, gap = 0.08, as = 'div' }: { children: ReactNode; className?: string; gap?: number; as?: 'div' | 'ul' | 'ol' }) {
  const M = motion[as] as typeof motion.div
  return (
    <M
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: gap } } }}
    >
      {children}
    </M>
  )
}

export const staggerItem = {
  hidden: { opacity: 0, y: 24, filter: 'blur(6px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 1, ease: EASE } },
}

export function StaggerItem({ children, className, as = 'div' }: { children: ReactNode; className?: string; as?: 'div' | 'li' }) {
  const M = motion[as] as typeof motion.div
  return (
    <M className={className} variants={staggerItem}>
      {children}
    </M>
  )
}
