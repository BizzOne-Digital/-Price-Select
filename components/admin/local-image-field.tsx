'use client'

import { ImagePlus, Loader2, RefreshCw, Trash2 } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useToast } from '@/components/ui/toast'
import { errorText } from '@/lib/client/api'
import { IMAGE_TYPES, uploadImage, type PublicFolder } from '@/lib/client/upload'
import { SafeImage } from '@/components/ui/safe-image'
import { cn } from '@/lib/utils'

/**
 * Admin image field. Uploads to MongoDB through /api/upload (chunked above ~3.5 MB) and reports
 * the saved public URL through `onChange`. Removal is reported as `onChange('')`.
 *
 * The field never deletes stored files itself: the parent form saves the record first, and the
 * server removes the old image only once nothing references it any more.
 */
export function LocalImageField({ value, onChange, folder, label = 'Image', alt = '', className, disabled }: { value: string; onChange: (url: string) => void; folder: PublicFolder; label?: string; alt?: string; className?: string; disabled?: boolean }) {
  const toast = useToast()
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [progress, setProgress] = useState<number | null>(null)

  // Revoke temporary object URLs when replaced or unmounted.
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview])

  const pick = async (file: File | undefined) => {
    if (!file) return
    const local = URL.createObjectURL(file)
    setPreview(local)
    setProgress(0)
    try {
      const r = await uploadImage(file, folder, setProgress)
      onChange(r.url)
      toast({ title: 'Image uploaded', body: 'Save the form to keep this change.' })
    } catch (e) {
      toast({ title: 'Upload failed', body: errorText(e), tone: 'error' })
    } finally {
      setPreview(null)
      setProgress(null)
      if (input.current) input.current.value = ''
    }
  }

  const shown = preview ?? value
  const busy = progress !== null
  return (
    <div className={cn('block', className)}>
      <label htmlFor={id} className="meta text-[0.6rem] text-slate">
        {label}
      </label>
      <div className="mt-1 flex items-center gap-4">
        <div className="relative size-24 shrink-0 overflow-hidden border border-obsidian/15 bg-pearl">
          {shown ? <SafeImage src={shown} alt={alt} fill sizes="96px" className="object-cover" unoptimized={!!preview} /> : <ImagePlus className="absolute inset-0 m-auto size-6 text-slate/60" strokeWidth={1.3} aria-hidden />}
          {busy && (
            <span className="absolute inset-0 grid place-items-center bg-ivory/70" aria-live="polite">
              <Loader2 className="size-5 animate-spin text-gold-deep" aria-hidden />
              <span className="sr-only">Uploading {Math.round((progress ?? 0) * 100)}%</span>
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={input} id={id} type="file" accept={IMAGE_TYPES.join(',')} className="sr-only" disabled={disabled || busy} onChange={(e) => pick(e.target.files?.[0])} />
          <button type="button" disabled={disabled || busy} onClick={() => input.current?.click()} className="inline-flex h-10 items-center gap-2 border border-obsidian/15 px-3 text-[0.66rem] font-semibold uppercase tracking-[0.14em] hover:border-obsidian disabled:opacity-50">
            {value ? <RefreshCw className="size-3.5" aria-hidden /> : <ImagePlus className="size-3.5" aria-hidden />}
            {busy ? `Uploading ${Math.round((progress ?? 0) * 100)}%` : value ? 'Replace' : 'Upload'}
          </button>
          {value && !busy && (
            <button type="button" disabled={disabled} onClick={() => onChange('')} className="inline-flex h-10 items-center gap-2 border border-danger/30 px-3 text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-danger hover:border-danger disabled:opacity-50">
              <Trash2 className="size-3.5" aria-hidden /> Remove
            </button>
          )}
        </div>
      </div>
      <p className="mt-1 text-xs text-slate">JPEG, PNG, WebP or GIF, up to 8 MB.</p>
    </div>
  )
}
