import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// Teach tailwind-merge the custom type scale, otherwise `text-display-*` is read as a colour
// and silently dropped when combined with `text-ivory` etc.
const twMerge = extendTailwindMerge({
  extend: { classGroups: { 'font-size': [{ text: ['display-1', 'display-2', 'display-3', 'display-4'] }] } },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
