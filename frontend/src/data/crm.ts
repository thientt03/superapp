import { createMemoryRepo, type Entity } from './repository'

export interface Opportunity extends Entity { title: string; customer: string; value: number; owner: string; stage: string; age: string }
export interface Customer extends Entity { name: string; tax_code: string; rep: string; phone: string; email: string; industry: string; tier: string; revenue: number }
export interface SegmentRule extends Entity { tier: string; condition: string; action: string; discount: number; priority: number; status: string }
export interface Activity extends Entity { title: string; customer: string; date: string; time: string; location: string }
export interface Ticket extends Entity { title: string; detail: string; customer: string; phone: string; channel: string; priority: string; status: string; sla: string; owner: string }

export const STAGES = [
  { value: '1', label: '1. Mới tiếp cận', dot: 'bg-blue-500' },
  { value: '2', label: '2. Đã gửi báo giá', dot: 'bg-amber-500' },
  { value: '3', label: '3. Thương lượng', dot: 'bg-purple-500' },
  { value: '4', label: '4. Chốt hợp đồng', dot: 'bg-emerald-500' },
]

const opportunities: Opportunity[] = [
  { id: '1', code: 'CH-0001', title: 'Dự án Cung cấp Nội thất Vp', customer: 'Tập đoàn ABC', value: 120_000_000, owner: 'Lê Văn Tùng', stage: '1', age: '2 ngày trước' },
  { id: '2', code: 'CH-0002', title: 'Nâng cấp hệ thống Server', customer: 'Công ty công nghệ X', value: 85_000_000, owner: 'Trần Thị Hoa', stage: '1', age: 'Hôm nay' },
  { id: '3', code: 'CH-0003', title: 'Cung cấp Thép Tấm Chịu Nhiệt', customer: 'Cty Nam Long', value: 340_000_000, owner: 'Phạm Minh', stage: '2', age: '1 ngày trước' },
  { id: '4', code: 'CH-0004', title: 'Gia công kết cấu thép giai đoạn 2', customer: 'Tập đoàn Hòa Bình', value: 650_000_000, owner: 'Lê Văn Tùng', stage: '3', age: 'Hôm nay' },
  { id: '5', code: 'CH-0005', title: 'Hợp đồng bảo trì hệ thống 1 năm', customer: 'Khách sạn Lotte', value: 210_000_000, owner: 'Trần Thị Hoa', stage: '4', age: 'Vừa chốt xong' },
]

const customers: Customer[] = [
  { id: '1', code: 'KH-0089', name: 'Tập Đoàn Xây Dựng Hòa Bình', tax_code: '0301234567', rep: 'Ông Nguyễn Hoài Nam', phone: '0903.888.999', email: 'nam.nh@hoabinh.com', industry: 'Xây Dựng / BĐS', tier: 'VIP Platinum', revenue: 1_450_000_000 },
  { id: '2', code: 'KH-0090', name: 'Công ty Cổ phần Công nghệ TMA', tax_code: '0319876543', rep: 'Bà Trần Mai Linh', phone: '0912.345.678', email: 'linh.tm@tma.vn', industry: 'Công Nghệ / CNTT', tier: 'Gold Partner', revenue: 820_000_000 },
]

const segments: SegmentRule[] = [
  { id: '1', code: 'QT-0001', tier: 'VIP Platinum', condition: 'Doanh số tích lũy >= 1.000.000.000 ₫ HOẶC >= 10 đơn/năm', action: 'Gán thẻ VIP Platinum, ưu tiên hỗ trợ 24/7', discount: 15, priority: 1, status: 'active' },
  { id: '2', code: 'QT-0002', tier: 'Gold Partner', condition: 'Doanh số tích lũy 500.000.000 ₫ - 999.999.999 ₫', action: 'Gán thẻ Gold Partner', discount: 10, priority: 2, status: 'active' },
  { id: '3', code: 'QT-0003', tier: 'Khách Hàng Mới', condition: 'Vừa khởi tạo hồ sơ hoặc chưa phát sinh đơn hàng lớn', action: 'Gán thẻ Khách Hàng Mới, gửi email chào mừng', discount: 5, priority: 3, status: 'default' },
]

const activities: Activity[] = [
  { id: '1', code: 'LH-0001', title: 'Cuộc họp đàm phán hợp đồng', customer: 'Tập đoàn Hòa Bình', date: '2026-11-02', time: '14:00', location: 'Phòng họp A1' },
  { id: '4', code: 'LH-0004', title: 'Gọi chăm sóc khách VIP', customer: 'Tập đoàn Hòa Bình', date: '2026-11-02', time: '16:00', location: 'Điện thoại' },
  { id: '2', code: 'LH-0002', title: 'Ký kết vật tư Q4', customer: 'Kho chính', date: '2026-11-05', time: '09:00', location: 'Kho chính' },
  { id: '3', code: 'LH-0003', title: 'Khảo sát máy lạnh', customer: 'Cty TMA', date: '2026-11-09', time: '10:30', location: 'Cty TMA' },
]

const tickets: Ticket[] = [
  { id: '1', code: 'TCK-0921', title: 'Lỗi kết nối API ERP tại chi nhánh Thủ Đức', detail: 'Hệ thống không đồng bộ đơn hàng về kho từ 9h sáng nay...', customer: 'Cty Cổ Phần Công Nghệ TMA', phone: '0912.345.678', channel: 'Hotline CSKH', priority: 'urgent', status: 'in_progress', sla: 'Còn 45 phút', owner: 'Lê Văn Tùng' },
  { id: '2', code: 'TCK-0922', title: 'Giao thiếu vật tư thép tấm theo PO-2026-089', detail: 'Đơn hàng giao ngày 31/10 thiếu 5 tấm thép 5mm...', customer: 'Tập Đoàn Xây Dựng Hòa Bình', phone: '0903.888.999', channel: 'Email Portal', priority: 'high', status: 'new', sla: 'Còn 4 giờ', owner: 'Phạm Minh' },
  { id: '3', code: 'TCK-0918', title: 'Yêu cầu cấp lại hóa đơn GTGT điện tử', detail: 'Khách hàng bị thất lạc email hóa đơn tháng 10...', customer: 'Công ty Cổ phần Nam Long', phone: '0988.777.666', channel: 'Zalo OA', priority: 'medium', status: 'resolved', sla: 'Đúng hạn', owner: 'Trần Thị Hoa' },
]

export const opportunityRepo = createMemoryRepo(opportunities, { codePrefix: 'CH', searchFields: ['title', 'customer', 'owner'] })
export const customerRepo = createMemoryRepo(customers, { codePrefix: 'KH', searchFields: ['name', 'code', 'rep', 'tax_code'] })
export const segmentRepo = createMemoryRepo(segments, { codePrefix: 'QT', searchFields: ['tier', 'condition'] })
export const activityRepo = createMemoryRepo(activities, { codePrefix: 'LH', searchFields: ['title', 'customer', 'location'] })
export const ticketRepo = createMemoryRepo(tickets, { codePrefix: 'TCK', searchFields: ['code', 'title', 'customer'] })
