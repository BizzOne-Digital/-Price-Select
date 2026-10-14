import type { Metadata } from 'next'
import { ApplyFlow } from '@/components/supplier/apply'
import { currentActor } from '@/lib/server/page-auth'
import { listCategories } from '@/lib/server/services/catalog'
import { getMySupplier } from '@/lib/server/services/suppliers'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Apply to become a supplier',
  description: 'Apply to supply on Price-Select: business details, contact, tax information, shipping capability and documentation, reviewed before approval.',
  alternates: { canonical: '/supplier/apply' },
}

export default async function SupplierApply() {
  const actor = await currentActor()
  const [categories, existing] = await Promise.all([listCategories(), actor?.role === 'supplier' ? getMySupplier(actor).catch(() => null) : null])
  return (
    <ApplyFlow
      categories={categories.filter((c) => c.active !== false).map((c) => ({ slug: c.slug, name: c.name, short: c.short, reviewLevel: c.reviewLevel, reviewNote: c.reviewNote }))}
      existing={existing}
    />
  )
}
