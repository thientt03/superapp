<script setup lang="ts">
import CrudPage, { type CrudConfig } from '../../components/CrudPage.vue'
import { issueRepo, type Issue } from '../../data'
import { toast } from '../../toast'

const waybill = (r: Issue) => toast(`Vận đơn của phiếu ${r.code}`)

const config: CrudConfig<Issue> = {
  title: 'Danh Sách Phiếu Xuất Kho (Goods Issue - GI)',
  subtitle: 'Quản lý nhập xuất vật tư, điều chuyển kho và kiểm kê an toàn tồn kho.',
  entityLabel: 'phiếu xuất kho',
  createLabel: 'Tạo Phiếu Xuất GI',
  countLabel: 'Phiếu',
  accent: 'cyan',
  repo: issueRepo,
  columns: [
    { key: 'so', label: 'Khớp Theo Đơn Bán (SO)' },
    { key: 'sku', label: 'Mã SKU' },
    { key: 'qty', label: 'Số Lượng' },
    { key: 'customer', label: 'Khách Hàng Nhận' },
    { key: 'date', label: 'Ngày Xuất Kho', format: 'date' },
    { key: 'warehouse', label: 'Kho Xuất' },
    {
      key: 'status', label: 'Trạng Thái Giao Hàng', format: 'badge',
      badge: {
        preparing: { label: 'Chuẩn Bị Hàng', cls: 'bg-slate-200 text-slate-700' },
        shipping: { label: 'Đang Vận Chuyển', cls: 'bg-blue-100 text-blue-800' },
        delivered: { label: 'Đã Giao', cls: 'bg-emerald-100 text-emerald-800' },
      },
    },
    {
      key: 'state', label: 'Phiếu', format: 'badge',
      badge: { draft: { label: 'Nháp', cls: 'bg-slate-200 text-slate-700' }, done: { label: 'Đã Xuất Kho', cls: 'bg-emerald-100 text-emerald-800' } },
    },
  ],
  fields: [
    { key: 'so', label: 'Khớp theo đơn bán (SO)', type: 'text' },
    { key: 'sku', label: 'Mã SKU', type: 'text', required: true },
    { key: 'qty', label: 'Số lượng xuất', type: 'number', required: true, min: 1 },
    { key: 'customer', label: 'Khách hàng nhận', type: 'text', required: true },
    { key: 'date', label: 'Ngày xuất kho', type: 'date', required: true },
    { key: 'warehouse', label: 'Kho xuất', type: 'text', required: true },
    { key: 'status', label: 'Trạng thái giao hàng', type: 'select', required: true, options: [{ value: 'preparing', label: 'Chuẩn bị hàng' }, { value: 'shipping', label: 'Đang vận chuyển' }, { value: 'delivered', label: 'Đã giao' }] },
    { key: 'state', label: 'Trạng thái phiếu (Hoàn tất sẽ trừ tồn kho)', type: 'select', required: true, options: [{ value: 'draft', label: 'Nháp' }, { value: 'done', label: 'Hoàn tất xuất kho' }] },
  ],
}
</script>

<template>
  <CrudPage :config="config">
    <template #actions="{ row }">
      <button type="button" class="px-2.5 py-1 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 font-semibold rounded-lg" @click="waybill(row)">Vận Đơn</button>
    </template>
  </CrudPage>
</template>
