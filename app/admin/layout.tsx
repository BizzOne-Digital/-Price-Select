import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { default: 'Operations console', template: '%s · Operations · Price-Select' },
  robots: { index: false, follow: false, nocache: true },
}

export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return children
}
