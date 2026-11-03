<script setup lang="ts">
import CrudPage, { type CrudConfig } from '../../components/CrudPage.vue'
import { itemRepo, type Item } from '../../data'

const config: CrudConfig<Item> = {
  title: 'Thiết Lập Ngưỡng Định Mức An Toàn & Mã SKU Tự Động',
  subtitle: 'Quản lý nhập xuất vật tư, điều chuyển kho và kiểm kê an toàn tồn kho.',
  entityLabel: 'SKU',
  createLabel: 'Tạo Mã SKU Mới',
  countLabel: 'SKU',
  accent: 'cyan',
  repo: itemRepo,
  rowClass: (r) => (r.qty < r.min_qty ? 'bg-rose-50 text-rose-700' : ''),
  columns: [
    { key: 'name', label: 'Tên Vật Tư / Sản Phẩm' },
    { key: 'warehouse', label: 'Kho Lưu Trữ' },
    { key: 'qty', label: 'Tồn Thực Tế', unitKey: 'unit' },
    { key: 'min_qty', label: 'Ngưỡng An Toàn', unitKey: 'unit' },
    { key: 'cost', label: 'Đơn Giá Nhập', format: 'vnd' },
  ],
  fields: [
    { key: 'code', label: 'Mã SKU (để trống để tự sinh)', type: 'text' },
    { key: 'name', label: 'Tên vật tư / sản phẩm', type: 'text', required: true },
    { key: 'warehouse', label: 'Kho lưu trữ', type: 'text', required: true },
    { key: 'qty', label: 'Tồn thực tế', type: 'number', required: true, min: 0 },
    { key: 'min_qty', label: 'Ngưỡng an toàn', type: 'number', required: true, min: 0 },
    { key: 'unit', label: 'Đơn vị tính', type: 'text', required: true },
    { key: 'cost', label: 'Đơn giá nhập (₫)', type: 'number', required: true, min: 0 },
  ],
}
</script>

<template>
  <CrudPage :config="config">
    <template #top>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm"><span class="px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded font-bold text-xs">Cảnh Báo Tự Động</span><h4 class="font-bold text-slate-800 mt-2">Gửi Mail Cho Phòng Mua Hàng</h4><p class="text-xs text-slate-500">Tự động kích hoạt luồng PR khi tồn kho rơi vào ngưỡng tối thiểu.</p></div>
        <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm"><span class="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded font-bold text-xs">Mã Mã Vạch (Barcode/QR)</span><h4 class="font-bold text-slate-800 mt-2">Quét Barcode Trên App Máy Quét</h4><p class="text-xs text-slate-500">Đồng bộ mã quét cầm tay khi nhập/xuất vật tư tại cửa kho.</p></div>
        <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm"><span class="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-xs">Phương Pháp Tính Giá</span><h4 class="font-bold text-slate-800 mt-2">Bình Quân Gia Quyền (FIFO)</h4><p class="text-xs text-slate-500">Giá xuất kho được tính tự động theo phương pháp đã chọn.</p></div>
      </div>
    </template>
  </CrudPage>
</template>
