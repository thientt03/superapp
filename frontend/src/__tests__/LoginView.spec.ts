import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { authNotice, clearToken, token } from '../auth'
import LoginView from '../views/LoginView.vue'

const res = (status: number, body: unknown) => ({ ok: status < 400, status, statusText: '', json: async () => body })

async function submit(u: string, p: string) {
  const w = mount(LoginView)
  await w.find('#username').setValue(u)
  await w.find('#password').setValue(p)
  await w.find('form').trigger('submit')
  await flushPromises()
  return w
}

beforeEach(() => clearToken())
afterEach(() => {
  vi.unstubAllGlobals()
  sessionStorage.clear()
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
})
