import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setToken } from '../auth'
import { toasts } from '../toast'
import TasksView from '../views/TasksView.vue'
import { calls, emp, mockFetch, res, task } from './helpers'

beforeEach(() => {
  setToken('t')
  toasts.value = []
})
afterEach(() => {
  vi.unstubAllGlobals()
  sessionStorage.clear()
  document.body.innerHTML = ''
})

const mountView = () => mount(TasksView, { attachTo: document.body })
const q = <T extends Element>(s: string) => document.body.querySelector<T>(s)!
async function setVal(sel: string, v: string) {
  const el = q<HTMLInputElement>(sel)
  el.value = v
  el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input'))
  await flushPromises()
}
const submit = async () => {
  q('form').dispatchEvent(new Event('submit'))
  await flushPromises()
}
const handler = (items: ReturnType<typeof task>[], onWrite?: (m: string) => unknown) => (u: string, i: RequestInit) => {
  if (i.method && i.method !== 'GET') return onWrite?.(i.method) ?? res(200, task())
  if (u.includes('/api/employees')) return res(200, [emp('u1'), emp('u2')])
  return res(200, { items, next_cursor: null })
}

describe('TasksView', () => {
  it('POST tạo gửi đúng body', async () => {
    const fn = mockFetch(handler([]))
    const w = mountView()
    await flushPromises()
    await w.findAll('button').find((b) => b.text().includes('Tạo Công Việc'))!.trigger('click')
    await flushPromises()
    await setVal('#t-title', '  Việc mới ')
    await setVal('#t-assignee', 'u2')
    await setVal('#t-due', '2026-12-01')
    await submit()
    const [post] = calls(fn, 'POST', '/api/tasks')
    expect(JSON.parse(String(post![1]!.body))).toEqual({ title: 'Việc mới', assignee_id: 'u2', priority: 'medium', due_date: '2026-12-01' })
    w.unmount()
  })

  it('tạo với tiêu đề rỗng thì không gọi API', async () => {
    const fn = mockFetch(handler([]))
    const w = mountView()
    await flushPromises()
    await w.findAll('button').find((b) => b.text().includes('Tạo Công Việc'))!.trigger('click')
    await flushPromises()
    await submit()
    expect(calls(fn, 'POST', '/api/tasks')).toHaveLength(0)
    expect(document.body.textContent).toContain('Tiêu đề bắt buộc')
    w.unmount()
  })

  it('người không phải người giao chỉ PATCH được status', async () => {
    const fn = mockFetch(handler([task({ id: 9, can_edit: false })]))
    const w = mountView()
    await flushPromises()
    await w.find('[aria-label="Sửa Làm báo cáo"]').trigger('click')
    await flushPromises()
    expect(q<HTMLInputElement>('#t-title').disabled).toBe(true)
    await setVal('#t-status', 'done')
    await submit()
    const [patch] = calls(fn, 'PATCH', '/api/tasks/9')
    expect(JSON.parse(String(patch![1]!.body))).toEqual({ status: 'done' })
    expect(w.find('[aria-label="Xóa Làm báo cáo"]').exists()).toBe(false)
    w.unmount()
  })

  it('không đổi gì thì không gọi PATCH', async () => {
    const fn = mockFetch(handler([task()]))
    const w = mountView()
    await flushPromises()
    await w.find('[aria-label="Sửa Làm báo cáo"]').trigger('click')
    await flushPromises()
    await submit()
    expect(calls(fn, 'PATCH', '/api/tasks')).toHaveLength(0)
    w.unmount()
  })

  it('DELETE trả 403 thì toast detail', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    mockFetch(handler([task()], () => res(403, { detail: 'Chỉ người giao được xóa' })))
    const w = mountView()
    await flushPromises()
    await w.find('[aria-label="Xóa Làm báo cáo"]').trigger('click')
    await flushPromises()
    expect(toasts.value.map((t) => t.msg)).toContain('Chỉ người giao được xóa')
    w.unmount()
  })

  it('đổi tab gọi lại với scope assigned_by_me', async () => {
    const fn = mockFetch(handler([]))
    const w = mountView()
    await flushPromises()
    await w.findAll('[role="tab"]')[1]!.trigger('click')
    await flushPromises()
    expect(String(calls(fn, 'GET', '/api/tasks').at(-1)![0])).toContain('scope=assigned_by_me')
    w.unmount()
  })
})
