import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setToken } from '../auth'
import DashboardView from '../views/DashboardView.vue'
import { approval, calls, dash, mockFetch, res, testRouter } from './helpers'

beforeEach(() => setToken('t'))
afterEach(() => {
  vi.unstubAllGlobals()
  sessionStorage.clear()
})

const mountView = async () => mount(DashboardView, { global: { plugins: [await testRouter()] } })

describe('DashboardView', () => {
  it('badge Xem tất cả lấy từ pending_approval_count; bảng gọi scope=to_approve không có status', async () => {
    const fn = mockFetch((u) =>
      u.includes('/api/dashboard') ? res(200, dash({ pending_approval_count: 7 })) : res(200, { items: [approval()], next_cursor: null }),
    )
    const w = await mountView()
    await flushPromises()
    expect(w.text()).toContain('Xem tất cả (7)')
    expect(w.text()).toContain('PO-1')
    const url = new URL(String(calls(fn, 'GET', '/api/approvals')[0]![0]))
    expect(url.searchParams.get('scope')).toBe('to_approve')
    expect(url.searchParams.get('limit')).toBe('5')
    expect(url.searchParams.has('status')).toBe(false)
  })

  it('lỗi tải hiện Thử lại', async () => {
    mockFetch(() => res(500, { detail: 'x' }))
    const w = await mountView()
    await flushPromises()
    expect(w.text()).toContain('Không tải được dữ liệu')
    expect(w.findAll('button').some((b) => b.text() === 'Thử lại')).toBe(true)
  })

  it('KPI tính từ repo: doanh thu = Σ đơn bán, nhân sự, tồn kho', async () => {
    mockFetch((u) => (u.includes('/api/dashboard') ? res(200, dash()) : res(200, { items: [], next_cursor: null })))
    const w = mountView()
    await flushPromises()
    const text = (await w).text()
    expect(text).toContain('650.000.000 ₫') // 1 đơn bán seed
    expect(text).toContain('1 Đơn')
    expect(text).toContain('4 Nhân viên')
    expect(text).toContain('1 mặt hàng dưới định mức')
  })
})
