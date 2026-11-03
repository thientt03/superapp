<script setup lang="ts">
import CrudPage, { type CrudConfig } from '../../components/CrudPage.vue'
import { orderRepo, type SalesOrder } from '../../data'

const config: CrudConfig<SalesOrder> = {
  title: 'Danh Sách Đơn Bán Hàng (SO)',
  subtitle: 'Theo dõi đơn bán hàng, thanh toán và giao hàng.',
  entityLabel: 'đơn bán hàng',
  createLabel: 'Tạo Đơn Bán Hàng Mới',
  countLabel: 'Đơn',
  repo: orderRepo,
  columns: [
    { key: 'customer', label: 'Khách Hàng' },
    { key: 'ordered', label: 'Ngày Đặt', format: 'date' },
    { key: 'total', label: 'Tổng Tiền', format: 'vnd' },
    {
      key: 'payment', label: 'Thanh Toán', format: 'badge',
      badge: {
        unpaid: { label: 'Chưa Thanh Toán', cls: 'bg-rose-100 text-rose-800' },
        deposit: { label: 'Đã Cọc 30%', cls: 'bg-amber-100 text-amber-800' },
        paid: { label: 'Đã Thanh Toán', cls: 'bg-emerald-100 text-emerald-800' },
      },
    },
    {
      key: 'delivery', label: 'Trạng Thái Giao Hàng', format: 'badge',
      badge: {
        preparing: { label: 'Chuẩn Bị Hàng', cls: 'bg-slate-200 text-slate-700' },
        shipping_out: { label: 'Đang Xuất Kho', cls: 'bg-blue-100 text-blue-800' },
        delivered: { label: 'Đã Giao', cls: 'bg-emerald-100 text-emerald-800' },
      },
    },
  ],
  fields: [
    { key: 'customer', label: 'Khách hàng', type: 'text', required: true },
    { key: 'ordered', label: 'Ngày đặt', type: 'date', required: true },
    { key: 'total', label: 'Tổng tiền (₫)', type: 'number', required: true, min: 0 },
    { key: 'payment', label: 'Thanh toán', type: 'select', required: true, options: [{ value: 'unpaid', label: 'Chưa thanh toán' }, { value: 'deposit', label: 'Đã cọc 30%' }, { value: 'paid', label: 'Đã thanh toán' }] },
    { key: 'delivery', label: 'Trạng thái giao hàng', type: 'select', required: true, options: [{ value: 'preparing', label: 'Chuẩn bị hàng' }, { value: 'shipping_out', label: 'Đang xuất kho' }, { value: 'delivered', label: 'Đã giao' }] },
  ],
}
</script>

<template>
  <CrudPage :config="config" />
</template>
