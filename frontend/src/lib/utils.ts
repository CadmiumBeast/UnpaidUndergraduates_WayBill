import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export const pad = (n: number) => String(n).padStart(2, '0')

export const fmt24 = (min: number) => {
  const m = Math.round(min)
  return `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`
}

export const fmt12 = (min: number) => {
  const m = Math.round(min)
  const h24 = Math.floor(m / 60) % 24
  const h = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h}:${pad(m % 60)} ${h24 < 12 ? 'AM' : 'PM'}`
}

export const t12 = (hhmm: string) => fmt12(toMin(hhmm))

export const fmtDuration = (min: number) => {
  const m = Math.round(min)
  if (m < 60) return `${m} min`
  return `${Math.floor(m / 60)} h ${pad(m % 60)} min`
}

export const timeAgo = (iso: string) => {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime())
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} h ago`
  return `${Math.floor(h / 24)} d ago`
}

export const clockTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-LK', { hour: 'numeric', minute: '2-digit' })
