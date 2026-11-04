import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { itemRepo, poRepo, receiptRepo, reqRepo } from '../data'
import { getInventoryReport } from '../data/stats'
import InventoryItemsView from '../views/inventory/InventoryItemsView.vue'
import InventoryOverviewView from '../views/inventory/InventoryOverviewView.vue'
import PurchaseOrdersView from '../views/purchase/PurchaseOrdersView.vue'
import { testRouter } from './helpers'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Kho', () => {
  it('getInventoryReport tính đúng giá trị tồn và số mặt hàng dưới định mức', async () => {
    let r = await getInventoryReport()
    expect(r.totalValue).toBe(12 * 2_250_000 + 85 * 1_450_000)
    expect(r.belowMin).toBe(1)
    expect(r.lowItems.map((i) => i.code)).toEqual(['SKU-TH-5MM'])
    await itemRepo.create({ name: 'Ốc vít', warehouse: 'K1', qty: 5, min_qty: 5, unit: 'Hộp', cost: 100_000 })
    r = await getInventoryReport()
    expect(r.belowMin).toBe(1) // qty == min_qty chưa tính là dưới định mức
    expect(r.totalValue).toBe(150_250_000 + 500_000)
    const it2 = await itemRepo.create({ name: 'Đinh', warehouse: 'K1', qty: 4, min_qty: 5, unit: 'Hộp', cost: 100_000 })
    expect((await getInventoryReport()).belowMin).toBe(2)
    await itemRepo.remove(it2.id)
  })

  it('màn danh mục tô đỏ dòng qty < min_qty', async () => {
    const w = mount(InventoryItemsView, { attachTo: document.body, global: { plugins: [await testRouter()] } })
    await flushPromises()
    const rows = w.findAll('tbody tr')
    expect(rows.find((r) => r.text().includes('SKU-TH-5MM'))!.classes()).toContain('bg-rose-50')
    expect(rows.find((r) => r.text().includes('SKU-NT-VP08'))!.classes()).not.toContain('bg-rose-50')
    expect(w.text()).toContain('12 Tấm')
    w.unmount()
  })

  it('tổng quan: KPI và Lập PR Mua tạo phiếu PR', async () => {
    const before = (await reqRepo.list()).length
    const w = mount(InventoryOverviewView, { attachTo: document.body, global: { plugins: [await testRouter()] } })
    await flushPromises()
    expect(w.text()).toContain('Cảnh Báo Dưới Định Mức')
    await w.findAll('button').find((b) => b.text() === 'Lập PR Mua')!.trigger('click')
    await flushPromises()
    const prs = await reqRepo.list()
    expect(prs).toHaveLength(before + 1)
    expect(prs.at(-1)!.content).toContain('Bổ sung 8 Tấm')
    w.unmount()
  })
})

describe('Mua hàng', () => {
  it('?new=1 ở /purchase/orders mở modal tạo PO', async () => {
    const w = mount(PurchaseOrdersView, { attachTo: document.body, global: { plugins: [await testRouter('/purchase/orders?new=1')] } })
    await flushPromises()
    expect(document.body.querySelector('[role="dialog"]')).toBeTruthy()
    expect(document.body.textContent).toContain('Lập Đơn PO Mới')
    w.unmount()
  })

  it('Nhập Kho (GR) tạo phiếu nhập và đánh dấu PO đã nhập', async () => {
    const grs = (await receiptRepo.list()).length
    const w = mount(PurchaseOrdersView, { attachTo: document.body, global: { plugins: [await testRouter()] } })
    await flushPromises()
    await w.findAll('button').find((b) => b.text() === 'Nhập Kho (GR)')!.trigger('click')
    await flushPromises()
    expect(await receiptRepo.list()).toHaveLength(grs + 1)
    expect((await poRepo.get('1')).status).toBe('received')
    expect(w.findAll('button').some((b) => b.text() === 'Nhập Kho (GR)')).toBe(false)
    w.unmount()
  })
})
