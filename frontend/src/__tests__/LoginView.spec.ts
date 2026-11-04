import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { authNotice, clearToken, token } from '../auth'
import LoginView from '../views/LoginView.vue'
import { testRouter } from './helpers'

const res = (status: number, body: unknown) => ({ ok: status < 400, status, statusText: '', json: async () => body })

async function submit(u: string, p: string, opts: { start?: string; remember?: boolean } = {}) {
  const router = await testRouter(opts.start ?? '/login')
  const w = mount(LoginView, { global: { plugins: [router] } })
  await w.find('#username').setValue(u)
  await w.find('#password').setValue(p)
  if (opts.remember) await w.find('#remember').setValue(true)
  await w.find('form').trigger('submit')
  await flushPromises()
  return Object.assign(w, { router })
}

beforeEach(() => clearToken())
afterEach(() => {
  vi.unstubAllGlobals()
  sessionStorage.clear()
  localStorage.clear()
})

describe('LoginView', () => {
  it('ô rỗng không gọi fetch và hiện lỗi', async () => {
    const fn = vi.fn()
    vi.stubGlobal('fetch', fn)
    const w = await submit('  ', '')
    expect(fn).not.toHaveBeenCalled()
    expect(w.text()).toContain('Vui lòng nhập tên đăng nhập và mật khẩu')
  })

  it('200 lưu token, gửi username đã trim', async () => {
    const fn = vi.fn(async () => res(200, { access_token: 'abc', token_type: 'bearer' }))
    vi.stubGlobal('fetch', fn)
    await submit('  demo ', 'demo123')
    expect(token.value).toBe('abc')
    expect(sessionStorage.getItem('superapp_token')).toBe('abc')
    const init = (fn.mock.calls[0] as unknown as [string, RequestInit])[1]
    expect(JSON.parse(init.body as string)).toEqual({ username: 'demo', password: 'demo123' })
  })

  it('401 hiện detail và xoá ô mật khẩu', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => res(401, { detail: 'Sai tên đăng nhập hoặc mật khẩu' })))
    const w = await submit('demo', 'x')
    expect(w.text()).toContain('Sai tên đăng nhập hoặc mật khẩu')
    expect((w.find('#password').element as HTMLInputElement).value).toBe('')
    expect((w.find('#username').element as HTMLInputElement).value).toBe('demo')
    expect(authNotice.value).toBe('')
  })

  it('429 hiện detail, giữ username và mật khẩu, nút không disabled', async () => {
    const detail = 'Thử đăng nhập quá nhiều lần, vui lòng thử lại sau'
    vi.stubGlobal('fetch', vi.fn(async () => res(429, { detail })))
    const w = await submit('demo', 'x')
    expect(w.text()).toContain(detail)
    expect(w.text()).not.toContain('Không thể kết nối máy chủ')
    expect((w.find('#username').element as HTMLInputElement).value).toBe('demo')
    expect((w.find('#password').element as HTMLInputElement).value).toBe('x')
    expect(w.find('button[type="submit"]').attributes('disabled')).toBeUndefined()
    expect(token.value).toBeNull()
  })

  it('fetch reject hiện lỗi kết nối', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('net'))))
    const w = await submit('demo', 'x')
    expect(w.text()).toContain('Không thể kết nối máy chủ')
  })

  it('tick ghi nhớ thì token nằm trong localStorage', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => res(200, { access_token: 'abc', token_type: 'bearer' })))
    await submit('demo', 'demo123', { remember: true })
    expect(localStorage.getItem('superapp_token')).toBe('abc')
    expect(sessionStorage.getItem('superapp_token')).toBeNull()
  })

  it('200 với redirect=/tasks thì điều hướng tới /tasks', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => res(200, { access_token: 'abc', token_type: 'bearer' })))
    const w = await submit('demo', 'x', { start: '/login?redirect=/tasks' })
    expect(w.router.currentRoute.value.fullPath).toBe('/tasks')
  })

  it.each(['//evil.com', 'https://evil.com'])('redirect=%s về /dashboard', async (r) => {
    vi.stubGlobal('fetch', vi.fn(async () => res(200, { access_token: 'abc', token_type: 'bearer' })))
    const w = await submit('demo', 'x', { start: `/login?redirect=${encodeURIComponent(r)}` })
    expect(w.router.currentRoute.value.fullPath).toBe('/dashboard')
  })

  it('422 hiện detail, không hiện lỗi kết nối', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => res(422, { detail: 'Dữ liệu không hợp lệ' })))
    const w = await submit('demo', 'x')
    expect(w.text()).toContain('Dữ liệu không hợp lệ')
    expect(w.text()).not.toContain('Không thể kết nối máy chủ')
  })

  it('maxlength của hai ô', async () => {
    const w = mount(LoginView, { global: { plugins: [await testRouter('/login')] } })
    expect(w.find('#username').attributes('maxlength')).toBe('64')
    expect(w.find('#password').attributes('maxlength')).toBe('256')
  })

  it('hiện authNotice', async () => {
    authNotice.value = 'Phiên hết hạn'
    const w = mount(LoginView, { global: { plugins: [await testRouter('/login')] } })
    expect(w.find('[role="alert"]').text()).toContain('Phiên hết hạn')
  })

  it('nút hiện/ẩn mật khẩu', async () => {
    const w = mount(LoginView, { global: { plugins: [await testRouter('/login')] } })
    const btn = () => w.find('button[aria-controls="password"]')
    expect(w.find('#password').attributes('type')).toBe('password')
    expect(btn().attributes('aria-label')).toBe('Hiện mật khẩu')
    await btn().trigger('click')
    expect(w.find('#password').attributes('type')).toBe('text')
    expect(btn().attributes('aria-label')).toBe('Ẩn mật khẩu')
  })

  it('Quên mật khẩu mở hộp thoại, không gọi fetch', async () => {
    const fn = vi.fn()
    vi.stubGlobal('fetch', fn)
    const w = mount(LoginView, { global: { plugins: [await testRouter('/login')] } })
    expect(w.find('[role="dialog"]').exists()).toBe(false)
    await w.findAll('button').find((b) => b.text() === 'Quên mật khẩu?')!.trigger('click')
    expect(w.find('[role="dialog"]').exists()).toBe(true)
    await w.findAll('button').find((b) => b.text() === 'Đã hiểu')!.trigger('click')
    expect(w.find('[role="dialog"]').exists()).toBe(false)
    expect(fn).not.toHaveBeenCalled()
  })
})
