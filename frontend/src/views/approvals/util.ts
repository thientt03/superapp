import type { ApprovalRequest, ApprovalStatus } from '../../api'
import { date, vnd } from '../../format'

export const refNo = (r: ApprovalRequest): string => r.ref_no ?? `#${r.id}`

export const valueText = (r: ApprovalRequest): string =>
  r.amount != null ? vnd(r.amount) : r.start_date && r.end_date ? `${date(r.start_date)} - ${date(r.end_date)}` : ''

export const STATUS: Record<ApprovalStatus, { label: string; cls: string }> = {
  pending: { label: 'Chờ Duyệt', cls: 'bg-amber-100 text-amber-800' },
  approved: { label: 'Đã Phê Duyệt', cls: 'bg-emerald-100 text-emerald-800' },
  rejected: { label: 'Đã Từ Chối', cls: 'bg-rose-100 text-rose-800' },
  cancelled: { label: 'Đã Hủy', cls: 'bg-slate-200 text-slate-700' },
}
