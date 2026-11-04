import { beforeEach, describe, expect, it, vi } from 'vitest'

async function fresh() {
  vi.resetModules()
  return import('../data')
}
let d: Awaited<ReturnType<typeof fresh>>
beforeEach(async () => (d = await fresh()))
const days = async (code: string) => (await d.employeeRepo.list({ filters: { code } }))[0]!.leave_days
const leave = { emp_code: 'NV-0012', full_name: 'Lê Văn Tùng', type: 'annual', start: '2026-11-10', end: '2026-11-12', reason: 'x', status: 'pending' }

describe('biên bổ sung (Tester)', () => {
  it('xoá đơn phép năm đã duyệt phải hoàn phép hoặc bị chặn (không được mất ngày phép)', async () => {
    const a = await d.leaveRepo.create(leave)
    await d.leaveRepo.update(a.id, { status: 'approved' })
    expect(await days('NV-0012')).toBe(9)
    try {
      await d.leaveRepo.remove(a.id)
    } catch {
      expect(await days('NV-0012')).toBe(9)
      return
    }
    expect(await days('NV-0012')).toBe(12)
  })

  it('xoá đơn: chưa duyệt không đổi phép, loại khác phép năm không hoàn, xoá hai lần không hoàn đôi', async () => {
    const p = await d.leaveRepo.create(leave)
    await d.leaveRepo.remove(p.id)
    expect(await days('NV-0012')).toBe(12)
    const s = await d.leaveRepo.create({ ...leave, type: 'sick' })
    await d.leaveRepo.update(s.id, { status: 'approved' })
    const before = await days('NV-0012')
    await d.leaveRepo.remove(s.id)
    expect(await days('NV-0012')).toBe(before)
    const a = await d.leaveRepo.create(leave)
    await d.leaveRepo.update(a.id, { status: 'approved' })
    await d.leaveRepo.remove(a.id)
    await expect(d.leaveRepo.remove(a.id)).rejects.toBeTruthy()
    expect(await days('NV-0012')).toBe(12)
  })

  it('netSalary làm tròn BHXH', () => {
    expect(d.netSalary(10_000_001, 0).insurance).toBe(Math.round(10_000_001 * 0.105))
  })

  it('xuất kho đúng bằng tồn thì được, còn 0', async () => {
    const [it] = await d.itemRepo.list({})
    const g = await d.issueRepo.create({ code: 'GI-T', so: 'SO', customer: 'c', sku: it!.code, qty: it!.qty, state: 'done' } as never)
    expect(g).toBeTruthy()
    expect((await d.itemRepo.get(it!.id)).qty).toBe(0)
  })

})
