<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import CrudPage, { type CrudConfig } from '../../components/CrudPage.vue'
import { departmentRepo, employeeRepo, positionRepo, type Department, type Employee, type Position } from '../../data'

const departments = ref<Department[]>([])
const positions = ref<Position[]>([])
const ready = ref(false)
onMounted(async () => {
  ;[departments.value, positions.value] = await Promise.all([departmentRepo.list(), positionRepo.list()])
  ready.value = true
})

const deptOpts = computed(() => departments.value.map((d) => ({ value: d.code, label: d.status === 'inactive' ? `${d.name} (Ngừng hoạt động)` : d.name })))
const nameOf = (list: { value: string; label: string }[], v: string) => list.find((o) => o.value === v)?.label ?? v
const posOpts = computed(() => positions.value.map((p) => ({ value: p.code, label: p.name })))

const config = computed<CrudConfig<Employee>>(() => ({
  title: 'Hồ Sơ Nhân Viên',
  subtitle: 'Quản lý hồ sơ, chấm công, nghỉ phép, lương thưởng và đánh giá hiệu suất nhân sự.',
  entityLabel: 'nhân viên',
  createLabel: 'Thêm Nhân Viên Mới',
  countLabel: 'Nhân viên',
  accent: 'indigo',
  repo: employeeRepo,
  columns: [
    { key: 'full_name', label: 'Họ & Tên' },
    { key: 'department', label: 'Phòng Ban', value: (r) => nameOf(deptOpts.value, r.department) },
    { key: 'position', label: 'Chức Vụ', value: (r) => nameOf(posOpts.value, r.position) },
    { key: 'base_salary', label: 'Lương Cơ Bản', format: 'vnd' },
    { key: 'leave_days', label: 'Phép Năm Còn Lại', value: (r) => `${r.leave_days} ngày` },
    { key: 'phone', label: 'Điện Thoại' },
    { key: 'email', label: 'Email' },
    { key: 'start_date', label: 'Ngày Vào Làm', format: 'date' },
    {
      key: 'status', label: 'Trạng Thái', format: 'badge',
      badge: {
        active: { label: 'Đang Làm Việc', cls: 'bg-emerald-100 text-emerald-800' },
        leave: { label: 'Nghỉ Phép', cls: 'bg-amber-100 text-amber-800' },
        resigned: { label: 'Đã Nghỉ Việc', cls: 'bg-slate-200 text-slate-700' },
      },
    },
  ],
  fields: [
    { key: 'code', label: 'Mã nhân viên (NV-xxxx, để trống để tự sinh)', type: 'text' },
    { key: 'full_name', label: 'Họ & tên', type: 'text', required: true },
    { key: 'department', label: 'Phòng ban', type: 'select', required: true, options: deptOpts.value },
    {
      key: 'position', label: 'Chức vụ', type: 'select',
      options: (form) => positions.value.filter((p) => p.department === form.department).map((p) => ({ value: p.code, label: p.status === 'inactive' ? `${p.name} (Ngừng hoạt động)` : p.name })),
    },
    { key: 'base_salary', label: 'Lương cơ bản (₫)', type: 'number', required: true, min: 0 },
    { key: 'leave_days', label: 'Số ngày phép năm còn lại', type: 'number', required: true, min: 0 },
    { key: 'phone', label: 'Điện thoại', type: 'text' },
    { key: 'email', label: 'Email', type: 'text' },
    { key: 'start_date', label: 'Ngày vào làm', type: 'date', required: true },
    { key: 'status', label: 'Trạng thái', type: 'select', required: true, options: [{ value: 'active', label: 'Đang làm việc' }, { value: 'leave', label: 'Nghỉ phép' }, { value: 'resigned', label: 'Đã nghỉ việc' }] },
  ],
  filter: { key: 'status', options: [{ value: 'active', label: 'Đang làm việc' }, { value: 'leave', label: 'Nghỉ phép' }, { value: 'resigned', label: 'Đã nghỉ việc' }] },
}))
</script>

<template>
  <CrudPage v-if="ready" :config="config" />
</template>
