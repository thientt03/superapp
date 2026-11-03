<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import CrudPage, { type CrudConfig } from '../../components/CrudPage.vue'
import { departmentRepo, formulaRepo, type Department, type Formula } from '../../data'

const departments = ref<Department[]>([])
const ready = ref(false)
onMounted(async () => {
  departments.value = await departmentRepo.list()
  ready.value = true
})

const deptOpts = computed(() => departments.value.map((d) => ({ value: d.code, label: d.name })))
const deptNames = (v: string) => v.split(',').filter(Boolean).map((c) => deptOpts.value.find((o) => o.value === c)?.label ?? c).join(', ')

const config = computed<CrudConfig<Formula>>(() => ({
  title: 'Cấu Hình Công Thức Tính Lương & Lương Sản Phẩm/KPI',
  subtitle: 'Thống nhất quy tắc tính lương thực lĩnh, hệ số Overtime, tỷ lệ đóng BHXH và thuế TNCN lũy tiến.',
  entityLabel: 'công thức',
  createLabel: 'Thêm Công Thức Mới',
  accent: 'indigo',
  repo: formulaRepo,
  columns: [
    { key: 'name', label: 'Tên Quy Tắc Tính Lương' },
    { key: 'departments', label: 'Áp Dụng Cho Phòng Ban', value: (r) => deptNames(r.departments) },
    { key: 'structure', label: 'Cấu Trúc Tính Lương' },
    {
      key: 'status', label: 'Trạng Thái', format: 'badge',
      badge: { active: { label: 'Đang Kích Hoạt', cls: 'bg-emerald-100 text-emerald-800' }, off: { label: 'Tạm Tắt', cls: 'bg-slate-200 text-slate-700' } },
    },
  ],
  fields: [
    { key: 'code', label: 'Mã công thức (để trống để tự sinh)', type: 'text' },
    { key: 'name', label: 'Tên quy tắc tính lương', type: 'text', required: true },
    { key: 'departments', label: 'Áp dụng cho phòng ban', type: 'checks', required: true, options: deptOpts.value },
    { key: 'structure', label: 'Cấu trúc tính lương', type: 'textarea', required: true },
    { key: 'status', label: 'Trạng thái', type: 'select', required: true, options: [{ value: 'active', label: 'Đang kích hoạt' }, { value: 'off', label: 'Tạm tắt' }] },
  ],
}))
</script>

<template>
  <CrudPage v-if="ready" :config="config">
    <template #top>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2"><span class="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded font-bold text-xs">Khối Văn Phòng / Khối Khác</span><h4 class="font-bold text-slate-800">Lương Theo Ngày Công Thực Tế</h4><p class="text-xs text-slate-600"><code class="bg-slate-50 px-1.5 py-0.5 rounded border">(Lương CB / 26 ngày) * Số ngày đi làm + Phụ cấp cố định</code></p></div>
        <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2"><span class="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-xs">Khối Sales & Kinh Doanh</span><h4 class="font-bold text-slate-800">Lương Cứng + % Hoa Hồng Chốt HĐ</h4><p class="text-xs text-slate-600"><code class="bg-slate-50 px-1.5 py-0.5 rounded border">Lương CB + (% Hoa hồng * Doanh số chốt) + Thưởng KPI</code></p></div>
        <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2"><span class="px-2.5 py-0.5 bg-rose-100 text-rose-800 rounded font-bold text-xs">Quy Định Khấu Trừ Thuế & BHXH</span><h4 class="font-bold text-slate-800">BHXH 10.5% & Thuế TNCN Lũy Tiến</h4><p class="text-xs text-slate-600"><code class="bg-slate-50 px-1.5 py-0.5 rounded border">Trừ BHXH (8% BHXH + 1.5% BHYT + 1% BHTN) + Biểu thuế lũy tiến</code></p></div>
      </div>
    </template>
  </CrudPage>
</template>
