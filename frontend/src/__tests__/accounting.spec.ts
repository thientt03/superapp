import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { testRouter } from './helpers'

// mỗi test dùng kho dữ liệu mới (module singleton)
async function fresh() {
  vi.resetModules()
  const data = await import('../data')
  const stats = await import('../data/stats')
  return { ...data, ...stats }
}
let d: Awaited<ReturnType<typeof fresh>>
let toasts: typeof import('../toast').toasts // phải lấy từ cùng lần nạp module với các màn
beforeEach(async () => {
  d = await fresh()
  toasts = (await import('../toast')).toasts
})
afterEach(() => {
  document.body.innerHTML = ''
})

const entry = { date: '2026-11-03', memo: 'x', debit_account: '111', debit_amount: 1_000_000, credit_account: '511', credit_amount: 1_000_000 }
const voucher = { date: '2026-11-03', partner: 'KH', memo: 'm', method: 'Tiền Mặt', amount: 1_000_000 }
async function setVal(sel: string, v: string) {
  const el = document.body.querySelector<HTMLInputElement>(sel)!
  el.value = v
  el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input'))
}
const submit = async () => {
  document.body.querySelector('form')!.dispatchEvent(new Event('submit'))
  await flushPromises()
}
async function mountView(path: string) {
  const mod = await import(/* @vite-ignore */ path)
  return mount(mod.default, { attachTo: document.body, global: { plugins: [await testRouter()] } })
}

describe('sổ quỹ', () => {
  it('tồn quỹ = Σ thu − Σ chi; tổng thu/chi theo tháng', async () => {
    const list = await d.cashRepo.list()
    expect(d.cashSummary(list, '2026-11')).toMatchObject({ balance: 150_000_000, inMonth: 195_000_000, outMonth: 45_000_000, netMonth: 150_000_000, inCount: 1 })
    expect(d.cashSummary(list, '2026-10')).toMatchObject({ balance: 150_000_000, inMonth: 0, outMonth: 0 })
    await d.cashRepo.create({ ...voucher, kind: 'out' })
    expect(d.cashSummary(await d.cashRepo.list(), '2026-11').balance).toBe(149_000_000)
  })

  it('màn sổ quỹ hiện tồn quỹ và tạo mã PT/PC theo loại phiếu', async () => {
    const w = await mountView('../views/accounting/AccountingCashflowView.vue')
    await flushPromises()
    expect(w.text()).toContain('150.000.000 ₫')
    const pc = await d.cashRepo.create({ ...voucher, kind: 'out' })
    const pt = await d.cashRepo.create({ ...voucher, kind: 'in' })
    expect(pc.code).toBe('PC-2026-0095')
    expect(pt.code).toBe('PT-2026-0190')
    w.unmount()
  })

  it('phiếu thu có tham chiếu SO cộng vào công nợ phải thu; vượt dư nợ thì báo lỗi, không lưu', async () => {
    await d.cashRepo.create({ ...voucher, kind: 'in', amount: 100_000_000, ref: 'SO-2026-0189' })
    expect((await d.receivableRepo.get('1')).paid).toBe(295_000_000)
    const n = (await d.cashRepo.list()).length
    await expect(d.cashRepo.create({ ...voucher, kind: 'in', amount: 400_000_000, ref: 'SO-2026-0189' })).rejects.toThrow('vượt dư nợ')
    expect((await d.cashRepo.list()).length).toBe(n)
    expect((await d.receivableRepo.get('1')).paid).toBe(295_000_000)
  })

  it('phiếu chi theo PO cộng công nợ phải trả; phiếu đã ghi công nợ không sửa/xoá', async () => {
    const po = await d.payableRepo.create({ vendor: 'X', po: 'PO-X', due: '2026-12-01', total: 10_000_000, paid: 0 })
    const v = await d.cashRepo.create({ ...voucher, kind: 'out', amount: 4_000_000, ref: 'PO-X' })
    expect((await d.payableRepo.get(po.id)).paid).toBe(4_000_000)
    expect(v.applied).toBe(true)
    await expect(d.cashRepo.update(v.id, { amount: 1 })).rejects.toThrow('không thể sửa')
    await expect(d.cashRepo.remove(v.id)).rejects.toThrow('không thể xóa')
  })

  it('số tiền ≤ 0 bị từ chối', async () => {
    await expect(d.cashRepo.create({ ...voucher, kind: 'in', amount: 0 })).rejects.toThrow('lớn hơn 0')
  })
})

describe('sổ cái', () => {
  it('bút toán Nợ ≠ Có thì không lưu', async () => {
    const n = (await d.ledgerRepo.list()).length
    await expect(d.ledgerRepo.create({ ...entry, credit_amount: 900_000 })).rejects.toThrow('không cân')
    await expect(d.ledgerRepo.create({ ...entry, credit_account: '111' })).rejects.toThrow('phải khác nhau')
    await expect(d.ledgerRepo.create({ ...entry, debit_amount: 0, credit_amount: 0 })).rejects.toThrow('lớn hơn 0')
    expect((await d.ledgerRepo.list()).length).toBe(n)
    const ok = await d.ledgerRepo.create(entry)
    expect(ok.code).toBe('BT-0003')
    await expect(d.ledgerRepo.update(ok.id, { credit_amount: 5 })).rejects.toThrow('không cân')
  })

  it('màn sổ cái: nhập lệch hiện toast lỗi, không thêm dòng; sửa cho cân thì lưu', async () => {
    const w = await mountView('../views/accounting/AccountingLedgerView.vue')
    await flushPromises()
    await w.findAll('button').find((b) => b.text().includes('Thêm Bút Toán'))!.trigger('click')
    await setVal('#f-date', '2026-11-03')
    await setVal('#f-memo', 'Bán hàng thu tiền mặt')
    await setVal('#f-debit_account', '111')
    await setVal('#f-debit_amount', '5000000')
    await setVal('#f-credit_account', '511')
    await setVal('#f-credit_amount', '4000000')
    await submit()
    expect(toasts.value.map((t) => t.msg)).toContain('Bút toán không cân: tổng Nợ phải bằng tổng Có')
    expect((await d.ledgerRepo.list()).length).toBe(2)
    await setVal('#f-credit_amount', '5000000')
    await submit()
    expect((await d.ledgerRepo.list()).length).toBe(3)
    w.unmount()
  })
})

describe('công nợ, hoá đơn', () => {
  it('màn phải thu hiện tổng phải thu = Σ dư nợ; phải trả hiện Hoàn tất', async () => {
    const ar = await mountView('../views/accounting/AccountingReceivablesView.vue')
    await flushPromises()
    expect(ar.get('[data-testid="debt-total"]').text()).toContain('455.000.000 ₫')
    ar.unmount()
    const ap = await mountView('../views/accounting/AccountingPayablesView.vue')
    await flushPromises()
    expect(ap.text()).toContain('0 ₫ (Hoàn tất)')
    ap.unmount()
  })

  it('đã thanh toán không vượt tổng giá trị', async () => {
    await expect(d.receivableRepo.create({ customer: 'A', so: 'SO-1', due: '2026-12-01', total: 10, paid: 11 })).rejects.toThrow('từ 0 đến tổng giá trị')
  })

  it('VAT làm tròn theo thuế suất; thuế suất sai bị từ chối', async () => {
    expect(d.vat(180_555_556, 8)).toBe(14_444_444)
    await expect(d.invoiceRepo.create({ series: 's', customer: 'c', tax_code: '1', date: '2026-11-03', net: 100, vat_rate: 7, status: 'pending' })).rejects.toThrow('Thuế suất')
    const w = await mountView('../views/accounting/AccountingInvoicesView.vue')
    await flushPromises()
    expect(w.text()).toContain('14.444.444 ₫ (8%)')
    w.unmount()
  })
})

describe('báo cáo tài chính và thống kê', () => {
  it('bảng cân đối cân: tài sản = nợ phải trả + vốn chủ sở hữu; EBIT = doanh thu − giá vốn − lương', async () => {
    const r = await d.getAccountingReport()
    expect(r.assets).toBe(150_000_000 + 455_000_000 + r.inventoryValue)
    expect(r.assets).toBe(r.liabilities + r.equity)
    expect(r.ebit).toBe(r.revenue - r.cogs - r.payrollCost)
    expect(r.cogs).toBe(23 * 2_250_000 + 15 * 1_450_000)
    const w = await mountView('../views/accounting/AccountingReportsView.vue')
    await flushPromises()
    expect(w.get('[data-testid="balance-title"]').text()).toContain('Tổng Tài Sản = Tổng Nguồn Vốn')
    w.unmount()
  })

  it('getReportStats lọc theo kỳ và phân hệ', async () => {
    const q4 = await d.getReportStats('Q4-2026')
    expect(q4.revenue).toBe(650_000_000)
    expect(q4.rows).toHaveLength(4)
    expect(q4.profit).toBe(q4.revenue - q4.expense)
    expect((await d.getReportStats('11-2026')).revenue).toBe(650_000_000)
    expect((await d.getReportStats('2026')).chart.labels).toEqual(['Q1', 'Q2', 'Q3', 'Q4 (Dự kiến)'])
    const hr = await d.getReportStats('Q4-2026', 'HR')
    expect(hr.rows.map((x) => x.key)).toEqual(['HR'])
    await d.orderRepo.create({ customer: 'K', ordered: '2026-05-01', total: 1_000_000, payment: 'paid', delivery: 'delivered' })
    expect((await d.getReportStats('Q4-2026')).revenue).toBe(650_000_000) // đơn tháng 5 ngoài kỳ
    expect((await d.getReportStats('2026')).revenue).toBe(651_000_000)
  })

  it('màn báo cáo đổi kỳ thì đổi số liệu và biểu đồ', async () => {
    const w = await mountView('../views/ReportsView.vue')
    await flushPromises()
    expect(w.text()).toContain('Doanh Thu Thuần')
    expect(w.text()).toContain('650.000.000 ₫')
    await w.get('#rep-dept').setValue('HR')
    await flushPromises()
    expect(w.findAll('tbody tr')).toHaveLength(1)
    w.unmount()
  })

  it('getDashboardStats tính từ repo', async () => {
    let s = await d.getDashboardStats()
    expect(s).toMatchObject({ revenue: 650_000_000, orders: 1, belowMin: 1, staff: 4, present: 2 })
    expect(s.inventoryValue).toBe(12 * 2_250_000 + 85 * 1_450_000)
    await d.orderRepo.create({ customer: 'K', ordered: '2026-11-03', total: 50_000_000, payment: 'paid', delivery: 'delivered' })
    await d.employeeRepo.update('3', { status: 'resigned' })
    s = await d.getDashboardStats()
    expect(s).toMatchObject({ revenue: 700_000_000, orders: 2, staff: 3 })
  })
})

describe('cài đặt', () => {
  it('tên đăng nhập không trùng (không phân biệt hoa thường)', async () => {
    const base = { full_name: 'A', role: 'ROLE-SALE', branch: 'HCM-HQ', status: 'active' }
    await expect(d.userRepo.create({ ...base, username: 'TUNG.LV' })).rejects.toThrow('Tên đăng nhập đã tồn tại')
    const u = await d.userRepo.create({ ...base, username: 'new.user' })
    await expect(d.userRepo.update(u.id, { username: 'hoa.tt' })).rejects.toThrow('đã tồn tại')
    await expect(d.userRepo.update(u.id, { username: 'new.user' })).resolves.toBeTruthy()
  })

  it('không xoá nhóm quyền đang gán cho tài khoản', async () => {
    await expect(d.roleRepo.remove('1')).rejects.toThrow('đang được gán cho 1 tài khoản')
    const r = await d.roleRepo.create({ name: 'Mới', scope: 'x' })
    await expect(d.roleRepo.remove(r.id)).resolves.toBeUndefined()
  })

  it('màn nhóm quyền đếm số tài khoản; màn người dùng hiện tên nhóm quyền và chi nhánh', async () => {
    const roles = await mountView('../views/settings/SettingsRolesView.vue')
    await flushPromises()
    expect(roles.text()).toContain('1 Tài khoản')
    roles.unmount()
    const users = await mountView('../views/settings/SettingsUsersView.vue')
    await flushPromises()
    expect(users.text()).toContain('Quản Trị Viên Tối Cao (Admin)')
    expect(users.text()).toContain('Chi Nhánh Thủ Đức & Kho Cơ Khí')
    expect(users.get('[data-testid="count"]').text()).toBe('5 Tài khoản')
    users.unmount()
  })

  it('công ty: mã số thuế sai thì toast lỗi, đúng thì lưu', async () => {
    const w = await mountView('../views/settings/SettingsCompanyView.vue')
    await flushPromises()
    expect(document.body.querySelector<HTMLInputElement>('#c-tax_code')!.value).toBe('0315892341')
    await setVal('#c-tax_code', '123')
    await submit()
    expect(toasts.value.map((t) => t.msg)).toContain('Mã số thuế phải gồm 10 hoặc 13 chữ số')
    expect((await d.companyRepo.list())[0]!.tax_code).toBe('0315892341')
    await setVal('#c-tax_code', '0315892341-001')
    await setVal('#c-phone', '028 1111 2222')
    await submit()
    expect(await d.companyRepo.list()).toHaveLength(1)
    expect((await d.companyRepo.list())[0]).toMatchObject({ tax_code: '0315892341-001', phone: '028 1111 2222' })
    w.unmount()
  })

  it('xoá phòng ban: chặn khi còn nhân viên, vị trí, công thức; phòng ban mới xoá được', async () => {
    await expect(d.departmentRepo.remove('1')).rejects.toThrow('đang có 3 nhân viên')
    await expect(d.departmentRepo.remove('3')).rejects.toThrow('đang có 1 vị trí công việc')
    await expect(d.departmentRepo.remove('4')).rejects.toThrow('đang dùng trong 1 công thức lương')
    const n = await d.departmentRepo.create({ name: 'Mới', parent: '', branch: 'HN-BD', head: '', status: 'active' })
    await expect(d.departmentRepo.remove(n.id)).resolves.toBeUndefined()
  })

  it('phòng ban cha không được là chính nó hay con cháu của nó', async () => {
    await expect(d.departmentRepo.update('1', { parent: 'PB-0004' })).rejects.toThrow('Phòng ban cha không hợp lệ')
    await expect(d.departmentRepo.update('1', { parent: 'PB-0001' })).rejects.toThrow('Phòng ban cha không hợp lệ')
    await expect(d.departmentRepo.update('1', { parent: 'PB-9999' })).rejects.toThrow('Phòng ban cha không hợp lệ')
  })

  it('xoá vị trí: chặn khi đang gán cho nhân viên', async () => {
    await expect(d.positionRepo.remove('1')).rejects.toThrow('đang được gán cho 1 nhân viên')
    await expect(d.positionRepo.remove('5')).resolves.toBeUndefined()
  })

  it('đổi phòng ban của vị trí: chặn khi có người giữ, các trường khác và vị trí trống thì qua', async () => {
    await expect(d.positionRepo.update('1', { department: 'PB-0002' })).rejects.toThrow('Vị trí đang có 1 nhân viên, không thể đổi phòng ban')
    const cur = await d.positionRepo.get('1')
    await expect(d.positionRepo.update('1', { name: 'Đổi tên', level: cur.level, status: cur.status, department: cur.department })).resolves.toBeTruthy()
    await expect(d.positionRepo.update('5', { department: 'PB-0001' })).resolves.toMatchObject({ department: 'PB-0001' })
  })

  it('đổi mã bản ghi đang được tham chiếu bị chặn; gửi lại mã cũ thì qua', async () => {
    await expect(d.departmentRepo.update('1', { code: 'PB-9001' })).rejects.toThrow('Không thể đổi mã đang được sử dụng')
    await expect(d.departmentRepo.update('1', { code: 'PB-0001' })).resolves.toBeTruthy()
    await expect(d.positionRepo.update('1', { code: 'VT-9001' })).rejects.toThrow('Không thể đổi mã đang được sử dụng')
    await expect(d.branchRepo.update('1', { code: 'X' })).rejects.toThrow('Không thể đổi mã đang được sử dụng')
  })

  it('xoá chi nhánh: chặn khi còn phòng ban', async () => {
    await expect(d.branchRepo.remove('1')).rejects.toThrow('đang có 3 phòng ban')
    await expect(d.branchRepo.remove('3')).resolves.toBeUndefined()
  })

  it('các màn phòng ban, chi nhánh, nhân viên, công thức lương hiện dữ liệu từ danh mục', async () => {
    const dep = await mountView('../views/settings/SettingsDepartmentsView.vue')
    await flushPromises()
    for (const t of ['Phòng Kinh Doanh', 'Trụ Sở Chính TP.HCM & Kho Tổng', 'Lê Văn Tùng', '3 Nhân viên']) expect(dep.text()).toContain(t)
    dep.unmount()
    const br = await mountView('../views/settings/SettingsBranchesView.vue')
    await flushPromises()
    expect(br.text()).toContain('Nguyễn Văn An')
    expect(br.text()).toContain('3 Nhân viên')
    br.unmount()
    const emp = await mountView('../views/hr/HrEmployeesView.vue')
    await flushPromises()
    expect(emp.text()).toContain('Phòng Kinh Doanh')
    emp.unmount()
    const fx = await mountView('../views/hr/HrSalaryFormulaView.vue')
    await flushPromises()
    expect(fx.text()).toContain('Phòng Kinh Doanh, Nhóm Sales B2B')
    fx.unmount()
  })
})
