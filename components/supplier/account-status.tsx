import type { SupplierApplication } from '@/lib/types'
import { PageHeader, Panel, StatusBadge } from '@/components/dashboard/kit'
import { SITE } from '@/lib/site'
import { day } from './data'
import { LinkButton } from './ui'

const COPY: Record<SupplierApplication['status'], [string, string]> = {
  draft: ['Application not submitted', 'Your account exists but the application is incomplete. Upload the required documents and submit it for review.'],
  applied: ['Application in review', 'The Price-Select team is checking your documents, categories and fulfillment capability. You will be notified of the decision.'],
  under_review: ['Application in review', 'The Price-Select team is checking your documents, categories and fulfillment capability. You will be notified of the decision.'],
  rejected: ['Application not approved', 'Your application was not approved. You can update your documents and resubmit, or contact Price-Select.'],
  suspended: ['Account suspended', 'Portal modules are unavailable while the account is suspended. Contact Price-Select to resolve it.'],
  approved: ['', ''],
}

/** Shown instead of the portal modules until the supplier account is approved. */
export function AccountStatus({ supplier: s }: { supplier: SupplierApplication }) {
  const [title, text] = COPY[s.status]
  const closed = s.status === 'rejected' || s.status === 'suspended'
  return (
    <>
      <PageHeader eyebrow={s.name} title={title} description={text} />
      <Panel title="Account status" action={<StatusBadge status={s.status} />}>
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          {s.appliedAt && (
            <div>
              <dt className="meta text-[0.6rem] text-slate">Submitted</dt>
              <dd className="mt-1">{day(s.appliedAt)}</dd>
            </div>
          )}
          <div>
            <dt className="meta text-[0.6rem] text-slate">Documents</dt>
            <dd className="mt-1">{s.documents.length ? s.documents.map((d) => `${d.label} (${d.status.replace('_', ' ')})`).join(', ') : 'None uploaded'}</dd>
          </div>
          {closed && s.statusReason ? (
            <div className="sm:col-span-2">
              <dt className="meta text-[0.6rem] text-slate">Reason given</dt>
              <dd className="mt-1 border-l-2 border-danger/50 pl-3">{s.statusReason}</dd>
            </div>
          ) : null}
        </dl>
        <div className="mt-6 flex flex-wrap gap-3">
          {(s.status === 'draft' || s.status === 'rejected') && (
            <LinkButton href="/supplier/apply" tone="primary">
              {s.status === 'draft' ? 'Complete your application' : 'Update and resubmit'}
            </LinkButton>
          )}
          {closed && (
            <a href={`mailto:${SITE.email}`} className="inline-flex h-10 items-center border border-obsidian/20 px-4 text-[0.65rem] font-semibold uppercase tracking-[0.16em] hover:border-obsidian">
              Contact {SITE.email}
            </a>
          )}
        </div>
      </Panel>
    </>
  )
}
