import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { orderRepo, quotationRepo } from '../data'
import { getSalesReport } from '../data/stats'
import SalesPricelistsView from '../views/sales/SalesPricelistsView.vue'
import SalesQuotationsView from '../views/sales/SalesQuotationsView.vue'
import SalesOrdersView from '../views/sales/SalesOrdersView.vue'
import { testRouter } from './helpers'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Sales', () => {
  it('getSalesReport cộng đúng tổng sau khi tạo một đơn', async () => {
    const before = await getSalesReport()
    expect(before.totalRevenue).toBe(650_000_000)
    await orderRepo.create({ customer: 'KH mới', ordered: '2026-11-03', total: 100_000_000, payment: 'paid', delivery: 'delivered' })
    const after = await getSalesReport()
    expect(after.totalRevenue).toBe(750_000_000)
    expect(after.orderCount).toBe(before.orderCount + 1)
  })

  it('?new=1 ở /sales/orders mở modal tạo đơn', async () => {
    const w = mount(SalesOrdersView, { attachTo: document.body, global: { plugins: [await testRouter('/sales/orders?new=1')] } })
    await flushPromises()
    expect(document.body.querySelector('[role="dialog"]')).toBeTruthy()
    expect(document.body.textContent).toContain('Tạo Đơn Bán Hàng Mới')
    w.unmount()
  })

  it('Chuyển SO tạo đơn bán từ báo giá chờ chấp nhận và đánh dấu đã chấp nhận', async () => {
    const orders = (await orderRepo.list()).length
    const w = mount(SalesQuotationsView, { attachTo: document.body, global: { plugins: [await testRouter()] } })
    await flushPromises()
    const btns = () => w.findAll('button').filter((b) => b.text() === 'Chuyển SO')
    expect(btns()).toHaveLength(1)
    await btns()[0]!.trigger('click')
    await flushPromises()
    const after = await orderRepo.list()
    expect(after).toHaveLength(orders + 1)
    expect(after.at(-1)).toMatchObject({ customer: 'Tập Đoàn Xây Dựng Hòa Bình', total: 650_000_000, payment: 'unpaid' })
    expect((await quotationRepo.get('1')).status).toBe('accepted')
    expect(btns()).toHaveLength(0)
    w.unmount()
  })

  it('bảng giá dạng thẻ, thêm bảng giá mới', async () => {
    const w = mount(SalesPricelistsView, { attachTo: document.body })
    await flushPromises()
    expect(w.findAll('article')).toHaveLength(3)
    expect(w.text()).toContain('Chiết khấu 15% Toàn Danh Mục')
    await w.findAll('button').find((b) => b.text().includes('Thêm Bảng Giá'))!.trigger('click')
    const set = (id: string, v: string) => {
      const el = document.body.querySelector<HTMLInputElement>(id)!
      el.value = v
      el.dispatchEvent(new Event('input'))
    }
    set('#p-name', 'Bảng Giá Đại Lý')
    set('#p-policy', 'Chiết khấu 5%')
    document.body.querySelector('form')!.dispatchEvent(new Event('submit'))
    await flushPromises()
    expect(w.findAll('article')).toHaveLength(4)
    w.unmount()
  })
})
