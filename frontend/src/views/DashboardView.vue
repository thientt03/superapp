<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ApiError, listApprovals, type ApprovalRequest } from '../api'
import ChartCanvas from '../components/ChartCanvas.vue'
import KpiCard from '../components/KpiCard.vue'
import { date, vnd } from '../format'
import { getDashboardStats, type DashboardStats } from '../data/stats'
import { pendingCount, refreshSession } from '../session'
import { toast } from '../toast'
import ApprovalDecision from './approvals/ApprovalDecision.vue'
import { refNo, valueText } from './approvals/util'

const stats = ref<DashboardStats | null>(null)
const pending = ref<ApprovalRequest[]>([])
const loading = ref(true)
const error = ref(false)

async function loadPending() {
  pending.value = (await listApprovals({ scope: 'to_approve', limit: 5 })).items
}

async function load() {
  loading.value = true
  error.value = false
  try {
    const [s] = await Promise.all([getDashboardStats(), loadPending(), refreshSession()])
    stats.value = s
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return
    error.value = true
  } finally {
    loading.value = false
  }
}

async function reload() {
  try {
    await loadPending()
  } catch (e) {
    if (!(e instanceof ApiError && e.status === 401)) toast('Không tải được dữ liệu', 'error')
  }
}

const revenueData = computed(() => ({
  labels: stats.value?.months ?? [],
  datasets: [
    { label: 'Doanh Thu', data: stats.value?.revenueSeries ?? [], backgroundColor: '#3b82f6', borderRadius: 6 },
    { label: 'Mua Hàng', data: stats.value?.purchaseSeries ?? [], backgroundColor: '#94a3b8', borderRadius: 6 },
  ],
}))
const crmData = computed(() => ({
  labels: stats.value?.crm.labels ?? [],
  datasets: [{ data: stats.value?.crm.data ?? [], backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'], borderWidth: 0 }],
}))
const legend = { plugins: { legend: { position: 'bottom' as const } } }

onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <div v-if="loading" class="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 flex justify-center text-brand-600" role="status" aria-label="Đang tải">
      <i class="fa-solid fa-spinner fa-spin text-2xl"></i>
    </div>

    <div v-else-if="error || !stats" class="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 text-center">
      <p class="text-sm font-semibold text-slate-700 mb-3">Không tải được dữ liệu</p>
      <button type="button" class="py-2 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold" @click="load">Thử lại</button>
    </div>

    <template v-else>
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Tổng Quan Báo Cáo Điều Hành</h1>
        <p class="text-sm text-slate-500">Xem nhanh hiệu suất hoạt động kinh doanh toàn doanh nghiệp.</p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Tổng Doanh Thu" :value="vnd(stats.revenue)" icon="fa-solid fa-sack-dollar" note="+12.5% so với tháng trước" note-icon="fa-solid fa-arrow-trend-up" note-class="text-emerald-600" />
        <KpiCard label="Đơn Bán Hàng (SO)" :value="`${stats.orders} Đơn`" icon="fa-solid fa-receipt" tone="bg-purple-50 text-purple-600" note="+8.2% tỉ lệ chốt đơn" note-icon="fa-solid fa-arrow-trend-up" note-class="text-emerald-600" />
        <KpiCard label="Giá Trị Tồn Kho" :value="vnd(stats.inventoryValue)" icon="fa-solid fa-boxes-packing" tone="bg-amber-50 text-amber-600" :note="`${stats.belowMin} mặt hàng dưới định mức`" note-icon="fa-solid fa-circle-exclamation" note-class="text-rose-500" />
        <KpiCard label="Tổng Nhân Sự" :value="`${stats.staff} Nhân viên`" icon="fa-solid fa-users" tone="bg-emerald-50 text-emerald-600" :note="`Có mặt hôm nay: ${stats.present}/${stats.staff}`" note-icon="fa-solid fa-user-check text-emerald-500" />
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-bold text-slate-800">So Sánh Doanh Thu & Mua Hàng năm 2026</h3>
            <span class="text-xs text-slate-400">(Đơn vị: Triệu VNĐ)</span>
          </div>
          <div class="h-72"><ChartCanvas type="bar" :data="revenueData" :options="legend" /></div>
        </div>
        <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <h3 class="font-bold text-slate-800 mb-2">Tỉ Lệ Chốt Khách Hàng (CRM)</h3>
          <div class="h-60 relative flex items-center justify-center"><ChartCanvas type="doughnut" :data="crmData" :options="legend" /></div>
        </div>
      </div>

      <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <i class="fa-solid fa-clock-rotate-left text-brand-600"></i>
            <h3 class="font-bold text-slate-800">Yêu Cầu Chờ Phê Duyệt Gần Đây</h3>
          </div>
          <RouterLink to="/approvals" class="text-xs text-brand-600 font-semibold hover:underline">Xem tất cả ({{ pendingCount }}) &rarr;</RouterLink>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 text-slate-500 font-semibold uppercase border-b border-slate-100">
              <tr>
                <th class="px-6 py-3">Mã phiếu</th>
                <th class="px-6 py-3">Người đề xuất</th>
                <th class="px-6 py-3">Loại yêu cầu</th>
                <th class="px-6 py-3">Giá trị / Lý do</th>
                <th class="px-6 py-3">Ngày gửi</th>
                <th class="px-6 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-medium">
              <tr v-if="!pending.length"><td colspan="6" class="px-6 py-8 text-center text-slate-400">Không có yêu cầu chờ duyệt</td></tr>
              <tr v-for="r in pending" :key="r.id" class="hover:bg-slate-50">
                <td class="px-6 py-3.5 font-bold text-brand-600">{{ refNo(r) }}</td>
                <td class="px-6 py-3.5">{{ r.requester.full_name }}</td>
                <td class="px-6 py-3.5"><span class="px-2 py-1 bg-blue-50 text-blue-700 rounded-md">{{ r.doc_type_name }}</span></td>
                <td class="px-6 py-3.5 font-semibold">{{ valueText(r) || r.title }}</td>
                <td class="px-6 py-3.5 text-slate-500">{{ date(r.created_at) }}</td>
                <td class="px-6 py-3.5 text-right space-x-2"><ApprovalDecision :req="r" @done="reload" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>
