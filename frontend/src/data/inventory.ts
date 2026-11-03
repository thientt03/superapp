import { createMemoryRepo, RepoError, type Entity, type Repository } from './repository'

export interface Item extends Entity { name: string; warehouse: string; qty: number; min_qty: number; unit: string; cost: number }
// state: draft = chưa ảnh hưởng tồn kho; done/closed = đã ghi vào tồn kho, khoá số lượng
export interface Receipt extends Entity { po: string; vendor: string; date: string; warehouse: string; keeper: string; qc: string; sku: string; qty: number; state: string }
export interface Issue extends Entity { so: string; customer: string; date: string; warehouse: string; status: string; sku: string; qty: number; state: string }
export interface Audit extends Entity { warehouse: string; date: string; council: string; sku: string; actual: number; system_qty?: number; diff?: number; state: string }
export interface Transfer extends Entity { item: string; from: string; to: string; date: string; status: string }

const items: Item[] = [
  { id: '1', code: 'SKU-TH-5MM', name: 'Thép Tấm Chịu Nhiệt 5mm (Khổ 1.5x6m)', warehouse: 'Kho Tổng Thủ Đức', qty: 12, min_qty: 20, unit: 'Tấm', cost: 2_250_000 },
  { id: '2', code: 'SKU-NT-VP08', name: 'Bàn Làm Việc Chân Sắt Sơn Tĩnh Điện', warehouse: 'Kho Thành Phẩm Q9', qty: 85, min_qty: 30, unit: 'Cái', cost: 1_450_000 },
]
// seed đã nằm trong qty của SKU nên state = done (không cộng/trừ lại)
const receipts: Receipt[] = [
  { id: '1', code: 'GR-2026-0092', po: 'PO-2026-089', vendor: 'Tập Đoàn Thép Việt Nhật', date: '2026-11-01', warehouse: 'Kho Vật Tư Cơ Khí', keeper: 'Nguyễn Văn An', qc: 'pass', sku: 'SKU-TH-5MM', qty: 10, state: 'done' },
  { id: '2', code: 'GR-2026-0091', po: '', vendor: 'Xưởng Sản Xuất Nội Thất', date: '2026-10-30', warehouse: 'Kho Thành Phẩm Q9', keeper: 'Nguyễn Văn An', qc: 'pass', sku: 'SKU-NT-VP08', qty: 50, state: 'done' },
]
const issues: Issue[] = [
  { id: '1', code: 'GI-2026-0114', so: 'SO-2026-0189', customer: 'Tập Đoàn Xây Dựng Hòa Bình', date: '2026-11-01', warehouse: 'Kho Tổng Thủ Đức', status: 'shipping', sku: 'SKU-TH-5MM', qty: 23, state: 'done' },
  { id: '2', code: 'GI-2026-0113', so: '', customer: 'Khách Lẻ', date: '2026-10-31', warehouse: 'Kho Thành Phẩm Q9', status: 'delivered', sku: 'SKU-NT-VP08', qty: 15, state: 'done' },
]
const audits: Audit[] = [
  { id: '1', code: 'AUD-2026-Q3', warehouse: 'Kho Tổng Thủ Đức', date: '2026-09-30', council: 'Nguyễn Văn An, Kế Toán Kho', sku: 'SKU-TH-5MM', actual: 12, system_qty: 14, diff: -2, state: 'closed' },
]
const transfers: Transfer[] = [
  { id: '1', code: 'TRF-2026-004', item: '50 Bộ Bản Lề Cửa Chống Cháy', from: 'Kho Tổng Thủ Đức', to: 'Kho Chi Nhánh Đà Nẵng', date: '2026-11-01', status: 'in_transit' },
]

export const itemRepo = createMemoryRepo(items, { codePrefix: 'SKU', searchFields: ['code', 'name', 'warehouse'] })
export const transferRepo = createMemoryRepo(transfers, { codePrefix: 'TRF', searchFields: ['code', 'item', 'from', 'to'] })

async function itemOf(sku: string): Promise<Item> {
  const [it] = await itemRepo.list({ filters: { code: sku } })
  if (!it) throw new RepoError(`Không tìm thấy mã SKU ${sku}`)
  return it
}
function positive(qty: number) {
  if (!(qty > 0)) throw new RepoError('Số lượng phải lớn hơn 0')
}

// Bọc repo phiếu: khi phiếu chuyển sang trạng thái cuối thì `post` ghi vào tồn kho (lỗi thì không lưu gì);
// phiếu đã chốt thì khoá sku/qty/state và không xoá được.
function postable<T extends Entity & { state: string }>(
  base: Repository<T>,
  doneState: string,
  post: (r: T) => Promise<Partial<T> | void>,
  locked: (keyof T)[],
): Repository<T> {
  return {
    ...base,
    async create(input) {
      const r = await base.create(input) // lỗi trùng mã dừng ở đây, chưa đụng tồn kho
      if (r.state !== doneState) return r
      try {
        const extra = await post(r)
        return extra ? await base.update(r.id, extra) : r
      } catch (e) {
        await base.remove(r.id) // post lỗi: không để lại phiếu
        throw e
      }
    },
    async update(id, patch) {
      const cur = await base.get(id)
      if (cur.state === doneState) {
        if (locked.some((k) => (patch as Record<string, unknown>)[k as string] !== undefined && (patch as Record<string, unknown>)[k as string] !== cur[k]))
          throw new RepoError('Phiếu đã hoàn tất, không thể sửa số lượng hoặc hủy')
        return base.update(id, patch)
      }
      const merged = { ...cur, ...patch } as T
      const extra = merged.state === doneState ? await post(merged) : undefined
      return base.update(id, { ...patch, ...extra })
    },
    async remove(id) {
      if ((await base.get(id)).state === doneState) throw new RepoError('Phiếu đã hoàn tất, không thể xóa')
      return base.remove(id)
    },
  }
}

const adjust = (it: Item, delta: number) => itemRepo.update(it.id, { qty: it.qty + delta })

// Nhập kho hoàn tất: cộng qty vào SKU
export const receiptRepo = postable<Receipt>(
  createMemoryRepo(receipts, { codePrefix: 'GR', searchFields: ['code', 'po', 'vendor', 'sku'] }),
  'done',
  async (r) => {
    positive(r.qty)
    await adjust(await itemOf(r.sku), r.qty)
  },
  ['sku', 'qty', 'state'],
)

// Xuất kho hoàn tất: trừ qty, chặn khi vượt tồn
export const issueRepo = postable<Issue>(
  createMemoryRepo(issues, { codePrefix: 'GI', searchFields: ['code', 'so', 'customer', 'sku'] }),
  'done',
  async (r) => {
    positive(r.qty)
    const it = await itemOf(r.sku)
    if (r.qty > it.qty) throw new RepoError(`Tồn kho không đủ: ${r.sku} còn ${it.qty} ${it.unit}, cần xuất ${r.qty}`)
    await adjust(it, -r.qty)
  },
  ['sku', 'qty', 'state'],
)

// Chốt kiểm kê: đặt qty = số thực tế, lưu số sổ sách và chênh lệch
export const auditRepo = postable<Audit>(
  createMemoryRepo(audits, { codePrefix: 'AUD', searchFields: ['code', 'warehouse', 'council', 'sku'] }),
  'closed',
  async (r) => {
    if (!(r.actual >= 0)) throw new RepoError('Số thực tế phải ≥ 0')
    const it = await itemOf(r.sku)
    await itemRepo.update(it.id, { qty: r.actual })
    return { system_qty: it.qty, diff: r.actual - it.qty }
  },
  ['sku', 'actual', 'state'],
)
