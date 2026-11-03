<script setup lang="ts">
import { onMounted, ref } from 'vue'
import CrudPage, { type CrudConfig } from '../../components/CrudPage.vue'
import { roleRepo, userRepo, type Role } from '../../data'
import { toast } from '../../toast'

const counts = ref<Record<string, number>>({})
async function loadCounts() {
  const c: Record<string, number> = {}
  for (const u of await userRepo.list()) c[u.role] = (c[u.role] ?? 0) + 1
  counts.value = c
}
onMounted(loadCounts)

const config: CrudConfig<Role> = {
  title: 'Danh Sách Nhóm Quyền & Phân Phân Hệ (RBAC Matrix)',
  subtitle: 'Cấu hình thông tin doanh nghiệp, chi nhánh, cây phê duyệt đa cấp, nhóm quyền và tài khoản.',
  entityLabel: 'nhóm quyền',
  createLabel: 'Thêm Nhóm Quyền Mới',
  repo: roleRepo,
  columns: [
    { key: 'name', label: 'Tên Nhóm Quyền' },
    { key: 'scope', label: 'Mô Tả Phạm Vi Quyền Hạn' },
    { key: 'code', label: 'Số Lượng Tài Khoản', value: (r) => `${counts.value[r.code] ?? 0} Tài khoản` },
  ],
  fields: [
    { key: 'code', label: 'Mã nhóm (ROLE-xxx, để trống để tự sinh)', type: 'text' },
    { key: 'name', label: 'Tên nhóm quyền', type: 'text', required: true },
    { key: 'scope', label: 'Mô tả phạm vi quyền hạn', type: 'textarea', required: true },
  ],
}
</script>

<template>
  <CrudPage :config="config" @changed="loadCounts">
    <template #actions="{ row }">
      <button type="button" class="px-2.5 py-1 bg-brand-50 hover:bg-brand-100 text-brand-600 font-semibold rounded-lg" @click="toast(`Cấu hình quyền: ${row.name}`)">Cấu Hình Quyền</button>
    </template>
  </CrudPage>
</template>
