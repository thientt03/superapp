import { createMemoryRepo, RepoError, withRules, type Entity, type Repository } from './repository'
import { branchBase, departmentBase, positionBase, type Branch, type Department, type Position } from './org'
import { employeeRepo, formulaRepo } from './hr'

export type { Branch, Department, Position } from './org'

export interface AppUser extends Entity { full_name: string; username: string; role: string; branch: string; status: string }
export interface Role extends Entity { name: string; scope: string }
export interface Company extends Entity { name: string; tax_code: string; legal_rep: string; phone: string; address: string }

const users: AppUser[] = [
  { id: '1', code: 'NV-0001', full_name: 'Trần Hoàng Minh', username: 'ceo.minhth', role: 'ROLE-ADMIN', branch: 'HCM-HQ', status: 'active' },
  { id: '2', code: 'NV-0012', full_name: 'Lê Văn Tùng', username: 'tung.lv', role: 'ROLE-SALE-LEAD', branch: 'HCM-TD', status: 'active' },
  { id: '3', code: 'NV-0015', full_name: 'Trần Thị Hoa', username: 'hoa.tt', role: 'ROLE-SALE', branch: 'HCM-HQ', status: 'active' },
  { id: '4', code: 'NV-0021', full_name: 'Nguyễn Văn An', username: 'an.nv', role: 'ROLE-WAREHOUSE', branch: 'HCM-TD', status: 'active' },
  { id: '5', code: 'NV-0030', full_name: 'Phạm Minh', username: 'minh.p', role: 'ROLE-ACCOUNTANT', branch: 'HCM-HQ', status: 'active' },
]
const roles: Role[] = [
  { id: '1', code: 'ROLE-ADMIN', name: 'Quản Trị Viên Tối Cao (Admin)', scope: 'Toàn quyền truy cập tất cả phân hệ, cấu hình hệ thống và duyệt ngân sách.' },
  { id: '2', code: 'ROLE-SALE-LEAD', name: 'Trưởng Nhóm Sales (Sale Lead)', scope: 'Quản lý CRM, tạo báo giá, duyệt đơn bán hàng SO dưới 500 Triệu ₫.' },
  { id: '3', code: 'ROLE-SALE', name: 'Nhân Viên Kinh Doanh (Sales Exec)', scope: 'Tạo cơ hội, khách hàng và báo giá thuộc phạm vi phụ trách.' },
  { id: '4', code: 'ROLE-WAREHOUSE', name: 'Thủ Kho & Quản Lý Kho', scope: 'Xử lý nhập kho (GR), xuất kho (GI), kiểm kê và điều chuyển kho.' },
  { id: '5', code: 'ROLE-ACCOUNTANT', name: 'Kế Toán Trưởng & Thu Ngân', scope: 'Quản lý thu chi quỹ, công nợ AR/AP và phát hành hóa đơn VAT điện tử.' },
]
const company: Company[] = [
  { id: '1', code: 'CTY-0001', name: 'CÔNG TY CỔ PHẦN TẬP ĐOÀN NGAYDEM ENTERPRISE VIỆT NAM', tax_code: '0315892341', legal_rep: 'Trần Hoàng Minh', phone: '028 3822 9999', address: 'Tòa nhà NgayDem Tower, Số 38 Đ. Lê Duẩn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh' },
]

const userBase = createMemoryRepo(users, { codePrefix: 'NV', searchFields: ['code', 'full_name', 'username'] })
const uniqueUsername = async (username: string, exceptId?: string) => {
  if ((await userBase.list()).some((u) => u.username.toLowerCase() === username.toLowerCase() && u.id !== exceptId)) throw new RepoError('Tên đăng nhập đã tồn tại')
}
// Tên đăng nhập không trùng
export const userRepo: Repository<AppUser> = {
  ...userBase,
  async create(input) {
    await uniqueUsername(input.username)
    return userBase.create(input)
  },
  async update(id, patch) {
    if (patch.username !== undefined) await uniqueUsername(patch.username, id)
    return userBase.update(id, patch)
  },
}

const roleBase = createMemoryRepo(roles, { codePrefix: 'ROLE', searchFields: ['code', 'name', 'scope'] })
// Không xoá nhóm quyền đang gán cho tài khoản
export const roleRepo: Repository<Role> = {
  ...roleBase,
  async remove(id) {
    const r = await roleBase.get(id)
    const n = (await userBase.list({ filters: { role: r.code } })).length
    if (n) throw new RepoError(`Nhóm quyền đang được gán cho ${n} tài khoản`)
    return roleBase.remove(id)
  },
}
const codeChanged = <T extends Entity>(cur: T, patch: Partial<T>) => patch.code !== undefined && patch.code !== cur.code
const inUseCode = () => new RepoError('Không thể đổi mã đang được sử dụng')
const codes = (s: string) => s.split(',').filter(Boolean)

// Chi nhánh: không xoá/đổi mã khi còn phòng ban
export const branchRepo: Repository<Branch> = {
  ...branchBase,
  async update(id, patch) {
    const cur = await branchBase.get(id)
    if (codeChanged(cur, patch) && (await departmentBase.list({ filters: { branch: cur.code } })).length) throw inUseCode()
    return branchBase.update(id, patch)
  },
  async remove(id) {
    const cur = await branchBase.get(id)
    const n = (await departmentBase.list({ filters: { branch: cur.code } })).length
    if (n) throw new RepoError(`Chi nhánh đang có ${n} phòng ban`)
    return branchBase.remove(id)
  },
}

// Phòng ban cha phải tồn tại, không phải chính nó hay con cháu của nó
async function checkParent(r: Department, id?: string) {
  if (!r.parent) return
  const all = await departmentBase.list()
  let p = all.find((d) => d.code === r.parent)
  for (let i = 0; p && i <= all.length; i++) {
    if (p.id === id) throw new RepoError('Phòng ban cha không hợp lệ')
    p = all.find((d) => d.code === p!.parent)
  }
  if (!all.some((d) => d.code === r.parent)) throw new RepoError('Phòng ban cha không hợp lệ')
}
// Mã được nối bằng dấu phẩy trong công thức lương nên chỉ nhận ký tự an toàn
// strict (update): mã rỗng cũng bị từ chối; create để rỗng thì tự sinh
function cleanCode<T extends { code?: string }>(r: T, strict = false): T {
  if (r.code === undefined || (!r.code && !strict)) return r
  const code = r.code.trim()
  if (!/^[A-Za-z0-9_-]+$/.test(code)) throw new RepoError('Mã phòng ban không hợp lệ')
  return { ...r, code }
}
export const departmentRepo: Repository<Department> = {
  ...departmentBase,
  async create(input) {
    await checkParent(input as Department)
    return departmentBase.create(cleanCode(input))
  },
  async update(id, patch) {
    const cur = await departmentBase.get(id)
    patch = cleanCode(patch, true)
    await checkParent({ ...cur, ...patch }, id)
    if (codeChanged(cur, patch)) {
      const used =
        (await employeeRepo.list({ filters: { department: cur.code } })).length ||
        (await positionBase.list({ filters: { department: cur.code } })).length ||
        (await departmentBase.list({ filters: { parent: cur.code } })).length ||
        (await formulaRepo.list()).some((f) => codes(f.departments).includes(cur.code))
      if (used) throw inUseCode()
    }
    return departmentBase.update(id, patch)
  },
  async remove(id) {
    const cur = await departmentBase.get(id)
    const emp = (await employeeRepo.list({ filters: { department: cur.code } })).length
    if (emp) throw new RepoError(`Phòng ban đang có ${emp} nhân viên`)
    const pos = (await positionBase.list({ filters: { department: cur.code } })).length
    if (pos) throw new RepoError(`Phòng ban đang có ${pos} vị trí công việc`)
    const kids = (await departmentBase.list({ filters: { parent: cur.code } })).length
    if (kids) throw new RepoError(`Phòng ban đang có ${kids} phòng ban con`)
    const fx = (await formulaRepo.list()).filter((f) => codes(f.departments).includes(cur.code)).length
    if (fx) throw new RepoError(`Phòng ban đang dùng trong ${fx} công thức lương`)
    return departmentBase.remove(id)
  },
}

// Vị trí: không xoá/đổi mã khi đang gán cho nhân viên
export const positionRepo: Repository<Position> = {
  ...positionBase,
  async update(id, patch) {
    const cur = await positionBase.get(id)
    if (codeChanged(cur, patch) && (await employeeRepo.list({ filters: { position: cur.code } })).length) throw inUseCode()
    if (patch.department !== undefined && patch.department !== cur.department) {
      const n = (await employeeRepo.list({ filters: { position: cur.code } })).length
      if (n) throw new RepoError(`Vị trí đang có ${n} nhân viên, không thể đổi phòng ban`)
    }
    return positionBase.update(id, patch)
  },
  async remove(id) {
    const cur = await positionBase.get(id)
    const n = (await employeeRepo.list({ filters: { position: cur.code } })).length
    if (n) throw new RepoError(`Vị trí đang được gán cho ${n} nhân viên`)
    return positionBase.remove(id)
  },
}

// Một bản ghi duy nhất: mã số thuế 10 hoặc 13 chữ số
export const companyRepo = withRules(createMemoryRepo(company, { codePrefix: 'CTY', searchFields: ['name'] }), (r) => {
  if (!r.name.trim()) throw new RepoError('Tên doanh nghiệp là bắt buộc')
  if (!/^\d{10}(-?\d{3})?$/.test(r.tax_code.trim())) throw new RepoError('Mã số thuế phải gồm 10 hoặc 13 chữ số')
})
