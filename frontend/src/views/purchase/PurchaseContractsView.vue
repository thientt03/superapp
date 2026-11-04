<script setup lang="ts">
import CrudPage, { type CrudConfig } from '../../components/CrudPage.vue'
import { purchaseContractRepo, type PurchaseContract } from '../../data'

const config: CrudConfig<PurchaseContract> = {
  title: 'Danh Mục Hợp Đồng Mua Vật Tư Nguyên Liệu',
  subtitle: 'Quản lý quy trình mua hàng vật tư, yêu cầu PR, báo giá RFQ, NCC và đơn mua PO.',
  entityLabel: 'hợp đồng mua',
  createLabel: 'Thêm Hợp Đồng Mua',
  countLabel: 'Hợp Đồng',
  accent: 'amber',
  repo: purchaseContractRepo,
  columns: [
    { key: 'name', label: 'Tên Hợp Đồng Mua' },
    { key: 'vendor', label: 'Nhà Cung Cấp' },
    { key: 'value', label: 'Giá Trị Khung', format: 'vnd' },
    { key: 'start', label: 'Từ Ngày', format: 'date' },
    { key: 'end', label: 'Đến Ngày', format: 'date' },
  ],
  fields: [
    { key: 'name', label: 'Tên hợp đồng mua', type: 'text', required: true },
    { key: 'vendor', label: 'Nhà cung cấp', type: 'text', required: true },
    { key: 'value', label: 'Giá trị khung (₫)', type: 'number', required: true, min: 0 },
    { key: 'start', label: 'Từ ngày', type: 'date', required: true },
    { key: 'end', label: 'Đến ngày', type: 'date', required: true },
  ],
}
</script>

<template>
  <CrudPage :config="config" />
</template>
