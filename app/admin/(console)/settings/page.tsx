import { PageHeader } from '@/components/dashboard/kit'
import { adminMeta } from '@/components/admin/data'
import { SettingsBoard } from '@/components/admin/settings'
import { requirePage } from '@/lib/server/page-auth'
import { listAudit } from '@/lib/server/services/admin'
import { capabilities } from '@/lib/server/services/capabilities'
import { listCategoriesAdmin } from '@/lib/server/services/catalog'
import { listProductsAdmin } from '@/lib/server/services/products'
import { getContentAdmin, getSettings } from '@/lib/server/services/settings'

export const metadata = adminMeta('Settings', 'Service targets, shipping, fees, promotions, policies, roles, notifications and audit log.', '/admin/settings')

export default async function AdminSettings() {
  const actor = await requirePage(['admin'], '/admin/login')
  const [settings, caps, terms, privacy, returns, site, audit, products, categories] = await Promise.all([
    getSettings(),
    capabilities(),
    getContentAdmin('policy:terms'),
    getContentAdmin('policy:privacy'),
    getContentAdmin('policy:returns'),
    getContentAdmin('content:site'),
    listAudit(actor, { limit: 50 }),
    listProductsAdmin(actor, { status: 'published' }),
    listCategoriesAdmin(),
  ])
  return (
    <>
      <PageHeader eyebrow="System" title="Settings" description="The rules the marketplace runs on. Anything not yet agreed is marked to be confirmed — no figures are assumed." />
      <SettingsBoard settings={settings} caps={caps} content={{ 'policy:terms': terms, 'policy:privacy': privacy, 'policy:returns': returns, 'content:site': site }} audit={audit} products={products.items} categories={categories} />
    </>
  )
}
