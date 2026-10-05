import type { Metadata } from 'next'
import { ApplyFlow } from '@/components/supplier/apply'

export const metadata: Metadata = {
  title: 'Apply to become a supplier',
  description: 'Apply to supply on Price-Select: business details, contact, tax information, shipping capability and documentation, reviewed before approval.',
  alternates: { canonical: '/supplier/apply' },
}

export default function SupplierApply() {
  return <ApplyFlow />
}
