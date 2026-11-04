<script setup lang="ts">
import CrudPage, { type CrudConfig } from '../../components/CrudPage.vue'
import { poRepo, receivePo, RepoError, type PurchaseOrder } from '../../data'
import { toast } from '../../toast'

// Nhập kho (GR) theo PO đi qua logic nhập kho ở lớp data
async function receive(po: PurchaseOrder, reload: () => Promise<void>) {
  try {
    const gr = await receivePo(po.id)
    toast(`Đã tạo phiếu nhập kho ${gr.code} cho ${po.code}`)
  } catch (e) {
    if (!(e instanceof RepoError)) throw e
    toast(e.message, 'error')
  }
  await reload()
}

const config: CrudConfig<PurchaseOrder> = {
  title: 'Danh Sách Đơn Mua Hàng Chính Thức (Purchase Orders - PO)',
  subtitle: 'Quản lý quy trình mua hàng vật tư, yêu cầu PR, báo giá RFQ, NCC và đơn mua PO.',
  entityLabel: 'đơn PO',
  createLabel: 'Lập Đơn PO Mới',
  countLabel: 'Đơn PO',
  accent: 'amber',
  repo: poRepo,
  columns: [
    { key: 'vendor', label: 'Nhà Cung Cấp' },
    { key: 'sku', label: 'Mã SKU' },
    { key: 'qty', label: 'Số Lượng' },
    { key: 'ordered', label: 'Ngày Đặt Hàng', format: 'date' },
    { key: 'total', label: 'Tổng Giá Trị PO', format: 'vnd' },
    {
      key: 'status', label: 'Trạng Thái Nhập Kho', format: 'badge',
      badge: {
        ordered: { label: 'Đã Đặt Hàng', cls: 'bg-slate-200 text-slate-700' },
        receiving: { label: 'Đang Nhập Kho (GR)', cls: 'bg-amber-100 text-amber-800' },
        received: { label: 'Đã Nhập Đủ', cls: 'bg-emerald-100 text-emerald-800' },
      },
    },
  ],
  fields: [
    { key: 'vendor', label: 'Nhà cung cấp', type: 'text', required: true },
    { key: 'sku', label: 'Mã SKU nhập kho', type: 'text' },
    { key: 'qty', label: 'Số lượng', type: 'number', min: 1 },
    { key: 'ordered', label: 'Ngày đặt hàng', type: 'date', required: true },
    { key: 'total', label: 'Tổng giá trị PO (₫)', type: 'number', required: true, min: 0 },
    { key: 'status', label: 'Trạng thái nhập kho', type: 'select', required: true, options: [{ value: 'ordered', label: 'Đã đặt hàng' }, { value: 'receiving', label: 'Đang nhập kho (GR)' }, { value: 'received', label: 'Đã nhập đủ' }] },
  ],
}
</script>

<template>
  <CrudPage :config="config">
    <template #actions="{ row, reload }">
      <button v-if="row.status !== 'received'" type="button" class="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold rounded-lg" @click="receive(row, reload)">Nhập Kho (GR)</button>
    </template>
  </CrudPage>
</template>
