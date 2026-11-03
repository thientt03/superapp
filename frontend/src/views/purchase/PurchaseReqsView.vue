<script setup lang="ts">
import CrudPage, { type CrudConfig } from '../../components/CrudPage.vue'
import { reqRepo, rfqRepo, type PurchaseReq } from '../../data'
import { toast } from '../../toast'

// Tạo RFQ từ phiếu PR rồi đánh dấu PR đã tạo RFQ
async function toRfq(r: PurchaseReq, reload: () => Promise<void>) {
  const q = await rfqRepo.create({ sku: r.sku, name: r.content, qty: r.qty ?? 1, unit: '', vendors_count: 0, lowest_price: 0, best_vendor: '', status: 'analyzing' })
  await reqRepo.update(r.id, { status: 'rfq' })
  toast(`Đã tạo ${q.code} từ ${r.code}`)
  await reload()
}

const config: CrudConfig<PurchaseReq> = {
  title: 'Danh Sách Phiếu Yêu Cầu Mua Hàng Nội Bộ (PR)',
  subtitle: 'Quản lý quy trình mua hàng vật tư, yêu cầu PR, báo giá RFQ, NCC và đơn mua PO.',
  entityLabel: 'phiếu PR',
  createLabel: 'Tạo Phiếu PR Mới',
  countLabel: 'Phiếu PR',
  accent: 'amber',
  repo: reqRepo,
  columns: [
    { key: 'dept', label: 'Phòng Ban Đề Xuất' },
    { key: 'content', label: 'Nội Dung Đề Xuất Mua' },
    { key: 'need_date', label: 'Ngày Cần Hàng', format: 'date' },
    {
      key: 'priority', label: 'Mức Độ Ưu Tiên', format: 'badge',
      badge: {
        urgent: { label: 'Khẩn Cấp', cls: 'bg-rose-100 text-rose-800' },
        high: { label: 'Cao', cls: 'bg-orange-100 text-orange-800' },
        normal: { label: 'Bình Thường', cls: 'bg-slate-200 text-slate-700' },
      },
    },
    {
      key: 'status', label: 'Trạng Thái', format: 'badge',
      badge: {
        pending_board: { label: 'Chờ Duyệt BGĐ', cls: 'bg-amber-100 text-amber-800' },
        approved: { label: 'Đã Duyệt', cls: 'bg-emerald-100 text-emerald-800' },
        rfq: { label: 'Đã Tạo RFQ', cls: 'bg-blue-100 text-blue-800' },
      },
    },
  ],
  fields: [
    { key: 'dept', label: 'Phòng ban đề xuất', type: 'text', required: true },
    { key: 'content', label: 'Nội dung đề xuất mua', type: 'textarea', required: true },
    { key: 'sku', label: 'Mã SKU cần mua', type: 'text' },
    { key: 'qty', label: 'Số lượng cần mua', type: 'number', min: 1 },
    { key: 'need_date', label: 'Ngày cần hàng', type: 'date', required: true },
    { key: 'priority', label: 'Mức độ ưu tiên', type: 'select', required: true, options: [{ value: 'urgent', label: 'Khẩn cấp' }, { value: 'high', label: 'Cao' }, { value: 'normal', label: 'Bình thường' }] },
    { key: 'status', label: 'Trạng thái', type: 'select', required: true, options: [{ value: 'pending_board', label: 'Chờ duyệt BGĐ' }, { value: 'approved', label: 'Đã duyệt' }, { value: 'rfq', label: 'Đã tạo RFQ' }] },
  ],
}
</script>

<template>
  <CrudPage :config="config">
    <template #actions="{ row, reload }">
      <button v-if="row.status !== 'rfq'" type="button" class="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold rounded-lg" @click="toRfq(row, reload)">Tạo RFQ</button>
    </template>
  </CrudPage>
</template>
