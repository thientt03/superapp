<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ChartCanvas from '../../components/ChartCanvas.vue'
import KpiCard from '../../components/KpiCard.vue'
import PageHeader from '../../components/PageHeader.vue'
import { getCrmAnalytics, type CrmAnalytics } from '../../data/stats'
import { vnd } from '../../format'

const timeframe = ref<'month' | 'quarter' | 'year'>('month')
const stats = ref<CrmAnalytics | null>(null)
watch(timeframe, async (t) => (stats.value = await getCrmAnalytics(t)), { immediate: true })

const funnel = computed(() => ({
  labels: ['1. Mới tiếp cận', '2. Gửi báo giá', '3. Thương lượng', '4. Chốt hợp đồng'],
  datasets: [{ label: 'Số lượng cơ hội', data: stats.value?.funnel ?? [], backgroundColor: ['#3b82f6', '#f59e0b', '#a855f7', '#10b981'], borderRadius: 8, barThickness: 28 }],
}))
const industry = computed(() => ({
  labels: stats.value?.industry.labels ?? [],
  datasets: [{ data: stats.value?.industry.data ?? [], backgroundColor: ['#3b82f6', '#a855f7', '#10b981', '#f59e0b'], borderWidth: 0 }],
}))
const perf = computed(() => ({
  labels: stats.value?.performance.labels ?? [],
  datasets: [
    { label: 'Doanh số thực tế (Triệu VNĐ)', data: stats.value?.performance.actual ?? [], backgroundColor: '#10b981', borderRadius: 6 },
    { label: 'Chỉ tiêu KPI (Triệu VNĐ)', data: stats.value?.performance.target ?? [], backgroundColor: '#cbd5e1', borderRadius: 6 },
  ],
}))
const RATING: Record<string, string> = { 'Xuất Sắc': 'bg-emerald-100 text-emerald-800', Tốt: 'bg-brand-100 text-brand-900', 'Đạt KPI': 'bg-amber-100 text-amber-800' }
const sel = 'bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500'
</script>

<template>
  <div class="space-y-6">
    <PageHeader title="Báo Cáo Phân Tích & Hiệu Suất CRM (Business Intelligence)" subtitle="Phân tích tỉ lệ chuyển đổi phễu bán hàng, chi phí CAC, CLV và hiệu suất kinh doanh của từng nhân sự.">
      <label for="crm-timeframe" class="sr-only">Mốc thời gian</label>
      <select id="crm-timeframe" v-model="timeframe" :class="sel">
        <option value="month">Tháng này (Tháng 11/2026)</option>
        <option value="quarter">Quý 4/2026</option>
        <option value="year">Năm 2026</option>
      </select>
    </PageHeader>

    <template v-if="stats">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Tỉ Lệ Chuyển Đổi Phễu" :value="stats.kpis.conversion" icon="fa-solid fa-filter" note="+4.2% so với tháng trước" note-icon="fa-solid fa-arrow-trend-up" note-class="text-emerald-600" />
        <KpiCard label="Giá Trị Vòng Đời (CLV)" :value="vnd(stats.kpis.clv)" icon="fa-solid fa-gem" tone="bg-purple-50 text-purple-600" note="+8.5% trung bình/khách hàng" note-icon="fa-solid fa-arrow-trend-up" note-class="text-emerald-600" />
        <KpiCard label="Chi Phí Thu Hút (CAC)" :value="vnd(stats.kpis.cac)" icon="fa-solid fa-bullseye" tone="bg-amber-50 text-amber-600" note="-2.1% tối ưu chi phí" note-icon="fa-solid fa-arrow-trend-down" note-class="text-emerald-600" />
        <KpiCard label="Thời Gian Chốt Trung Bình" :value="stats.kpis.closeDays" icon="fa-solid fa-hourglass-half" tone="bg-emerald-50 text-emerald-600" note="Rút ngắn 2.5 ngày so với Q3" note-class="text-emerald-600" />
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div class="flex items-center justify-between mb-4">
            <h4 class="font-bold text-slate-800"><i class="fa-solid fa-filter text-brand-600 mr-2"></i>Biểu Đồ Tỉ Lệ Chuyển Đổi Qua Các Giai Đoạn Phễu</h4>
            <span class="text-xs text-slate-400">Đơn vị: Cơ hội</span>
          </div>
          <div class="h-64"><ChartCanvas type="bar" :data="funnel" :options="{ indexAxis: 'y', plugins: { legend: { display: false } } }" /></div>
        </div>
        <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <h4 class="font-bold text-slate-800 mb-3"><i class="fa-solid fa-chart-pie text-purple-600 mr-2"></i>Cơ Cấu Doanh Thu Theo Ngành</h4>
          <div class="h-48"><ChartCanvas type="doughnut" :data="industry" :options="{ plugins: { legend: { position: 'bottom' } } }" /></div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <h4 class="font-bold text-slate-800 mb-3"><i class="fa-solid fa-bullseye text-emerald-600 mr-2"></i>Hiệu Suất vs Chỉ Tiêu KPI</h4>
          <div class="h-64"><ChartCanvas type="bar" :data="perf" :options="{ plugins: { legend: { position: 'bottom' } } }" /></div>
        </div>
        <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h4 class="font-bold text-slate-800"><i class="fa-solid fa-trophy text-amber-500 mr-2"></i>Bảng Xếp Hạng Đội Ngũ Kinh Doanh (Sales Leaderboard)</h4>
            <span class="text-xs text-slate-400">Tháng 11/2026</span>
          </div>
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 text-slate-500 font-semibold uppercase border-b border-slate-100">
              <tr><th class="px-5 py-3">Hạng</th><th class="px-5 py-3">Nhân Viên Sales</th><th class="px-5 py-3">Số Hợp Đồng</th><th class="px-5 py-3">Doanh Số Chốt</th><th class="px-5 py-3">Tỉ Lệ Đạt KPI</th><th class="px-5 py-3 text-right">Đánh Giá</th></tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-medium">
              <tr v-for="r in stats.leaderboard" :key="r.rank" class="hover:bg-slate-50">
                <td class="px-5 py-3.5 font-bold">{{ r.rank }}</td>
                <td class="px-5 py-3.5 font-bold text-slate-800">{{ r.name }}</td>
                <td class="px-5 py-3.5 font-semibold">{{ r.contracts }} Hợp đồng</td>
                <td class="px-5 py-3.5 font-bold text-emerald-600">{{ vnd(r.revenue) }}</td>
                <td class="px-5 py-3.5 font-bold">{{ r.kpi }}%</td>
                <td class="px-5 py-3.5 text-right"><span class="px-2 py-0.5 rounded font-bold text-[10px]" :class="RATING[r.rating]">{{ r.rating }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>
