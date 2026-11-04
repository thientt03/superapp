<script setup lang="ts">
import CrudPage, { type CrudConfig } from '../../components/CrudPage.vue'
import { orderRepo, quotationRepo, type Quotation } from '../../data'
import { toast } from '../../toast'

// Chuyển báo giá thành đơn bán hàng rồi đánh dấu báo giá đã chấp nhận
async function toOrder(q: Quotation, reload: () => Promise<void>) {
  const o = await orderRepo.create({ customer: q.customer, ordered: new Date().toISOString().slice(0, 10), total: q.total, payment: 'unpaid', delivery: 'preparing' })
  await quotationRepo.update(q.id, { status: 'accepted' })
  toast(`Đã tạo đơn bán ${o.code} từ báo giá ${q.code}`)
  await reload()
}

const STATUS = [
  { value: 'pending', label: 'Chờ chấp nhận' },
  { value: 'accepted', label: 'Đã chấp nhận' },
  { value: 'rejected', label: 'Từ chối' },
]

const config: CrudConfig<Quotation> = {
  title: 'Danh Sách Báo Giá Kinh Doanh',
  subtitle: 'Quản lý lập báo giá cho khách hàng.',
  entityLabel: 'báo giá',
  createLabel: 'Tạo Báo Giá Mới',
  countLabel: 'Báo Giá',
  repo: quotationRepo,
  columns: [
    { key: 'customer', label: 'Khách Hàng / Doanh Nghiệp' },
    { key: 'issued', label: 'Ngày Lập', format: 'date' },
    { key: 'valid_until', label: 'Hạn Hiệu Lực', format: 'date' },
    { key: 'total', label: 'Tổng Giá Trị', format: 'vnd' },
    {
      key: 'status', label: 'Trạng Thái', format: 'badge',
      badge: {
        pending: { label: 'Chờ Chấp Nhận', cls: 'bg-amber-100 text-amber-800' },
        accepted: { label: 'Đã Chấp Nhận', cls: 'bg-emerald-100 text-emerald-800' },
        rejected: { label: 'Từ Chối', cls: 'bg-rose-100 text-rose-800' },
      },
    },
    { key: 'owner', label: 'Người Lập' },
  ],
  fields: [
    { key: 'customer', label: 'Khách hàng / doanh nghiệp', type: 'text', required: true },
    { key: 'issued', label: 'Ngày lập', type: 'date', required: true },
    { key: 'valid_until', label: 'Hạn hiệu lực', type: 'date', required: true },
    { key: 'total', label: 'Tổng giá trị (₫)', type: 'number', required: true, min: 0 },
    { key: 'status', label: 'Trạng thái', type: 'select', required: true, options: STATUS },
    { key: 'owner', label: 'Người lập', type: 'text' },
  ],
  filter: { key: 'status', options: STATUS },
}
</script>

<template>
  <CrudPage :config="config">
    <template #actions="{ row, reload }">
      <button v-if="row.status === 'pending'" type="button" class="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-lg" @click="toOrder(row, reload)">Chuyển SO</button>
    </template>
  </CrudPage>
</template>
