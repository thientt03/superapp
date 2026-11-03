import { beforeEach, describe, expect, it, vi } from 'vitest'

// mỗi test dùng kho dữ liệu mới (module singleton)
async function fresh() {
  vi.resetModules()
  return import('../data')
}
let d: Awaited<ReturnType<typeof fresh>>
beforeEach(async () => (d = await fresh()))

const leave = { emp_code: 'NV-0012', full_name: 'Lê Văn Tùng', type: 'annual', start: '2026-11-10', end: '2026-11-12', reason: 'Việc riêng', status: 'pending' }
const days = async (code: string) => (await d.employeeRepo.list({ filters: { code } }))[0]!.leave_days

describe('tính lương tháng', () => {
  it('tạo dòng cho nhân viên active: base từ hồ sơ, bonus = tiền OT đã duyệt trong tháng', async () => {
    const r = await d.runPayroll('2026-11')
    expect(r).toEqual({ created: 3, updated: 0 }) // NV-0021 đang nghỉ phép nên không có dòng
    const rows = await d.payrollRepo.list({ filters: { month: '2026-11' } })
    const tung = rows.find((x) => x.emp_code === 'NV-0012')!
    expect(tung.base).toBe(22_000_000)
    expect(tung.bonus).toBe(555_288) // 3.5 giờ × (22.000.000/26/8) × 1.5
    expect(rows.find((x) => x.emp_code === 'NV-0008')!.bonus).toBe(0) // OT chờ duyệt không tính
    expect(d.netSalary(tung.base, tung.bonus)).toEqual({ insurance: 2_310_000, net: 22_000_000 + 555_288 - 2_310_000 })
  })

  it('chạy lại cùng tháng cập nhật, không nhân đôi; OT duyệt thêm thì bonus đổi', async () => {
    await d.runPayroll('2026-11')
    await d.overtimeRepo.update('2', { status: 'approved' }) // 8 giờ x2.0, base 25tr
    expect(await d.runPayroll('2026-11')).toEqual({ created: 0, updated: 3 })
    const rows = await d.payrollRepo.list({ filters: { month: '2026-11' } })
    expect(rows).toHaveLength(3)
    expect(rows.find((x) => x.emp_code === 'NV-0008')!.bonus).toBe(1_923_077)
  })

  it('tháng khác không bị ảnh hưởng; OT ngoài tháng không tính; tháng sai báo lỗi', async () => {
    await d.runPayroll('2026-11')
    const oct = await d.runPayroll('2026-12')
    expect(oct.created).toBe(3)
    expect((await d.payrollRepo.list({ filters: { month: '2026-12' } })).every((x) => x.bonus === 0)).toBe(true)
    expect((await d.payrollRepo.list({ filters: { month: '2026-10' } })).length).toBe(1) // dòng seed tháng 10 giữ nguyên
    await expect(d.runPayroll('2026-13')).rejects.toThrow('Tháng không hợp lệ')
  })
})

describe('nghỉ phép trừ phép năm', () => {
  it('duyệt đơn phép năm trừ số ngày; đơn nghỉ bệnh không trừ', async () => {
    const a = await d.leaveRepo.create(leave)
    expect(await days('NV-0012')).toBe(12)
    await d.leaveRepo.update(a.id, { status: 'approved' })
    expect(await days('NV-0012')).toBe(9)
    const b = await d.leaveRepo.create({ ...leave, type: 'sick' })
    await d.leaveRepo.update(b.id, { status: 'approved' })
    expect(await days('NV-0012')).toBe(9)
  })

  it('không đủ phép thì báo lỗi, đơn vẫn chờ duyệt và phép không đổi', async () => {
    const a = await d.leaveRepo.create({ ...leave, emp_code: 'NV-0021', start: '2026-11-10', end: '2026-11-20' }) // 11 ngày > 6
    await expect(d.leaveRepo.update(a.id, { status: 'approved' })).rejects.toThrow('Không đủ ngày phép năm')
    expect((await d.leaveRepo.get(a.id)).status).toBe('pending')
    expect(await days('NV-0021')).toBe(6)
    await expect(d.leaveRepo.create({ ...leave, emp_code: 'NV-0021', end: '2026-11-30', status: 'approved' })).rejects.toThrow('Không đủ ngày phép năm')
    expect((await d.leaveRepo.list()).length).toBe(2) // seed + đơn chờ duyệt ở trên
  })

  it('từ chối không trừ; đơn đã duyệt bị khoá, đổi sang từ chối thì hoàn phép', async () => {
    const a = await d.leaveRepo.create(leave)
    await d.leaveRepo.update(a.id, { status: 'rejected' })
    expect(await days('NV-0012')).toBe(12)
    const b = await d.leaveRepo.create(leave)
    await d.leaveRepo.update(b.id, { status: 'approved' })
    await expect(d.leaveRepo.update(b.id, { end: '2026-11-20' })).rejects.toThrow('Đơn đã duyệt')
    await d.leaveRepo.update(b.id, { status: 'rejected' })
    expect(await days('NV-0012')).toBe(12)
  })

  it('mã nhân viên không tồn tại khi duyệt phép năm thì báo lỗi', async () => {
    const a = await d.leaveRepo.create({ ...leave, emp_code: 'NV-9999' })
    await expect(d.leaveRepo.update(a.id, { status: 'approved' })).rejects.toThrow('Không tìm thấy nhân viên')
  })
})

describe('kiểm tra bảng lương', () => {
  const row = { emp_code: 'NV-0015', month: '2026-11', full_name: 'Trần Thị Hoa', base: 1, bonus: 0 }
  it('từ chối tháng sai định dạng và trùng (mã NV, tháng); mã tự sinh tiền tố BL', async () => {
    await expect(d.payrollRepo.create({ ...row, month: '2026-13' })).rejects.toThrow('Tháng không hợp lệ')
    const c = await d.payrollRepo.create(row)
    expect(c.code).toMatch(/^BL-/)
    await expect(d.payrollRepo.create(row)).rejects.toThrow('đã có bảng lương')
    await expect(d.payrollRepo.update(c.id, { month: '2026-10', emp_code: 'NV-0012' })).rejects.toThrow('đã có bảng lương')
    await d.payrollRepo.update(c.id, { bonus: 5 }) // sửa chính nó không bị coi là trùng
  })
  it('chạy lại tính lương sau khi đã có dòng tay vẫn không nhân đôi', async () => {
    await d.payrollRepo.create(row)
    expect(await d.runPayroll('2026-11')).toEqual({ created: 2, updated: 1 })
    expect((await d.payrollRepo.list({ filters: { month: '2026-11' } })).length).toBe(3)
  })
})

describe('biên bảng lương (bản vá đánh giá)', () => {
  const row = { emp_code: 'NV-0012', month: '2026-11', full_name: 'T', base: 1, bonus: 0 }
  it('tháng sai định dạng bị chặn ở create, update và runPayroll; không lưu gì', async () => {
    const n = (await d.payrollRepo.list()).length
    for (const m of ['abc', '', '2026-00', '2026-1', '2026-13', '2026-11-01', ' 2026-11'])
      await expect(d.payrollRepo.create({ ...row, month: m })).rejects.toThrow('Tháng không hợp lệ')
    for (const m of ['abc', '', '2026-00', '2026-1']) await expect(d.runPayroll(m)).rejects.toThrow('Tháng không hợp lệ')
    const c = await d.payrollRepo.create(row)
    await expect(d.payrollRepo.update(c.id, { month: 'abc' })).rejects.toThrow('Tháng không hợp lệ')
    expect((await d.payrollRepo.get(c.id)).month).toBe('2026-11')
    expect((await d.payrollRepo.list()).length).toBe(n + 1)
  })
  it('mã tự sinh tiền tố BL, hai dòng tay khác tháng không trùng mã', async () => {
    const a = await d.payrollRepo.create(row)
    const b = await d.payrollRepo.create({ ...row, month: '2026-12' })
    expect(a.code).toMatch(/^BL-\d{4}$/)
    expect(b.code).not.toBe(a.code)
  })
  it('runPayroll sau khi có dòng tay cùng NV+tháng: cập nhật, không thêm; thêm tay lần nữa bị chặn', async () => {
    await d.payrollRepo.create(row)
    await d.runPayroll('2026-11')
    await d.runPayroll('2026-11')
    const rows = await d.payrollRepo.list({ filters: { emp_code: 'NV-0012', month: '2026-11' } })
    expect(rows.length).toBe(1)
    await expect(d.payrollRepo.create({ ...row, code: 'BL-ZZ' })).rejects.toThrow('đã có bảng lương')
  })
  it('chỉ trùng khi cùng cả NV lẫn tháng', async () => {
    await d.payrollRepo.create(row)
    await expect(d.payrollRepo.create({ ...row, emp_code: 'NV-0008' })).resolves.toBeTruthy()
    await expect(d.payrollRepo.create({ ...row, month: '2026-12' })).resolves.toBeTruthy()
  })
})
