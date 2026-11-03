<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import CrudPage, { type CrudConfig } from '../../components/CrudPage.vue'
import { branchRepo, departmentRepo, employeeRepo, type Branch, type Department, type Employee } from '../../data'

const departments = ref<Department[]>([])
const branches = ref<Branch[]>([])
const employees = ref<Employee[]>([])
const ready = ref(false)
async function loadDepartments() {
  departments.value = await departmentRepo.list()
}
onMounted(async () => {
  ;[branches.value, employees.value] = await Promise.all([branchRepo.list(), employeeRepo.list()])
  await loadDepartments()
  ready.value = true
})

const parentOpts = computed(() => departments.value.map((d) => ({ value: d.code, label: d.name })))
const branchOpts = computed(() => branches.value.map((b) => ({ value: b.code, label: b.name })))
const headOpts = computed(() => employees.value.map((e) => ({ value: e.code, label: `${e.full_name} (${e.code})` })))
const nameOf = (list: { value: string; label: string }[], v: string) => list.find((o) => o.value === v)?.label ?? v
const counts = computed(() => {
  const c: Record<string, number> = {}
  for (const e of employees.value) c[e.department] = (c[e.department] ?? 0) + 1
  return c
})
const statusOpts = [{ value: 'active', label: 'Đang hoạt động' }, { value: 'inactive', label: 'Ngừng hoạt động' }]

const config = computed<CrudConfig<Department>>(() => ({
  title: 'Danh Sách Phòng Ban & Cơ Cấu Tổ Chức',
  subtitle: 'Cấu hình thông tin doanh nghiệp, chi nhánh, cây phê duyệt đa cấp, nhóm quyền và tài khoản.',
  entityLabel: 'phòng ban',
  createLabel: 'Thêm Phòng Ban Mới',
  countLabel: 'Phòng ban',
  repo: departmentRepo,
  columns: [
    { key: 'name', label: 'Tên Phòng Ban' },
    { key: 'parent', label: 'Phòng Ban Cha', value: (r) => (r.parent ? nameOf(parentOpts.value, r.parent) : '—') },
    { key: 'branch', label: 'Chi Nhánh', value: (r) => nameOf(branchOpts.value, r.branch) },
    { key: 'head', label: 'Trưởng Phòng', value: (r) => employees.value.find((e) => e.code === r.head)?.full_name ?? r.head },
    { key: 'code', label: 'Số Nhân Sự', value: (r) => `${counts.value[r.code] ?? 0} Nhân viên` },
    { key: 'status', label: 'Trạng Thái', format: 'badge', badge: { active: { label: 'Đang Hoạt Động', cls: 'bg-emerald-100 text-emerald-800' }, inactive: { label: 'Ngừng Hoạt Động', cls: 'bg-slate-200 text-slate-700' } } },
  ],
  fields: [
    { key: 'code', label: 'Mã phòng ban (PB-xxxx, để trống để tự sinh)', type: 'text' },
    { key: 'name', label: 'Tên phòng ban', type: 'text', required: true },
    { key: 'parent', label: 'Phòng ban cha', type: 'select', options: parentOpts.value },
    { key: 'branch', label: 'Chi nhánh', type: 'select', required: true, options: branchOpts.value },
    { key: 'head', label: 'Trưởng phòng', type: 'select', options: headOpts.value },
    { key: 'status', label: 'Trạng thái', type: 'select', required: true, options: statusOpts },
  ],
}))
</script>

<template>
  <CrudPage v-if="ready" :config="config" @changed="loadDepartments" />
</template>
