import { PageHeader } from '@/components/dashboard/kit'
import { adminMeta } from '@/components/admin/data'
import { ProductReview } from '@/components/admin/products'
import { requirePage } from '@/lib/server/page-auth'
import { listCategoriesAdmin } from '@/lib/server/services/catalog'
import { listProductsAdmin } from '@/lib/server/services/products'

export const metadata = adminMeta('Products', 'Product review queue: approve, reject, suspend or remove listings.', '/admin/products')

export default async function AdminProducts() {
  const actor = await requirePage(['admin'], '/admin/login')
  const [{ items }, categories] = await Promise.all([listProductsAdmin(actor), listCategoriesAdmin()])
  return (
    <>
      <PageHeader eyebrow="Commerce" title="Product review" description="Every listing passes review before it reaches the storefront. Inspect documents, correct the listing and decide." />
      <ProductReview initial={items} categories={categories} />
    </>
  )
}
