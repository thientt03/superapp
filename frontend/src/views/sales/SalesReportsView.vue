<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ChartCanvas from '../../components/ChartCanvas.vue'
import KpiCard from '../../components/KpiCard.vue'
import PageHeader from '../../components/PageHeader.vue'
import { getSalesReport } from '../../data/stats'
import { vnd } from '../../format'

const report = ref<Awaited<ReturnType<typeof getSalesReport>> | null>(null)
onMounted(async () => (report.value = await getSalesReport()))

const data = computed(() => ({
  labels: report.value?.months ?? [],
  datasets: [{ label: 'Doanh Thu Bán Hàng (Triệu VNĐ)', data: report.value?.series ?? [], borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, tension: 0.3 }],
}))
</script>

<template>
  <div class="space-y-6">
    <PageHeader title="Báo Cáo Doanh Thu" subtitle="Biểu Đồ Thống Kê Doanh Thu Bán Hàng" />
    <div v-if="report" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <KpiCard label="Tổng Doanh Thu (Đơn Bán)" :value="vnd(report.totalRevenue)" icon="fa-solid fa-sack-dollar" />
      <KpiCard label="Số Đơn Bán Hàng" :value="`${report.orderCount} Đơn`" icon="fa-solid fa-receipt" tone="bg-purple-50 text-purple-600" />
    </div>
    <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
      <h3 class="font-bold text-slate-800 mb-4">Biểu Đồ Thống Kê Doanh Thu Bán Hàng</h3>
      <div class="h-80"><ChartCanvas type="line" :data="data" :options="{ plugins: { legend: { position: 'bottom' } } }" /></div>
    </div>
  </div>
</template>
