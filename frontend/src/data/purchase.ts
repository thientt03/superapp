import { receiptRepo } from './inventory'
import { createMemoryRepo, RepoError, type Entity } from './repository'

export interface PurchasePlan extends Entity { name: string; period: string; budget: number; status: string; owner: string }
export interface PurchaseReq extends Entity { dept: string; content: string; need_date: string; priority: string; status: string; sku?: string; qty?: number }
export interface Rfq extends Entity { sku?: string; name: string; qty: number; unit: string; vendors_count: number; lowest_price: number; best_vendor: string; status: string }
export interface Vendor extends Entity { name: string; rep: string; phone: string; group: string; rating: number }
export interface PurchaseOrder extends Entity { vendor: string; ordered: string; total: number; status: string; sku?: string; qty?: number }
export interface PurchaseContract extends Entity { name: string; vendor: string; value: number; start: string; end: string }

const plans: PurchasePlan[] = [
  { id: '1', code: 'PLAN-2026-Q4', name: 'Kế hoạch nhập Thép & Nguyên liệu Sản xuất Q4/2026', period: 'Quý 4/2026', budget: 1_850_000_000, status: 'approved', owner: 'Nguyễn Văn An' },
]
const reqs: PurchaseReq[] = [
  { id: '1', code: 'PR-2026-045', dept: 'Bộ Phận Quản Lý Kho', content: 'Bổ sung 20 Tấm Thép Chịu Nhiệt 5mm (Tồn kho chạm ngưỡng tối thiểu)', need_date: '2026-11-05', priority: 'urgent', status: 'pending_board', sku: 'SKU-TH-5MM', qty: 20 },
]
const rfqs: Rfq[] = [
  { id: '1', code: 'RFQ-2026-012', sku: 'SKU-TH-5MM', name: 'Cung cấp Thép Tấm 5mm x 50 tấm', qty: 50, unit: 'Tấm', vendors_count: 3, lowest_price: 2_150_000, best_vendor: 'Tập Đoàn Thép Việt Nhật', status: 'analyzing' },
]
const vendors: Vendor[] = [
  { id: '1', code: 'NCC-0012', name: 'Tập Đoàn Thép Việt Nhật', rep: 'Ông Trần Văn Hùng', phone: '0918.222.333', group: 'Sắt Thép & Kim Loại', rating: 4.9 },
]
const orders: PurchaseOrder[] = [
  { id: '1', code: 'PO-2026-089', vendor: 'Tập Đoàn Thép Việt Nhật', ordered: '2026-11-01', total: 45_000_000, status: 'receiving', sku: 'SKU-TH-5MM', qty: 20 },
]
const contracts: PurchaseContract[] = [
  { id: '1', code: 'HDM-2026-008', name: 'Hợp đồng khung Cung cấp Phôi Thép 2026', vendor: 'Tập Đoàn Thép Việt Nhật', value: 3_500_000_000, start: '2026-01-01', end: '2026-12-31' },
]

export const planRepo = createMemoryRepo(plans, { codePrefix: 'PLAN', searchFields: ['code', 'name', 'owner'] })
export const reqRepo = createMemoryRepo(reqs, { codePrefix: 'PR', searchFields: ['code', 'dept', 'content'] })
export const rfqRepo = createMemoryRepo(rfqs, { codePrefix: 'RFQ', searchFields: ['code', 'name', 'best_vendor'] })
export const vendorRepo = createMemoryRepo(vendors, { codePrefix: 'NCC', searchFields: ['code', 'name', 'rep', 'group'] })
export const poRepo = createMemoryRepo(orders, { codePrefix: 'PO', searchFields: ['code', 'vendor'] })
export const purchaseContractRepo = createMemoryRepo(contracts, { codePrefix: 'HDM', searchFields: ['code', 'name', 'vendor'] })

// PO "Nhập Kho (GR)": tạo phiếu nhập kho hoàn tất (cộng tồn qua logic nhập kho) rồi đánh dấu PO đã nhập.
// Lỗi (thiếu SKU/số lượng, SKU không tồn tại) thì không đổi gì.
export async function receivePo(id: string) {
  const po = await poRepo.get(id)
  if (po.status === 'received') throw new RepoError('PO đã nhập kho')
  if (!po.sku || !po.qty) throw new RepoError('PO chưa có mã SKU và số lượng để nhập kho')
  const gr = await receiptRepo.create({
    po: po.code, vendor: po.vendor, date: new Date().toISOString().slice(0, 10),
    warehouse: 'Kho Tổng Thủ Đức', keeper: '', qc: 'pass', sku: po.sku, qty: po.qty, state: 'done',
  })
  await poRepo.update(po.id, { status: 'received' })
  return gr
}
