<script setup lang="ts">
import CrudPage, { type CrudConfig } from '../../components/CrudPage.vue'
import { vendorRepo, type Vendor } from '../../data'

const config: CrudConfig<Vendor> = {
  title: 'Danh Mục Nhà Cung Cấp (Vendors B2B)',
  subtitle: 'Quản lý quy trình mua hàng vật tư, yêu cầu PR, báo giá RFQ, NCC và đơn mua PO.',
  entityLabel: 'nhà cung cấp',
  createLabel: 'Thêm Nhà Cung Cấp',
  countLabel: 'Nhà Cung Cấp',
  accent: 'amber',
  repo: vendorRepo,
  columns: [
    { key: 'name', label: 'Tên Nhà Cung Cấp' },
    { key: 'rep', label: 'Người Đại Diện / SDT', value: (r) => `${r.rep} - ${r.phone}` },
    { key: 'group', label: 'Nhóm Vật Tư' },
    {
      key: 'rating', label: 'Điểm Đánh Giá SLA', format: 'badge',
      value: (r) => (r.rating >= 4.5 ? 'top' : r.rating >= 3.5 ? 'good' : 'low'),
      badge: {
        top: { label: 'Xuất Sắc', cls: 'bg-emerald-100 text-emerald-800' },
        good: { label: 'Tốt', cls: 'bg-blue-100 text-blue-800' },
        low: { label: 'Cần Cải Thiện', cls: 'bg-rose-100 text-rose-800' },
      },
    },
    { key: 'rating', label: 'Điểm', value: (r) => `${r.rating}/5.0` },
  ],
  fields: [
    { key: 'name', label: 'Tên nhà cung cấp', type: 'text', required: true },
    { key: 'rep', label: 'Người đại diện', type: 'text', required: true },
    { key: 'phone', label: 'Số điện thoại', type: 'text' },
    { key: 'group', label: 'Nhóm vật tư', type: 'text' },
    { key: 'rating', label: 'Điểm đánh giá (0-5)', type: 'number', required: true, min: 0 },
  ],
}
</script>

<template>
  <CrudPage :config="config" />
</template>
