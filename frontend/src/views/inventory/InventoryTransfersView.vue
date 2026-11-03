<script setup lang="ts">
import CrudPage, { type CrudConfig } from '../../components/CrudPage.vue'
import { transferRepo, type Transfer } from '../../data'
import { toast } from '../../toast'

async function confirmIn(t: Transfer, reload: () => Promise<void>) {
  await transferRepo.update(t.id, { status: 'received' })
  toast(`Đã xác nhận nhập kho đích cho ${t.code}`)
  await reload()
}

const config: CrudConfig<Transfer> = {
  title: 'Lệnh Điều Chuyển Vật Tư Giữa Các Kho',
  subtitle: 'Quản lý nhập xuất vật tư, điều chuyển kho và kiểm kê an toàn tồn kho.',
  entityLabel: 'lệnh điều chuyển',
  createLabel: 'Lập Lệnh Điều Chuyển',
  countLabel: 'Lệnh',
  accent: 'cyan',
  repo: transferRepo,
  columns: [
    { key: 'item', label: 'Vật Tư Điều Chuyển' },
    { key: 'from', label: 'Kho Nguồn (Xuất)' },
    { key: 'to', label: 'Kho Đích (Nhập)' },
    { key: 'date', label: 'Ngày Đi', format: 'date' },
    {
      key: 'status', label: 'Trạng Thái', format: 'badge',
      badge: {
        in_transit: { label: 'Đang Trên Đường Giao', cls: 'bg-blue-100 text-blue-800' },
        received: { label: 'Đã Nhập Kho Đích', cls: 'bg-emerald-100 text-emerald-800' },
      },
    },
  ],
  fields: [
    { key: 'item', label: 'Vật tư điều chuyển', type: 'text', required: true },
    { key: 'from', label: 'Kho nguồn (xuất)', type: 'text', required: true },
    { key: 'to', label: 'Kho đích (nhập)', type: 'text', required: true },
    { key: 'date', label: 'Ngày đi', type: 'date', required: true },
    { key: 'status', label: 'Trạng thái', type: 'select', required: true, options: [{ value: 'in_transit', label: 'Đang trên đường giao' }, { value: 'received', label: 'Đã nhập kho đích' }] },
  ],
}
</script>

<template>
  <CrudPage :config="config">
    <template #actions="{ row, reload }">
      <button v-if="row.status === 'in_transit'" type="button" class="px-2.5 py-1 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 font-semibold rounded-lg" @click="confirmIn(row, reload)">Xác Nhận Nhập</button>
    </template>
  </CrudPage>
</template>
