import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const combinedSlug = (name: string, maxLen = 80): string => {
  const base = name
  if (!base) return 'untitled'
  let s = base
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '')
  if (!s) s = 'untitled'
  if (s.length > maxLen) s = s.slice(0, maxLen)
  return s
}

// Google-style avatar background colors (blue/green/orange/red/purple/teal...).
// Color user ke naam/email se deterministically chunte hain — taake har user ka
// color "random" lage par har refresh par same rahe (Google profile jaisa).
const AVATAR_COLORS = [
  '#4285F4', // blue
  '#0F9D58', // green
  '#F4B400', // orange/yellow
  '#DB4437', // red
  '#9334E6', // purple
  '#00897B', // teal
  '#FF7043', // deep orange
  '#3949AB', // indigo
]

export const avatarColor = (seed: string): string => {
  if (!seed) return AVATAR_COLORS[0]
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export const polylineBox = (
  points: ReadonlyArray<{ x: number; y: number }>
) => {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity

  for (let i = 0; i < points.length; i++) {
    const { x, y } = points[i]
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY }
}