import { clearToken, setToken, token } from './auth'

export interface User {
  id: string
  full_name: string
  avatar_url: string | null
}
export interface Attendance {
  shift_start: string
  checked_in_at: string | null
}
export interface EventItem {
  id: string
  title: string
  start_time: string
  end_time: string | null
  location: string | null
}
export interface PinnedApp {
  id: string
  name: string
}
export interface Dashboard {
  user: User
  attendance: Attendance
  events_today: EventItem[]
  pinned_apps: PinnedApp[]
  notifications: { unread_count: number }
}

export class ApiError extends Error {
  status: number
  detail: string
  constructor(status: number, detail: string) {
    super(detail)
    this.status = status
    this.detail = detail
  }
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const sent = token.value
  const headers = new Headers(init.headers)
  if (sent) headers.set('Authorization', `Bearer ${sent}`)
  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers })
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      if (typeof body?.detail === 'string') detail = body.detail
    } catch {
      // body không phải JSON: giữ statusText
    }
    if (res.status === 401 && sent) clearToken('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại')
    throw new ApiError(res.status, detail)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const fetchDashboard = () => request<Dashboard>('/api/dashboard')

export const checkIn = () => request<Attendance>('/api/attendance/check-in', { method: 'POST' })

export async function login(username: string, password: string): Promise<void> {
  const r = await request<{ access_token: string }>('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  setToken(r.access_token)
}

export async function logout(): Promise<void> {
  try {
    await request<void>('/api/auth/logout', { method: 'POST' })
  } catch {
    // bỏ qua mọi lỗi: luôn đăng xuất phía client
  }
  clearToken()
}
