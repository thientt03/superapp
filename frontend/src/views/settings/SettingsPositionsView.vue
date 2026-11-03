<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import CrudPage, { type CrudConfig } from '../../components/CrudPage.vue'
import { departmentRepo, employeeRepo, positionRepo, type Department, type Employee, type Position } from '../../data'

const departments = ref<Department[]>([])
const employees = ref<Employee[]>([])
const ready = ref(false)
async function loadEmployees() {
  employees.value = await employeeRepo.list()
}
onMounted(async () => {
  departments.value = await departmentRepo.list()
  await loadEmployees()
  ready.value = true
})

const deptOpts = computed(() => departments.value.map((d) => ({ value: d.code, label: d.name })))
const nameOf = (list: { value: string; label: string }[], v: string) => list.find((o) => o.value === v)?.label ?? v
const counts = computed(() => {
  const c: Record<string, number> = {}
  for (const e of employees.value) c[e.position] = (c[e.position] ?? 0) + 1
  return c
})
const levelOpts = [
  { value: 'staff', label: 'Nhân viên' },
  { value: 'specialist', label: 'Chuyên viên' },
  { value: 'lead', label: 'Trưởng nhóm' },
  { value: 'manager', label: 'Trưởng phòng' },
  { value: 'director', label: 'Giám đốc' },
]
const statusOpts = [{ value: 'active', label: 'Đang hoạt động' }, { value: 'inactive', label: 'Ngừng hoạt động' }]
const levelBadge = Object.fromEntries(levelOpts.map((o) => [o.value, { label: o.label, cls: 'bg-indigo-100 text-indigo-800' }]))

const config = computed<CrudConfig<Position>>(() => ({
  title: 'Danh Sách Vị Trí Công Việc',
  subtitle: 'Cấu hình thông tin doanh nghiệp, chi nhánh, cây phê duyệt đa cấp, nhóm quyền và tài khoản.',
  entityLabel: 'vị trí',
  createLabel: 'Thêm Vị Trí Mới',
  countLabel: 'Vị trí',
  repo: positionRepo,
  columns: [
    { key: 'name', label: 'Tên Vị Trí' },
    { key: 'department', label: 'Phòng Ban', value: (r) => nameOf(deptOpts.value, r.department) },
    { key: 'level', label: 'Cấp Bậc', format: 'badge', badge: levelBadge },
    { key: 'code', label: 'Số Nhân Sự', value: (r) => `${counts.value[r.code] ?? 0} Nhân viên` },
    { key: 'status', label: 'Trạng Thái', format: 'badge', badge: { active: { label: 'Đang Hoạt Động', cls: 'bg-emerald-100 text-emerald-800' }, inactive: { label: 'Ngừng Hoạt Động', cls: 'bg-slate-200 text-slate-700' } } },
  ],
  fields: [
    { key: 'code', label: 'Mã vị trí (VT-xxxx, để trống để tự sinh)', type: 'text' },
    { key: 'name', label: 'Tên vị trí', type: 'text', required: true },
    { key: 'department', label: 'Phòng ban', type: 'select', required: true, options: deptOpts.value },
    { key: 'level', label: 'Cấp bậc', type: 'select', required: true, options: levelOpts },
    { key: 'status', label: 'Trạng thái', type: 'select', required: true, options: statusOpts },
  ],
  filter: { key: 'level', options: levelOpts },
}))
</script>

<template>
  <CrudPage v-if="ready" :config="config" @changed="loadEmployees" />
</template>
