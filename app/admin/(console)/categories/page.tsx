import { PageHeader } from '@/components/dashboard/kit'
import { adminMeta } from '@/components/admin/data'
import { CategoryBoard } from '@/components/admin/categories'
import { requirePage } from '@/lib/server/page-auth'
import { listCategoriesAdmin } from '@/lib/server/services/catalog'

export const metadata = adminMeta('Categories', 'Marketplace categories, review levels and required documents.', '/admin/categories')

export default async function AdminCategories() {
  await requirePage(['admin'], '/admin/login')
  const categories = await listCategoriesAdmin()
  return (
    <>
      <PageHeader eyebrow="Commerce" title="Categories" description="Set the review level each category requires, the documents suppliers must provide, and the storefront image and copy." />
      <CategoryBoard initial={categories} />
    </>
  )
}
