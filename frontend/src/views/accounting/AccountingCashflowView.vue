<script setup lang="ts">
import CrudPage, { type CrudConfig } from '../../components/CrudPage.vue'
import KpiCard from '../../components/KpiCard.vue'
import { cashRepo, cashSummary, latestMonth, type CashVoucher } from '../../data'
import { vnd } from '../../format'
import { toast } from '../../toast'

const sum = (rows: CashVoucher[]) => cashSummary(rows, latestMonth(rows))
const monthLabel = (rows: CashVoucher[]) => latestMonth(rows).split('-').reverse().join('/')

const config: CrudConfig<CashVoucher> = {
  title: 'Nhật Ký Thu Chi Quỹ Tiền Mặt & Tài Khoản Ngân Hàng',
  subtitle: 'Quản lý dòng tiền, sổ quỹ thu chi, công nợ phải thu/phải trả và hóa đơn điện tử.',
  entityLabel: 'phiếu thu/chi',
  createLabel: 'Tạo Phiếu Thu / Chi',
  countLabel: 'Phiếu',
  repo: cashRepo,
  columns: [
    { key: 'date', label: 'Ngày', format: 'date' },
    { key: 'kind', label: 'Loại Thu/Chi', format: 'badge', badge: { in: { label: 'Phiếu Thu', cls: 'bg-emerald-100 text-emerald-800' }, out: { label: 'Phiếu Chi', cls: 'bg-rose-100 text-rose-800' } } },
    { key: 'partner', label: 'Đối Tác / Khách Hàng' },
    { key: 'memo', label: 'Diễn Giải / Nội Dung' },
    { key: 'method', label: 'Hình Thức' },
    { key: 'amount', label: 'Số Tiền', value: (r) => `${r.kind === 'in' ? '+' : '-'}${vnd(r.amount)}` },
  ],
  fields: [
    { key: 'date', label: 'Ngày', type: 'date', required: true },
    { key: 'kind', label: 'Loại phiếu', type: 'select', required: true, options: [{ value: 'in', label: 'Phiếu thu' }, { value: 'out', label: 'Phiếu chi' }] },
    { key: 'partner', label: 'Đối tác / khách hàng', type: 'text', required: true },
    { key: 'memo', label: 'Diễn giải / nội dung', type: 'text', required: true },
    { key: 'method', label: 'Hình thức', type: 'select', required: true, options: ['Tiền Mặt', 'Chuyển Khoản VCB', 'Chuyển Khoản TCB'].map((v) => ({ value: v, label: v })) },
    { key: 'amount', label: 'Số tiền (₫)', type: 'number', required: true, min: 1 },
    { key: 'ref', label: 'Tham chiếu SO (thu) / PO (chi) để ghi công nợ', type: 'text' },
  ],
}
</script>

<template>
  <CrudPage :config="config">
    <template #top="{ rows }">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Tồn Quỹ Tiền Mặt & Ngân Hàng" :value="vnd(sum(rows).balance)" icon="fa-solid fa-vault" tone="bg-rose-50 text-rose-600" note="Σ thu − Σ chi" note-class="text-emerald-600" />
        <KpiCard :label="`Tổng Thu (Tháng ${monthLabel(rows)})`" :value="`+${vnd(sum(rows).inMonth)}`" icon="fa-solid fa-arrow-trend-up" tone="bg-emerald-50 text-emerald-600" :note="`${sum(rows).inCount} Phiếu Thu`" note-class="text-emerald-600" />
        <KpiCard :label="`Tổng Chi (Tháng ${monthLabel(rows)})`" :value="`-${vnd(sum(rows).outMonth)}`" icon="fa-solid fa-arrow-trend-down" tone="bg-amber-50 text-amber-600" note="Phê duyệt bởi Giám Đốc" />
        <KpiCard label="Dòng Tiền Thuần (Net Cash)" :value="`${sum(rows).netMonth >= 0 ? '+' : '-'}${vnd(Math.abs(sum(rows).netMonth))}`" icon="fa-solid fa-scale-balanced" note="Thu − Chi trong tháng" />
      </div>
    </template>
    <template #actions="{ row }">
      <button type="button" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg" @click="toast(`Đang in phiếu ${row.code}`)">In Phiếu</button>
    </template>
  </CrudPage>
</template>
