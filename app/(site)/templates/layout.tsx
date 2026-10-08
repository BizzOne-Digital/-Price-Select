import type { Metadata } from 'next'
import { TemplateSwitcher } from '@/components/templates/switcher'

// Client review previews of alternative homepage designs. Not for search engines.
export const metadata: Metadata = { robots: { index: false, follow: false } }

export default function TemplatesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <TemplateSwitcher />
    </>
  )
}
