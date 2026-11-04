<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import CrudPage, { type CrudConfig } from '../../components/CrudPage.vue'
import { branchRepo, roleRepo, userRepo, type AppUser, type Branch, type Role } from '../../data'

const roles = ref<Role[]>([])
const branches = ref<Branch[]>([])
const ready = ref(false)
onMounted(async () => {
  ;[roles.value, branches.value] = await Promise.all([roleRepo.list(), branchRepo.list()])
  ready.value = true
})

const roleOpts = computed(() => roles.value.map((r) => ({ value: r.code, label: r.name })))
const branchOpts = computed(() => branches.value.map((b) => ({ value: b.code, label: b.name })))
const nameOf = (list: { value: string; label: string }[], v: string) => list.find((o) => o.value === v)?.label ?? v

const config = computed<CrudConfig<AppUser>>(() => ({
  title: 'Danh Sách Tài Khoản Người Dùng Hệ Thống',
  subtitle: 'Cấu hình thông tin doanh nghiệp, chi nhánh, cây phê duyệt đa cấp, nhóm quyền và tài khoản.',
  entityLabel: 'tài khoản',
  createLabel: 'Thêm Người Dùng Mới',
  countLabel: 'Tài khoản',
  repo: userRepo,
  columns: [
    { key: 'full_name', label: 'Họ và Tên' },
    { key: 'username', label: 'Tên Đăng Nhập' },
    { key: 'role', label: 'Nhóm Quyền (Role)', value: (r) => nameOf(roleOpts.value, r.role) },
    { key: 'branch', label: 'Chi Nhánh Trực Thuộc', value: (r) => nameOf(branchOpts.value, r.branch) },
    { key: 'status', label: 'Trạng Thái', format: 'badge', badge: { active: { label: 'Đang Hoạt Động', cls: 'bg-emerald-100 text-emerald-800' }, locked: { label: 'Đã Khóa', cls: 'bg-rose-100 text-rose-800' } } },
  ],
  fields: [
    { key: 'code', label: 'Mã NV / ID (để trống để tự sinh)', type: 'text' },
    { key: 'full_name', label: 'Họ và tên', type: 'text', required: true },
    { key: 'username', label: 'Tên đăng nhập', type: 'text', required: true },
    { key: 'role', label: 'Nhóm quyền', type: 'select', required: true, options: roleOpts.value },
    { key: 'branch', label: 'Chi nhánh trực thuộc', type: 'select', required: true, options: branchOpts.value },
    { key: 'status', label: 'Trạng thái', type: 'select', required: true, options: [{ value: 'active', label: 'Đang hoạt động' }, { value: 'locked', label: 'Đã khóa' }] },
  ],
}))
</script>

<template>
  <CrudPage v-if="ready" :config="config" />
</template>
