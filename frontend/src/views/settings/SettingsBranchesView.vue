<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import CrudPage, { type CrudConfig } from '../../components/CrudPage.vue'
import { branchRepo, departmentRepo, employeeRepo, type Branch, type Department, type Employee } from '../../data'

const employees = ref<Employee[]>([])
const departments = ref<Department[]>([])
const ready = ref(false)
async function loadStaff() {
  ;[employees.value, departments.value] = await Promise.all([employeeRepo.list(), departmentRepo.list()])
}
onMounted(async () => {
  await loadStaff()
  ready.value = true
})

const managerOpts = computed(() => employees.value.map((e) => ({ value: e.code, label: `${e.full_name} (${e.code})` })))
// Nhân viên chưa nghỉ việc, theo trường branch của chính phòng ban
const counts = computed(() => {
  const branchOf = new Map(departments.value.map((d) => [d.code, d.branch]))
  const c: Record<string, number> = {}
  for (const e of employees.value) {
    const b = e.status !== 'resigned' ? branchOf.get(e.department) : undefined
    if (b) c[b] = (c[b] ?? 0) + 1
  }
  return c
})

const config = computed<CrudConfig<Branch>>(() => ({
  title: 'Danh Sách Chi Nhánh & Kho Trực Thuộc Doanh Nghiệp',
  subtitle: 'Cấu hình thông tin doanh nghiệp, chi nhánh, cây phê duyệt đa cấp, nhóm quyền và tài khoản.',
  entityLabel: 'chi nhánh',
  createLabel: 'Thêm Chi Nhánh Mới',
  repo: branchRepo,
  columns: [
    { key: 'name', label: 'Tên Chi Nhánh / Đơn Vị' },
    { key: 'address', label: 'Địa Chỉ Giao Dịch' },
    { key: 'manager', label: 'Người Quản Lý', value: (r) => employees.value.find((e) => e.code === r.manager)?.full_name ?? r.manager },
    { key: 'code', label: 'Số Lượng Nhân Sự', value: (r) => `${counts.value[r.code] ?? 0} Nhân viên` },
  ],
  fields: [
    { key: 'code', label: 'Mã chi nhánh (vd HCM-HQ, để trống để tự sinh)', type: 'text' },
    { key: 'name', label: 'Tên chi nhánh / đơn vị', type: 'text', required: true },
    { key: 'address', label: 'Địa chỉ giao dịch', type: 'text', required: true },
    { key: 'manager', label: 'Người quản lý', type: 'select', options: managerOpts.value },
  ],
}))
</script>

<template>
  <CrudPage v-if="ready" :config="config" @changed="loadStaff" />
</template>
