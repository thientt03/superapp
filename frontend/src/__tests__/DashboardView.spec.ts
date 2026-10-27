import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { authNotice, setToken, token } from '../auth'
import App from '../App.vue'
import DashboardView from '../views/DashboardView.vue'
import AiChatModal from '../components/AiChatModal.vue'

const IDS = ['cong-viec', 'de-xuat', 'tuyen-dung', 'hanh-chinh', 'cham-cong', 'ho-so', 'tinh-luong', 'bao-cao', 'kho', 'cai-dat']
const dash = (over: object = {}) => ({
  user: { id: 'u1', full_name: 'Nguyễn Văn A', avatar_url: null },
  attendance: { shift_start: '08:30', checked_in_at: null },
  events_today: [{ id: 'e2', title: 'Họp giao ban tuần', start_time: '15:30', end_time: '16:30', location: 'Phòng A1' }],
  pinned_apps: IDS.map((id) => ({ id, name: id })),
  notifications: { unread_count: 3 },
  ...over,
})
const res = (status: number, body: unknown) => ({ ok: status < 400, status, statusText: '', json: async () => body })

function mockFetch(routes: { get?: () => unknown; post?: () => unknown }) {
  const fn = vi.fn(async (_url: string, init?: RequestInit) =>
    init?.method === 'POST' ? routes.post!() : routes.get!(),
  )
  vi.stubGlobal('fetch', fn)
  return fn
}
const btn = (w: ReturnType<typeof mount>, text: string) => w.findAll('button').find((b) => b.text().includes(text))

beforeEach(() => setToken('t'))
afterEach(() => {
  vi.unstubAllGlobals()
  sessionStorage.clear()
})

describe('DashboardView', () => {
  it('render tên và 10 app cộng ô Thêm mới', async () => {
    mockFetch({ get: () => res(200, dash()) })
    const w = mount(DashboardView)
    await flushPromises()
    expect(w.text()).toContain('Nguyễn Văn A')
    expect(w.findAll('.grid-cols-4 > button')).toHaveLength(11)
    expect(w.text()).toContain('Thêm mới')
  })

  it('bấm Chấm vào gọi POST và chuyển thành Đã chấm vào', async () => {
    const fn = mockFetch({
      get: () => res(200, dash()),
      post: () => res(200, { shift_start: '08:30', checked_in_at: '14:47' }),
    })
    const w = mount(DashboardView)
    await flushPromises()
    await btn(w, 'Chấm vào')!.trigger('click')
    await flushPromises()
    expect(fn.mock.calls.some(([, i]) => i?.method === 'POST')).toBe(true)
    const done = btn(w, 'Đã chấm vào')!
    expect(done.attributes('disabled')).toBeDefined()
    expect(w.text()).toContain('Chấm công thành công lúc 14:47')
  })

  it('POST 409 hiện toast detail', async () => {
    mockFetch({
      get: () => res(200, dash()),
      post: () => res(409, { detail: 'Bạn đã chấm vào hôm nay' }),
    })
    const w = mount(DashboardView)
    await flushPromises()
    await btn(w, 'Chấm vào')!.trigger('click')
    await flushPromises()
    expect(w.text()).toContain('Bạn đã chấm vào hôm nay')
  })

  it('events_today rỗng hiện Không có sự kiện', async () => {
    mockFetch({ get: () => res(200, dash({ events_today: [] })) })
    const w = mount(DashboardView)
    await flushPromises()
    expect(w.text()).toContain('Không có sự kiện')
    expect(btn(w, 'Chi tiết')).toBeUndefined()
  })

  it('GET lỗi hiện Thử lại', async () => {
    mockFetch({ get: () => res(500, { detail: 'x' }) })
    const w = mount(DashboardView)
    await flushPromises()
    expect(w.text()).toContain('Không tải được dữ liệu')
    expect(btn(w, 'Thử lại')).toBeDefined()
  })

  it('gửi header Authorization Bearer', async () => {
    const fn = mockFetch({ get: () => res(200, dash()) })
    mount(DashboardView)
    await flushPromises()
    const init = (fn.mock.calls[0] as unknown as [string, RequestInit])[1]
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer t')
  })

  it('GET 401 xoá token, đặt thông báo, không hiện Thử lại', async () => {
    mockFetch({ get: () => res(401, { detail: 'x' }) })
    const w = mount(App)
    await flushPromises()
    expect(token.value).toBeNull()
    expect(authNotice.value).toBe('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại')
    expect(btn(w, 'Thử lại')).toBeUndefined()
  })

  it('Đăng xuất gọi POST logout và xoá token kể cả khi reject', async () => {
    const fn = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === 'POST') throw new Error('net')
      return res(200, dash())
    })
    vi.stubGlobal('fetch', fn)
    const w = mount(DashboardView)
    await flushPromises()
    await w.find('[aria-label="Đăng xuất"]').trigger('click')
    await flushPromises()
    expect(fn.mock.calls.some(([u, i]) => u.endsWith('/api/auth/logout') && i?.method === 'POST')).toBe(true)
    expect(token.value).toBeNull()
    expect(authNotice.value).toBe('')
  })

  it('gửi 2 tin liền nhau thì sau 600ms có 2 tin bot', async () => {
    mockFetch({ get: () => res(200, dash()) })
    const w = mount(DashboardView)
    await flushPromises()
    vi.useFakeTimers()
    try {
      const modal = w.findComponent(AiChatModal)
      modal.vm.$emit('send', 'a')
      modal.vm.$emit('send', 'b')
      await vi.advanceTimersByTimeAsync(600)
      expect(modal.props('messages').filter((m) => m.from === 'bot')).toHaveLength(3)
    } finally {
      vi.useRealTimers()
    }
  })
})
