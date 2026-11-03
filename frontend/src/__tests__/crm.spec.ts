import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { opportunityRepo, ticketRepo } from '../data'
import { getCrmAnalytics } from '../data/stats'
import CrmKanbanView from '../views/crm/CrmKanbanView.vue'
import CrmActivitiesView from '../views/crm/CrmActivitiesView.vue'
import CrmTicketsView from '../views/crm/CrmTicketsView.vue'
import CrmListView from '../views/crm/CrmListView.vue'
import { testRouter } from './helpers'

afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('CRM kanban', () => {
  it('kéo thẻ sang cột khác thì đổi stage và tổng giá trị cột cập nhật', async () => {
    const w = mount(CrmKanbanView, { attachTo: document.body })
    await flushPromises()
    const totals = () => w.findAll('[data-testid="stage-total"]').map((x) => x.text())
    expect(totals()[0]).toBe('205.000.000 ₫')
    expect(totals()[1]).toBe('340.000.000 ₫')

    await w.findAll('article').find((a) => a.text().includes('Nội thất'))!.trigger('dragstart')
    await w.get('[data-stage="2"]').trigger('drop')
    await flushPromises()

    expect(totals().slice(0, 2)).toEqual(['85.000.000 ₫', '460.000.000 ₫'])
    expect((await opportunityRepo.get('1')).stage).toBe('2')
    expect(w.findAll('[data-testid="stage-count"]').map((x) => x.text()).slice(0, 2)).toEqual(['1', '2'])
    w.unmount()
  })

  it('thả vào chính cột cũ thì không đổi', async () => {
    const w = mount(CrmKanbanView, { attachTo: document.body })
    await flushPromises()
    const before = w.findAll('[data-testid="stage-total"]').map((x) => x.text())
    await w.get('[data-stage="4"] article').trigger('dragstart')
    await w.get('[data-stage="4"]').trigger('drop')
    await flushPromises()
    expect(w.findAll('[data-testid="stage-total"]').map((x) => x.text())).toEqual(before)
    w.unmount()
  })

  it('modal sửa đổi được stage', async () => {
    const w = mount(CrmKanbanView, { attachTo: document.body })
    await flushPromises()
    await w.findAll('article').find((a) => a.text().includes('Server'))!.trigger('click')
    const sel = document.body.querySelector<HTMLSelectElement>('#o-stage')!
    sel.value = '3'
    sel.dispatchEvent(new Event('change'))
    document.body.querySelector('form')!.dispatchEvent(new Event('submit'))
    await flushPromises()
    expect((await opportunityRepo.get('2')).stage).toBe('3')
    w.unmount()
  })
})

describe('CRM khác', () => {
  it('?new=1 ở /crm/list mở modal tạo khách hàng', async () => {
    const w = mount(CrmListView, { attachTo: document.body, global: { plugins: [await testRouter('/crm/list?new=1')] } })
    await flushPromises()
    expect(document.body.textContent).toContain('Thêm Khách Hàng Mới')
    expect(document.body.querySelector('[role="dialog"]')).toBeTruthy()
    w.unmount()
  })

  it('getCrmAnalytics đổi phễu theo timeframe', async () => {
    expect((await getCrmAnalytics('month')).funnel).toEqual([48, 36, 24, 17])
    expect((await getCrmAnalytics('year')).funnel).toEqual([450, 320, 210, 160])
  })
})

describe('CRM lịch hoạt động', () => {
  async function mountCal() {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 3))
    const w = mount(CrmActivitiesView, { attachTo: document.body, global: { plugins: [await testRouter()] } })
    await flushPromises()
    return w
  }

  it('lưới tháng 11/2026: đủ tuần, ngày 2 có 2 việc tô màu ít việc', async () => {
    const w = await mountCal()
    expect(w.get('[data-testid="period"]').text()).toBe('Tháng 11, 2026')
    expect(w.findAll('[data-date]')).toHaveLength(42)
    const d2 = w.get('[data-date="2026-11-02"]')
    expect(d2.text()).toContain('2 việc')
    expect(d2.text()).toContain('+1 đầu việc khác')
    expect(d2.classes()).toContain('bg-blue-50')
    expect(w.get('[data-date="2026-11-03"]').classes()).toContain('bg-slate-50')
    w.unmount()
  })

  it('chuyển sang chế độ tuần và đổi kỳ', async () => {
    const w = await mountCal()
    await w.findAll('button').find((b) => b.text() === 'Tuần')!.trigger('click')
    expect(w.findAll('[data-date]')).toHaveLength(7)
    expect(w.get('[data-testid="period"]').text()).toContain('02/11 - 08/11/2026')
    await w.get('[aria-label="Kỳ sau"]').trigger('click')
    expect(w.get('[data-testid="period"]').text()).toContain('09/11 - 15/11/2026')
    await w.findAll('button').find((b) => b.text() === 'Tháng')!.trigger('click')
    await w.get('[aria-label="Kỳ trước"]').trigger('click')
    expect(w.get('[data-testid="period"]').text()).toBe('Tháng 10, 2026')
    w.unmount()
  })

  it('bấm vào ngày mở modal tạo với ngày đã chọn', async () => {
    const w = await mountCal()
    await w.get('[data-date="2026-11-10"]').trigger('click')
    expect(document.body.querySelector<HTMLInputElement>('#a-date')!.value).toBe('2026-11-10')
    w.unmount()
  })
})

describe('CRM ticket', () => {
  it('4 thẻ thống kê và lọc theo ưu tiên', async () => {
    const w = mount(CrmTicketsView, { attachTo: document.body, global: { plugins: [await testRouter()] } })
    await flushPromises()
    expect(w.text()).toContain('Tổng Ticket')
    expect(w.text()).toContain('Tỉ Lệ Đạt SLA')
    expect(w.text()).toContain('3 Ticket')
    await w.findAll('button').find((b) => b.text() === 'Khẩn cấp')!.trigger('click')
    await flushPromises()
    expect(w.get('[data-testid="count"]').text()).toBe('1 Ticket')
    expect(w.text()).toContain('TCK-0921')
    expect(w.text()).not.toContain('TCK-0922')
    const n = (await ticketRepo.list()).length
    expect(n).toBe(3)
    w.unmount()
  })
})
