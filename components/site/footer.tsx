import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { SITE } from '@/lib/site'
import { LineReveal, Reveal, ScrollMarquee } from '@/components/motion/primitives'
import { Wordmark } from './header'

const COLS = [
  {
    title: 'Navigate',
    links: [
      ['/shop', 'Shop'], ['/categories', 'Categories'], ['/about', 'About Us'], ['/services', 'Services'],
      ['/pricing', 'Pricing'], ['/team', 'Our Team'], ['/contact', 'Contact'],
    ],
  },
  { title: 'Customer', links: [['/account/orders', 'Orders'], ['/account/returns', 'Returns'], ['/contact', 'Support'], ['/account', 'Account']] },
  { title: 'Supplier', links: [['/supplier/apply', 'Become a Supplier'], ['/supplier/login', 'Supplier Login']] },
  { title: 'Policies', links: [['/policies/privacy', 'Privacy'], ['/policies/terms', 'Terms'], ['/policies/returns', 'Returns']] },
]

export function Footer() {
  return (
    <footer className="relative isolate overflow-hidden bg-obsidian text-ivory">
      <div aria-hidden className="aurora opacity-40" />
      <div className="container-luxe relative pt-24 md:pt-36">
        <Reveal>
          <p className="eyebrow text-champagne">Price-Select · A business of {SITE.parent}</p>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mt-8 max-w-[16ch] font-display text-[clamp(2.8rem,7vw,7.5rem)] font-light leading-[0.9] tracking-[-0.035em]">
            Selected for the way you <em className="text-champagne">buy.</em>
          </p>
        </Reveal>
        <Reveal delay={0.2} className="mt-12">
          <a href={`mailto:${SITE.email}`} className="link-line link-line--static group text-base text-ivory/80 hover:text-ivory md:text-lg">
            {SITE.email}
            <ArrowUpRight className="size-4 transition-transform duration-500 group-hover:-translate-y-1 group-hover:translate-x-1" strokeWidth={1.3} />
          </a>
        </Reveal>

        <LineReveal className="mt-20 md:mt-28" />

        <div className="grid gap-12 py-16 sm:grid-cols-2 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Link href="/" aria-label="Price-Select home">
              <Wordmark className="h-20 md:h-24" />
            </Link>
            <p className="mt-6 max-w-xs text-sm leading-relaxed text-ivory/55">
              A curated marketplace connecting customers with approved suppliers. Displayed prices exclude applicable taxes and shipping.
            </p>
          </div>
          {COLS.map((c) => (
            <nav key={c.title} aria-label={c.title} className="lg:col-span-2">
              <p className="eyebrow text-ivory/40">{c.title}</p>
              <ul className="mt-6 space-y-3">
                {c.links.map(([href, label]) => (
                  <li key={href + label}>
                    <Link href={href} className="link-line text-sm text-ivory/75 transition-colors hover:text-champagne">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      <ScrollMarquee from={0} to={-30} className="select-none border-t border-ivory/10 py-6">
        <span aria-hidden className="font-display text-[clamp(5rem,16vw,17rem)] font-light leading-none tracking-[-0.04em] text-ivory/[0.06]">
          Price—Select · Just for you · Price—Select · Just for you ·
        </span>
      </ScrollMarquee>

      <div className="container-luxe relative flex flex-col gap-4 border-t border-ivory/10 py-8 meta text-ivory/40 md:flex-row md:items-center md:justify-between">
        <span>© {new Date().getFullYear()} Price-Select.com</span>
        <span>A business of {SITE.parent}</span>
        <Link href="/admin/login" className="hover:text-champagne">Staff sign-in</Link>
      </div>
    </footer>
  )
}
