<script setup lang="ts">
import CrudPage, { type CrudConfig } from '../../components/CrudPage.vue'
import { planRepo, type PurchasePlan } from '../../data'

const config: CrudConfig<PurchasePlan> = {
  title: 'Danh Sách Kế Hoạch Mua Vật Tư Năm 2026',
  subtitle: 'Quản lý quy trình mua hàng vật tư, yêu cầu PR, báo giá RFQ, NCC và đơn mua PO.',
  entityLabel: 'kế hoạch',
  createLabel: 'Tạo Kế Hoạch Mới',
  countLabel: 'Kế hoạch',
  accent: 'amber',
  repo: planRepo,
  columns: [
    { key: 'name', label: 'Tên Kế Hoạch Mua Sắm' },
    { key: 'period', label: 'Kỳ Ngân Sách' },
    { key: 'budget', label: 'Dự Trù Chi Phí', format: 'vnd' },
    {
      key: 'status', label: 'Trạng Thái Duyệt', format: 'badge',
      badge: {
        draft: { label: 'Nháp', cls: 'bg-slate-200 text-slate-700' },
        pending: { label: 'Chờ Duyệt', cls: 'bg-amber-100 text-amber-800' },
        approved: { label: 'Đã Phê Duyệt', cls: 'bg-emerald-100 text-emerald-800' },
      },
    },
    { key: 'owner', label: 'Phụ Trách' },
  ],
  fields: [
    { key: 'name', label: 'Tên kế hoạch mua sắm', type: 'text', required: true },
    { key: 'period', label: 'Kỳ ngân sách', type: 'text', required: true },
    { key: 'budget', label: 'Dự trù chi phí (₫)', type: 'number', required: true, min: 0 },
    { key: 'status', label: 'Trạng thái duyệt', type: 'select', required: true, options: [{ value: 'draft', label: 'Nháp' }, { value: 'pending', label: 'Chờ duyệt' }, { value: 'approved', label: 'Đã phê duyệt' }] },
    { key: 'owner', label: 'Phụ trách', type: 'text' },
  ],
}
</script>

<template>
  <CrudPage :config="config" />
</template>
