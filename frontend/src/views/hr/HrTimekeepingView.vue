<script setup lang="ts">
import CrudPage, { type CrudConfig } from '../../components/CrudPage.vue'
import { attendanceRepo, lateMinutes, type Attendance } from '../../data'
import { toast } from '../../toast'

const late = (r: Attendance) => lateMinutes(r.check_in)

const config: CrudConfig<Attendance> = {
  title: 'Chấm Công Tự Động (Vân Tay & App)',
  subtitle: 'Dữ Liệu Điểm Danh Tự Động (Máy Vân Tay, FaceID & App Mobile)',
  entityLabel: 'bản ghi chấm công',
  createLabel: 'Thêm Bản Ghi Chấm Công',
  countLabel: 'Lượt',
  accent: 'indigo',
  repo: attendanceRepo,
  columns: [
    { key: 'emp_code', label: 'Mã NV' },
    { key: 'full_name', label: 'Nhân Viên' },
    { key: 'date', label: 'Ngày', format: 'date' },
    {
      key: 'channel', label: 'Kênh Điểm Danh', format: 'badge',
      badge: {
        fingerprint: { label: 'Máy Vân Tay', cls: 'bg-blue-100 text-blue-800' },
        face: { label: 'FaceID', cls: 'bg-purple-100 text-purple-800' },
        app: { label: 'App Mobile GPS', cls: 'bg-teal-100 text-teal-800' },
      },
    },
    { key: 'check_in', label: 'Giờ Vào (Check-In)' },
    { key: 'check_out', label: 'Giờ Ra (Check-Out)', value: (r) => r.check_out || 'Chưa check-out' },
    { key: 'device', label: 'Thiết Bị / Vị Trí GPS' },
    {
      key: 'check_in', label: 'Trạng Thái', format: 'badge',
      value: (r) => (late(r) > 0 ? 'late' : 'on_time'),
      text: (r) => (late(r) > 0 ? `Đi Muộn ${late(r)}p` : 'Đúng Giờ'),
      badge: { on_time: { label: 'Đúng Giờ', cls: 'bg-emerald-100 text-emerald-800' }, late: { label: 'Đi Muộn', cls: 'bg-amber-100 text-amber-800' } },
    },
  ],
  fields: [
    { key: 'emp_code', label: 'Mã nhân viên', type: 'text', required: true },
    { key: 'full_name', label: 'Nhân viên', type: 'text', required: true },
    { key: 'date', label: 'Ngày', type: 'date', required: true },
    { key: 'channel', label: 'Kênh điểm danh', type: 'select', required: true, options: [{ value: 'fingerprint', label: 'Máy vân tay' }, { value: 'face', label: 'FaceID' }, { value: 'app', label: 'App Mobile GPS' }] },
    { key: 'check_in', label: 'Giờ vào (HH:MM:SS)', type: 'text', required: true },
    { key: 'check_out', label: 'Giờ ra (HH:MM:SS)', type: 'text' },
    { key: 'device', label: 'Thiết bị / vị trí GPS', type: 'text' },
  ],
}
</script>

<template>
  <CrudPage :config="config">
    <template #header>
      <button type="button" class="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl font-semibold text-xs hover:bg-slate-50 flex items-center shadow-sm" @click="toast('Đang đồng bộ dữ liệu từ 3 máy chấm công cửa!')">
        <i class="fa-solid fa-rotate mr-1.5"></i>Đồng Bộ Máy Chấm Công
      </button>
    </template>
    <template #actions="{ row }">
      <button v-if="late(row) > 0" type="button" class="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold rounded-lg" @click="toast(`Giải trình đi muộn của ${row.full_name}`)">Giải Trình</button>
      <button v-else type="button" class="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg" @click="toast(`Log chi tiết của ${row.full_name}`)">Log Chi Tiết</button>
    </template>
  </CrudPage>
</template>
