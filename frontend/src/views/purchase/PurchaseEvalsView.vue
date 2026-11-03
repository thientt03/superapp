<script setup lang="ts">
import PageHeader from '../../components/PageHeader.vue'
import { toast } from '../../toast'

const CARDS = [
  { tag: 'Tiêu Chí Chất Lượng (QC)', tone: 'bg-emerald-100 text-emerald-800', title: 'Tỉ Lệ Đạt Kiểm Hàng: 99.2%', desc: 'Tỷ lệ hàng giao không lỗi kỹ thuật khi nhập kho.' },
  { tag: 'Giao Hàng Đúng Hạn', tone: 'bg-blue-100 text-blue-800', title: 'Chỉ Số SLA On-Time: 96.5%', desc: 'Tỷ lệ giao đúng tiến độ cam kết theo đơn PO.' },
  { tag: 'Cạnh Tranh Giá', tone: 'bg-amber-100 text-amber-800', title: 'Chính Sách Chiết Khấu & Thanh Toán', desc: 'Hạn mức công nợ trả chậm 45 - 60 ngày.' },
]
</script>

<template>
  <div class="space-y-6">
    <PageHeader title="Đánh Giá Nhà Cung Cấp" subtitle="Quản lý quy trình mua hàng vật tư, yêu cầu PR, báo giá RFQ, NCC và đơn mua PO.">
      <button type="button" class="bg-amber-600 text-white px-4 py-2 rounded-xl font-semibold text-xs hover:bg-amber-700 flex items-center shadow-sm" @click="toast('Tạo phiếu đánh giá SLA NCC thành công!')">
        <i class="fa-solid fa-star mr-1.5"></i>Đánh Giá NCC
      </button>
    </PageHeader>
    <div class="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
      <h3 class="font-bold text-slate-800">Hệ Thống Đánh Giá & Xếp Hạng Nhà Cung Cấp (Vendor Rating System)</h3>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <article v-for="c in CARDS" :key="c.tag" class="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
          <span class="px-2.5 py-0.5 rounded font-bold text-xs" :class="c.tone">{{ c.tag }}</span>
          <h4 class="font-bold text-slate-800">{{ c.title }}</h4>
          <p class="text-xs text-slate-500">{{ c.desc }}</p>
        </article>
      </div>
    </div>
  </div>
</template>
