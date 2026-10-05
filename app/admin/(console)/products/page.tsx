import { DemoBanner, PageHeader } from '@/components/dashboard/kit'
import { adminMeta } from '@/components/admin/data'
import { ProductReview } from '@/components/admin/products'

export const metadata = adminMeta('Products', 'Product review queue: approve, reject, suspend or remove listings.', '/admin/products')

export default function AdminProducts() {
  return (
    <>
      <PageHeader eyebrow="Commerce" title="Product review" description="Every listing passes review before it reaches the storefront. Inspect documents, correct the category and decide." />
      <DemoBanner>Demonstration catalog. Decisions are kept in this session only.</DemoBanner>
      <ProductReview />
    </>
  )
}
