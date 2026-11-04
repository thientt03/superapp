<script setup lang="ts">
import CrudPage, { type CrudConfig } from '../../components/CrudPage.vue'
import { customerRepo, type Customer } from '../../data'

const config: CrudConfig<Customer> = {
  title: 'Danh Sách Khách Hàng (B2B & B2C)',
  subtitle: 'Quản lý hồ sơ khách hàng doanh nghiệp và cá nhân.',
  entityLabel: 'khách hàng',
  createLabel: 'Thêm Khách Hàng Mới',
  countLabel: 'hồ sơ',
  repo: customerRepo,
  columns: [
    { key: 'name', label: 'Tên Khách Hàng / Công Ty' },
    { key: 'tax_code', label: 'MST' },
    { key: 'rep', label: 'Người Đại Diện' },
    { key: 'phone', label: 'Liên Hệ' },
    { key: 'industry', label: 'Lĩnh Vực' },
    {
      key: 'tier', label: 'Hạng Thẻ', format: 'badge',
      badge: {
        'VIP Platinum': { label: 'VIP Platinum', cls: 'bg-purple-100 text-purple-800' },
        'Gold Partner': { label: 'Gold Partner', cls: 'bg-amber-100 text-amber-800' },
        'Khách Hàng Mới': { label: 'Khách Hàng Mới', cls: 'bg-blue-100 text-blue-800' },
      },
    },
    { key: 'revenue', label: 'Doanh Số', format: 'vnd' },
  ],
  fields: [
    { key: 'name', label: 'Tên khách hàng / công ty', type: 'text', required: true },
    { key: 'tax_code', label: 'Mã số thuế', type: 'text' },
    { key: 'rep', label: 'Người đại diện', type: 'text' },
    { key: 'phone', label: 'Điện thoại', type: 'text' },
    { key: 'email', label: 'Email', type: 'text' },
    { key: 'industry', label: 'Lĩnh vực', type: 'text' },
    { key: 'tier', label: 'Hạng thẻ', type: 'select', required: true, options: ['VIP Platinum', 'Gold Partner', 'Khách Hàng Mới'].map((v) => ({ value: v, label: v })) },
    { key: 'revenue', label: 'Doanh số (₫)', type: 'number', min: 0 },
  ],
  filter: { key: 'tier', options: ['VIP Platinum', 'Gold Partner', 'Khách Hàng Mới'].map((v) => ({ value: v, label: v })) },
}
</script>

<template>
  <CrudPage :config="config" />
</template>
