import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App.vue'
import { authNotice, clearToken, setToken, token } from '../auth'
import { router } from '../router'
import { dash, mockFetch, res } from './helpers'

beforeEach(() => clearToken())
afterEach(() => {
  vi.unstubAllGlobals()
  sessionStorage.clear()
})

async function mountApp() {
  router.push('/dashboard')
  await router.isReady()
  const w = mount(App, { global: { plugins: [router] } })
  await flushPromises()
  return w
}

describe('App', () => {
  it('không token thì hiện login', async () => {
    const w = await mountApp()
    expect(w.find('#username').exists()).toBe(true)
    expect(w.find('aside').exists()).toBe(false)
  })

  it('có token thì sidebar đủ mục cấp 1 và 46 mục con', async () => {
    setToken('t')
    mockFetch((u) => (u.includes('/api/dashboard') ? res(200, dash()) : res(200, { items: [], next_cursor: null })))
    const w = await mountApp()
    const nav = w.find('nav')
    expect(nav.findAll('button[aria-expanded]')).toHaveLength(7)
    const top = nav.findAll(':scope > a')
    expect(top.map((a) => a.text())).toEqual(expect.arrayContaining(['Tổng Quan', 'Công Việc', 'Phê Duyệt3', 'Báo Cáo & Thống Kê']))
    expect(top).toHaveLength(4)
    expect(nav.findAll('div.pl-8 a')).toHaveLength(46)
    expect(w.find('aside').text()).toContain('Nguyễn Văn A')
  })

  it('GET /api/dashboard 401 xoá token và đặt authNotice', async () => {
    setToken('t')
    mockFetch(() => res(401, { detail: 'x' }))
    await mountApp()
    expect(token.value).toBeNull()
    expect(authNotice.value).toBe('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại')
  })
})
