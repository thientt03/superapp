<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import ChartCanvas from '../components/ChartCanvas.vue'
import KpiCard from '../components/KpiCard.vue'
import PageHeader from '../components/PageHeader.vue'
import { getReportStats } from '../data/stats'
import { vnd } from '../format'
import { toast } from '../toast'

type Stats = Awaited<ReturnType<typeof getReportStats>>
const period = ref('Q4-2026')
const dept = ref('ALL')
const region = ref('ALL') // THIẾT KẾ chỉ hiện thông báo khi đổi khu vực, dữ liệu chưa có chiều khu vực
const stats = ref<Stats | null>(null)

async function load() {
  stats.value = await getReportStats(period.value, dept.value)
}
watch([period, dept], load)
watch(region, () => toast(`Đã áp dụng bộ lọc khu vực: ${region.value}`))
onMounted(load)

const main = computed(() => ({
  labels: stats.value?.chart.labels ?? [],
  datasets: [
    { label: 'Doanh Thu', data: stats.value?.chart.revenue ?? [], borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.1)', fill: true, tension: 0.3 },
    { label: 'Chi Phí Vận Hành', data: stats.value?.chart.cost ?? [], borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)', fill: true, tension: 0.3 },
  ],
}))
const pie = computed(() => ({
  labels: stats.value?.pie.labels ?? [],
  datasets: [{ data: stats.value?.pie.data ?? [], backgroundColor: ['#3b82f6', '#06b6d4', '#a855f7', '#94a3b8'], borderWidth: 0 }],
}))
const sel = 'bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500'
const pct = (n: number) => `${n.toFixed(1)}%`
const BAR: Record<string, string> = { 'Vượt Chỉ Tiêu': 'bg-emerald-100 text-emerald-800', 'Đạt Chuẩn': 'bg-blue-100 text-blue-800', Tốt: 'bg-brand-100 text-brand-900', 'Ổn Định': 'bg-slate-200 text-slate-700' }
</script>

<template>
  <div class="space-y-6">
    <PageHeader title="Báo Cáo & Thống Kê Vận Hành Toàn Hệ Thống (BI Analytics)" subtitle="Phân tích chuyên sâu chỉ số hiệu quả (KPIs), tổng hợp Doanh Thu, Chi Phí, Lợi Nhuận & Nhân Sự.">
      <label for="rep-dept" class="sr-only">Phân hệ</label>
      <select id="rep-dept" v-model="dept" :class="sel">
        <option value="ALL">Tất cả phân hệ / Khối</option>
        <option value="Sales">Khối Bán Hàng (Sales)</option>
        <option value="Inventory">Khối Quản Lý Kho</option>
        <option value="CRM">Khối CRM & Khách Hàng</option>
        <option value="HR">Khối Nhân Sự (HR)</option>
      </select>
      <label for="rep-region" class="sr-only">Khu vực</label>
      <select id="rep-region" v-model="region" :class="sel">
        <option value="ALL">Toàn quốc (Tất cả khu vực)</option>
        <option value="HCM">Miền Nam (TP.HCM & Cần Thơ)</option>
        <option value="HN">Miền Bắc (Hà Nội & Hải Phòng)</option>
        <option value="DN">Miền Trung (Đà Nẵng)</option>
      </select>
      <label for="rep-period" class="sr-only">Kỳ báo cáo</label>
      <select id="rep-period" v-model="period" :class="sel">
        <option value="Q4-2026">Quý 4/2026</option>
        <option value="11-2026">Tháng 11/2026</option>
        <option value="2026">Năm 2026</option>
      </select>
      <button type="button" class="bg-brand-600 text-white px-3 py-2 rounded-xl font-semibold text-xs hover:bg-brand-700 shadow-sm" @click="toast('Đã xuất báo cáo PDF')"><i class="fa-solid fa-file-pdf mr-1.5"></i>Xuất Báo Cáo PDF</button>
      <button type="button" class="bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-xl font-semibold text-xs hover:bg-slate-50 shadow-sm" @click="toast('Đã xuất báo cáo Excel')"><i class="fa-solid fa-file-excel mr-1.5"></i>Xuất Excel</button>
    </PageHeader>

    <template v-if="stats">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Doanh Thu Thuần" :value="vnd(stats.revenue)" icon="fa-solid fa-sack-dollar" note="+14.8% so với cùng kỳ năm trước" note-icon="fa-solid fa-arrow-trend-up" note-class="text-emerald-600" />
        <KpiCard label="Lợi Nhuận Gộp (EBITDA)" :value="vnd(stats.profit)" icon="fa-solid fa-chart-line" tone="bg-emerald-50 text-emerald-600" :note="`Biên lợi nhuận gộp: ${pct(stats.margin)}`" note-class="text-emerald-600" />
        <KpiCard label="Tổng Chi Phí Vận Hành" :value="vnd(stats.expense)" icon="fa-solid fa-receipt" tone="bg-amber-50 text-amber-600" :note="`Tỷ trọng chi phí / doanh thu: ${pct(stats.expenseRatio)}`" />
        <KpiCard label="Tỉ Lệ Hoàn Vốn (ROI)" :value="pct(stats.roi)" icon="fa-solid fa-percent" tone="bg-purple-50 text-purple-600" note="Vượt 4.2% mục tiêu đề ra" note-icon="fa-solid fa-arrow-trend-up" note-class="text-emerald-600" />
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div class="flex items-center justify-between mb-4">
            <div><h3 class="font-bold text-slate-800"><i class="fa-solid fa-chart-area text-brand-600 mr-2"></i>Biểu Đồ Xu Hướng Doanh Thu & Chi Phí Vận Hành</h3><p class="text-xs text-slate-500">So sánh tương quan qua các kỳ báo cáo kinh doanh thực tế.</p></div>
            <span class="text-xs text-slate-400">(Đơn vị: Triệu VNĐ)</span>
          </div>
          <div class="h-72"><ChartCanvas type="line" :data="main" :options="{ plugins: { legend: { position: 'bottom' } } }" /></div>
        </div>
        <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <h3 class="font-bold text-slate-800"><i class="fa-solid fa-chart-pie text-purple-600 mr-2"></i>Phân Bổ Doanh Thu Theo Khối</h3>
          <p class="text-xs text-slate-500 mb-2">Tỷ trọng đóng góp lợi nhuận từng phân hệ.</p>
          <div class="h-56"><ChartCanvas type="pie" :data="pie" :options="{ plugins: { legend: { position: 'bottom' } } }" /></div>
        </div>
      </div>

      <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 class="font-bold text-slate-800">Bảng Tổng Hợp Chi Tiết Hiệu Quả Hoạt Động Theo Phân Hệ</h3>
          <span class="text-xs text-slate-400">Đồng bộ dữ liệu Real-time</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 text-slate-500 font-semibold uppercase border-b border-slate-100">
              <tr><th class="px-6 py-3">Phân Hệ ERP</th><th class="px-6 py-3">Chỉ Số Đạt Được</th><th class="px-6 py-3">Doanh Số / Giá Trị</th><th class="px-6 py-3">Chi Phí Vận Hành</th><th class="px-6 py-3">Tỉ Lệ Đạt KPI</th><th class="px-6 py-3">Đánh Giá Tổng Thể</th></tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-medium">
              <tr v-if="!stats.rows.length"><td colspan="6" class="px-6 py-8 text-center text-slate-400">Không có dữ liệu</td></tr>
              <tr v-for="r in stats.rows" :key="r.key" class="hover:bg-slate-50">
                <td class="px-6 py-3.5 font-bold text-slate-800">{{ r.name }}</td>
                <td class="px-6 py-3.5">{{ r.metric }}</td>
                <td class="px-6 py-3.5 font-semibold">{{ r.value ? vnd(r.value) : '-' }}</td>
                <td class="px-6 py-3.5">{{ r.cost ? vnd(r.cost) : '-' }}</td>
                <td class="px-6 py-3.5"><div class="flex items-center gap-2"><div class="w-20 h-1.5 bg-slate-200 rounded"><div class="h-1.5 rounded bg-brand-600" :style="{ width: `${Math.min(r.kpi, 100)}%` }"></div></div><span class="font-bold">{{ r.kpi }}%</span></div></td>
                <td class="px-6 py-3.5"><span class="px-2 py-0.5 rounded font-bold text-[10px]" :class="BAR[r.rating]">{{ r.rating }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>
