import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { employeeRepo, formulaRepo, lateMinutes, leaveDays, leaveRepo, netSalary, otHours, overtimeRepo, payrollRepo } from '../data'
import { toasts } from '../toast'
import HrLeavesView from '../views/hr/HrLeavesView.vue'
import HrPayrollView from '../views/hr/HrPayrollView.vue'
import HrShiftsView from '../views/hr/HrShiftsView.vue'
import HrTimekeepingView from '../views/hr/HrTimekeepingView.vue'
import HrEmployeesView from '../views/hr/HrEmployeesView.vue'
import { testRouter } from './helpers'

beforeEach(() => {
  toasts.value = []
})
afterEach(() => {
  document.body.innerHTML = ''
})

const mountView = async (c: Parameters<typeof mount>[0], start = '/') => mount(c, { attachTo: document.body, global: { plugins: [await testRouter(start)] } })
async function setVal(sel: string, v: string) {
  const el = document.body.querySelector<HTMLInputElement>(sel)!
  el.value = v
  el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input'))
}
const submit = async () => {
  document.body.querySelector('form')!.dispatchEvent(new Event('submit'))
  await flushPromises()
}

describe('netSalary', () => {
  it('22tr lương + 14.2tr thưởng', () => {
    expect(netSalary(22_000_000, 14_200_000)).toEqual({ insurance: 2_310_000, net: 33_890_000 })
  })
  it('làm tròn BHXH, không tính thuế TNCN', () => {
    expect(netSalary(10_000_001, 0)).toEqual({ insurance: 1_050_000, net: 8_950_001 })
    expect(netSalary(0, 5_000_000)).toEqual({ insurance: 0, net: 5_000_000 })
  })
})

describe('hàm tính HR', () => {
  it('đi muộn, giờ OT, số ngày phép', () => {
    expect(lateMinutes('07:52:14')).toBe(0)
    expect(lateMinutes('08:15:02')).toBe(15)
    expect(otHours('18:00', '21:30')).toBe(3.5)
    expect(otHours('08:00', '17:00')).toBe(8)
    expect(leaveDays('2026-11-01', '2026-11-02')).toBe(2)
    expect(leaveDays('2026-11-05', '2026-11-05')).toBe(1)
  })
})

describe('đơn nghỉ phép', () => {
  it('repo: end < start thì báo lỗi, không lưu; hợp lệ thì tự tính số ngày', async () => {
    const n = (await leaveRepo.list()).length
    const base = { emp_code: 'NV-0012', full_name: 'A', type: 'sick', reason: 'x', status: 'pending' }
    await expect(leaveRepo.create({ ...base, start: '2026-11-10', end: '2026-11-09' })).rejects.toThrow('Ngày kết thúc phải sau hoặc bằng ngày bắt đầu')
    expect((await leaveRepo.list()).length).toBe(n)
    const ok = await leaveRepo.create({ ...base, start: '2026-11-10', end: '2026-11-12' })
    expect(ok.days).toBe(3)
    await expect(leaveRepo.update(ok.id, { end: '2026-11-01' })).rejects.toThrow('Ngày kết thúc')
    expect((await leaveRepo.update(ok.id, { end: '2026-11-10' })).days).toBe(1)
  })

  it('màn: end < start hiện lỗi và không thêm dòng; sau đó nhập đúng thì lưu với số ngày', async () => {
    const w = await mountView(HrLeavesView)
    await flushPromises()
    const before = (await leaveRepo.list()).length
    await w.findAll('button').find((b) => b.text().includes('Tạo Đơn Xin Nghỉ Phép'))!.trigger('click')
    await setVal('#f-emp_code', 'NV-0015')
    await setVal('#f-full_name', 'Phạm Minh')
    await setVal('#f-type', 'sick')
    await setVal('#f-start', '2026-11-20')
    await setVal('#f-end', '2026-11-18')
    await setVal('#f-reason', 'Việc gia đình')
    await setVal('#f-status', 'pending')
    await submit()
    expect(toasts.value.map((t) => t.msg)).toContain('Ngày kết thúc phải sau hoặc bằng ngày bắt đầu')
    expect((await leaveRepo.list()).length).toBe(before)
    await setVal('#f-end', '2026-11-22')
    await submit()
    expect((await leaveRepo.list()).length).toBe(before + 1)
    expect(w.text()).toContain('(3 Ngày)')
    w.unmount()
  })

  it('Duyệt đổi trạng thái đơn chờ duyệt', async () => {
    const w = await mountView(HrLeavesView)
    await flushPromises()
    await w.findAll('button').find((b) => b.text() === 'Duyệt')!.trigger('click')
    await flushPromises()
    expect((await leaveRepo.get('1')).status).toBe('approved')
    w.unmount()
  })
})

describe('bảng lương', () => {
  it('tháng mặc định là tháng mới nhất có dữ liệu', async () => {
    await payrollRepo.create({ code: 'BL-LATEST', emp_code: 'NV-0098', month: '2027-03', full_name: 'L', base: 1, bonus: 0 })
    const w = await mountView(HrPayrollView)
    await flushPromises()
    expect((w.get('#payroll-month').element as HTMLInputElement).value).toBe('2027-03')
  })
  it('hiện BHXH, thực lĩnh và tổng chi = Σ net theo tháng đang chọn', async () => {
    const w = await mountView(HrPayrollView)
    await w.get('#payroll-month').setValue('2026-10')
    await flushPromises()
    expect(w.text()).toContain('-2.310.000 ₫')
    expect(w.text()).toContain('33.890.000 ₫')
    expect(w.get('[data-testid="payroll-total"]').text()).toContain('33.890.000 ₫')
    await payrollRepo.create({ code: 'BL-X', emp_code: 'NV-0099', month: '2026-10', full_name: 'B', base: 10_000_000, bonus: 0 })
    await w.get('#payroll-month').setValue('2026-09')
    await w.get('#payroll-month').setValue('2026-10')
    await flushPromises()
    expect(w.get('[data-testid="payroll-total"]').text()).toContain('42.840.000 ₫') // 33.890.000 + 8.950.000
    w.unmount()
  })

  it('nút Tính Lương Tháng sinh dòng cho nhân viên đang làm việc và không nhân đôi khi chạy lại', async () => {
    const w = await mountView(HrPayrollView)
    await w.get('#payroll-month').setValue('2026-11')
    await flushPromises()
    const run = () => w.findAll('button').find((b) => b.text().includes('Tính Lương Tháng'))!.trigger('click')
    await run()
    await flushPromises()
    const n = (await payrollRepo.list({ filters: { month: '2026-11' } })).length
    expect(n).toBe(3)
    expect(w.text()).toContain('555.288 ₫')
    await run()
    await flushPromises()
    expect((await payrollRepo.list({ filters: { month: '2026-11' } })).length).toBe(3)
    w.unmount()
  })
})

describe('chấm công, tăng ca, nhân viên', () => {
  it('chấm công: Đi Muộn 15p cho 08:15:02, Đúng Giờ cho 07:52:14', async () => {
    const w = await mountView(HrTimekeepingView)
    await flushPromises()
    expect(w.text()).toContain('Đi Muộn 15p')
    expect(w.text()).toContain('Đúng Giờ')
    expect(w.text()).toContain('Chưa check-out')
    w.unmount()
  })

  it('tăng ca: tính giờ, hệ số, KPI; giờ kết thúc ≤ bắt đầu bị từ chối; Duyệt', async () => {
    const w = await mountView(HrShiftsView)
    await flushPromises()
    expect(w.text()).toContain('3.5 Giờ')
    expect(w.text()).toContain('x 2.0 (200%)')
    expect(w.text()).toContain('11.5 Giờ')
    await expect(overtimeRepo.create({ emp_code: 'NV-0012', full_name: 'A', type: 'weekday', date: '2026-11-03', from: '20:00', to: '19:00', status: 'pending' })).rejects.toThrow('Giờ kết thúc')
    await w.findAll('button').find((b) => b.text() === 'Duyệt')!.trigger('click')
    await flushPromises()
    expect((await overtimeRepo.get('2')).status).toBe('approved')
    w.unmount()
  })

  it('nhân viên: thêm mới sinh mã NV-xxxx sau số lớn nhất', async () => {
    const w = await mountView(HrEmployeesView)
    await flushPromises()
    await w.findAll('button').find((b) => b.text().includes('Thêm Nhân Viên Mới'))!.trigger('click')
    await setVal('#f-full_name', 'Võ Thị Lan')
    await setVal('#f-base_salary', '10000000')
    await setVal('#f-leave_days', '12')
    await setVal('#f-department', 'PB-0003')
    await setVal('#f-start_date', '2026-11-03')
    await setVal('#f-status', 'active')
    await submit()
    expect((await employeeRepo.list()).map((e) => e.code)).toContain('NV-0022')
    w.unmount()
  })

  it('repo nhân viên: vị trí phải thuộc phòng ban đã chọn', async () => {
    const base = { base_salary: 1, leave_days: 1, full_name: 'X', phone: '', email: '', start_date: '2026-11-03', status: 'active' }
    await expect(employeeRepo.create({ ...base, department: 'PB-0001', position: 'VT-0004' })).rejects.toThrow('Vị trí không thuộc phòng ban đã chọn')
    await expect(employeeRepo.create({ ...base, department: 'PB-9999', position: '' })).rejects.toThrow('Phòng ban không tồn tại')
    await expect(employeeRepo.update('2', { position: 'VT-0004' })).rejects.toThrow('Vị trí không thuộc phòng ban đã chọn')
  })

  it('form nhân viên: ô vị trí lọc theo phòng ban và tự xoá khi đổi phòng ban', async () => {
    const w = await mountView(HrEmployeesView)
    await flushPromises()
    await w.findAll('button').find((b) => b.text().includes('Thêm Nhân Viên Mới'))!.trigger('click')
    await setVal('#f-department', 'PB-0002')
    await flushPromises()
    const opts = () => [...document.body.querySelectorAll<HTMLOptionElement>('#f-position option')].map((o) => o.value)
    expect(opts()).toEqual(['', 'VT-0004'])
    await setVal('#f-position', 'VT-0004')
    await flushPromises()
    expect(document.body.querySelector<HTMLSelectElement>('#f-position')!.value).toBe('VT-0004')
    await setVal('#f-department', 'PB-0001')
    await flushPromises()
    expect(document.body.querySelector<HTMLSelectElement>('#f-position')!.value).toBe('')
    w.unmount()
  })

  it('không xoá/đổi mã nhân viên đang là trưởng phòng hoặc quản lý chi nhánh', async () => {
    await expect(employeeRepo.remove('1')).rejects.toThrow('trưởng phòng')
    await expect(employeeRepo.remove('3')).rejects.toThrow('trưởng phòng')
    await expect(employeeRepo.update('1', { code: 'NV-9999' })).rejects.toThrow('Không thể đổi mã đang được sử dụng')
  })

  it('repo công thức lương: phòng ban áp dụng phải có trong danh mục', async () => {
    const base = { name: 'x', structure: 'y', status: 'active' }
    await expect(formulaRepo.create({ ...base, departments: 'PB-9999' })).rejects.toThrow('Phòng ban áp dụng không hợp lệ')
    await expect(formulaRepo.create({ ...base, departments: '' })).rejects.toThrow('Phòng ban áp dụng không hợp lệ')
  })
})
