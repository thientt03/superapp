import { createMemoryRepo, type Entity } from './repository'

// Danh mục tổ chức THÔ (không rule). Màn hình dùng branchRepo/departmentRepo/positionRepo trong settings.ts.
export interface Branch extends Entity { name: string; address: string; manager: string }
export interface Department extends Entity { name: string; parent: string; branch: string; head: string; status: string }
export interface Position extends Entity { name: string; department: string; level: string; status: string }

const branches: Branch[] = [
  { id: '1', code: 'HCM-HQ', name: 'Trụ Sở Chính TP.HCM & Kho Tổng', address: 'Tòa nhà Nexus Tower, Quận 1, TP.HCM', manager: '' },
  { id: '2', code: 'HCM-TD', name: 'Chi Nhánh Thủ Đức & Kho Cơ Khí', address: 'Khu Công Nghệ Phường Linh Trung, Thủ Đức', manager: 'NV-0008' },
  { id: '3', code: 'HN-BD', name: 'Chi Nhánh Miền Bắc (Hà Nội)', address: 'Phố Duy Tân, Quận Cầu Giấy, Hà Nội', manager: '' },
]
const departments: Department[] = [
  { id: '1', code: 'PB-0001', name: 'Phòng Kinh Doanh', parent: '', branch: 'HCM-HQ', head: 'NV-0012', status: 'active' },
  { id: '2', code: 'PB-0002', name: 'Phòng Kho Vận', parent: '', branch: 'HCM-TD', head: 'NV-0008', status: 'active' },
  { id: '3', code: 'PB-0003', name: 'Phòng Kế Toán', parent: '', branch: 'HCM-HQ', head: '', status: 'active' },
  { id: '4', code: 'PB-0004', name: 'Nhóm Sales B2B', parent: 'PB-0001', branch: 'HCM-HQ', head: '', status: 'active' },
]
const positions: Position[] = [
  { id: '1', code: 'VT-0001', name: 'Trưởng Nhóm Sales (Sale Lead)', department: 'PB-0001', level: 'lead', status: 'active' },
  { id: '2', code: 'VT-0002', name: 'Nhân Viên Kinh Doanh (Sales Exec)', department: 'PB-0001', level: 'staff', status: 'active' },
  { id: '3', code: 'VT-0003', name: 'Chuyên Viên Sales', department: 'PB-0001', level: 'specialist', status: 'active' },
  { id: '4', code: 'VT-0004', name: 'Trưởng Phòng Kho', department: 'PB-0002', level: 'manager', status: 'active' },
  { id: '5', code: 'VT-0005', name: 'Kế Toán Viên', department: 'PB-0003', level: 'staff', status: 'active' },
]

export const branchBase = createMemoryRepo(branches, { codePrefix: 'CN', searchFields: ['code', 'name', 'address'] })
export const departmentBase = createMemoryRepo(departments, { codePrefix: 'PB', searchFields: ['code', 'name'] })
export const positionBase = createMemoryRepo(positions, { codePrefix: 'VT', searchFields: ['code', 'name'] })
