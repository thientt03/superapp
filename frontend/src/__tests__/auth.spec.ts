import { afterEach, describe, expect, it, vi } from 'vitest'
import { authNotice, clearToken, setToken } from '../auth'
import { safeRedirect } from '../router'

const KEY = 'superapp_token'

afterEach(() => {
  clearToken()
  localStorage.clear()
  sessionStorage.clear()
})

describe('auth', () => {
  it('setToken remember chọn đúng storage', () => {
    setToken('a', true)
    expect(localStorage.getItem(KEY)).toBe('a')
    expect(sessionStorage.getItem(KEY)).toBeNull()
    setToken('b')
    expect(sessionStorage.getItem(KEY)).toBe('b')
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('clearToken xoá cả hai storage và đặt notice', () => {
    localStorage.setItem(KEY, 'a')
    sessionStorage.setItem(KEY, 'a')
    clearToken('x')
    expect(localStorage.getItem(KEY)).toBeNull()
    expect(sessionStorage.getItem(KEY)).toBeNull()
    expect(authNotice.value).toBe('x')
  })

  it('token ban đầu đọc từ localStorage', async () => {
    localStorage.setItem(KEY, 'zzz')
    vi.resetModules()
    const m = await import('../auth')
    expect(m.token.value).toBe('zzz')
  })
})

describe('safeRedirect', () => {
  it('giữ đường dẫn nội bộ', () => expect(safeRedirect('/tasks')).toBe('/tasks'))
  it.each(['//a', '/\\a', 'https://a', '/login', undefined, ['/x']])('chặn %s', (v) => {
    expect(safeRedirect(v)).toBe('/dashboard')
  })
})
