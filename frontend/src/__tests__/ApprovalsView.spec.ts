import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setToken } from '../auth'
import { toasts } from '../toast'
import ApprovalsView from '../views/approvals/ApprovalsView.vue'
import { approval, calls, dash, mockFetch, res, testRouter } from './helpers'

beforeEach(() => {
  setToken('t')
  toasts.value = []
})
afterEach(() => {
  vi.unstubAllGlobals()
  sessionStorage.clear()
})

const mountView = async (start = '/approvals') => mount(ApprovalsView, { attachTo: document.body, global: { plugins: [await testRouter(start)] } })
const btn = (w: Awaited<ReturnType<typeof mountView>>, t: string) => w.findAll('button').find((b) => b.text() === t)
const page = (...items: ReturnType<typeof approval>[]) => res(200, { items, next_cursor: null })

describe('ApprovalsView', () => {
  it('tab to_approve không gửi status, tab submitted có status khi chọn chip', async () => {
    const fn = mockFetch((u) => (u.includes('/api/dashboard') ? res(200, dash()) : page(approval())))
    const w = await mountView()
    await flushPromises()
    expect(new URL(String(fn.mock.calls[0]![0])).searchParams.has('status')).toBe(false)
    await btn(w, 'Tôi đã gửi')!.trigger('click')
    await btn(w, 'Chờ duyệt')!.trigger('click')
    await flushPromises()
    const last = new URL(String(calls(fn, 'GET', '/api/approvals').at(-1)![0]))
    expect(last.searchParams.get('scope')).toBe('submitted')
    expect(last.searchParams.get('status')).toBe('pending')
    w.unmount()
  })

  it('Từ chối với lý do rỗng thì không gọi fetch', async () => {
    const fn = mockFetch(() => page(approval()))
    const w = await mountView()
    await flushPromises()
    const before = fn.mock.calls.length
    await btn(w, 'Từ chối')!.trigger('click')
    await document.body.querySelector('form')!.dispatchEvent(new Event('submit'))
    await flushPromises()
    expect(fn.mock.calls.length).toBe(before)
    expect(document.body.textContent).toContain('Vui lòng nhập lý do từ chối')
    w.unmount()
  })

  it('approve gửi POST đúng URL', async () => {
    const fn = mockFetch((u, i) => {
      if (i.method === 'POST') return res(200, approval({ status: 'approved' }))
      return u.includes('/api/dashboard') ? res(200, dash()) : page(approval({ id: 5 }))
    })
    const w = await mountView()
    await flushPromises()
    await btn(w, 'Duyệt')!.trigger('click')
    document.body.querySelector('form')!.dispatchEvent(new Event('submit'))
    await flushPromises()
    const [post] = calls(fn, 'POST', '/api/approvals/5/approve')
    expect(post).toBeTruthy()
    w.unmount()
  })

  it('409 thì toast detail', async () => {
    mockFetch((u, i) => {
      if (i.method === 'POST') return res(409, { detail: 'Phiếu đã được xử lý' })
      return u.includes('/api/dashboard') ? res(200, dash()) : page(approval())
    })
    const w = await mountView()
    await flushPromises()
    await btn(w, 'Duyệt')!.trigger('click')
    document.body.querySelector('form')!.dispatchEvent(new Event('submit'))
    await flushPromises()
    expect(toasts.value.map((t) => t.msg)).toContain('Phiếu đã được xử lý')
    w.unmount()
  })

  it('?new=1 mở modal tạo; loại chưa có luồng bị chặn', async () => {
    mockFetch((u) => {
      if (u.includes('/api/approval-types'))
        return res(200, { can_edit: false, items: [{ code: 'x', name: 'Loại X', has_amount: false, has_date_range: false, steps: [] }] })
      return page()
    })
    const w = await mountView('/approvals?new=1')
    await flushPromises()
    expect(document.body.textContent).toContain('Tạo Đề Xuất Mới')
    const sel = document.body.querySelector<HTMLSelectElement>('#ap-type')!
    sel.value = 'x'
    sel.dispatchEvent(new Event('change'))
    await flushPromises()
    expect(document.body.textContent).toContain('Loại chứng từ chưa được cấu hình quy trình phê duyệt')
    w.unmount()
  })
})
