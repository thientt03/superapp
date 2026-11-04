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
  my_task: Task | null
  pending_approval_count: number
}

export interface Employee {
  id: string
  full_name: string
  avatar_url: string | null
}
export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'
export interface Task {
  id: number
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  is_overdue: boolean
  can_edit: boolean
  assigner: Employee
  assignee: Employee
  created_at: string
  updated_at: string
}
export interface TaskPage {
  items: Task[]
  next_cursor: string | null
}
export interface TaskCreate {
  title: string
  description?: string | null
  assignee_id: string
  due_date?: string | null
  priority?: TaskPriority
}
export type TaskUpdate = Partial<{
  title: string
  description: string | null
  assignee_id: string
  due_date: string | null
  priority: TaskPriority
  status: TaskStatus
}>

export interface FlowStep {
  level: number
  approver: Employee
}
export interface ApprovalType {
  code: string
  name: string
  has_amount: boolean
  has_date_range: boolean
  steps: FlowStep[]
}
export interface ApprovalTypeList {
  can_edit: boolean
  items: ApprovalType[]
}
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'
export interface ApprovalStep {
  level: number
  approver: Employee
  decision: 'approved' | 'rejected' | null
  comment: string | null
  decided_at: string | null
}
export interface ApprovalRequest {
  id: number
  doc_type: string
  doc_type_name: string
  title: string
  description: string | null
  ref_no: string | null
  amount: number | null
  start_date: string | null
  end_date: string | null
  status: ApprovalStatus
  current_level: number | null
  requester: Employee
  steps: ApprovalStep[]
  can_approve: boolean
  can_cancel: boolean
  created_at: string
  updated_at: string
}
export interface ApprovalPage {
  items: ApprovalRequest[]
  next_cursor: string | null
}
export interface ApprovalCreate {
  doc_type: string
  title: string
  description?: string | null
  ref_no?: string | null
  amount?: number | null
  start_date?: string | null
  end_date?: string | null
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
      else if (Array.isArray(body?.detail) && typeof body.detail[0]?.msg === 'string') detail = body.detail[0].msg
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

const json = (method: string, body?: unknown): RequestInit =>
  body === undefined
    ? { method }
    : { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }

function qs(p: Record<string, string | number | undefined>): string {
  const u = new URLSearchParams()
  for (const [k, v] of Object.entries(p)) if (v !== undefined && v !== '') u.set(k, String(v))
  const s = u.toString()
  return s ? `?${s}` : ''
}

export const fetchEmployees = () => request<Employee[]>('/api/employees')

export const listTasks = (p: { scope: 'assigned_to_me' | 'assigned_by_me'; status?: TaskStatus; cursor?: string; limit?: number }) =>
  request<TaskPage>(`/api/tasks${qs(p)}`)
export const createTask = (b: TaskCreate) => request<Task>('/api/tasks', json('POST', b))
export const updateTask = (id: number, patch: TaskUpdate) => request<Task>(`/api/tasks/${id}`, json('PATCH', patch))
export const deleteTask = (id: number) => request<void>(`/api/tasks/${id}`, json('DELETE'))

export const fetchApprovalTypes = () => request<ApprovalTypeList>('/api/approval-types')
export const updateApprovalFlow = (code: string, approverIds: string[]) =>
  request<ApprovalType>(`/api/approval-types/${encodeURIComponent(code)}/steps`, json('PUT', { approver_ids: approverIds }))

export const listApprovals = (p: { scope: 'to_approve' | 'submitted'; status?: ApprovalStatus; cursor?: string; limit?: number }) =>
  request<ApprovalPage>(`/api/approvals${qs(p)}`)
export const getApproval = (id: number) => request<ApprovalRequest>(`/api/approvals/${id}`)
export const createApproval = (b: ApprovalCreate) => request<ApprovalRequest>('/api/approvals', json('POST', b))
export const approveApproval = (id: number, comment?: string) =>
  request<ApprovalRequest>(`/api/approvals/${id}/approve`, json('POST', comment ? { comment } : {}))
export const rejectApproval = (id: number, comment: string) =>
  request<ApprovalRequest>(`/api/approvals/${id}/reject`, json('POST', { comment }))
export const cancelApproval = (id: number) => request<ApprovalRequest>(`/api/approvals/${id}/cancel`, json('POST'))

export const checkIn = () => request<Attendance>('/api/attendance/check-in', { method: 'POST' })

export async function login(username: string, password: string, remember = false): Promise<void> {
  const r = await request<{ access_token: string }>('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  setToken(r.access_token, remember)
}

export async function logout(): Promise<void> {
  try {
    await request<void>('/api/auth/logout', { method: 'POST' })
  } catch {
    // bỏ qua mọi lỗi: luôn đăng xuất phía client
  }
  clearToken()
}
