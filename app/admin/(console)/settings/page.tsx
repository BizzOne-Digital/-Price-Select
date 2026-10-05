import { DemoBanner, PageHeader } from '@/components/dashboard/kit'
import { adminMeta } from '@/components/admin/data'
import { SettingsBoard } from '@/components/admin/settings'

export const metadata = adminMeta('Settings', 'Service targets, shipping, fees, promotions, policies, roles, notifications and audit log.', '/admin/settings')

export default function AdminSettings() {
  return (
    <>
      <PageHeader eyebrow="System" title="Settings" description="The rules the marketplace runs on. Anything not yet agreed is marked to be confirmed — no figures are assumed." />
      <DemoBanner>Settings are saved to this session only until the database is connected.</DemoBanner>
      <SettingsBoard />
    </>
  )
}
