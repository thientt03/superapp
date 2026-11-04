import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setToken } from '../auth'
import ApprovalTreeView from '../views/settings/ApprovalTreeView.vue'
import { calls, emp, mockFetch, res } from './helpers'

beforeEach(() => setToken('t'))
afterEach(() => {
  vi.unstubAllGlobals()
  sessionStorage.clear()
  document.body.innerHTML = ''
})

const EMPS = ['a', 'b', 'c', 'd', 'e', 'f'].map((i) => emp(i))
const type = (steps: string[] = []) => ({
  code: 'purchase', name: 'Mua hàng', has_amount: true, has_date_range: false,
  steps: steps.map((id, i) => ({ level: i + 1, approver: emp(id) })),
})
function setup(canEdit = true, steps: string[] = []) {
  return mockFetch((u, i) => {
    if (u.includes('/steps')) return res(200, type(JSON.parse(String(i.body)).approver_ids))
    if (u.includes('/api/employees')) return res(200, EMPS)
    return res(200, { can_edit: canEdit, items: [type(steps)] })
  })
}
const mountView = () => mount(ApprovalTreeView, { attachTo: document.body })
const q = <T extends Element>(s: string) => document.body.querySelector<T>(s)!
async function pickEmp(id: string) {
  const sel = q<HTMLSelectElement>('#tree-pick')
  sel.value = id
  sel.dispatchEvent(new Event('change'))
  await flushPromises()
  ;[...document.body.querySelectorAll('button')].find((b) => b.textContent === 'Thêm')!.click()
  await flushPromises()
}

describe('ApprovalTreeView', () => {
  it('PUT approver_ids đúng thứ tự (sau khi chuyển lên)', async () => {
    const fn = setup()
    const w = mountView()
    await flushPromises()
    q<HTMLButtonElement>('[aria-label^="Cấu Hình Luồng"]').click()
    await flushPromises()
    await pickEmp('a')
    await pickEmp('b')
    q<HTMLButtonElement>('[aria-label="Chuyển lên NV b"]').click()
    await flushPromises()
    q('form').dispatchEvent(new Event('submit'))
    await flushPromises()
    const [put] = calls(fn, 'PUT', '/api/approval-types/purchase/steps')
    expect(JSON.parse(String(put![1]!.body))).toEqual({ approver_ids: ['b', 'a'] })
    expect(w.text()).toContain('Cấp 1: NV b')
  })

  it('không thêm được người thứ 6', async () => {
    setup(true, ['a', 'b', 'c', 'd', 'e'])
    mountView()
    await flushPromises()
    q<HTMLButtonElement>('[aria-label^="Cấu Hình Luồng"]').click()
    await flushPromises()
    expect(q<HTMLSelectElement>('#tree-pick').disabled).toBe(true)
    expect(document.body.textContent).toContain('Tối đa 5 cấp duyệt')
  })

  it('can_edit=false thì không có nút cấu hình', async () => {
    setup(false, ['a'])
    const w = mountView()
    await flushPromises()
    expect(w.text()).toContain('Cấp 1: NV a')
    expect(w.text()).not.toContain('Cấu Hình Luồng')
  })

  it('chuỗi rỗng hiện Chưa cấu hình', async () => {
    setup(true, [])
    const w = mountView()
    await flushPromises()
    expect(w.text()).toContain('Chưa cấu hình')
  })
})
