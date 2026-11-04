<script setup lang="ts">
import CrudPage, { type CrudConfig } from '../../components/CrudPage.vue'
import { poRepo, rfqRepo, type Rfq } from '../../data'
import { vnd } from '../../format'
import { toast } from '../../toast'

// Chuyển RFQ thành đơn PO theo NCC có giá thấp nhất
async function toPo(r: Rfq, reload: () => Promise<void>) {
  const po = await poRepo.create({ vendor: r.best_vendor, ordered: new Date().toISOString().slice(0, 10), total: r.qty * r.lowest_price, status: 'ordered', sku: r.sku, qty: r.qty })
  await rfqRepo.update(r.id, { status: 'converted' })
  toast(`Đã tạo ${po.code} từ ${r.code}`)
  await reload()
}

const config: CrudConfig<Rfq> = {
  title: 'Quản Lý Yêu Cầu Báo Giá & So Sánh Báo Giá NCC (RFQ)',
  subtitle: 'Quản lý quy trình mua hàng vật tư, yêu cầu PR, báo giá RFQ, NCC và đơn mua PO.',
  entityLabel: 'RFQ',
  createLabel: 'Gửi RFQ Cho NCC',
  countLabel: 'Yêu cầu',
  accent: 'amber',
  repo: rfqRepo,
  columns: [
    { key: 'name', label: 'Tên Hàng Hóa / Vật Tư' },
    { key: 'vendors_count', label: 'Số NCC Đã Gửi Báo Giá', value: (r) => `${r.vendors_count} Nhà cung cấp` },
    { key: 'lowest_price', label: 'Giá Thấp Nhất', value: (r) => `${vnd(r.lowest_price)}${r.unit ? `/${r.unit}` : ''}` },
    {
      key: 'status', label: 'Trạng Thái', format: 'badge',
      badge: {
        analyzing: { label: 'Đang Phân Tích Báo Giá', cls: 'bg-amber-100 text-amber-800' },
        converted: { label: 'Đã Chuyển PO', cls: 'bg-emerald-100 text-emerald-800' },
      },
    },
  ],
  fields: [
    { key: 'sku', label: 'Mã SKU', type: 'text' },
    { key: 'name', label: 'Tên hàng hóa / vật tư', type: 'text', required: true },
    { key: 'qty', label: 'Số lượng', type: 'number', required: true, min: 1 },
    { key: 'unit', label: 'Đơn vị', type: 'text' },
    { key: 'vendors_count', label: 'Số NCC đã gửi báo giá', type: 'number', required: true, min: 0 },
    { key: 'lowest_price', label: 'Giá thấp nhất (₫/đơn vị)', type: 'number', required: true, min: 0 },
    { key: 'best_vendor', label: 'NCC giá thấp nhất', type: 'text' },
    { key: 'status', label: 'Trạng thái', type: 'select', required: true, options: [{ value: 'analyzing', label: 'Đang phân tích báo giá' }, { value: 'converted', label: 'Đã chuyển PO' }] },
  ],
}
</script>

<template>
  <CrudPage :config="config">
    <template #actions="{ row, reload }">
      <button v-if="row.status === 'analyzing' && row.best_vendor" type="button" class="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold rounded-lg" @click="toPo(row, reload)">Chuyển PO</button>
    </template>
  </CrudPage>
</template>
