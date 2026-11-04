import { beforeEach, describe, expect, it, vi } from 'vitest'

async function fresh() {
  vi.resetModules()
  return import('../data')
}
let d: Awaited<ReturnType<typeof fresh>>
beforeEach(async () => (d = await fresh()))
const emp = { base_salary: 1, leave_days: 1, full_name: 'X', phone: '', email: '', start_date: '2026-01-01', status: 'active' }

describe('biên phòng ban/vị trí (Tester)', () => {
  it('data/org.ts không import settings/hr (không vòng import)', async () => {
    const src = (await import('../data/org.ts?raw')).default
    expect(src).not.toMatch(/from '\.\/(settings|hr|index)'/)
    const hr = (await import('../data/hr.ts?raw')).default
    expect(hr).not.toMatch(/from '\.\/settings'/)
    const idx = (await import('../data/index.ts?raw')).default
    expect(idx).not.toMatch(/\.\/org/)
  })

  it('chu trình 3 cấp: A->B->C, đặt cha của A là C bị chặn; đổi cha hợp lệ qua', async () => {
    await expect(d.departmentRepo.update('1', { parent: 'PB-0004' })).rejects.toThrow('Phòng ban cha không hợp lệ')
    const c = await d.departmentRepo.create({ name: 'C', parent: 'PB-0004', branch: 'HCM-HQ', head: '', status: 'active' })
    await expect(d.departmentRepo.update('1', { parent: c.code })).rejects.toThrow('Phòng ban cha không hợp lệ')
    await expect(d.departmentRepo.update('3', { parent: 'PB-0001' })).resolves.toBeTruthy()
    await expect(d.departmentRepo.create({ name: 'Z', parent: 'PB-9999', branch: 'HCM-HQ', head: '', status: 'active' })).rejects.toThrow('Phòng ban cha không hợp lệ')
  })

  it('nhân viên: update đổi phòng ban mà giữ vị trí cũ bị chặn; đổi cả hai thì qua; vị trí rỗng qua', async () => {
    await expect(d.employeeRepo.update('2', { department: 'PB-0002' })).rejects.toThrow('Vị trí không thuộc phòng ban đã chọn')
    await expect(d.employeeRepo.update('2', { department: 'PB-9999' })).rejects.toThrow('Phòng ban không tồn tại')
    await expect(d.employeeRepo.update('2', { department: 'PB-0002', position: 'VT-0004' })).resolves.toBeTruthy()
    await expect(d.employeeRepo.update('2', { department: 'PB-0003', position: '' })).resolves.toBeTruthy()
    await expect(d.employeeRepo.create({ ...emp, code: 'NV-7', department: 'PB-0001', position: 'VT-9999' })).rejects.toThrow('Vị trí không thuộc phòng ban đã chọn')
  })

  it('xoá/đổi mã nhân viên: head, manager chi nhánh, nhân viên thường', async () => {
    await expect(d.employeeRepo.remove('1')).rejects.toThrow('trưởng phòng của 1 phòng ban')
    await expect(d.employeeRepo.remove('3')).rejects.toThrow('trưởng phòng') // head kiểm tra trước manager
    await expect(d.employeeRepo.update('3', { code: 'NV-9' })).rejects.toThrow('Không thể đổi mã đang được sử dụng')
    await expect(d.employeeRepo.update('3', { code: 'NV-0008' })).resolves.toBeTruthy()
    await d.departmentRepo.update('2', { head: '' })
    await expect(d.employeeRepo.remove('3')).rejects.toThrow('Nhân viên đang quản lý 1 chi nhánh')
    await d.branchRepo.update('2', { manager: '' })
    await expect(d.employeeRepo.update('3', { code: 'NV-9' })).resolves.toBeTruthy()
    await expect(d.employeeRepo.remove('2')).resolves.toBeUndefined()
  })

  it('công thức: tạo/sửa với danh sách hợp lệ qua; một mã sai hoặc dấu phẩy thừa', async () => {
    const f = { name: 'F', structure: 's', status: 'active' }
    await expect(d.formulaRepo.create({ ...f, departments: 'PB-0001,PB-0002' })).resolves.toBeTruthy()
    await expect(d.formulaRepo.create({ ...f, departments: 'PB-0001,PB-9999' })).rejects.toThrow('Phòng ban áp dụng không hợp lệ')
    await expect(d.formulaRepo.create({ ...f, departments: ',' })).rejects.toThrow('Phòng ban áp dụng không hợp lệ')
    await expect(d.formulaRepo.update('1', { departments: '' })).rejects.toThrow('Phòng ban áp dụng không hợp lệ')
  })

  it('đổi mã/xoá phòng ban: đếm cả nhân viên nghỉ việc; tham chiếu bởi công thức hoặc phòng ban con', async () => {
    await d.employeeRepo.update('4', { status: 'resigned' })
    await expect(d.departmentRepo.remove('1')).rejects.toThrow('đang có 3 nhân viên')
    const n = await d.departmentRepo.create({ name: 'N', parent: '', branch: 'HCM-HQ', head: '', status: 'active' })
    await d.formulaRepo.create({ name: 'F', structure: 's', status: 'active', departments: n.code })
    await expect(d.departmentRepo.update(n.id, { code: 'PB-8' })).rejects.toThrow('Không thể đổi mã đang được sử dụng')
    await expect(d.departmentRepo.remove(n.id)).rejects.toThrow('đang dùng trong 1 công thức lương')
    // PB-0002 có nhân viên + vị trí; PB-0003 sau khi bỏ công thức và vị trí thì đổi mã được
    await d.positionRepo.remove('5')
    await expect(d.departmentRepo.update('3', { code: 'PB-0033' })).rejects.toThrow('Không thể đổi mã đang được sử dụng') // còn CT-OFFICE-01
    await d.formulaRepo.update('1', { departments: 'PB-0001' })
    await expect(d.departmentRepo.update('3', { code: 'PB-0033' })).resolves.toBeTruthy()
  })

  it('xoá phòng ban có phòng ban con bị chặn đúng thông báo (sau nhân viên/vị trí)', async () => {
    const p = await d.departmentRepo.create({ name: 'P', parent: '', branch: 'HCM-HQ', head: '', status: 'active' })
    await d.departmentRepo.create({ name: 'K', parent: p.code, branch: 'HCM-HQ', head: '', status: 'active' })
    await expect(d.departmentRepo.remove(p.id)).rejects.toThrow('đang có 1 phòng ban con')
  })

  it('vị trí: đổi mã khi chưa ai giữ thì qua; chi nhánh HN-BD đổi mã được', async () => {
    await expect(d.positionRepo.update('5', { code: 'VT-0055' })).resolves.toBeTruthy()
    await expect(d.branchRepo.update('3', { code: 'HN-X' })).resolves.toBeTruthy()
    await expect(d.branchRepo.update('1', { name: 'đổi tên' })).resolves.toBeTruthy()
  })

  it('xoá bản ghi không tồn tại báo lỗi', async () => {
    await expect(d.departmentRepo.remove('999')).rejects.toBeTruthy()
    await expect(d.positionRepo.remove('999')).rejects.toBeTruthy()
    await expect(d.branchRepo.remove('999')).rejects.toBeTruthy()
  })

  it('BM-01: mã phòng ban chứa dấu phẩy/khoảng trắng bị từ chối (create và update)', async () => {
    const base = { name: 'Z', parent: '', branch: 'HCM-HQ', head: '', status: 'active' }
    for (const code of ['PB-0001,PB-0003', '   ', 'PB 9']) {
      await expect(d.departmentRepo.create({ ...base, code })).rejects.toThrow('Mã phòng ban không hợp lệ')
      await expect(d.departmentRepo.update('2', { code })).rejects.toThrow('Mã phòng ban không hợp lệ')
    }
    await expect(d.departmentRepo.create({ ...base, code: ' PB-77 ' })).resolves.toMatchObject({ code: 'PB-77' })
  })

  it('BM-01: mã rỗng tự sinh PB-xxxx hợp lệ; update trim mã; đổi mã vẫn bị chặn khi được tham chiếu', async () => {
    const base = { name: 'Z', parent: '', branch: 'HCM-HQ', head: '', status: 'active' }
    const a = await d.departmentRepo.create({ ...base, code: '' })
    expect(a.code).toMatch(/^PB-\d+$/)
    const b = await d.departmentRepo.create({ ...base, code: ' PB-88 ' })
    await expect(d.departmentRepo.update(b.id, { code: '  PB-89  ' })).resolves.toMatchObject({ code: 'PB-89' })
    await expect(d.departmentRepo.update('1', { code: 'PB-0100' })).rejects.toBeTruthy()
    await expect(d.departmentRepo.update('1', { name: 'Đổi tên' })).resolves.toBeTruthy()
  })

  it('update với mã rỗng bị từ chối', async () => {
    const b = await d.departmentRepo.create({ name: 'Z', parent: '', branch: 'HCM-HQ', head: '', status: 'active', code: 'PB-55' })
    await expect(d.departmentRepo.update(b.id, { code: '' })).rejects.toThrow('Mã phòng ban không hợp lệ')
    await expect(d.departmentRepo.update(b.id, { code: '  ' })).rejects.toThrow('Mã phòng ban không hợp lệ')
  })

  it('runPayroll vẫn chạy: NV active được tính, nghỉ phép không', async () => {
    expect(await (await import('../data')).runPayroll('2026-11')).toEqual({ created: 3, updated: 0 })
  })

  it('positionRepo đổi phòng ban: N nhân viên (kể cả đã nghỉ) chặn đúng N; rule mã chạy trước', async () => {
    const pos = await d.positionRepo.get('1')
    const before = (await d.employeeRepo.list({ filters: { position: pos.code } })).length
    await d.employeeRepo.create({ ...emp, code: 'NV-B1', department: pos.department, position: pos.code })
    const r = await d.employeeRepo.create({ ...emp, code: 'NV-B2', department: pos.department, position: pos.code })
    await d.employeeRepo.update(r.id, { status: 'resigned' })
    const n = before + 2
    await expect(d.positionRepo.update('1', { department: 'PB-0002' })).rejects.toThrow(`Vị trí đang có ${n} nhân viên, không thể đổi phòng ban`)
    await expect(d.positionRepo.update('1', { code: 'VT-9001', department: 'PB-0002' })).rejects.toThrow('Không thể đổi mã đang được sử dụng')
    await expect(d.positionRepo.update('1', { name: 'Tên mới' })).resolves.toBeTruthy()
  })
})
