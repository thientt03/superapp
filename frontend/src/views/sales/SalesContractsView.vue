<script setup lang="ts">
import CrudPage, { type CrudConfig } from '../../components/CrudPage.vue'
import { contractRepo, type Contract } from '../../data'

const config: CrudConfig<Contract> = {
  title: 'Hợp Đồng Kinh Doanh & Dịch Vụ',
  subtitle: 'Quản lý hợp đồng bán hàng và dịch vụ.',
  entityLabel: 'hợp đồng',
  createLabel: 'Tạo Hợp Đồng Mới',
  countLabel: 'Hợp đồng',
  repo: contractRepo,
  columns: [
    { key: 'name', label: 'Tên Hợp Đồng' },
    { key: 'customer', label: 'Khách Hàng' },
    { key: 'value', label: 'Giá Trị', format: 'vnd' },
    { key: 'start', label: 'Từ Ngày', format: 'date' },
    { key: 'end', label: 'Đến Ngày', format: 'date' },
    {
      key: 'status', label: 'Trạng Thái', format: 'badge',
      badge: {
        draft: { label: 'Soạn Thảo', cls: 'bg-slate-200 text-slate-700' },
        active: { label: 'Đang Hiệu Lực', cls: 'bg-emerald-100 text-emerald-800' },
        expired: { label: 'Hết Hạn', cls: 'bg-rose-100 text-rose-800' },
      },
    },
  ],
  fields: [
    { key: 'name', label: 'Tên hợp đồng', type: 'text', required: true },
    { key: 'customer', label: 'Khách hàng', type: 'text', required: true },
    { key: 'value', label: 'Giá trị (₫)', type: 'number', required: true, min: 0 },
    { key: 'start', label: 'Từ ngày', type: 'date', required: true },
    { key: 'end', label: 'Đến ngày', type: 'date', required: true },
    { key: 'status', label: 'Trạng thái', type: 'select', required: true, options: [{ value: 'draft', label: 'Soạn thảo' }, { value: 'active', label: 'Đang hiệu lực' }, { value: 'expired', label: 'Hết hạn' }] },
  ],
}
</script>

<template>
  <CrudPage :config="config" />
</template>
