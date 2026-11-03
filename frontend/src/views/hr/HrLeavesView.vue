<script setup lang="ts">
import CrudPage, { type CrudConfig } from '../../components/CrudPage.vue'
import { leaveRepo, RepoError, type Leave } from '../../data'
import { date } from '../../format'
import { toast } from '../../toast'

async function decide(r: Leave, status: 'approved' | 'rejected', reload: () => Promise<void>) {
  try {
    await leaveRepo.update(r.id, { status })
    toast(status === 'approved' ? `Đã phê duyệt đơn xin nghỉ phép ${r.code}!` : `Đã từ chối đơn ${r.code}`)
  } catch (e) {
    if (!(e instanceof RepoError)) throw e
    toast(e.message, 'error')
  }
  await reload()
}

const config: CrudConfig<Leave> = {
  title: 'Danh Sách Đơn Xin Nghỉ Phép Nhân Sự',
  subtitle: 'Quản lý hồ sơ, chấm công, nghỉ phép, lương thưởng và đánh giá hiệu suất nhân sự.',
  entityLabel: 'đơn nghỉ phép',
  createLabel: 'Tạo Đơn Xin Nghỉ Phép',
  countLabel: 'Đơn phép',
  accent: 'indigo',
  repo: leaveRepo,
  columns: [
    { key: 'full_name', label: 'Nhân Viên Xin Nghỉ' },
    {
      key: 'type', label: 'Loại Phép', format: 'badge',
      badge: {
        sick: { label: 'Nghỉ Bệnh', cls: 'bg-rose-100 text-rose-800' },
        annual: { label: 'Phép Năm', cls: 'bg-blue-100 text-blue-800' },
        unpaid: { label: 'Nghỉ Không Lương', cls: 'bg-slate-200 text-slate-700' },
        other: { label: 'Khác', cls: 'bg-purple-100 text-purple-800' },
      },
    },
    { key: 'start', label: 'Thời Gian Nghỉ', value: (r) => `${date(r.start)} - ${date(r.end)} (${r.days} Ngày)` },
    { key: 'reason', label: 'Lý Do' },
    {
      key: 'status', label: 'Trạng Thái', format: 'badge',
      badge: {
        pending: { label: 'Chờ Quản Lý Duyệt', cls: 'bg-amber-100 text-amber-800' },
        approved: { label: 'Đã Duyệt', cls: 'bg-emerald-100 text-emerald-800' },
        rejected: { label: 'Từ Chối', cls: 'bg-rose-100 text-rose-800' },
      },
    },
  ],
  fields: [
    { key: 'emp_code', label: 'Mã nhân viên (NV-xxxx)', type: 'text', required: true },
    { key: 'full_name', label: 'Nhân viên xin nghỉ', type: 'text', required: true },
    { key: 'type', label: 'Loại phép', type: 'select', required: true, options: [{ value: 'sick', label: 'Nghỉ bệnh' }, { value: 'annual', label: 'Phép năm' }, { value: 'unpaid', label: 'Nghỉ không lương' }, { value: 'other', label: 'Khác' }] },
    { key: 'start', label: 'Từ ngày', type: 'date', required: true },
    { key: 'end', label: 'Đến ngày (số ngày tự tính)', type: 'date', required: true },
    { key: 'reason', label: 'Lý do', type: 'textarea', required: true },
    { key: 'status', label: 'Trạng thái', type: 'select', required: true, options: [{ value: 'pending', label: 'Chờ quản lý duyệt' }, { value: 'approved', label: 'Đã duyệt' }, { value: 'rejected', label: 'Từ chối' }] },
  ],
}
</script>

<template>
  <CrudPage :config="config">
    <template #actions="{ row, reload }">
      <template v-if="row.status === 'pending'">
        <button type="button" class="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-lg" @click="decide(row, 'approved', reload)">Duyệt</button>
        <button type="button" class="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-lg" @click="decide(row, 'rejected', reload)">Từ chối</button>
      </template>
    </template>
  </CrudPage>
</template>
