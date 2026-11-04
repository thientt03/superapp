import { createMemoryRepo, type Entity } from './repository'

export interface Quotation extends Entity { customer: string; issued: string; valid_until: string; total: number; status: string; owner: string }
export interface SalesOrder extends Entity { customer: string; ordered: string; total: number; payment: string; delivery: string }
export interface Contract extends Entity { name: string; customer: string; value: number; start: string; end: string; status: string }
export interface PriceList extends Entity { name: string; policy: string; discount: number; note: string }

const quotations: Quotation[] = [
  { id: '1', code: 'BG-2026-042', customer: 'Tập Đoàn Xây Dựng Hòa Bình', issued: '2026-11-01', valid_until: '2026-11-15', total: 650_000_000, status: 'pending', owner: 'Lê Văn Tùng' },
  { id: '2', code: 'BG-2026-041', customer: 'Công Ty Cổ Phần Công Nghệ TMA', issued: '2026-10-28', valid_until: '2026-11-10', total: 210_000_000, status: 'accepted', owner: 'Trần Thị Hoa' },
]
const orders: SalesOrder[] = [
  { id: '1', code: 'SO-2026-0189', customer: 'Tập Đoàn Xây Dựng Hòa Bình', ordered: '2026-11-01', total: 650_000_000, payment: 'deposit', delivery: 'shipping_out' },
]
const contracts: Contract[] = [
  { id: '1', code: 'HD-2026-088', name: 'Cung cấp kết cấu thép giai đoạn 2', customer: 'Tập Đoàn Xây Dựng Hòa Bình', value: 1_250_000_000, start: '2026-11-01', end: '2027-12-31', status: 'active' },
]
const priceLists: PriceList[] = [
  { id: '1', code: 'BGIA-0001', name: 'Bảng Giá VIP Platinum', policy: 'Chiết khấu 15% Toàn Danh Mục', discount: 15, note: 'Áp dụng cho khách hàng doanh nghiệp có doanh số > 1 Tỷ VNĐ.' },
  { id: '2', code: 'BGIA-0002', name: 'Bảng Giá Gold Partner', policy: 'Chiết khấu 10% Toàn Danh Mục', discount: 10, note: 'Áp dụng cho đối tác đạt từ 500 Triệu VNĐ.' },
  { id: '3', code: 'BGIA-0003', name: 'Bảng Giá Chuẩn (Retail)', policy: 'Giá Niêm Yết Tiêu Chuẩn', discount: 0, note: 'Áp dụng cho khách hàng mới và bán lẻ.' },
]

export const quotationRepo = createMemoryRepo(quotations, { codePrefix: 'BG', searchFields: ['code', 'customer', 'owner'] })
export const orderRepo = createMemoryRepo(orders, { codePrefix: 'SO', searchFields: ['code', 'customer'] })
export const contractRepo = createMemoryRepo(contracts, { codePrefix: 'HD', searchFields: ['code', 'name', 'customer'] })
export const priceListRepo = createMemoryRepo(priceLists, { codePrefix: 'BGIA', searchFields: ['name', 'policy'] })
