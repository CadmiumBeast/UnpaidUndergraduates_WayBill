import type { Account } from '@/domain/accounts'
import type { ServerData } from '@/domain/types'

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '')

type ApiEnvelope<T> = { data: T; error?: string }

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  })
  const body = (await response.json().catch(() => ({}))) as ApiEnvelope<T>
  if (!response.ok) throw new Error(body.error ?? `Request failed (${response.status})`)
  return body.data
}

export async function apiLogin(username: string, pin: string) {
  return request<{ user: Account }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, pin }),
  })
}

export async function apiLogout() {
  await request('/auth/logout', { method: 'POST' })
}

export async function apiGetSharedState() {
  return request<{ version: number; state: ServerData } | null>('/state')
}

export async function apiPutSharedState(state: ServerData) {
  return request<{ version: number; state: ServerData }>('/state', {
    method: 'PUT',
    body: JSON.stringify({ state }),
  })
}
