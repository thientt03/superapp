import { vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { ApprovalRequest, Dashboard, Employee, Task } from '../api'

export const res = (status: number, body: unknown) => ({ ok: status < 400, status, statusText: '', json: async () => body })

export function mockFetch(handler: (url: string, init: RequestInit) => unknown) {
  const fn = vi.fn(async (url: string, init: RequestInit = {}) => handler(url, init))
  vi.stubGlobal('fetch', fn)
  return fn
}
export const calls = (fn: ReturnType<typeof mockFetch>, method: string, part: string) =>
  fn.mock.calls.filter(([u, i]) => (i?.method ?? 'GET') === method && String(u).includes(part))

export async function testRouter(start = '/') {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)*', component: { render: () => null } }] })
  await router.push(start)
  return router
}

export const emp = (id: string, full_name = `NV ${id}`): Employee => ({ id, full_name, avatar_url: null })

export const dash = (over: Partial<Dashboard> = {}): Dashboard => ({
  user: emp('u1', 'Nguyễn Văn A'),
  attendance: { shift_start: '08:30', checked_in_at: null },
  events_today: [],
  pinned_apps: [],
  notifications: { unread_count: 3 },
  my_task: null,
  pending_approval_count: 3,
  ...over,
})

export const approval = (over: Partial<ApprovalRequest> = {}): ApprovalRequest => ({
  id: 1,
  doc_type: 'purchase',
  doc_type_name: 'Mua vật tư',
  title: 'Mua thép',
  description: null,
  ref_no: 'PO-1',
  amount: 45_000_000,
  start_date: null,
  end_date: null,
  status: 'pending',
  current_level: 1,
  requester: emp('u2', 'Lê Thị Mai'),
  steps: [{ level: 1, approver: emp('u1'), decision: null, comment: null, decided_at: null }],
  can_approve: true,
  can_cancel: false,
  created_at: '2026-11-01T09:30:00',
  updated_at: '2026-11-01T09:30:00',
  ...over,
})

export const task = (over: Partial<Task> = {}): Task => ({
  id: 1,
  title: 'Làm báo cáo',
  description: null,
  status: 'todo',
  priority: 'medium',
  due_date: null,
  is_overdue: false,
  can_edit: true,
  assigner: emp('u1', 'Nguyễn Văn A'),
  assignee: emp('u2', 'Lê Thị Mai'),
  created_at: '2026-11-01T09:30:00',
  updated_at: '2026-11-01T09:30:00',
  ...over,
})
