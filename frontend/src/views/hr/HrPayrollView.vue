<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import CrudPage, { type CrudConfig } from '../../components/CrudPage.vue'
import { netSalary, payrollRepo, RepoError, runPayroll, type PayrollRow } from '../../data'
import { vnd } from '../../format'
import { toast } from '../../toast'

const now = new Date()
const month = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
// Mặc định: tháng mới nhất có trong bảng lương (rỗng thì giữ tháng hiện tại)
onMounted(async () => {
  const months = (await payrollRepo.list()).map((r) => r.month).sort()
  if (months.length) month.value = months[months.length - 1]
})
const label = computed(() => month.value.split('-').reverse().join('/'))
const total = (rows: PayrollRow[]) => rows.reduce((s, r) => s + netSalary(r.base, r.bonus).net, 0)

// Tính lương tháng đang chọn cho mọi nhân viên đang làm việc, rồi tải lại bảng
async function run(reload: () => Promise<void>) {
  try {
    const { created, updated } = await runPayroll(month.value)
    toast(`Đã tính lương tháng ${label.value}: thêm ${created}, cập nhật ${updated} dòng`)
  } catch (e) {
    if (!(e instanceof RepoError)) throw e
    toast(e.message, 'error')
  }
  await reload()
}

const config = computed<CrudConfig<PayrollRow>>(() => ({
  title: 'Tính Lương & Thuế TNCN',
  subtitle: 'Quản lý hồ sơ, chấm công, nghỉ phép, lương thưởng và đánh giá hiệu suất nhân sự.',
  entityLabel: 'bảng lương',
  createLabel: 'Thêm Bảng Lương Nhân Viên',
  accent: 'indigo',
  repo: payrollRepo,
  extraFilters: () => ({ month: month.value }),
  columns: [
    { key: 'emp_code', label: 'Mã NV' },
    { key: 'full_name', label: 'Họ & Tên' },
    { key: 'base', label: 'Lương Cơ Bản', format: 'vnd' },
    { key: 'bonus', label: 'Thưởng KPI & HH', value: (r) => `+${vnd(r.bonus)}` },
    { key: 'base', label: 'Bảo Hiểm (BHXH)', value: (r) => `-${vnd(netSalary(r.base, r.bonus).insurance)}` },
    { key: 'bonus', label: 'Thực Lĩnh', value: (r) => vnd(netSalary(r.base, r.bonus).net) },
  ],
  fields: [
    { key: 'emp_code', label: 'Mã NV (NV-xxxx)', type: 'text', required: true },
    { key: 'month', label: 'Tháng (yyyy-mm)', type: 'text', required: true },
    { key: 'full_name', label: 'Họ & tên', type: 'text', required: true },
    { key: 'base', label: 'Lương cơ bản (₫)', type: 'number', required: true, min: 0 },
    { key: 'bonus', label: 'Thưởng KPI & hoa hồng (₫)', type: 'number', required: true, min: 0 },
  ],
}))
</script>

<template>
  <CrudPage :key="month" :config="config">
    <template #header="{ reload }">
      <label for="payroll-month" class="sr-only">Tháng tính lương</label>
      <input id="payroll-month" v-model="month" type="month" class="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold" />
      <button type="button" class="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl font-semibold text-xs hover:bg-slate-50 flex items-center shadow-sm" @click="run(reload)">
        <i class="fa-solid fa-calculator mr-1.5"></i>Tính Lương Tháng
      </button>
    </template>
    <template #top="{ rows }">
      <div class="bg-white px-6 py-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-2">
        <span class="font-bold text-slate-800">Bảng Tổng Hợp Lương & Thuế TNCN Tháng {{ label }}</span>
        <span class="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold" data-testid="payroll-total">Tổng Chi Lương: {{ vnd(total(rows)) }}</span>
      </div>
    </template>
    <template #actions="{ row }">
      <button type="button" class="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg" @click="toast(`Đã gửi payslip cho ${row.full_name}`)">Gửi Payslip</button>
    </template>
  </CrudPage>
</template>
