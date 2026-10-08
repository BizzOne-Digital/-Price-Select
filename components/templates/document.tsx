'use client'

import Image from 'next/image'
import { Printer } from 'lucide-react'
import type { ReactNode } from 'react'
import { SITE } from '@/lib/site'

// Printing shows only the document: site chrome and the template switcher are hidden.
const PRINT_CSS = `@media print {
  @page { size: A4; margin: 14mm; }
  body { background: #fff !important; }
  body header, body footer, nav[aria-label="Homepage templates"], [data-print-hide] { display: none !important; }
  [data-doc] { box-shadow: none !important; border: 0 !important; padding: 0 !important; max-width: none !important; }
}`

export function DocumentFrame({ children, toolbar }: { children: ReactNode; toolbar?: ReactNode }) {
  return (
    <section className="bg-pearl pb-40 pt-10 md:pt-14">
      <style>{PRINT_CSS}</style>
      <div className="container-luxe">
        <div data-print-hide className="mx-auto mb-6 flex max-w-[860px] flex-wrap items-center justify-between gap-4">
          {toolbar}
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-11 items-center gap-2 bg-obsidian px-5 text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-ivory hover:bg-midnight"
          >
            <Printer className="size-4" strokeWidth={1.5} /> Print / Save as PDF
          </button>
        </div>
        <article data-doc className="mx-auto max-w-[860px] border border-obsidian/10 bg-white p-8 text-[#1d2430] shadow-2xl md:p-14">
          {children}
        </article>
      </div>
    </section>
  )
}

export function DocHeader({ title, meta }: { title: string; meta: [string, string][] }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-8 border-b-2 border-[#b8914f] pb-8">
      <div>
        <Image src="/pricelogo.png" alt="Price-Select" width={1672} height={941} className="h-20 w-auto" priority />
        <p className="mt-3 text-xs leading-relaxed text-[#5f6b78]">
          Price-Select.com · A business of {SITE.parent}
          <br />
          {SITE.email}
        </p>
      </div>
      <div className="text-right">
        <p className="font-display text-5xl font-light tracking-[-0.02em] text-[#14284a]">{title}</p>
        <dl className="mt-4 grid grid-cols-[auto_auto] justify-end gap-x-6 gap-y-1 text-sm">
          {meta.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-[#5f6b78]">{k}</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </header>
  )
}

export function DocLabel({ children }: { children: ReactNode }) {
  return <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#8a6c33]">{children}</p>
}
