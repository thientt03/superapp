import { createMemoryRepo, RepoError, withRules, type Entity, type Repository } from './repository'

export interface CashVoucher extends Entity { date: string; kind: string; partner: string; memo: string; method: string; amount: number; ref?: string; applied?: boolean }
export interface Receivable extends Entity { customer: string; so: string; due: string; total: number; paid: number }
export interface Payable extends Entity { vendor: string; po: string; due: string; total: number; paid: number }
export interface Invoice extends Entity { series: string; customer: string; tax_code: string; date: string; net: number; vat_rate: number; status: string }
export interface LedgerEntry extends Entity { date: string; memo: string; debit_account: string; debit_amount: number; credit_account: string; credit_amount: number }

export const ACCOUNTS = [
  { value: '111', label: '111 - Tiền mặt' },
  { value: '112', label: '112 - Tiền gửi ngân hàng' },
  { value: '131', label: '131 - Phải thu khách hàng' },
  { value: '156', label: '156 - Hàng hóa' },
  { value: '331', label: '331 - Phải trả nhà cung cấp' },
  { value: '511', label: '511 - Doanh thu bán hàng' },
  { value: '632', label: '632 - Giá vốn hàng bán' },
]

const cash: CashVoucher[] = [
  { id: '1', code: 'PT-2026-0189', date: '2026-11-01', kind: 'in', partner: 'Tập Đoàn Xây Dựng Hòa Bình', memo: 'Thanh toán cọc 30% Đơn hàng SO-2026-0189', method: 'Chuyển Khoản VCB', amount: 195_000_000, ref: 'SO-2026-0189', applied: true },
  { id: '2', code: 'PC-2026-0094', date: '2026-11-01', kind: 'out', partner: 'Tập Đoàn Thép Việt Nhật', memo: 'Thanh toán tiền nhập vật tư PO-2026-089', method: 'Chuyển Khoản TCB', amount: 45_000_000, ref: 'PO-2026-089', applied: true },
]
const receivables: Receivable[] = [
  { id: '1', code: 'AR-0001', customer: 'Tập Đoàn Xây Dựng Hòa Bình', so: 'SO-2026-0189', due: '2026-11-30', total: 650_000_000, paid: 195_000_000 },
]
const payables: Payable[] = [
  { id: '1', code: 'AP-0001', vendor: 'Tập Đoàn Thép Việt Nhật', po: 'PO-2026-089', due: '2026-11-15', total: 45_000_000, paid: 45_000_000 },
]
const invoices: Invoice[] = [
  { id: '1', code: '0001248', series: '1/001 - C26TKN', customer: 'Tập Đoàn Xây Dựng Hòa Bình', tax_code: '0301234567', date: '2026-11-01', net: 180_555_556, vat_rate: 8, status: 'verified' },
]
const ledger: LedgerEntry[] = [
  { id: '1', code: 'BT-0001', date: '2026-11-01', memo: 'Thu cọc 30% SO-2026-0189', debit_account: '112', debit_amount: 195_000_000, credit_account: '131', credit_amount: 195_000_000 },
  { id: '2', code: 'BT-0002', date: '2026-11-01', memo: 'Trả tiền vật tư PO-2026-089', debit_account: '331', debit_amount: 45_000_000, credit_account: '112', credit_amount: 45_000_000 },
]

export const vat = (net: number, rate: number) => Math.round((net * rate) / 100)

const paidRule = (r: { total: number; paid: number }) => {
  if (r.paid < 0 || r.paid > r.total) throw new RepoError('Số đã thanh toán phải từ 0 đến tổng giá trị')
}
export const receivableRepo = withRules(createMemoryRepo(receivables, { codePrefix: 'AR', searchFields: ['customer', 'so'] }), paidRule)
export const payableRepo = withRules(createMemoryRepo(payables, { codePrefix: 'AP', searchFields: ['vendor', 'po'] }), paidRule)

export const invoiceRepo = withRules(createMemoryRepo(invoices, { codePrefix: 'HDDT', searchFields: ['code', 'customer', 'tax_code'] }), (r) => {
  if (!(r.net > 0)) throw new RepoError('Tiền chưa thuế phải lớn hơn 0')
  if (![0, 5, 8, 10].includes(Number(r.vat_rate))) throw new RepoError('Thuế suất VAT phải là 0, 5, 8 hoặc 10%')
})

// Bút toán chỉ lưu khi Nợ = Có (> 0) và hai tài khoản khác nhau
export const ledgerRepo = withRules(createMemoryRepo(ledger, { codePrefix: 'BT', searchFields: ['code', 'memo'] }), (r) => {
  if (!(r.debit_amount > 0) || !(r.credit_amount > 0)) throw new RepoError('Số tiền Nợ và Có phải lớn hơn 0')
  if (r.debit_amount !== r.credit_amount) throw new RepoError('Bút toán không cân: tổng Nợ phải bằng tổng Có')
  if (r.debit_account === r.credit_account) throw new RepoError('Tài khoản Nợ và Có phải khác nhau')
})

// Phiếu thu/chi có tham chiếu SO (thu) hoặc PO (chi) khớp công nợ thì cộng vào "đã thanh toán" (không vượt dư nợ).
// Phiếu đã ghi vào công nợ thì không sửa/xoá.
const cashBase = createMemoryRepo(cash, { codePrefix: 'PT', searchFields: ['code', 'partner', 'memo', 'ref'] })
export const cashRepo: Repository<CashVoucher> = {
  ...cashBase,
  async create(input) {
    if (!(input.amount > 0)) throw new RepoError('Số tiền phải lớn hơn 0')
    if (input.kind !== 'in' && input.kind !== 'out') throw new RepoError('Loại phiếu phải là thu hoặc chi')
    // mã tự sinh theo loại phiếu: PT (thu) / PC (chi), số thứ tự sau số lớn nhất cùng loại
    const prefix = input.kind === 'in' ? 'PT' : 'PC'
    const maxSeq = Math.max(0, ...(await cashBase.list()).filter((v) => v.code.startsWith(`${prefix}-`)).map((v) => Number(/(\d+)$/.exec(v.code)?.[1] ?? 0)))
    const code = input.code || `${prefix}-${(input.date || '').slice(0, 4)}-${String(maxSeq + 1).padStart(4, '0')}`
    const ref = input.ref?.trim()
    let applied = false
    let debt: { repo: Repository<Receivable | Payable>; row: Receivable | Payable } | undefined
    if (ref) {
      const repo = (input.kind === 'in' ? receivableRepo : payableRepo) as Repository<Receivable | Payable>
      const rows = await repo.list()
      const row = rows.find((x) => ('so' in x ? x.so : x.po) === ref)
      if (row) {
        const left = row.total - row.paid
        if (input.amount > left) throw new RepoError(`Số tiền vượt dư nợ còn lại (${left})`)
        debt = { repo, row }
      }
    }
    const v = await cashBase.create({ ...input, code, ref, applied })
    if (debt) {
      await debt.repo.update(debt.row.id, { paid: debt.row.paid + input.amount })
      return cashBase.update(v.id, { applied: true })
    }
    return v
  },
  async update(id, patch) {
    if ((await cashBase.get(id)).applied) throw new RepoError('Phiếu đã ghi nhận vào công nợ, không thể sửa')
    return cashBase.update(id, patch)
  },
  async remove(id) {
    if ((await cashBase.get(id)).applied) throw new RepoError('Phiếu đã ghi nhận vào công nợ, không thể xóa')
    return cashBase.remove(id)
  },
}

/** Tồn quỹ = Σ thu − Σ chi; tổng thu/chi của tháng (yyyy-mm). */
export function cashSummary(list: CashVoucher[], month: string) {
  const sum = (kind: string, ms?: string) => list.filter((v) => v.kind === kind && (!ms || v.date.startsWith(ms))).reduce((s, v) => s + v.amount, 0)
  const inM = sum('in', month)
  const outM = sum('out', month)
  return { balance: sum('in') - sum('out'), inMonth: inM, outMonth: outM, netMonth: inM - outM, inCount: list.filter((v) => v.kind === 'in' && v.date.startsWith(month)).length }
}

/** Tháng (yyyy-mm) của phiếu thu/chi mới nhất; dùng làm kỳ xem mặc định. */
export const latestMonth = (list: CashVoucher[]) => list.map((v) => v.date.slice(0, 7)).sort().at(-1) ?? new Date().toISOString().slice(0, 7)
