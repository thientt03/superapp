<script setup lang="ts">
import CrudPage, { type CrudConfig } from '../../components/CrudPage.vue'
import { kpiRepo, type KpiCardItem } from '../../data'

const config: CrudConfig<KpiCardItem> = {
  title: 'Báo Cáo Đánh Giá Hiệu Suất Đội Ngũ (OKRs/KPIs)',
  subtitle: 'Quản lý hồ sơ, chấm công, nghỉ phép, lương thưởng và đánh giá hiệu suất nhân sự.',
  entityLabel: 'kỳ đánh giá',
  createLabel: 'Tạo Kỳ Đánh Giá',
  accent: 'indigo',
  repo: kpiRepo,
  card: { tag: 'tag', title: 'title', desc: 'desc' },
  fields: [
    { key: 'tag', label: 'Nhãn (vd: Tỉ Lệ Đạt KPI Khối Sales)', type: 'text', required: true },
    { key: 'title', label: 'Chỉ số / tiêu đề', type: 'text', required: true },
    { key: 'desc', label: 'Mô tả', type: 'textarea' },
  ],
  columns: [],
}
</script>

<template>
  <CrudPage :config="config" />
</template>
