'use client'

import Image, { type ImageProps } from 'next/image'
import { useState } from 'react'

export const PLACEHOLDER = '/placeholder.svg'

/** Legacy `/uploads/...` paths (filesystem uploads) no longer exist; map them to the placeholder. */
export const normalizeSrc = (src: ImageProps['src']) => (typeof src === 'string' && (!src || src.startsWith('/uploads/')) ? PLACEHOLDER : src)

/**
 * next/image with a safe fallback: a missing or failed image swaps to the bundled placeholder
 * once (no retry loop).
 */
export function SafeImage({ src, alt, ...rest }: ImageProps) {
  const [failed, setFailed] = useState(false)
  const s = failed ? PLACEHOLDER : normalizeSrc(src)
  return <Image {...rest} src={s} alt={alt} onError={() => !failed && setFailed(true)} unoptimized={rest.unoptimized || s === PLACEHOLDER} />
}
