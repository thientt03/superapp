<script setup lang="ts">
import CrudPage, { type CrudConfig } from '../../components/CrudPage.vue'
import { auditRepo, type Audit } from '../../data'
import { toast } from '../../toast'

const minutes = (r: Audit) => toast(`Biên bản kiểm kê ${r.code}`)

const config: CrudConfig<Audit> = {
  title: 'Lịch Sử Phiếu Kiểm Kê Tồn Kho Định Kỳ',
  subtitle: 'Quản lý nhập xuất vật tư, điều chuyển kho và kiểm kê an toàn tồn kho.',
  entityLabel: 'phiếu kiểm kê',
  createLabel: 'Tạo Phiếu Kiểm Kê',
  countLabel: 'Kỳ kiểm kê',
  accent: 'cyan',
  repo: auditRepo,
  columns: [
    { key: 'warehouse', label: 'Kho Kiểm Kê' },
    { key: 'date', label: 'Ngày Thực Hiện', format: 'date' },
    { key: 'council', label: 'Hội Đồng Kiểm Kê' },
    { key: 'sku', label: 'Mã SKU' },
    { key: 'actual', label: 'Số Thực Tế' },
    { key: 'diff', label: 'Lệch Thừa/Thiếu', value: (r) => (r.diff === undefined ? '' : `${r.diff > 0 ? '+' : ''}${r.diff} (${r.diff > 0 ? 'Thừa' : r.diff < 0 ? 'Thiếu' : 'Khớp'})`) },
    {
      key: 'state', label: 'Trạng Thái Xử Lý', format: 'badge',
      badge: {
        draft: { label: 'Chờ Xử Lý', cls: 'bg-amber-100 text-amber-800' },
        closed: { label: 'Đã Cân Bằng Sổ Sách', cls: 'bg-emerald-100 text-emerald-800' },
      },
    },
  ],
  fields: [
    { key: 'warehouse', label: 'Kho kiểm kê', type: 'text', required: true },
    { key: 'date', label: 'Ngày thực hiện', type: 'date', required: true },
    { key: 'council', label: 'Hội đồng kiểm kê', type: 'text' },
    { key: 'sku', label: 'Mã SKU kiểm kê', type: 'text', required: true },
    { key: 'actual', label: 'Số lượng thực tế', type: 'number', required: true, min: 0 },
    { key: 'state', label: 'Trạng thái (Chốt sẽ đặt tồn kho = số thực tế)', type: 'select', required: true, options: [{ value: 'draft', label: 'Chờ xử lý' }, { value: 'closed', label: 'Chốt kiểm kê' }] },
  ],
}
</script>

<template>
  <CrudPage :config="config">
    <template #actions="{ row }">
      <button type="button" class="px-2.5 py-1 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 font-semibold rounded-lg" @click="minutes(row)">Biên Bản</button>
    </template>
  </CrudPage>
</template>
