<script setup lang="ts">
import CrudPage, { type CrudConfig } from '../../components/CrudPage.vue'
import { invoiceRepo, vat, type Invoice } from '../../data'
import { toast } from '../../toast'
import { vnd } from '../../format'

const config: CrudConfig<Invoice> = {
  title: 'Hóa Đơn Điện Tử Tích Hợp Tổng Cục Thuế (Einvoice)',
  subtitle: 'Quản lý dòng tiền, sổ quỹ thu chi, công nợ phải thu/phải trả và hóa đơn điện tử.',
  entityLabel: 'hóa đơn',
  createLabel: 'Xuất Hóa Đơn Điện Tử',
  countLabel: 'Hóa đơn',
  repo: invoiceRepo,
  columns: [
    { key: 'series', label: 'Mẫu Số / Ký Hiệu' },
    { key: 'customer', label: 'Khách Hàng / MST', value: (r) => `${r.customer} - MST: ${r.tax_code}` },
    { key: 'date', label: 'Ngày Phát Hành', format: 'date' },
    { key: 'net', label: 'Tiền Chưa Thuế', format: 'vnd' },
    { key: 'vat_rate', label: 'Thuế VAT (8%-10%)', value: (r) => `${vnd(vat(r.net, r.vat_rate))} (${r.vat_rate}%)` },
    {
      key: 'status', label: 'Mã Xác Thực CQT', format: 'badge',
      badge: { verified: { label: 'Đã Có Mã CQT', cls: 'bg-emerald-100 text-emerald-800' }, pending: { label: 'Chờ Mã CQT', cls: 'bg-amber-100 text-amber-800' } },
    },
  ],
  fields: [
    { key: 'code', label: 'Số hóa đơn (để trống để tự sinh)', type: 'text' },
    { key: 'series', label: 'Mẫu số / ký hiệu', type: 'text', required: true },
    { key: 'customer', label: 'Khách hàng', type: 'text', required: true },
    { key: 'tax_code', label: 'Mã số thuế', type: 'text', required: true },
    { key: 'date', label: 'Ngày phát hành', type: 'date', required: true },
    { key: 'net', label: 'Tiền chưa thuế (₫)', type: 'number', required: true, min: 1 },
    { key: 'vat_rate', label: 'Thuế suất VAT (%)', type: 'select', required: true, options: [0, 5, 8, 10].map((v) => ({ value: String(v), label: `${v}%` })) },
    { key: 'status', label: 'Trạng thái', type: 'select', required: true, options: [{ value: 'verified', label: 'Đã có mã CQT' }, { value: 'pending', label: 'Chờ mã CQT' }] },
  ],
}
</script>

<template>
  <CrudPage :config="config">
    <template #actions="{ row }">
      <button type="button" class="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-lg" @click="toast(`Đang tải PDF/XML hóa đơn ${row.code}`)">Tải PDF/XML</button>
    </template>
  </CrudPage>
</template>
