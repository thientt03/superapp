<script setup lang="ts">
import CrudPage, { type CrudConfig } from '../../components/CrudPage.vue'
import { campaignRepo, type Campaign } from '../../data'

const config: CrudConfig<Campaign> = {
  title: 'Chiến Dịch Tuyển Dụng & Đào Tạo Đang Mở',
  subtitle: 'Quản lý hồ sơ, chấm công, nghỉ phép, lương thưởng và đánh giá hiệu suất nhân sự.',
  entityLabel: 'chiến dịch',
  createLabel: 'Đăng Tin Tuyển Dụng',
  accent: 'indigo',
  repo: campaignRepo,
  card: { tag: 'tag', title: 'title', desc: 'desc' },
  fields: [
    { key: 'kind', label: 'Loại', type: 'select', required: true, options: [{ value: 'job', label: 'Tuyển dụng' }, { value: 'training', label: 'Đào tạo' }] },
    { key: 'tag', label: 'Nhãn (vd: Đang Tuyển (3 Vị trí))', type: 'text', required: true },
    { key: 'title', label: 'Tiêu đề', type: 'text', required: true },
    { key: 'desc', label: 'Mô tả (mức lương / thời gian)', type: 'textarea' },
  ],
  columns: [],
  filter: { key: 'kind', options: [{ value: 'job', label: 'Tuyển dụng' }, { value: 'training', label: 'Đào tạo' }] },
}
</script>

<template>
  <CrudPage :config="config" />
</template>
