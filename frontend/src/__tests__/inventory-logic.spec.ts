import { beforeEach, describe, expect, it, vi } from 'vitest'

// mỗi test dùng kho dữ liệu mới (module singleton)
async function fresh() {
  vi.resetModules()
  const data = await import('../data')
  const stats = await import('../data/stats')
  return { ...data, ...stats }
}
const qty = async (d: Awaited<ReturnType<typeof fresh>>, sku: string) => (await d.itemRepo.list({ filters: { code: sku } }))[0]!.qty
const rec = { po: '', vendor: 'NCC', date: '2026-11-03', warehouse: 'K', keeper: '', qc: 'pass' }
const iss = { so: '', customer: 'KH', date: '2026-11-03', warehouse: 'K', status: 'preparing' }

let d: Awaited<ReturnType<typeof fresh>>
beforeEach(async () => (d = await fresh()))

describe('logic nhập kho', () => {
  it('phiếu nháp không đổi tồn; chuyển sang hoàn tất thì cộng qty', async () => {
    const r = await d.receiptRepo.create({ ...rec, sku: 'SKU-TH-5MM', qty: 8, state: 'draft' })
    expect(await qty(d, 'SKU-TH-5MM')).toBe(12)
    await d.receiptRepo.update(r.id, { state: 'done' })
    expect(await qty(d, 'SKU-TH-5MM')).toBe(20)
  })

  it('tạo thẳng ở trạng thái hoàn tất cũng cộng qty; SKU không tồn tại thì không lưu', async () => {
    await d.receiptRepo.create({ ...rec, sku: 'SKU-NT-VP08', qty: 5, state: 'done' })
    expect(await qty(d, 'SKU-NT-VP08')).toBe(90)
    const n = (await d.receiptRepo.list()).length
    await expect(d.receiptRepo.create({ ...rec, sku: 'SKU-XXX', qty: 5, state: 'done' })).rejects.toThrow('Không tìm thấy mã SKU')
    expect((await d.receiptRepo.list()).length).toBe(n)
  })

  it('phiếu đã hoàn tất không sửa số lượng, không xoá; sửa trường khác được', async () => {
    const r = await d.receiptRepo.create({ ...rec, sku: 'SKU-TH-5MM', qty: 3, state: 'done' })
    await expect(d.receiptRepo.update(r.id, { qty: 99 })).rejects.toThrow('đã hoàn tất')
    await expect(d.receiptRepo.remove(r.id)).rejects.toThrow('đã hoàn tất')
    await d.receiptRepo.update(r.id, { keeper: 'An', qty: 3 })
    expect(await qty(d, 'SKU-TH-5MM')).toBe(15)
  })

  it('trùng mã phiếu thì không cộng tồn', async () => {
    await expect(d.receiptRepo.create({ ...rec, code: 'GR-2026-0092', sku: 'SKU-TH-5MM', qty: 5, state: 'done' })).rejects.toThrow('Mã đã tồn tại')
    expect(await qty(d, 'SKU-TH-5MM')).toBe(12)
  })

  it('PO Nhập Kho (GR) đi qua logic nhập: cộng tồn, tạo phiếu, PO đã nhập; nhập lần hai bị chặn', async () => {
    const gr = await d.receivePo('1')
    expect(gr).toMatchObject({ po: 'PO-2026-089', sku: 'SKU-TH-5MM', qty: 20, state: 'done' })
    expect(await qty(d, 'SKU-TH-5MM')).toBe(32)
    expect((await d.poRepo.get('1')).status).toBe('received')
    await expect(d.receivePo('1')).rejects.toThrow('PO đã nhập kho')
    expect(await qty(d, 'SKU-TH-5MM')).toBe(32)
  })

  it('PO thiếu SKU thì báo lỗi và không đổi gì', async () => {
    const po = await d.poRepo.create({ vendor: 'X', ordered: '2026-11-03', total: 1, status: 'ordered' })
    await expect(d.receivePo(po.id)).rejects.toThrow('chưa có mã SKU')
    expect((await d.poRepo.get(po.id)).status).toBe('ordered')
  })
})

describe('logic xuất kho', () => {
  it('hoàn tất thì trừ qty', async () => {
    await d.issueRepo.create({ ...iss, sku: 'SKU-NT-VP08', qty: 10, state: 'done' })
    expect(await qty(d, 'SKU-NT-VP08')).toBe(75)
  })

  it('vượt tồn thì báo lỗi và không lưu, không đổi tồn', async () => {
    const n = (await d.issueRepo.list()).length
    await expect(d.issueRepo.create({ ...iss, sku: 'SKU-TH-5MM', qty: 13, state: 'done' })).rejects.toThrow('Tồn kho không đủ')
    expect((await d.issueRepo.list()).length).toBe(n)
    expect(await qty(d, 'SKU-TH-5MM')).toBe(12)
    await d.issueRepo.create({ ...iss, sku: 'SKU-TH-5MM', qty: 12, state: 'done' }) // đúng bằng tồn thì được
    expect(await qty(d, 'SKU-TH-5MM')).toBe(0)
  })

  it('phiếu nháp vượt tồn lưu được, nhưng chốt thì bị chặn', async () => {
    const g = await d.issueRepo.create({ ...iss, sku: 'SKU-TH-5MM', qty: 50, state: 'draft' })
    await expect(d.issueRepo.update(g.id, { state: 'done' })).rejects.toThrow('Tồn kho không đủ')
    expect((await d.issueRepo.get(g.id)).state).toBe('draft')
  })

  it('số lượng ≤ 0 bị từ chối', async () => {
    await expect(d.issueRepo.create({ ...iss, sku: 'SKU-NT-VP08', qty: 0, state: 'done' })).rejects.toThrow('lớn hơn 0')
  })
})

describe('logic kiểm kê và điều chuyển', () => {
  it('chốt kiểm kê đặt qty = số thực tế, lưu số sổ sách và chênh lệch', async () => {
    const a = await d.auditRepo.create({ warehouse: 'K', date: '2026-11-03', council: '', sku: 'SKU-NT-VP08', actual: 80, state: 'draft' })
    expect(await qty(d, 'SKU-NT-VP08')).toBe(85)
    const closed = await d.auditRepo.update(a.id, { state: 'closed' })
    expect(await qty(d, 'SKU-NT-VP08')).toBe(80)
    expect(closed).toMatchObject({ system_qty: 85, diff: -5 })
    await expect(d.auditRepo.update(a.id, { actual: 1 })).rejects.toThrow('đã hoàn tất')
  })

  it('điều chuyển chỉ đổi trạng thái, không đổi tổng tồn', async () => {
    const before = (await d.getInventoryReport()).totalValue
    await d.transferRepo.update('1', { status: 'received' })
    expect((await d.getInventoryReport()).totalValue).toBe(before)
  })
})

describe('báo cáo xuất-nhập-tồn từ phiếu', () => {
  it('tổng nhập/xuất và tồn đầu kỳ suy ra từ phiếu đã hoàn tất', async () => {
    let r = await d.getInventoryReport()
    expect(r.rows.find((x) => x.code === 'SKU-TH-5MM')).toMatchObject({ opening: 25, in: 10, out: 23, closing: 12 })
    expect(r.periodIn).toBe(10 * 2_250_000 + 50 * 1_450_000)
    expect(r.periodOut).toBe(23 * 2_250_000 + 15 * 1_450_000)
    await d.receiptRepo.create({ ...rec, sku: 'SKU-TH-5MM', qty: 4, state: 'done' })
    await d.receiptRepo.create({ ...rec, sku: 'SKU-TH-5MM', qty: 100, state: 'draft' }) // nháp không tính
    r = await d.getInventoryReport()
    expect(r.periodIn).toBe(14 * 2_250_000 + 50 * 1_450_000)
    expect(r.rows.find((x) => x.code === 'SKU-TH-5MM')).toMatchObject({ opening: 25, in: 14, closing: 16 })
  })
})
