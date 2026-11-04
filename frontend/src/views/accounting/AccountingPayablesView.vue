<script setup lang="ts">
import CrudPage, { type CrudConfig } from '../../components/CrudPage.vue'
import { payableRepo, type Payable } from '../../data'
import { vnd } from '../../format'
import { toast } from '../../toast'

const left = (r: Payable) => r.total - r.paid
const sum = (rows: Payable[]) => rows.reduce((s, r) => s + left(r), 0)

const config: CrudConfig<Payable> = {
  title: 'Quản Lý Công Nợ Phải Trả Nhà Cung Cấp (Accounts Payable - AP)',
  subtitle: 'Quản lý dòng tiền, sổ quỹ thu chi, công nợ phải thu/phải trả và hóa đơn điện tử.',
  entityLabel: 'công nợ',
  createLabel: 'Thêm Công Nợ Phải Trả',
  repo: payableRepo,
  columns: [
    { key: 'vendor', label: 'Nhà Cung Cấp' },
    { key: 'po', label: 'Mã Đơn PO' },
    { key: 'due', label: 'Hạn Thanh Toán', format: 'date' },
    { key: 'total', label: 'Tổng Đơn Hàng', format: 'vnd' },
    { key: 'paid', label: 'Đã Thanh Toán', format: 'vnd' },
    { key: 'total', label: 'Còn Phải Trả', value: (r) => (left(r) === 0 ? '0 ₫ (Hoàn tất)' : vnd(left(r))) },
  ],
  fields: [
    { key: 'vendor', label: 'Nhà Cung Cấp', type: 'text', required: true },
    { key: 'po', label: 'Mã Đơn PO', type: 'text', required: true },
    { key: 'due', label: 'Hạn thanh toán', type: 'date', required: true },
    { key: 'total', label: 'Tổng giá trị (₫)', type: 'number', required: true, min: 0 },
    { key: 'paid', label: 'Đã thanh toán (₫)', type: 'number', required: true, min: 0 },
  ],
}
</script>

<template>
  <CrudPage :config="config">
    <template #header>
      <button type="button" class="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl font-semibold text-xs hover:bg-slate-50 shadow-sm" @click="toast('Lập kế hoạch thanh toán công nợ NCC!')">Lập Lịch Trả Nợ</button>
    </template>
    <template #top="{ rows }">
      <div class="bg-white px-6 py-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-2">
        <span class="font-bold text-slate-800">Quản Lý Công Nợ Phải Trả Nhà Cung Cấp (Accounts Payable - AP)</span>
        <span class="px-3 py-1 bg-rose-50 text-rose-700 rounded-full text-xs font-bold" data-testid="debt-total">Tổng Phải Trả: {{ vnd(sum(rows)) }}</span>
      </div>
    </template>
    <template #actions="{ row }">
      <button type="button" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg" @click="toast(`Đã gửi đối soát tới ${row.vendor}`)">Đối Soát</button>
    </template>
  </CrudPage>
</template>
