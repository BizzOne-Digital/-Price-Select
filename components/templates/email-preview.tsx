'use client'

import { useEffect, useState } from 'react'
import { Check, Copy, Monitor, Smartphone } from 'lucide-react'
import type { EmailTemplate } from '@/lib/emails'
import { cn } from '@/lib/utils'

export function EmailPreview({ emails, siteUrl }: { emails: EmailTemplate[]; siteUrl: string }) {
  const [active, setActive] = useState(0)
  const [mobile, setMobile] = useState(false)
  const [copied, setCopied] = useState(false)
  const [origin, setOrigin] = useState('')
  useEffect(() => setOrigin(window.location.origin), [])

  const e = emails[active]
  const copy = () =>
    navigator.clipboard?.writeText(e.html.replaceAll('%BASE%', siteUrl)).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })

  return (
    <div className="grid gap-10 lg:grid-cols-12">
      <ol className="lg:col-span-4">
        {emails.map((x, i) => (
          <li key={x.id} className="border-b border-obsidian/12 first:border-t">
            <button
              type="button"
              onClick={() => setActive(i)}
              aria-current={i === active ? 'true' : undefined}
              className={cn('flex w-full items-baseline gap-5 py-4 text-left transition-colors', i === active ? 'text-obsidian' : 'text-slate hover:text-obsidian')}
            >
              <span className={cn('meta', i === active ? 'text-gold-deep' : 'text-mist')}>{String(i + 1).padStart(2, '0')}</span>
              <span>
                <span className={cn('block font-display text-2xl font-light', i === active && 'italic')}>{x.name}</span>
                <span className="mt-1 block text-xs text-slate">{x.trigger}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>

      <div className="lg:col-span-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border border-obsidian/12 bg-ivory px-5 py-4">
          <div className="min-w-0">
            <p className="meta text-[0.6rem] text-slate">Subject</p>
            <p className="truncate text-sm font-medium text-obsidian">{e.subject}</p>
          </div>
          <div className="flex items-center gap-2">
            <div role="group" aria-label="Preview width" className="flex border border-obsidian/15">
              <button type="button" onClick={() => setMobile(false)} aria-pressed={!mobile} aria-label="Desktop preview" className={cn('grid size-10 place-items-center', !mobile ? 'bg-obsidian text-ivory' : 'text-slate')}>
                <Monitor className="size-4" strokeWidth={1.5} />
              </button>
              <button type="button" onClick={() => setMobile(true)} aria-pressed={mobile} aria-label="Phone preview" className={cn('grid size-10 place-items-center', mobile ? 'bg-obsidian text-ivory' : 'text-slate')}>
                <Smartphone className="size-4" strokeWidth={1.5} />
              </button>
            </div>
            <button type="button" onClick={copy} className="inline-flex h-10 items-center gap-2 border border-obsidian/15 px-4 text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-obsidian hover:border-obsidian">
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? 'Copied' : 'Copy HTML'}
            </button>
          </div>
        </div>
        <div className="mt-4 flex justify-center border border-obsidian/12 bg-pearl p-4 md:p-8">
          {origin && (
            <iframe
              key={e.id + mobile}
              title={`${e.name} email preview`}
              srcDoc={e.html.replaceAll('%BASE%', origin)}
              className={cn('h-[900px] max-h-[75vh] bg-white shadow-xl transition-[width] duration-500', mobile ? 'w-[375px] max-w-full' : 'w-full')}
            />
          )}
        </div>
      </div>
    </div>
  )
}
