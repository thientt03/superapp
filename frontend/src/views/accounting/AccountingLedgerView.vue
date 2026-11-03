<script setup lang="ts">
import CrudPage, { type CrudConfig } from '../../components/CrudPage.vue'
import { ACCOUNTS, ledgerRepo, type LedgerEntry } from '../../data'

const acc = (v: string) => ACCOUNTS.find((a) => a.value === v)?.label ?? v

const config: CrudConfig<LedgerEntry> = {
  title: 'Sổ Cái Nhật Ký Chung & Định Khoản Nợ / Có (General Ledger)',
  subtitle: 'Quản lý dòng tiền, sổ quỹ thu chi, công nợ phải thu/phải trả và hóa đơn điện tử.',
  entityLabel: 'bút toán',
  createLabel: 'Thêm Bút Toán',
  countLabel: 'Bút toán',
  repo: ledgerRepo,
  columns: [
    { key: 'date', label: 'Ngày', format: 'date' },
    { key: 'memo', label: 'Diễn Giải' },
    { key: 'debit_account', label: 'TK Nợ', value: (r) => acc(r.debit_account) },
    { key: 'debit_amount', label: 'Số Tiền Nợ', format: 'vnd' },
    { key: 'credit_account', label: 'TK Có', value: (r) => acc(r.credit_account) },
    { key: 'credit_amount', label: 'Số Tiền Có', format: 'vnd' },
  ],
  fields: [
    { key: 'date', label: 'Ngày', type: 'date', required: true },
    { key: 'memo', label: 'Diễn giải', type: 'text', required: true },
    { key: 'debit_account', label: 'Tài khoản Nợ', type: 'select', required: true, options: ACCOUNTS },
    { key: 'debit_amount', label: 'Số tiền Nợ (₫)', type: 'number', required: true, min: 1 },
    { key: 'credit_account', label: 'Tài khoản Có', type: 'select', required: true, options: ACCOUNTS },
    { key: 'credit_amount', label: 'Số tiền Có (₫) - phải bằng Nợ', type: 'number', required: true, min: 1 },
  ],
}
</script>

<template>
  <CrudPage :config="config">
    <template #top>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2"><span class="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded font-bold text-xs">TK 111 / 112 (Tiền)</span><h4 class="font-bold text-slate-800">Nợ: Tiền Mặt / Tiền Gửi NH</h4><p class="text-xs text-slate-500">Tăng khi nhận tiền thanh toán từ đơn hàng bán.</p></div>
        <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2"><span class="px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded font-bold text-xs">TK 131 / 331 (Công Nợ)</span><h4 class="font-bold text-slate-800">Có: Phải Thu KH / Phải Trả NCC</h4><p class="text-xs text-slate-500">Định khoản hạch toán khấu trừ nghĩa vụ tài chính.</p></div>
        <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2"><span class="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-xs">TK 511 / 632 (Doanh Thu/Giá Vốn)</span><h4 class="font-bold text-slate-800">Doanh Thu & Giá Vốn Bán Hàng</h4><p class="text-xs text-slate-500">Kết chuyển báo cáo Lãi/Lỗ hoạt động kinh doanh.</p></div>
      </div>
    </template>
  </CrudPage>
</template>
