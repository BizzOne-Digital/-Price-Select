'use client'

import { motion } from 'motion/react'
import { CURTAIN, EASE } from '@/components/motion/primitives'

/** Route transition: a champagne-lined curtain lifts while the page settles in. */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <>
      <motion.div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[80] origin-top bg-ivory"
        initial={{ scaleY: 1 }}
        animate={{ scaleY: 0 }}
        transition={{ duration: 0.85, ease: CURTAIN }}
      >
        <div className="absolute inset-x-0 bottom-0 h-px bg-champagne/60" />
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7, delay: 0.15, ease: EASE }}>
        {children}
      </motion.div>
    </>
  )
}
