<script setup lang="ts">
import CrudPage, { type CrudConfig } from '../../components/CrudPage.vue'
import { receiptRepo, type Receipt } from '../../data'
import { toast } from '../../toast'

const print = (r: Receipt) => toast(`Đang in phiếu ${r.code}`)

const config: CrudConfig<Receipt> = {
  title: 'Danh Sách Phiếu Nhập Kho (Goods Receipt - GR)',
  subtitle: 'Quản lý nhập xuất vật tư, điều chuyển kho và kiểm kê an toàn tồn kho.',
  entityLabel: 'phiếu nhập kho',
  createLabel: 'Tạo Phiếu Nhập GR',
  countLabel: 'Phiếu',
  accent: 'cyan',
  repo: receiptRepo,
  columns: [
    { key: 'po', label: 'Khớp Theo Đơn Mua (PO)' },
    { key: 'sku', label: 'Mã SKU' },
    { key: 'qty', label: 'Số Lượng' },
    { key: 'vendor', label: 'Nhà Cung Cấp' },
    { key: 'date', label: 'Ngày Nhập Kho', format: 'date' },
    { key: 'warehouse', label: 'Kho Tiếp Nhận' },
    { key: 'keeper', label: 'Thủ Kho Kiểm' },
    {
      key: 'qc', label: 'Trạng Thái QC', format: 'badge',
      badge: {
        pass: { label: 'Đạt 100% QC', cls: 'bg-emerald-100 text-emerald-800' },
        partial: { label: 'Đạt Một Phần', cls: 'bg-amber-100 text-amber-800' },
        fail: { label: 'Không Đạt', cls: 'bg-rose-100 text-rose-800' },
      },
    },
    {
      key: 'state', label: 'Phiếu', format: 'badge',
      badge: { draft: { label: 'Nháp', cls: 'bg-slate-200 text-slate-700' }, done: { label: 'Đã Nhập Kho', cls: 'bg-emerald-100 text-emerald-800' } },
    },
  ],
  fields: [
    { key: 'po', label: 'Khớp theo đơn mua (PO)', type: 'text' },
    { key: 'sku', label: 'Mã SKU', type: 'text', required: true },
    { key: 'qty', label: 'Số lượng nhập', type: 'number', required: true, min: 1 },
    { key: 'vendor', label: 'Nhà cung cấp', type: 'text', required: true },
    { key: 'date', label: 'Ngày nhập kho', type: 'date', required: true },
    { key: 'warehouse', label: 'Kho tiếp nhận', type: 'text', required: true },
    { key: 'keeper', label: 'Thủ kho kiểm', type: 'text' },
    { key: 'qc', label: 'Trạng thái QC', type: 'select', required: true, options: [{ value: 'pass', label: 'Đạt 100% QC' }, { value: 'partial', label: 'Đạt một phần' }, { value: 'fail', label: 'Không đạt' }] },
    { key: 'state', label: 'Trạng thái phiếu (Hoàn tất sẽ cộng tồn kho)', type: 'select', required: true, options: [{ value: 'draft', label: 'Nháp' }, { value: 'done', label: 'Hoàn tất nhập kho' }] },
  ],
}
</script>

<template>
  <CrudPage :config="config">
    <template #actions="{ row }">
      <button type="button" class="px-2.5 py-1 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 font-semibold rounded-lg" @click="print(row)">In Phiếu</button>
    </template>
  </CrudPage>
</template>
