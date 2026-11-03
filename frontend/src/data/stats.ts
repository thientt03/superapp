import { cashRepo, cashSummary, latestMonth, payableRepo, receivableRepo } from './accounting'
import { opportunityRepo } from './crm'
import { attendanceRepo, employeeRepo, netSalary, payrollRepo } from './hr'
import { issueRepo, itemRepo, receiptRepo } from './inventory'
import { orderRepo } from './sales'

export interface DashboardStats {
  revenue: number
  orders: number
  inventoryValue: number
  belowMin: number
  staff: number
  present: number
  months: string[]
  revenueSeries: number[]
  purchaseSeries: number[]
  crm: { labels: string[]; data: number[] }
}

// Số tổng lấy từ repo (doanh thu từ đơn bán, tồn kho từ kho, nhân sự từ HR); chuỗi theo tháng/CRM là seed tĩnh theo THIẾT KẾ.
export async function getDashboardStats(): Promise<DashboardStats> {
  const [orders, inv, staff, logs] = await Promise.all([orderRepo.list(), getInventoryReport(), employeeRepo.list(), attendanceRepo.list()])
  const lastDay = logs.map((l) => l.date).sort().at(-1)
  return {
    revenue: orders.reduce((s, o) => s + o.total, 0),
    orders: orders.length,
    inventoryValue: inv.totalValue,
    belowMin: inv.belowMin,
    staff: staff.filter((e) => e.status !== 'resigned').length,
    present: new Set(logs.filter((l) => l.date === lastDay).map((l) => l.emp_code)).size,
    months: ['Th 1', 'Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7', 'Th 8', 'Th 9', 'Th 10', 'Th 11', 'Th 12'],
    revenueSeries: [180, 220, 250, 300, 280, 320, 350, 400, 380, 420, 450, 480],
    purchaseSeries: [120, 150, 170, 200, 190, 210, 230, 250, 240, 270, 290, 310],
    crm: { labels: ['Thành công', 'Đang đàm phán', 'Mới tiếp cận', 'Thất bại / Hủy'], data: [45, 35, 15, 5] },
  }
}

export interface CrmAnalytics {
  funnel: number[]
  kpis: { conversion: string; clv: number; cac: number; closeDays: string }
  industry: { labels: string[]; data: number[] }
  performance: { labels: string[]; actual: number[]; target: number[] }
  leaderboard: { rank: number; name: string; contracts: number; revenue: number; kpi: number; rating: string }[]
}

const FUNNEL = { month: [48, 36, 24, 17], quarter: [120, 85, 60, 42], year: [450, 320, 210, 160] }

export async function getCrmAnalytics(timeframe: 'month' | 'quarter' | 'year'): Promise<CrmAnalytics> {
  return {
    funnel: FUNNEL[timeframe] ?? FUNNEL.month,
    kpis: { conversion: '38.4%', clv: 425_000_000, cac: 18_500_000, closeDays: '14.2 Ngày' },
    industry: { labels: ['Xây Dựng / BĐS', 'Công Nghệ / CNTT', 'Sản Xuất & Nội Thất', 'Khác'], data: [45, 30, 15, 10] },
    performance: { labels: ['Lê Văn Tùng', 'Trần Thị Hoa', 'Phạm Minh'], actual: [1420, 980, 740], target: [1200, 1000, 800] },
    leaderboard: [
      { rank: 1, name: 'Lê Văn Tùng (Sale Lead)', contracts: 12, revenue: 1_420_000_000, kpi: 118, rating: 'Xuất Sắc' },
      { rank: 2, name: 'Trần Thị Hoa (Sales Exec)', contracts: 9, revenue: 980_000_000, kpi: 98, rating: 'Tốt' },
      { rank: 3, name: 'Phạm Minh (Senior Sale)', contracts: 7, revenue: 740_000_000, kpi: 92, rating: 'Đạt KPI' },
    ],
  }
}

// Tổng doanh thu = Σ total của đơn bán; chuỗi theo tháng là seed tĩnh theo THIẾT KẾ.
export async function getSalesReport() {
  const orders = await orderRepo.list()
  return {
    totalRevenue: orders.reduce((s, o) => s + o.total, 0),
    orderCount: orders.length,
    months: ['Th 1', 'Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7', 'Th 8', 'Th 9', 'Th 10', 'Th 11'],
    series: [1200, 1450, 1300, 1600, 1850, 2100, 1950, 2300, 2500, 2700, 2840],
  }
}

// Giá trị tồn = Σ qty×cost; dưới định mức khi qty < min_qty; tổng nhập/xuất tính từ phiếu đã hoàn tất
export async function getInventoryReport() {
  const [items, receipts, issues] = await Promise.all([itemRepo.list(), receiptRepo.list(), issueRepo.list()])
  const rec = receipts.filter((r) => r.state === 'done')
  const iss = issues.filter((r) => r.state === 'done')
  const sum = (list: { sku: string; qty: number }[], sku: string) => list.filter((x) => x.sku === sku).reduce((s, x) => s + x.qty, 0)
  const low = items.filter((i) => i.qty < i.min_qty)
  const cost = (sku: string) => items.find((i) => i.code === sku)?.cost ?? 0
  return {
    totalValue: items.reduce((s, i) => s + i.qty * i.cost, 0),
    belowMin: low.length,
    lowItems: low,
    periodIn: rec.reduce((s, r) => s + r.qty * cost(r.sku), 0),
    periodOut: iss.reduce((s, r) => s + r.qty * cost(r.sku), 0),
    rows: items.map((i) => {
      const inQty = sum(rec, i.code)
      const outQty = sum(iss, i.code)
      return { code: i.code, name: i.name, unit: i.unit, opening: i.qty - inQty + outQty, in: inQty, out: outQty, closing: i.qty, value: i.qty * i.cost }
    }),
  }
}

/** Báo cáo tài chính tổng hợp từ quỹ, công nợ, kho, đơn bán, phiếu xuất và bảng lương. */
export async function getAccountingReport(month?: string) {
  const [vouchers, ar, ap, inv, orders, issues, items, payroll] = await Promise.all([
    cashRepo.list(), receivableRepo.list(), payableRepo.list(), getInventoryReport(), orderRepo.list(), issueRepo.list(), itemRepo.list(), payrollRepo.list(),
  ])
  const cash = cashSummary(vouchers, month ?? latestMonth(vouchers))
  const receivable = ar.reduce((s, r) => s + r.total - r.paid, 0)
  const payable = ap.reduce((s, r) => s + r.total - r.paid, 0)
  const assets = cash.balance + receivable + inv.totalValue
  const revenue = orders.reduce((s, o) => s + o.total, 0)
  const cogs = issues.filter((i) => i.state === 'done').reduce((s, i) => s + i.qty * (items.find((x) => x.code === i.sku)?.cost ?? 0), 0)
  const payrollCost = payroll.reduce((s, r) => s + netSalary(r.base, r.bonus).net, 0)
  return {
    ...cash, receivable, payable, inventoryValue: inv.totalValue,
    assets, liabilities: payable, equity: assets - payable, // vốn chủ sở hữu = tài sản − nợ phải trả nên luôn cân
    revenue, cogs, payrollCost, ebit: revenue - cogs - payrollCost,
  }
}

const inPeriod = (iso: string, period: string) =>
  period === '2026' ? iso.startsWith('2026') : period === '11-2026' ? iso.startsWith('2026-11') : /^2026-(10|11|12)/.test(iso)

const REPORT_CHARTS: Record<string, { labels: string[]; revenue: number[]; cost: number[] }> = {
  'Q4-2026': { labels: ['Tháng 10', 'Tháng 11', 'Tháng 12 (Dự kiến)'], revenue: [2800, 2840, 2900], cost: [1900, 1950, 2000] },
  '11-2026': { labels: ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4'], revenue: [650, 720, 780, 840], cost: [420, 480, 510, 540] },
  '2026': { labels: ['Q1', 'Q2', 'Q3', 'Q4 (Dự kiến)'], revenue: [2400, 2900, 3100, 3500], cost: [1700, 1950, 2100, 2350] },
}

/** Báo cáo & thống kê theo kỳ (Q4-2026 | 11-2026 | 2026): KPI và bảng phân hệ tính từ repo, chuỗi biểu đồ là seed tĩnh. */
export async function getReportStats(period: string, dept = 'ALL') {
  const [orders, issues, items, vouchers, payroll, staff, logs, opps, inv] = await Promise.all([
    orderRepo.list(), issueRepo.list(), itemRepo.list(), cashRepo.list(), payrollRepo.list(), employeeRepo.list(), attendanceRepo.list(), opportunityRepo.list(), getInventoryReport(),
  ])
  const revenue = orders.filter((o) => inPeriod(o.ordered, period)).reduce((s, o) => s + o.total, 0)
  const cogs = issues.filter((i) => i.state === 'done' && inPeriod(i.date, period)).reduce((s, i) => s + i.qty * (items.find((x) => x.code === i.sku)?.cost ?? 0), 0)
  const cashOut = vouchers.filter((v) => v.kind === 'out' && inPeriod(v.date, period)).reduce((s, v) => s + v.amount, 0)
  const payrollCost = payroll.filter((r) => inPeriod(r.month, period)).reduce((s, r) => s + netSalary(r.base, r.bonus).net, 0)
  const expense = cashOut + payrollCost
  const profit = revenue - expense
  const won = opps.filter((o) => o.stage === '4').reduce((s, o) => s + o.value, 0)
  const lastDay = logs.map((l) => l.date).sort().at(-1)
  const rows = [
    { key: 'Sales', name: 'Bán Hàng (Sales)', metric: `${orders.filter((o) => inPeriod(o.ordered, period)).length} Đơn SO thành công`, value: revenue, cost: cogs, kpi: 105, rating: 'Vượt Chỉ Tiêu' },
    { key: 'Inventory', name: 'Quản Lý Kho (Inventory)', metric: `${inv.belowMin} mặt hàng dưới định mức`, value: inv.totalValue, cost: 0, kpi: 98, rating: 'Đạt Chuẩn' },
    { key: 'CRM', name: 'CRM & Khách Hàng', metric: `${opps.length} cơ hội trong phễu`, value: won, cost: 0, kpi: 102, rating: 'Tốt' },
    { key: 'HR', name: 'Nhân Sự (HR)', metric: `${staff.filter((e) => e.status !== 'resigned').length} nhân sự (${new Set(logs.filter((l) => l.date === lastDay).map((l) => l.emp_code)).size} có mặt)`, value: 0, cost: payrollCost, kpi: 100, rating: 'Ổn Định' },
  ].filter((r) => dept === 'ALL' || r.key === dept)
  return {
    revenue, profit, expense,
    margin: revenue ? (profit / revenue) * 100 : 0,
    expenseRatio: revenue ? (expense / revenue) * 100 : 0,
    roi: expense ? (profit / expense) * 100 : 0,
    chart: REPORT_CHARTS[period] ?? REPORT_CHARTS['Q4-2026']!,
    pie: { labels: ['Bán Hàng (Sales)', 'Quản Lý Kho', 'Dịch Vụ CRM', 'Khác'], data: [42, 28, 18, 12] },
    rows,
  }
}
