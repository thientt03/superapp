import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearToken, setToken, token, authNotice } from '../auth'
import AiChatModal from '../components/AiChatModal.vue'
import Sidebar from '../layout/Sidebar.vue'
import Topbar from '../layout/Topbar.vue'
import { attendance } from '../session'
import { toasts } from '../toast'
import { calls, dash, mockFetch, res, testRouter } from './helpers'

beforeEach(() => {
  setToken('t')
  attendance.value = { shift_start: '08:30', checked_in_at: null }
  toasts.value = []
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
  sessionStorage.clear()
})

const mountTop = async () => mount(Topbar, { global: { plugins: [await testRouter()] } })
const btn = (w: Awaited<ReturnType<typeof mountTop>>, t: string) => w.findAll('button').find((b) => b.text().includes(t))

describe('Topbar', () => {
  it('Chấm vào gửi POST, sau đó nút disable và hiện Đã chấm vào', async () => {
    let done = false
    const fn = mockFetch((_u, i) => {
      if (i.method === 'POST') {
        done = true
        return res(200, { shift_start: '08:30', checked_in_at: '14:47' })
      }
      return res(200, dash({ attendance: { shift_start: '08:30', checked_in_at: done ? '14:47' : null } }))
    })
    const w = await mountTop()
    await btn(w, 'Chấm vào')!.trigger('click')
    await flushPromises()
    expect(calls(fn, 'POST', '/api/attendance/check-in')).toHaveLength(1)
    const b = btn(w, 'Đã chấm vào')!
    expect(b.attributes('disabled')).toBeDefined()
    expect(toasts.value.map((t) => t.msg)).toContain('Chấm công thành công lúc 14:47')
  })

  it('POST 409 thì toast detail', async () => {
    mockFetch((_u, i) => (i.method === 'POST' ? res(409, { detail: 'Bạn đã chấm vào hôm nay' }) : res(200, dash())))
    const w = await mountTop()
    await btn(w, 'Chấm vào')!.trigger('click')
    await flushPromises()
    expect(toasts.value.map((t) => t.msg)).toContain('Bạn đã chấm vào hôm nay')
  })

  it('lỗi mạng thì toast không kết nối được', async () => {
    mockFetch(() => {
      throw new Error('net')
    })
    const w = await mountTop()
    await btn(w, 'Chấm vào')!.trigger('click')
    await flushPromises()
    expect(toasts.value.map((t) => t.msg)).toContain('Không thể kết nối máy chủ')
  })

  it('gửi 2 tin liền nhau thì sau 600ms có 3 tin bot', async () => {
    const w = await mountTop()
    vi.useFakeTimers()
    const modal = w.findComponent(AiChatModal)
    modal.vm.$emit('send', 'a')
    modal.vm.$emit('send', 'b')
    await vi.advanceTimersByTimeAsync(600)
    expect(modal.props('messages').filter((m) => m.from === 'bot')).toHaveLength(3)
  })

  it('Đăng xuất gọi POST logout và xoá token kể cả khi request lỗi', async () => {
    const fn = mockFetch((_u, i) => {
      if (i.method === 'POST') throw new Error('net')
      return res(200, dash())
    })
    const w = mount(Sidebar, { props: { open: false }, global: { plugins: [await testRouter()] } })
    await w.find('[aria-label="Đăng xuất"]').trigger('click')
    await flushPromises()
    expect(calls(fn, 'POST', '/api/auth/logout')).toHaveLength(1)
    expect(token.value).toBeNull()
    expect(authNotice.value).toBe('')
    clearToken()
  })
})
