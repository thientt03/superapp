<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PageHeader from '../../components/PageHeader.vue'
import { getInventoryReport } from '../../data/stats'
import { vnd } from '../../format'
import { toast } from '../../toast'

const report = ref<Awaited<ReturnType<typeof getInventoryReport>> | null>(null)
onMounted(async () => (report.value = await getInventoryReport()))
</script>

<template>
  <div v-if="report" class="space-y-6">
    <PageHeader title="Báo Cáo Tổng Hợp Xuất - Nhập - Tồn Định Kỳ" subtitle="Theo dõi chi tiết giá trị đầu kỳ, tổng nhập, tổng xuất và tồn cuối kỳ của toàn bộ hệ thống kho.">
      <button type="button" class="bg-cyan-600 text-white px-4 py-2 rounded-xl font-semibold text-xs hover:bg-cyan-700 flex items-center shadow-sm" @click="toast('Đã xuất báo cáo Excel')">
        <i class="fa-solid fa-file-excel mr-1.5"></i><span>Xuất Báo Cáo Excel</span>
      </button>
    </PageHeader>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm"><span class="text-xs font-semibold uppercase text-slate-400">Tổng Giá Trị Nhập (Tháng 11)</span><h4 class="text-2xl font-bold text-blue-600 mt-1">{{ vnd(report.periodIn) }}</h4></div>
      <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm"><span class="text-xs font-semibold uppercase text-slate-400">Tổng Giá Trị Xuất (Tháng 11)</span><h4 class="text-2xl font-bold text-amber-600 mt-1">{{ vnd(report.periodOut) }}</h4></div>
      <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm"><span class="text-xs font-semibold uppercase text-slate-400">Tồn Cuối Kỳ Định Giá</span><h4 class="text-2xl font-bold text-cyan-600 mt-1" data-testid="closing-value">{{ vnd(report.totalValue) }}</h4></div>
    </div>
    <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-x-auto">
      <table class="w-full text-left text-xs">
        <thead class="bg-slate-50 text-slate-500 font-semibold uppercase border-b border-slate-100">
          <tr><th class="px-6 py-3">Mã SKU</th><th class="px-6 py-3">Tên Vật Tư</th><th class="px-6 py-3">Tồn Đầu Kỳ</th><th class="px-6 py-3">Tổng Nhập</th><th class="px-6 py-3">Tổng Xuất</th><th class="px-6 py-3">Tồn Cuối Kỳ</th><th class="px-6 py-3">Giá Trị Tồn Kho</th></tr>
        </thead>
        <tbody class="divide-y divide-slate-100 font-medium">
          <tr v-if="!report.rows.length"><td colspan="7" class="px-6 py-8 text-center text-slate-400">Không có dữ liệu</td></tr>
          <tr v-for="r in report.rows" :key="r.code" class="hover:bg-slate-50">
            <td class="px-6 py-3.5 font-bold text-cyan-700">{{ r.code }}</td>
            <td class="px-6 py-3.5 font-bold">{{ r.name }}</td>
            <td class="px-6 py-3.5">{{ r.opening }} {{ r.unit }}</td>
            <td class="px-6 py-3.5 text-emerald-600">+{{ r.in }} {{ r.unit }}</td>
            <td class="px-6 py-3.5 text-rose-600">-{{ r.out }} {{ r.unit }}</td>
            <td class="px-6 py-3.5 font-bold">{{ r.closing }} {{ r.unit }}</td>
            <td class="px-6 py-3.5 font-bold">{{ vnd(r.value) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
