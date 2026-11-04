<script setup lang="ts">
import CrudPage, { type CrudConfig } from '../../components/CrudPage.vue'
import { segmentRepo, type SegmentRule } from '../../data'

const config: CrudConfig<SegmentRule> = {
  title: 'Cấu Hình Quy Tắc Phân Loại Khách Hàng Tự Động',
  subtitle: 'Thiết lập điều kiện tự động gán nhãn, hạng thẻ và chính sách chiết khấu.',
  entityLabel: 'quy tắc',
  createLabel: 'Thêm Quy Tắc (Rule) Mới',
  repo: segmentRepo,
  columns: [
    { key: 'tier', label: 'Hạng' },
    { key: 'condition', label: 'Điều Kiện (Rule)' },
    { key: 'action', label: 'Hành Động Tự Động' },
    { key: 'discount', label: 'Chiết Khấu (%)' },
    { key: 'priority', label: 'Ưu Tiên' },
    {
      key: 'status', label: 'Trạng Thái', format: 'badge',
      badge: {
        active: { label: 'Đang Kích Hoạt', cls: 'bg-emerald-100 text-emerald-800' },
        default: { label: 'Mặc Định', cls: 'bg-slate-200 text-slate-700' },
        off: { label: 'Tạm Tắt', cls: 'bg-rose-100 text-rose-800' },
      },
    },
  ],
  fields: [
    { key: 'tier', label: 'Hạng / nhãn', type: 'text', required: true },
    { key: 'condition', label: 'Điều kiện', type: 'textarea', required: true },
    { key: 'action', label: 'Hành động tự động', type: 'textarea' },
    { key: 'discount', label: 'Chiết khấu (%)', type: 'number', required: true, min: 0 },
    { key: 'priority', label: 'Ưu tiên', type: 'number', required: true, min: 1 },
    { key: 'status', label: 'Trạng thái', type: 'select', required: true, options: [{ value: 'active', label: 'Đang kích hoạt' }, { value: 'default', label: 'Mặc định' }, { value: 'off', label: 'Tạm tắt' }] },
  ],
}
</script>

<template>
  <CrudPage :config="config" />
</template>
