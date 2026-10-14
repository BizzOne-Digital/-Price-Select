'use client'

import { useState } from 'react'
import { ActionButton, Field, StatusBadge } from '@/components/dashboard/kit'
import { SafeImage } from '@/components/ui/safe-image'
import { useToast } from '@/components/ui/toast'
import { api, errorText } from '@/lib/client/api'
import type { Category } from '@/lib/types'
import { cn } from '@/lib/utils'
import { LocalImageField } from './local-image-field'
import { Drawer, inputCls } from './ui'

type Row = Category & { total: number; live: number }
const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean)

export function CategoryBoard({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState(initial)
  const [editing, setEditing] = useState<Row | 'new' | null>(null)

  return (
    <>
      <div className="mb-6">
        <ActionButton tone="primary" onClick={() => setEditing('new')}>
          New category
        </ActionButton>
      </div>
      {rows.length === 0 && <p className="text-sm text-slate">No categories yet. Create the first one.</p>}
      <ul className="grid gap-px border border-obsidian/10 bg-obsidian/10 md:grid-cols-2">
        {rows.map((c, i) => (
          <li key={c.slug} className="flex flex-col bg-ivory sm:flex-row">
            <div className="relative aspect-[16/9] shrink-0 overflow-hidden bg-pearl sm:aspect-auto sm:w-40">
              {c.image && <SafeImage src={c.image} alt={c.imageAlt} fill sizes="(min-width: 640px) 160px, 100vw" className="object-cover" />}
              <span className="absolute left-3 top-3 font-display text-lg text-obsidian">{String(i + 1).padStart(2, '0')}</span>
            </div>
            <div className="flex-1 p-5 md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="font-display text-2xl font-light leading-tight">{c.name}</h2>
                <p className="meta text-[0.6rem] text-slate tabular-nums">
                  {c.live} live · {c.total - c.live} other
                </p>
              </div>
              <p className="mt-3 flex flex-wrap gap-2">
                <StatusBadge status={c.reviewLevel} tone={c.reviewLevel === 'enhanced' ? 'gold' : 'muted'} label={`${c.reviewLevel} review`} />
                {c.active === false && <StatusBadge status="inactive" tone="bad" label="Inactive" />}
              </p>
              {c.reviewNote && <p className="mt-3 text-xs leading-relaxed text-slate">{c.reviewNote}</p>}
              {!!c.requiredDocuments?.length && (
                <div className="mt-4">
                  <p className="meta text-[0.6rem] text-slate">Required documents</p>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {c.requiredDocuments.map((a) => (
                      <li key={a}>
                        <StatusBadge status="attr" tone="muted" label={a} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <ActionButton className="mt-4 h-9" onClick={() => setEditing(c)}>
                Edit
              </ActionButton>
            </div>
          </li>
        ))}
      </ul>
      <Drawer open={!!editing} onClose={() => setEditing(null)} eyebrow="Category" title={editing === 'new' ? 'New category' : (editing?.name ?? '')}>
        {editing && (
          <CategoryForm
            key={editing === 'new' ? 'new' : editing.slug}
            c={editing === 'new' ? null : editing}
            onSaved={(row) => {
              setRows((rs) => (rs.some((r) => r.slug === row.slug) ? rs.map((r) => (r.slug === row.slug ? row : r)) : [...rs, row]))
              setEditing(null)
            }}
          />
        )}
      </Drawer>
    </>
  )
}

function CategoryForm({ c, onSaved }: { c: Row | null; onSaved: (r: Row) => void }) {
  const toast = useToast()
  const [image, setImage] = useState(c?.image ?? '')
  const [level, setLevel] = useState<Category['reviewLevel']>(c?.reviewLevel ?? 'standard')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const area = 'w-full border border-obsidian/15 bg-ivory/60 p-3 text-sm focus:border-gold focus:outline-none'

  const save = async (f: FormData) => {
    setBusy(true)
    setError('')
    const body = {
      name: String(f.get('name')).trim(),
      short: String(f.get('short')).trim(),
      description: String(f.get('description')).trim(),
      includes: lines(String(f.get('includes'))),
      image,
      imageAlt: String(f.get('imageAlt')).trim(),
      reviewLevel: level,
      reviewNote: String(f.get('reviewNote')).trim(),
      requiredDocuments: lines(String(f.get('requiredDocuments'))),
      active: f.get('active') === 'on',
    }
    try {
      const row = c ? await api<Row>(`/api/admin/categories/${c.slug}`, { method: 'PATCH', body }) : await api<Row>('/api/admin/categories', { body })
      toast({ title: c ? `${row.name} saved` : `${row.name} created` })
      onSaved(row)
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault()
        void save(new FormData(e.currentTarget))
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name">
          <input name="name" defaultValue={c?.name} required minLength={2} maxLength={80} className={inputCls} />
        </Field>
        <Field label="Short name">
          <input name="short" defaultValue={c?.short} required minLength={2} maxLength={40} className={inputCls} />
        </Field>
      </div>
      <Field label="Description">
        <textarea name="description" defaultValue={c?.description} rows={3} maxLength={400} className={area} />
      </Field>
      <Field label="Includes" hint="One item per line">
        <textarea name="includes" defaultValue={c?.includes.join('\n')} rows={3} className={area} />
      </Field>
      <LocalImageField value={image} onChange={setImage} folder="pages" label="Category image" alt={c?.imageAlt} disabled={busy} />
      <Field label="Image alt text">
        <input name="imageAlt" defaultValue={c?.imageAlt} maxLength={200} className={inputCls} />
      </Field>
      <fieldset>
        <legend className="meta text-[0.6rem] text-slate">Review level</legend>
        <div className="mt-2 inline-grid grid-cols-2 border border-obsidian/15">
          {(['standard', 'enhanced'] as const).map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={level === l}
              onClick={() => setLevel(l)}
              className={cn('min-h-10 px-4 text-[0.62rem] font-semibold uppercase tracking-[0.14em] transition-colors', level === l ? (l === 'enhanced' ? 'bg-gold/15 text-gold-deep' : 'bg-teal text-white') : 'text-slate hover:text-obsidian')}
            >
              {l}
            </button>
          ))}
        </div>
        {level === 'enhanced' && <p className="mt-2 text-xs text-slate">Enhanced listings need reviewed documents and a recorded sign-off before publishing.</p>}
      </fieldset>
      <Field label="Review note" hint="Shown to reviewers and suppliers">
        <textarea name="reviewNote" defaultValue={c?.reviewNote} rows={2} maxLength={300} className={area} />
      </Field>
      <Field label="Required documents" hint="One per line. New listings in this category must supply each.">
        <textarea name="requiredDocuments" defaultValue={c?.requiredDocuments?.join('\n')} rows={3} className={area} />
      </Field>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input type="checkbox" name="active" defaultChecked={c?.active !== false} className="size-4 accent-[#5420C7]" /> Active on the storefront
      </label>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <ActionButton type="submit" tone="primary" disabled={busy}>
        {busy ? 'Saving' : c ? 'Save category' : 'Create category'}
      </ActionButton>
    </form>
  )
}
