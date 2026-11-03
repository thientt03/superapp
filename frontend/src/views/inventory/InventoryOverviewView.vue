<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import KpiCard from '../../components/KpiCard.vue'
import PageHeader from '../../components/PageHeader.vue'
import { itemRepo, orderRepo, poRepo, reqRepo, type Item } from '../../data'
import { getInventoryReport } from '../../data/stats'
import { vnd } from '../../format'
import { toast } from '../../toast'

const router = useRouter()
const items = ref<Item[]>([])
const kpi = ref({ totalValue: 0, belowMin: 0, waitIn: 0, waitOut: 0 })

async function load() {
  const [report, list, pos, sos] = await Promise.all([getInventoryReport(), itemRepo.list(), poRepo.list(), orderRepo.list()])
  items.value = list
  kpi.value = {
    totalValue: report.totalValue,
    belowMin: report.belowMin,
    waitIn: pos.filter((p) => p.status !== 'received').length,
    waitOut: sos.filter((s) => s.delivery !== 'delivered').length,
  }
}

async function makePr(i: Item) {
  const need = i.min_qty - i.qty
  const pr = await reqRepo.create({
    dept: 'Bộ Phận Quản Lý Kho',
    content: `Bổ sung ${need} ${i.unit} ${i.name} (Tồn kho chạm ngưỡng tối thiểu)`,
    need_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    priority: 'high',
    status: 'pending_board',
    sku: i.code,
    qty: need,
  })
  toast(`Đã lập phiếu ${pr.code} mua bổ sung ${i.code}`)
}

onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <PageHeader title="Tổng Quan Kho & Tồn Kho" subtitle="Quản lý nhập xuất vật tư, điều chuyển kho và kiểm kê an toàn tồn kho.">
      <button type="button" class="bg-cyan-600 text-white px-4 py-2 rounded-xl font-semibold text-xs hover:bg-cyan-700 flex items-center shadow-sm" @click="router.push('/inventory/receipts?new=1')">
        <i class="fa-solid fa-plus mr-1.5"></i>Tạo Phiếu Nhập Kho
      </button>
    </PageHeader>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard label="Tổng Giá Trị Tồn Kho" :value="vnd(kpi.totalValue)" icon="fa-solid fa-boxes-packing" tone="bg-cyan-50 text-cyan-600" note="Tỷ lệ lấp đầy kho: 78.4%" note-icon="fa-solid fa-circle-check" note-class="text-emerald-600" />
      <KpiCard label="Chờ Nhập Kho (Từ PO)" :value="`${kpi.waitIn} Đơn Hàng`" icon="fa-solid fa-download" tone="bg-blue-50 text-blue-600" note="Khớp từ Đơn Mua Hàng PO" />
      <KpiCard label="Chờ Xuất Kho (Cho SO)" :value="`${kpi.waitOut} Đơn Hàng`" icon="fa-solid fa-upload" tone="bg-amber-50 text-amber-600" note="Khớp từ Đơn Bán Hàng SO" />
      <KpiCard label="Cảnh Báo Dưới Định Mức" :value="`${kpi.belowMin} Mặt Hàng`" icon="fa-solid fa-triangle-exclamation" tone="bg-rose-50 text-rose-600" note="Cần lập yêu cầu PR mua bổ sung" note-class="text-rose-500" />
    </div>

    <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div class="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
        <span class="font-bold text-slate-800">Danh Mục Tồn Kho Nguyên Vật Tư & Thành Phẩm</span>
        <span class="bg-cyan-50 text-cyan-700 px-2.5 py-0.5 rounded-full text-xs font-bold">{{ items.length }} SKU</span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 text-slate-500 font-semibold uppercase border-b border-slate-100">
            <tr>
              <th class="px-6 py-3">Mã SKU</th><th class="px-6 py-3">Tên Vật Tư / Sản Phẩm</th><th class="px-6 py-3">Kho Lưu Trữ</th><th class="px-6 py-3">Tồn Thực Tế</th>
              <th class="px-6 py-3">Ngưỡng An Toàn</th><th class="px-6 py-3">Đơn Giá Nhập</th><th class="px-6 py-3">Trạng Thái</th><th class="px-6 py-3 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-medium">
            <tr v-if="!items.length"><td colspan="8" class="px-6 py-8 text-center text-slate-400">Không có dữ liệu</td></tr>
            <tr v-for="i in items" :key="i.id" class="hover:bg-slate-50" :class="i.qty < i.min_qty ? 'bg-rose-50 text-rose-700' : ''">
              <td class="px-6 py-3.5 font-bold text-cyan-700">{{ i.code }}</td>
              <td class="px-6 py-3.5 font-bold">{{ i.name }}</td>
              <td class="px-6 py-3.5">{{ i.warehouse }}</td>
              <td class="px-6 py-3.5 font-bold">{{ i.qty }} {{ i.unit }}</td>
              <td class="px-6 py-3.5">{{ i.min_qty }} {{ i.unit }}</td>
              <td class="px-6 py-3.5">{{ vnd(i.cost) }}</td>
              <td class="px-6 py-3.5">
                <span v-if="i.qty < i.min_qty" class="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-full font-bold text-[10px]"><i class="fa-solid fa-triangle-exclamation mr-1"></i>Sắp Hết Tồn Kho</span>
                <span v-else class="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">Tồn Kho Dồi Dào</span>
              </td>
              <td class="px-6 py-3.5 text-right">
                <button v-if="i.qty < i.min_qty" type="button" class="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 font-semibold rounded-lg" @click="makePr(i)">Lập PR Mua</button>
                <button v-else type="button" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg" @click="toast(`${i.name}: ${i.warehouse}`)">Vị Trí Kho</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
