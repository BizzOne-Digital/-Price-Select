import { DemoBanner, PageHeader } from '@/components/dashboard/kit'
import { adminMeta } from '@/components/admin/data'
import { CategoryBoard } from '@/components/admin/categories'

export const metadata = adminMeta('Categories', 'Marketplace categories, review levels and listing attributes.', '/admin/categories')

export default function AdminCategories() {
  return (
    <>
      <PageHeader eyebrow="Commerce" title="Categories" description="Eight categories. Set the review level each one requires and the attributes suppliers must supply for a listing." />
      <DemoBanner>Attribute sets are demonstration values derived from current listings.</DemoBanner>
      <CategoryBoard />
    </>
  )
}
