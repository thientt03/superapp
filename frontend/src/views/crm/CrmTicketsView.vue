<script setup lang="ts">
import CrudPage, { type CrudConfig } from '../../components/CrudPage.vue'
import { ref } from 'vue'
import KpiCard from '../../components/KpiCard.vue'
import { ticketRepo, type Ticket } from '../../data'

const all = ref<Ticket[]>([])
const refreshStats = async () => (all.value = await ticketRepo.list())
const count = (st: string) => all.value.filter((t) => t.status === st).length

const config: CrudConfig<Ticket> = {
  title: 'Ticket & Khiếu Nại',
  subtitle: 'Tiếp nhận và xử lý khiếu nại, yêu cầu hỗ trợ của khách hàng.',
  entityLabel: 'ticket',
  createLabel: 'Tạo Ticket Khiếu Nại Mới',
  repo: ticketRepo,
  columns: [
    { key: 'title', label: 'Nội Dung Khiếu Nại / Yêu Cầu' },
    { key: 'customer', label: 'Khách Hàng' },
    { key: 'channel', label: 'Kênh Tiếp Nhận' },
    {
      key: 'priority', label: 'Ưu Tiên', format: 'badge',
      badge: {
        urgent: { label: 'Khẩn cấp', cls: 'bg-rose-100 text-rose-800' },
        high: { label: 'Cao', cls: 'bg-orange-100 text-orange-800' },
        medium: { label: 'Trung bình', cls: 'bg-blue-100 text-blue-800' },
        low: { label: 'Thấp', cls: 'bg-slate-200 text-slate-700' },
      },
    },
    {
      key: 'status', label: 'Trạng Thái', format: 'badge',
      badge: {
        new: { label: 'Mới tiếp nhận', cls: 'bg-blue-100 text-blue-800' },
        in_progress: { label: 'Đang xử lý', cls: 'bg-amber-100 text-amber-800' },
        resolved: { label: 'Đã giải quyết', cls: 'bg-emerald-100 text-emerald-800' },
      },
    },
    { key: 'sla', label: 'Hạn SLA' },
    { key: 'owner', label: 'Phụ Trách' },
  ],
  fields: [
    { key: 'title', label: 'Nội dung khiếu nại / yêu cầu', type: 'text', required: true },
    { key: 'detail', label: 'Chi tiết', type: 'textarea' },
    { key: 'customer', label: 'Khách hàng', type: 'text', required: true },
    { key: 'phone', label: 'Điện thoại', type: 'text' },
    { key: 'channel', label: 'Kênh tiếp nhận', type: 'select', required: true, options: ['Hotline CSKH', 'Email Portal', 'Zalo OA'].map((v) => ({ value: v, label: v })) },
    { key: 'priority', label: 'Ưu tiên', type: 'select', required: true, options: [{ value: 'urgent', label: 'Khẩn cấp' }, { value: 'high', label: 'Cao' }, { value: 'medium', label: 'Trung bình' }, { value: 'low', label: 'Thấp' }] },
    { key: 'status', label: 'Trạng thái', type: 'select', required: true, options: [{ value: 'new', label: 'Mới tiếp nhận' }, { value: 'in_progress', label: 'Đang xử lý' }, { value: 'resolved', label: 'Đã giải quyết' }] },
    { key: 'sla', label: 'Hạn SLA', type: 'text' },
    { key: 'owner', label: 'Phụ trách', type: 'text' },
  ],
  countLabel: 'Ticket',
  filter2: { key: 'priority', options: [{ value: 'urgent', label: 'Khẩn cấp' }, { value: 'high', label: 'Cao' }, { value: 'medium', label: 'Trung bình' }, { value: 'low', label: 'Thấp' }] },
  filter: { key: 'status', options: [{ value: 'new', label: 'Mới tiếp nhận' }, { value: 'in_progress', label: 'Đang xử lý' }, { value: 'resolved', label: 'Đã giải quyết' }] },
}
</script>

<template>
  <CrudPage :config="config" @changed="refreshStats">
    <template #top>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Tổng Ticket" :value="`${all.length} Ticket`" icon="fa-solid fa-headset" />
        <KpiCard label="Mới Tiếp Nhận" :value="`${count('new')} Ticket`" icon="fa-solid fa-inbox" tone="bg-amber-50 text-amber-600" />
        <KpiCard label="Đang Xử Lý" :value="`${count('in_progress')} Ticket`" icon="fa-solid fa-gears" tone="bg-purple-50 text-purple-600" />
        <KpiCard label="Tỉ Lệ Đạt SLA" value="95.8%" icon="fa-solid fa-stopwatch" tone="bg-emerald-50 text-emerald-600" />
      </div>
    </template>
  </CrudPage>
</template>
