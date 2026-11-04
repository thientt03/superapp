import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import CrudPage, { type CrudConfig } from '../components/CrudPage.vue'
import { createMemoryRepo, type Entity } from '../data/repository'
import { testRouter } from './helpers'

interface C extends Entity { name: string; qty: number }
const config = (): CrudConfig<C> => ({
  title: 'Khách hàng', entityLabel: 'khách hàng', createLabel: 'Thêm khách hàng',
  repo: createMemoryRepo<C>([{ id: '1', code: 'KH-0001', name: 'Nguyễn An', qty: 1 }], { codePrefix: 'KH', searchFields: ['name'] }),
  columns: [{ key: 'name', label: 'Tên' }, { key: 'qty', label: 'SL' }],
  fields: [{ key: 'name', label: 'Tên', type: 'text', required: true }, { key: 'qty', label: 'SL', type: 'number', min: 1 }],
})
const mountPage = async (start = '/') => {
  const w = mount(CrudPage<C>, { props: { config: config() }, attachTo: document.body, global: { plugins: [await testRouter(start)] } })
  await flushPromises()
  return w
}
const q = <T extends Element>(s: string) => document.body.querySelector<T>(s)!
async function setVal(sel: string, v: string) {
  const el = q<HTMLInputElement>(sel)
  el.value = v
  el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input'))
}
const submit = async () => {
  q('form').dispatchEvent(new Event('submit'))
  await flushPromises()
}
afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('CrudPage', () => {
  it('thêm, sửa, xoá', async () => {
    const w = await mountPage()
    await w.findAll('button').find((b) => b.text().includes('Thêm khách hàng'))!.trigger('click')
    await setVal('#f-name', 'Trần Bình')
    await setVal('#f-qty', '5')
    await submit()
    expect(w.text()).toContain('KH-0002')
    expect(w.get('[data-testid="count"]').text()).toBe('2')

    await w.get('[aria-label="Sửa KH-0002"]').trigger('click')
    await setVal('#f-name', 'Trần Cường')
    await submit()
    expect(w.text()).toContain('Trần Cường')

    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await w.get('[aria-label="Xóa KH-0002"]').trigger('click')
    await flushPromises()
    expect(w.text()).not.toContain('Trần Cường')
    w.unmount()
  })

  it('validate required và min, lỗi hiện dưới trường', async () => {
    const w = await mountPage()
    await w.findAll('button').find((b) => b.text().includes('Thêm khách hàng'))!.trigger('click')
    await setVal('#f-qty', '0')
    await submit()
    expect(document.body.textContent).toContain('Tên là bắt buộc')
    expect(document.body.textContent).toContain('SL phải ≥ 1')
    expect(w.get('[data-testid="count"]').text()).toBe('1')
    w.unmount()
  })

  it('tìm kiếm debounce 200ms, bỏ dấu; rỗng hiện Không có dữ liệu', async () => {
    const w = await mountPage()
    vi.useFakeTimers()
    await w.get('#crud-search').setValue('zzz')
    await vi.advanceTimersByTimeAsync(199)
    expect(w.text()).toContain('Nguyễn An')
    await vi.advanceTimersByTimeAsync(1)
    expect(w.text()).toContain('Không có dữ liệu')
    await w.get('#crud-search').setValue('nguyen')
    await vi.advanceTimersByTimeAsync(200)
    expect(w.text()).toContain('Nguyễn An')
    w.unmount()
  })

  it('?new=1 mở modal tạo', async () => {
    const w = await mountPage('/x?new=1')
    expect(document.body.textContent).toContain('Thêm khách hàng')
    expect(q('[role="dialog"]')).toBeTruthy()
    w.unmount()
  })

  it('select options dạng hàm: đổi field khác làm giá trị hết hợp lệ thì xoá trắng', async () => {
    interface P extends Entity { grp: string; item: string }
    const cfg: CrudConfig<P> = {
      title: 'P', entityLabel: 'p', createLabel: 'Thêm p',
      repo: createMemoryRepo<P>([], { codePrefix: 'P', searchFields: ['grp'] }),
      columns: [{ key: 'grp', label: 'Nhóm' }],
      fields: [
        { key: 'grp', label: 'Nhóm', type: 'select', options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }] },
        { key: 'item', label: 'Mục', type: 'select', options: (f) => (f.grp ? [{ value: `${f.grp}1`, label: 'm' }] : []) },
      ],
    }
    const w = mount(CrudPage<P>, { props: { config: cfg }, attachTo: document.body, global: { plugins: [await testRouter()] } })
    await flushPromises()
    await w.findAll('button').find((b) => b.text().includes('Thêm p'))!.trigger('click')
    await setVal('#f-grp', 'a')
    await flushPromises()
    await setVal('#f-item', 'a1')
    await flushPromises()
    expect(q<HTMLSelectElement>('#f-item').value).toBe('a1')
    await setVal('#f-grp', 'b')
    await flushPromises()
    expect(q<HTMLSelectElement>('#f-item').value).toBe('')
    w.unmount()
  })

  it('checks: tick 2 ô lưu "A,B"; bỏ trống field bắt buộc thì báo lỗi, không lưu', async () => {
    interface K extends Entity { tags: string }
    const cfg: CrudConfig<K> = {
      title: 'K', entityLabel: 'k', createLabel: 'Thêm k',
      repo: createMemoryRepo<K>([], { codePrefix: 'K', searchFields: ['tags'] }),
      columns: [{ key: 'tags', label: 'Tags' }],
      fields: [{ key: 'tags', label: 'Tags', type: 'checks', required: true, options: [{ value: 'A', label: 'Aa' }, { value: 'B', label: 'Bb' }, { value: 'C', label: 'Cc' }] }],
    }
    const w = mount(CrudPage<K>, { props: { config: cfg }, attachTo: document.body, global: { plugins: [await testRouter()] } })
    await flushPromises()
    await w.findAll('button').find((b) => b.text().includes('Thêm k'))!.trigger('click')
    await submit()
    expect(document.body.querySelector('#f-tags')).toBeNull()
    expect(document.body.textContent).toContain('Tags là bắt buộc')
    expect(w.get('[data-testid="count"]').text()).toBe('0')
    for (const v of ['B', 'A']) {
      const box = q<HTMLInputElement>(`input[name="f-tags"][value="${v}"]`)
      box.checked = true
      box.dispatchEvent(new Event('change'))
    }
    await submit()
    expect(w.text()).toContain('A,B')
    w.unmount()
  })
})
