<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PageHeader from '../../components/PageHeader.vue'
import { getAccountingReport } from '../../data/stats'
import { vnd } from '../../format'
import { toast } from '../../toast'

const r = ref<Awaited<ReturnType<typeof getAccountingReport>> | null>(null)
onMounted(async () => (r.value = await getAccountingReport()))
</script>

<template>
  <div v-if="r" class="space-y-6">
    <PageHeader title="Hệ Thống Báo Cáo Tài Chính Theo Chuẩn Mực Kế Toán (VAS/IFRS)" subtitle="Quản lý dòng tiền, sổ quỹ thu chi, công nợ phải thu/phải trả và hóa đơn điện tử.">
      <button type="button" class="bg-brand-600 text-white px-4 py-2 rounded-xl font-semibold text-xs hover:bg-brand-700 shadow-sm" @click="toast('Đã xuất bộ Báo Cáo Tài Chính quý thành công!')">Xuất BCTC PDF</button>
    </PageHeader>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <article class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
        <span class="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded font-bold text-xs">Bảng Cân Đối Kế Toán</span>
        <h4 class="font-bold text-slate-800" data-testid="balance-title">Tổng Tài Sản = Tổng Nguồn Vốn ({{ vnd(r.assets) }})</h4>
        <dl class="text-xs text-slate-600 grid grid-cols-2 gap-x-4 gap-y-1">
          <dt>Tiền (tồn quỹ)</dt><dd class="text-right font-semibold">{{ vnd(r.balance) }}</dd>
          <dt>Phải thu khách hàng</dt><dd class="text-right font-semibold">{{ vnd(r.receivable) }}</dd>
          <dt>Hàng tồn kho</dt><dd class="text-right font-semibold">{{ vnd(r.inventoryValue) }}</dd>
          <dt>Phải trả nhà cung cấp</dt><dd class="text-right font-semibold">{{ vnd(r.payable) }}</dd>
          <dt>Vốn chủ sở hữu</dt><dd class="text-right font-semibold">{{ vnd(r.equity) }}</dd>
        </dl>
      </article>
      <article class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
        <span class="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-xs">Báo Cáo Kết Quả HĐKD</span>
        <h4 class="font-bold text-slate-800" data-testid="ebit-title">Lợi Nhuận Trước Thuế (EBIT): {{ r.ebit >= 0 ? '+' : '-' }}{{ vnd(Math.abs(r.ebit)) }}</h4>
        <dl class="text-xs text-slate-600 grid grid-cols-2 gap-x-4 gap-y-1">
          <dt>Doanh thu (đơn bán)</dt><dd class="text-right font-semibold">{{ vnd(r.revenue) }}</dd>
          <dt>Giá vốn (phiếu xuất kho)</dt><dd class="text-right font-semibold">-{{ vnd(r.cogs) }}</dd>
          <dt>Chi phí lương (thực lĩnh)</dt><dd class="text-right font-semibold">-{{ vnd(r.payrollCost) }}</dd>
        </dl>
      </article>
    </div>
  </div>
</template>
