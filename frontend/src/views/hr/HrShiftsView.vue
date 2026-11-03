<script setup lang="ts">
import CrudPage, { type CrudConfig } from '../../components/CrudPage.vue'
import KpiCard from '../../components/KpiCard.vue'
import { OT_COEF, otHours, overtimeRepo, type Overtime } from '../../data'
import { toast } from '../../toast'

const TYPES = [
  { value: 'weekday', label: 'Tăng Ca Ngoài Giờ (Ngày Thường)' },
  { value: 'sunday', label: 'Làm Thêm Ngày Chủ Nhật' },
  { value: 'holiday', label: 'Làm Thêm Ngày Lễ' },
]
const hours = (r: Overtime) => otHours(r.from, r.to)
const total = (rows: Overtime[]) => rows.reduce((s, r) => s + hours(r), 0)

async function approve(r: Overtime, reload: () => Promise<void>) {
  await overtimeRepo.update(r.id, { status: 'approved' })
  toast(`Đã duyệt đơn tăng ca ${r.code}`)
  await reload()
}

const config: CrudConfig<Overtime> = {
  title: 'Ca Làm & Tăng Ca (Overtime)',
  subtitle: 'Quản Lý Phân Ca & Đăng Ký Tăng Ca (Overtime - OT)',
  entityLabel: 'đơn tăng ca',
  createLabel: 'Đăng Ký Tăng Ca / OT',
  accent: 'indigo',
  repo: overtimeRepo,
  columns: [
    { key: 'full_name', label: 'Nhân Viên' },
    { key: 'type', label: 'Loại Tăng Ca / Phân Ca', format: 'badge', badge: { weekday: { label: TYPES[0]!.label, cls: 'bg-blue-100 text-blue-800' }, sunday: { label: TYPES[1]!.label, cls: 'bg-purple-100 text-purple-800' }, holiday: { label: TYPES[2]!.label, cls: 'bg-rose-100 text-rose-800' } } },
    { key: 'date', label: 'Khung Giờ Tăng Ca', value: (r) => `${r.date.split('-').reverse().join('/')} (${r.from} - ${r.to})` },
    { key: 'from', label: 'Số Giờ OT', value: (r) => `${hours(r).toFixed(1)} Giờ` },
    { key: 'type', label: 'Hệ Số Lương', value: (r) => `x ${OT_COEF[r.type]?.toFixed(1)} (${(OT_COEF[r.type] ?? 0) * 100}%)` },
    {
      key: 'status', label: 'Trạng Thái', format: 'badge',
      badge: {
        approved: { label: 'Đã Duyệt', cls: 'bg-emerald-100 text-emerald-800' },
        pending: { label: 'Chờ Trưởng Phòng Duyệt', cls: 'bg-amber-100 text-amber-800' },
        rejected: { label: 'Từ Chối', cls: 'bg-rose-100 text-rose-800' },
      },
    },
  ],
  fields: [
    { key: 'emp_code', label: 'Mã nhân viên (NV-xxxx)', type: 'text', required: true },
    { key: 'full_name', label: 'Nhân viên', type: 'text', required: true },
    { key: 'type', label: 'Loại tăng ca', type: 'select', required: true, options: TYPES },
    { key: 'date', label: 'Ngày', type: 'date', required: true },
    { key: 'from', label: 'Từ giờ (HH:MM)', type: 'text', required: true },
    { key: 'to', label: 'Đến giờ (HH:MM)', type: 'text', required: true },
    { key: 'status', label: 'Trạng thái', type: 'select', required: true, options: [{ value: 'pending', label: 'Chờ trưởng phòng duyệt' }, { value: 'approved', label: 'Đã duyệt' }, { value: 'rejected', label: 'Từ chối' }] },
  ],
}
</script>

<template>
  <CrudPage :config="config">
    <template #top="{ rows }">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard label="Tổng Số Giờ OT Tháng Này" :value="`${total(rows).toFixed(1)} Giờ`" icon="fa-solid fa-business-time" tone="bg-indigo-50 text-indigo-600" />
        <KpiCard label="Đơn Tăng Ca Chờ Duyệt" :value="`${rows.filter((r) => r.status === 'pending').length} Đơn`" icon="fa-solid fa-hourglass-half" tone="bg-amber-50 text-amber-600" />
        <KpiCard label="Hệ Số Tăng Ca Ngày Nghỉ/Lễ" value="200% - 300% Lương" icon="fa-solid fa-percent" tone="bg-emerald-50 text-emerald-600" />
      </div>
    </template>
    <template #actions="{ row, reload }">
      <button v-if="row.status === 'pending'" type="button" class="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-lg" @click="approve(row, reload)">Duyệt</button>
    </template>
  </CrudPage>
</template>
