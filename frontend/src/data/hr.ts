import { createMemoryRepo, RepoError, withRules, type Entity, type Repository } from './repository'
import { branchBase, departmentBase, positionBase } from './org'

export interface Employee extends Entity { base_salary: number; leave_days: number; full_name: string; department: string; position: string; phone: string; email: string; start_date: string; status: string }
export interface Attendance extends Entity { emp_code: string; full_name: string; date: string; channel: string; check_in: string; check_out: string; device: string }
export interface Overtime extends Entity { emp_code: string; full_name: string; type: string; date: string; from: string; to: string; status: string }
export interface Leave extends Entity { emp_code: string; full_name: string; type: string; start: string; end: string; days?: number; reason: string; status: string }
export interface Formula extends Entity { name: string; departments: string; structure: string; status: string }
export interface PayrollRow extends Entity { emp_code: string; month: string; full_name: string; base: number; bonus: number }
export interface Campaign extends Entity { kind: string; tag: string; title: string; desc: string }
export interface KpiCardItem extends Entity { tag: string; title: string; desc: string }

export const SHIFT_START = '08:00'
export const OT_COEF: Record<string, number> = { weekday: 1.5, sunday: 2, holiday: 3 }

/** Lương thực lĩnh: BHXH 10.5% trên lương cơ bản, không tính thuế TNCN. */
export function netSalary(base: number, bonus: number): { insurance: number; net: number } {
  const insurance = Math.round(base * 0.105)
  return { insurance, net: base + bonus - insurance }
}

const mins = (hhmm: string) => {
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(hhmm)
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN
}

/** Số phút đi muộn so với giờ vào ca (làm tròn xuống), 0 nếu đúng giờ. */
export function lateMinutes(checkIn: string): number {
  const d = mins(checkIn) - mins(SHIFT_START)
  return d > 0 ? d : 0
}

/** Số giờ OT; khung giờ bao trùm 12:00-13:00 thì trừ 1 giờ nghỉ trưa. */
export function otHours(from: string, to: string): number {
  const a = mins(from)
  const b = mins(to)
  return (b - a - (a <= 720 && b >= 780 ? 60 : 0)) / 60
}

/** Số ngày nghỉ gồm cả hai đầu (ISO yyyy-mm-dd). */
export function leaveDays(start: string, end: string): number {
  return Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1
}

const employees: Employee[] = [
  { id: '1', code: 'NV-0012', base_salary: 22_000_000, leave_days: 12, full_name: 'Lê Văn Tùng', department: 'PB-0001', position: 'VT-0001', phone: '0903.111.222', email: 'tung.lv@ngaydem.vn', start_date: '2023-03-01', status: 'active' },
  { id: '2', code: 'NV-0015', base_salary: 15_000_000, leave_days: 12, full_name: 'Trần Thị Hoa', department: 'PB-0001', position: 'VT-0002', phone: '0903.333.444', email: 'hoa.tt@ngaydem.vn', start_date: '2024-01-15', status: 'active' },
  { id: '3', code: 'NV-0008', base_salary: 25_000_000, leave_days: 10, full_name: 'Nguyễn Văn An', department: 'PB-0002', position: 'VT-0004', phone: '0903.555.666', email: 'an.nv@ngaydem.vn', start_date: '2021-06-01', status: 'active' },
  { id: '4', code: 'NV-0021', base_salary: 12_000_000, leave_days: 6, full_name: 'Lê Thị Mai', department: 'PB-0001', position: 'VT-0003', phone: '0903.777.888', email: 'mai.lt@ngaydem.vn', start_date: '2024-08-01', status: 'leave' },
]
const attendance: Attendance[] = [
  { id: '1', code: 'CC-0001', emp_code: 'NV-0012', full_name: 'Lê Văn Tùng', date: '2026-11-02', channel: 'fingerprint', check_in: '07:52:14', check_out: '', device: 'Máy Cửa Chính Tầng 1 (IP: 192.168.1.102)' },
  { id: '2', code: 'CC-0002', emp_code: 'NV-0015', full_name: 'Trần Thị Hoa', date: '2026-11-02', channel: 'app', check_in: '08:15:02', check_out: '', device: 'GPS: 10.7769, 106.7009 (Tòa nhà AB, Q.1)' },
]
const overtimes: Overtime[] = [
  { id: '1', code: 'OT-2026-088', emp_code: 'NV-0012', full_name: 'Lê Văn Tùng (Sales)', type: 'weekday', date: '2026-11-02', from: '18:00', to: '21:30', status: 'approved' },
  { id: '2', code: 'OT-2026-089', emp_code: 'NV-0008', full_name: 'Nguyễn Văn An (Kho)', type: 'sunday', date: '2026-11-08', from: '08:00', to: '17:00', status: 'pending' },
]
const leaves: Leave[] = [
  { id: '1', code: 'NP-2026-012', emp_code: 'NV-0021', full_name: 'Lê Thị Mai (Sales)', type: 'sick', start: '2026-11-01', end: '2026-11-02', days: 2, reason: 'Nghỉ ốm sốt có giấy y tế', status: 'pending' },
]
const formulas: Formula[] = [
  { id: '1', code: 'CT-OFFICE-01', name: 'Công thức Lương Thời Gian Tiêu Chuẩn', departments: 'PB-0003', structure: '(LCB/26)*Ngày làm + OT*1.5 - BHXH 10.5%', status: 'active' },
  { id: '2', code: 'CT-SALES-02', name: 'Công thức Lương Bán Hàng & Hoa Hồng KPI', departments: 'PB-0001,PB-0004', structure: 'LCB + DoanhSố * %HoaHồng + ThưởngKPI - TrừThuế', status: 'active' },
]
const payroll: PayrollRow[] = [{ id: '1', code: 'BL-202610-NV-0012', emp_code: 'NV-0012', month: '2026-10', full_name: 'Lê Văn Tùng', base: 22_000_000, bonus: 14_200_000 }]
const campaigns: Campaign[] = [
  { id: '1', code: 'TD-0001', kind: 'job', tag: 'Đang Tuyển (3 Vị trí)', title: 'Tuyển 02 Senior Sales B2B (Ngành Thép/Vật tư)', desc: 'Mức lương: 15 - 25 Triệu + % Hoa hồng doanh số cao.' },
  { id: '2', code: 'TD-0002', kind: 'training', tag: 'Khóa Đào Tạo Nội Bộ', title: 'Đào Tạo Quy Trình ERP NgayDem 2026', desc: 'Thời gian: Thứ 7 tuần này (Phòng đào tạo tầng 4).' },
]
const kpis: KpiCardItem[] = [
  { id: '1', code: 'KPI-0001', tag: 'Tỉ Lệ Đạt KPI Khối Sales', title: '104.5% Chỉ Tiêu Doanh Số', desc: 'Xuất sắc vượt mốc doanh số Q4 trước hạn.' },
  { id: '2', code: 'KPI-0002', tag: 'KPI Khối Vận Hành Kho', title: '98.2% Chuẩn Đúng Hạn', desc: 'Giảm thiểu tối đa hư hỏng & giao trễ.' },
  { id: '3', code: 'KPI-0003', tag: 'Đánh Giá 360 Độ', title: 'Kỳ Đánh Giá Cuối Năm 2026', desc: 'Mở cổng tự đánh giá từ 15/12/2026.' },
]

export const attendanceRepo = withRules(createMemoryRepo(attendance, { codePrefix: 'CC', searchFields: ['emp_code', 'full_name', 'device'] }), (r) => {
  if (Number.isNaN(mins(r.check_in))) throw new RepoError('Giờ vào phải có dạng HH:MM hoặc HH:MM:SS')
  if (r.check_out && (Number.isNaN(mins(r.check_out)) || mins(r.check_out) < mins(r.check_in))) throw new RepoError('Giờ ra không hợp lệ hoặc trước giờ vào')
})
export const overtimeRepo = withRules(createMemoryRepo(overtimes, { codePrefix: 'OT', searchFields: ['code', 'full_name'] }), (r) => {
  if (Number.isNaN(mins(r.from)) || Number.isNaN(mins(r.to))) throw new RepoError('Khung giờ phải có dạng HH:MM')
  if (mins(r.to) <= mins(r.from)) throw new RepoError('Giờ kết thúc phải sau giờ bắt đầu')
})
const employeeBase = createMemoryRepo(employees, { codePrefix: 'NV', searchFields: ['code', 'full_name', 'department', 'position'] })
async function checkEmployee(r: Employee) {
  if (!(await departmentBase.list({ filters: { code: r.department } })).length) throw new RepoError('Phòng ban không tồn tại')
  if (r.position) {
    const [p] = await positionBase.list({ filters: { code: r.position } })
    if (!p || p.department !== r.department) throw new RepoError('Vị trí không thuộc phòng ban đã chọn')
  }
}
const employeeRules = withRules(employeeBase, checkEmployee)
const heads = async (code: string) => (await departmentBase.list({ filters: { head: code } })).length
const managed = async (code: string) => (await branchBase.list({ filters: { manager: code } })).length
// Vị trí thuộc phòng ban đã chọn; không xoá/đổi mã nhân viên đang là trưởng phòng hoặc người quản lý chi nhánh
export const employeeRepo: Repository<Employee> = {
  ...employeeRules,
  async update(id, patch) {
    const cur = await employeeBase.get(id)
    if (patch.code !== undefined && patch.code !== cur.code && ((await heads(cur.code)) || (await managed(cur.code)))) throw new RepoError('Không thể đổi mã đang được sử dụng')
    return employeeRules.update(id, patch)
  },
  async remove(id) {
    const cur = await employeeBase.get(id)
    const h = await heads(cur.code)
    if (h) throw new RepoError(`Nhân viên đang là trưởng phòng của ${h} phòng ban`)
    const m = await managed(cur.code)
    if (m) throw new RepoError(`Nhân viên đang quản lý ${m} chi nhánh`)
    return employeeBase.remove(id)
  },
}

function checkLeave(r: Leave) {
  if (!r.start || !r.end || r.end < r.start) throw new RepoError('Ngày kết thúc phải sau hoặc bằng ngày bắt đầu')
  return { days: leaveDays(r.start, r.end) }
}
async function employeeOf(code: string) {
  const [e] = await employeeRepo.list({ filters: { code } })
  if (!e) throw new RepoError(`Không tìm thấy nhân viên ${code}`)
  return e
}
// Chỉ "Phép năm" trừ vào số ngày phép năm còn lại; nghỉ bệnh/không lương/khác thì không trừ
async function deductLeave(r: Leave) {
  if (r.type !== 'annual') return
  const e = await employeeOf(r.emp_code)
  if ((r.days ?? 0) > e.leave_days) throw new RepoError(`Không đủ ngày phép năm: ${e.full_name} còn ${e.leave_days} ngày, cần ${r.days} ngày`)
  await employeeRepo.update(e.id, { leave_days: e.leave_days - (r.days ?? 0) })
}
async function refundLeave(r: Leave) {
  if (r.type !== 'annual') return
  const e = await employeeOf(r.emp_code)
  await employeeRepo.update(e.id, { leave_days: e.leave_days + (r.days ?? 0) })
}
const leaveBase = createMemoryRepo(leaves, { codePrefix: 'NP', searchFields: ['code', 'full_name', 'reason'] })
// Duyệt thì trừ phép (không đủ thì không duyệt); đơn đã duyệt khoá ngày/loại/nhân viên, đổi sang trạng thái khác thì hoàn phép
export const leaveRepo: Repository<Leave> = {
  ...leaveBase,
  async create(input) {
    const r = { ...input, ...checkLeave(input as Leave) } as Omit<Leave, 'id' | 'code'> & { code?: string }
    if (r.status === 'approved') await deductLeave(r as Leave)
    try {
      return await leaveBase.create(r)
    } catch (e) {
      if (r.status === 'approved') await refundLeave(r as Leave)
      throw e
    }
  },
  async update(id, patch) {
    const cur = await leaveBase.get(id)
    const merged = { ...cur, ...patch } as Leave
    const extra = checkLeave(merged)
    if (cur.status === 'approved') {
      if (merged.start !== cur.start || merged.end !== cur.end || merged.type !== cur.type || merged.emp_code !== cur.emp_code)
        throw new RepoError('Đơn đã duyệt, không thể sửa thời gian, loại phép hoặc nhân viên')
      if (merged.status !== 'approved') await refundLeave(cur)
    } else if (merged.status === 'approved') {
      await deductLeave({ ...merged, ...extra })
    }
    return leaveBase.update(id, { ...patch, ...extra })
  },
  async remove(id) {
    const cur = await leaveBase.get(id)
    if (cur.status === 'approved') await refundLeave(cur)
    return leaveBase.remove(id)
  },
}
export const formulaRepo = withRules(createMemoryRepo(formulas, { codePrefix: 'CT', searchFields: ['code', 'name', 'departments'] }), async (r) => {
  const codes = r.departments.split(',').filter(Boolean)
  const known = new Set((await departmentBase.list()).map((d) => d.code))
  if (!codes.length || codes.some((c) => !known.has(c))) throw new RepoError('Phòng ban áp dụng không hợp lệ')
})
const payrollBase = createMemoryRepo(payroll, { codePrefix: 'BL', searchFields: ['code', 'full_name'] })
export const payrollRepo = withRules(payrollBase, async (r) => {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(r.month)) throw new RepoError('Tháng không hợp lệ (yyyy-mm)')
  if ((await payrollBase.list({ filters: { emp_code: r.emp_code, month: r.month } })).some((x) => x.id !== r.id))
    throw new RepoError('Nhân viên đã có bảng lương tháng này')
})
export const campaignRepo = createMemoryRepo(campaigns, { codePrefix: 'TD', searchFields: ['title', 'desc', 'tag'] })
export const kpiRepo = createMemoryRepo(kpis, { codePrefix: 'KPI', searchFields: ['title', 'desc', 'tag'] })

const hourly = (base: number) => base / 26 / 8
/** Tiền OT đã duyệt trong tháng (yyyy-mm): giờ × lương giờ (base/26/8) × hệ số, làm tròn. */
export async function overtimePay(empCode: string, base: number, month: string): Promise<number> {
  const list = await overtimeRepo.list({ filters: { emp_code: empCode, status: 'approved' } })
  const pay = list.filter((o) => o.date.startsWith(month)).reduce((s, o) => s + otHours(o.from, o.to) * hourly(base) * (OT_COEF[o.type] ?? 1), 0)
  return Math.round(pay)
}

/** Tính lương tháng: mỗi nhân viên đang làm việc một dòng (base từ hồ sơ, bonus = tiền OT). Chạy lại thì cập nhật, không nhân đôi. */
export async function runPayroll(month: string): Promise<{ created: number; updated: number }> {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new RepoError('Tháng không hợp lệ (yyyy-mm)')
  let created = 0
  let updated = 0
  for (const e of await employeeRepo.list({ filters: { status: 'active' } })) {
    const row = { emp_code: e.code, month, full_name: e.full_name, base: e.base_salary, bonus: await overtimePay(e.code, e.base_salary, month) }
    const [cur] = (await payrollRepo.list({ filters: { emp_code: e.code, month } }))
    if (cur) {
      await payrollRepo.update(cur.id, row)
      updated++
    } else {
      await payrollRepo.create({ ...row, code: `BL-${month.replace('-', '')}-${e.code}` })
      created++
    }
  }
  return { created, updated }
}
