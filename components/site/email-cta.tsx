'use client'

import { ArrowUpRight, Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { Magnetic } from '@/components/motion/primitives'

export function EmailCta({ email }: { email: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
      <Magnetic strength={0.12}>
        <a href={`mailto:${email}`} data-cursor="Write" className="group relative inline-flex items-end gap-4 break-all font-display text-[clamp(1.8rem,5.2vw,5rem)] font-light leading-none tracking-[-0.02em]">
          <span className="relative">
            {email}
            <span className="absolute -bottom-3 left-0 h-px w-full origin-left bg-champagne/40" aria-hidden />
            <span className="absolute -bottom-3 left-0 h-px w-full origin-left scale-x-0 bg-champagne transition-transform duration-700 ease-[var(--ease-luxe)] group-hover:scale-x-100" aria-hidden />
          </span>
          <ArrowUpRight className="mb-1 size-8 shrink-0 text-champagne transition-transform duration-700 ease-[var(--ease-luxe)] group-hover:-translate-y-2 group-hover:translate-x-2" strokeWidth={1} aria-hidden />
        </a>
      </Magnetic>
      <button
        onClick={() => {
          navigator.clipboard?.writeText(email).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 2200)
          })
        }}
        className="inline-flex h-11 items-center gap-3 self-start border border-ivory/25 px-5 eyebrow text-ivory/80 transition-colors hover:border-champagne hover:text-champagne md:self-auto"
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        <span aria-live="polite">{copied ? 'Copied' : 'Copy address'}</span>
      </button>
    </div>
  )
}
