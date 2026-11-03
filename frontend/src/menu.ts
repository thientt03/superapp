export interface MenuLeaf { path: string; label: string; icon: string; component: () => Promise<unknown> }
export interface MenuGroup { key: string; label: string; icon: string; children: MenuLeaf[] }
export type MenuEntry = ({ kind: 'link' } & MenuLeaf & { badge?: 'approvals' }) | ({ kind: 'group' } & MenuGroup)

const leaf = (path: string, label: string, icon: string, component: MenuLeaf['component']): MenuLeaf => ({ path, label, icon: `fa-solid fa-${icon}`, component })
const group = (key: string, label: string, icon: string, children: MenuLeaf[]): MenuEntry => ({ kind: 'group', key, label, icon: `fa-solid fa-${icon}`, children })
const link = (l: MenuLeaf, badge?: 'approvals'): MenuEntry => ({ kind: 'link', ...l, badge })

export const MENU: MenuEntry[] = [
  link(leaf('/dashboard', 'Tổng Quan', 'chart-pie', () => import('./views/DashboardView.vue'))),
  link(leaf('/tasks', 'Công Việc', 'list-check', () => import('./views/TasksView.vue'))),
  group('crm', 'CRM & Khách Hàng', 'user-group text-brand-400', [
    leaf('/crm/kanban', 'Cơ Hội', 'grip-vertical', () => import('./views/crm/CrmKanbanView.vue')),
    leaf('/crm/list', 'Danh Sách Khách Hàng', 'users', () => import('./views/crm/CrmListView.vue')),
    leaf('/crm/segment', 'Phân Loại Khách Hàng', 'tags', () => import('./views/crm/CrmSegmentView.vue')),
    leaf('/crm/activities', 'Hoạt Động & Lịch Hẹn', 'clock-rotate-left', () => import('./views/crm/CrmActivitiesView.vue')),
    leaf('/crm/tickets', 'Ticket & Khiếu Nại', 'headset', () => import('./views/crm/CrmTicketsView.vue')),
    leaf('/crm/analytics', 'Phân Tích CRM', 'chart-line', () => import('./views/crm/CrmAnalyticsView.vue')),
  ]),
  group('sales', 'Bán Hàng (Sales)', 'cart-shopping text-emerald-400', [
    leaf('/sales/quotations', 'Báo Giá', 'file-signature', () => import('./views/sales/SalesQuotationsView.vue')),
    leaf('/sales/orders', 'Đơn Bán Hàng', 'receipt', () => import('./views/sales/SalesOrdersView.vue')),
    leaf('/sales/contracts', 'Hợp Đồng Bán Hàng', 'file-contract', () => import('./views/sales/SalesContractsView.vue')),
    leaf('/sales/pricelists', 'Bảng Giá', 'tags', () => import('./views/sales/SalesPricelistsView.vue')),
    leaf('/sales/reports', 'Báo Cáo Doanh Thu', 'chart-pie', () => import('./views/sales/SalesReportsView.vue')),
  ]),
  group('purchase', 'Mua Hàng (Purchase)', 'bag-shopping text-amber-400', [
    leaf('/purchase/plans', 'Kế Hoạch Mua Hàng', 'calendar-check', () => import('./views/purchase/PurchasePlansView.vue')),
    leaf('/purchase/reqs', 'Yêu Cầu Mua Hàng (PR)', 'clipboard-question', () => import('./views/purchase/PurchaseReqsView.vue')),
    leaf('/purchase/rfq', 'Báo Giá Nhà Cung Cấp', 'file-invoice-dollar', () => import('./views/purchase/PurchaseRfqView.vue')),
    leaf('/purchase/vendors', 'Nhà Cung Cấp', 'handshake', () => import('./views/purchase/PurchaseVendorsView.vue')),
    leaf('/purchase/evals', 'Đánh Giá Nhà Cung Cấp', 'star', () => import('./views/purchase/PurchaseEvalsView.vue')),
    leaf('/purchase/orders', 'Đơn Mua Hàng (PO)', 'cart-flatbed', () => import('./views/purchase/PurchaseOrdersView.vue')),
    leaf('/purchase/contracts', 'Hợp Đồng Mua Hàng', 'file-contract', () => import('./views/purchase/PurchaseContractsView.vue')),
  ]),
  group('inventory', 'Quản Lý Kho', 'boxes-stacked text-cyan-400', [
    leaf('/inventory/overview', 'Tổng Quan Kho', 'chart-line text-cyan-400', () => import('./views/inventory/InventoryOverviewView.vue')),
    // THIẾT KẾ dùng icon Pro arrow-down-to-line / arrow-up-from-line; thay bằng icon free
    leaf('/inventory/receipts', 'Nhập Kho (GR)', 'download text-emerald-400', () => import('./views/inventory/InventoryReceiptsView.vue')),
    leaf('/inventory/issues', 'Xuất Kho (GI)', 'upload text-amber-400', () => import('./views/inventory/InventoryIssuesView.vue')),
    leaf('/inventory/audits', 'Kiểm Kê Kho', 'clipboard-check text-purple-400', () => import('./views/inventory/InventoryAuditsView.vue')),
    leaf('/inventory/transfers', 'Điều Chuyển Kho', 'right-left text-blue-400', () => import('./views/inventory/InventoryTransfersView.vue')),
    leaf('/inventory/reports', 'Báo Cáo Tồn Kho', 'chart-pie text-brand-400', () => import('./views/inventory/InventoryReportsView.vue')),
    leaf('/inventory/items', 'Danh Mục & Định Mức Tồn', 'barcode text-rose-400', () => import('./views/inventory/InventoryItemsView.vue')),
  ]),
  group('hr', 'Nhân Sự (HR)', 'id-card text-indigo-400', [
    leaf('/hr/employees', 'Hồ Sơ Nhân Viên', 'users text-indigo-400', () => import('./views/hr/HrEmployeesView.vue')),
    leaf('/hr/timekeeping', 'Chấm Công', 'fingerprint text-blue-400', () => import('./views/hr/HrTimekeepingView.vue')),
    leaf('/hr/shifts', 'Ca Làm & Tăng Ca', 'business-time text-cyan-400', () => import('./views/hr/HrShiftsView.vue')),
    leaf('/hr/leaves', 'Quản Lý Nghỉ Phép', 'plane-departure text-amber-400', () => import('./views/hr/HrLeavesView.vue')),
    leaf('/hr/salary-formula', 'Công Thức Tính Lương', 'square-root-variable text-teal-400', () => import('./views/hr/HrSalaryFormulaView.vue')),
    leaf('/hr/payroll', 'Tính Lương & Thuế', 'money-check-dollar text-emerald-400', () => import('./views/hr/HrPayrollView.vue')),
    leaf('/hr/recruitment', 'Tuyển Dụng & Đào Tạo', 'user-plus text-purple-400', () => import('./views/hr/HrRecruitmentView.vue')),
    leaf('/hr/kpi', 'Đánh Giá KPI & Hiệu Suất', 'award text-rose-400', () => import('./views/hr/HrKpiView.vue')),
  ]),
  group('accounting', 'Tài Chính & Kế Toán', 'calculator text-rose-400', [
    leaf('/accounting/cashflow', 'Sổ Quỹ & Thu Chi', 'vault text-rose-400', () => import('./views/accounting/AccountingCashflowView.vue')),
    leaf('/accounting/receivables', 'Công Nợ Phải Thu (AR)', 'hand-holding-dollar text-emerald-400', () => import('./views/accounting/AccountingReceivablesView.vue')),
    leaf('/accounting/payables', 'Công Nợ Phải Trả (AP)', 'credit-card text-amber-400', () => import('./views/accounting/AccountingPayablesView.vue')),
    leaf('/accounting/invoices', 'Hóa Đơn VAT Điện Tử', 'file-invoice-dollar text-blue-400', () => import('./views/accounting/AccountingInvoicesView.vue')),
    leaf('/accounting/ledger', 'Sổ Cái & Định Khoản', 'book-journal-whills text-purple-400', () => import('./views/accounting/AccountingLedgerView.vue')),
    leaf('/accounting/reports', 'Báo Cáo Tài Chính (BCTC)', 'chart-pie text-cyan-400', () => import('./views/accounting/AccountingReportsView.vue')),
  ]),
  link(leaf('/approvals', 'Phê Duyệt', 'circle-check', () => import('./views/approvals/ApprovalsView.vue')), 'approvals'),
  link(leaf('/reports', 'Báo Cáo & Thống Kê', 'chart-line', () => import('./views/ReportsView.vue'))),
  group('settings', 'Cấu Hình Hệ Thống', 'gear text-rose-400', [
    leaf('/settings/users', 'Người Dùng', 'user-gear text-blue-400', () => import('./views/settings/SettingsUsersView.vue')),
    leaf('/settings/roles', 'Nhóm Quyền (Roles)', 'shield-halved text-amber-400', () => import('./views/settings/SettingsRolesView.vue')),
    leaf('/settings/approval-tree', 'Cây Phê Duyệt', 'sitemap text-emerald-400', () => import('./views/settings/ApprovalTreeView.vue')),
    leaf('/settings/branches', 'Chi Nhánh', 'code-branch text-purple-400', () => import('./views/settings/SettingsBranchesView.vue')),
    leaf('/settings/departments', 'Phòng Ban', 'building-user text-indigo-400', () => import('./views/settings/SettingsDepartmentsView.vue')),
    leaf('/settings/positions', 'Vị Trí Công Việc', 'briefcase text-cyan-400', () => import('./views/settings/SettingsPositionsView.vue')),
    leaf('/settings/company', 'Công Ty', 'building-shield text-rose-400', () => import('./views/settings/SettingsCompanyView.vue')),
  ]),
]

export const LEAVES: MenuLeaf[] = MENU.flatMap((e) => (e.kind === 'group' ? e.children : [e]))
