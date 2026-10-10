'use client'

import { motion } from 'motion/react'

/** 4 · 0 · 4 drifting apart and reconnecting around the selection line. */
export function NotFoundDigits() {
  const drift = (x: number, delay = 0) => ({
    animate: { x: [0, x, 0] },
    transition: { duration: 6, delay, repeat: Infinity, ease: [0.65, 0, 0.35, 1] as const },
  })
  return (
    <div aria-hidden className="relative flex items-center font-display text-[clamp(7rem,26vw,22rem)] font-light leading-none tracking-[-0.06em]">
      <motion.span initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2 }}>
        <motion.span className="inline-block" {...drift(-40)}>4</motion.span>
      </motion.span>
      <motion.span className="relative mx-[0.04em] inline-block italic text-teal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 1.2 }}>
        <motion.span className="inline-block" animate={{ rotate: [0, -6, 0], scale: [1, 0.94, 1] }} transition={{ duration: 6, repeat: Infinity, ease: [0.65, 0, 0.35, 1] }}>
          0
        </motion.span>
        <motion.span className="absolute left-1/2 top-1/2 h-px -translate-x-1/2 bg-champagne/70" animate={{ width: ['60%', '180%', '60%'] }} transition={{ duration: 6, repeat: Infinity, ease: [0.65, 0, 0.35, 1] }} />
      </motion.span>
      <motion.span initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2, delay: 0.15 }}>
        <motion.span className="inline-block" {...drift(40)}>4</motion.span>
      </motion.span>
    </div>
  )
}
