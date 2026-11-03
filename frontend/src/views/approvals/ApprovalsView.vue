<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ApiError, cancelApproval, createApproval, fetchApprovalTypes, listApprovals,
  type ApprovalCreate, type ApprovalRequest, type ApprovalStatus, type ApprovalType,
} from '../../api'
import FormModal from '../../components/FormModal.vue'
import KpiCard from '../../components/KpiCard.vue'
import PageHeader from '../../components/PageHeader.vue'
import { dateTime, normalize } from '../../format'
import { pendingCount, refreshSession } from '../../session'
import { toast } from '../../toast'
import ApprovalDecision from './ApprovalDecision.vue'
import { refNo, STATUS, valueText } from './util'

const route = useRoute()
const router = useRouter()

const scope = ref<'to_approve' | 'submitted'>('to_approve')
const status = ref<ApprovalStatus | ''>('')
const items = ref<ApprovalRequest[]>([])
const nextCursor = ref<string | null>(null)
const loading = ref(true)
const error = ref(false)
const search = ref('')
const selected = ref<ApprovalRequest | null>(null)

const shown = computed(() => {
  const q = normalize(search.value.trim())
  if (!q) return items.value
  return items.value.filter((r) => [r.title, r.ref_no ?? '', r.requester.full_name].some((s) => normalize(s).includes(q)))
})

let gen = 0
async function load(more = false) {
  const my = ++gen
  loading.value = true
  error.value = false
  try {
    const page = await listApprovals({
      scope: scope.value,
      // scope=to_approve mà gửi status thì backend trả 422
      status: scope.value === 'submitted' && status.value ? status.value : undefined,
      cursor: more ? (nextCursor.value ?? undefined) : undefined,
    })
    if (my !== gen) return
    items.value = more ? [...items.value, ...page.items] : page.items
    nextCursor.value = page.next_cursor
  } catch (e) {
    if (my !== gen || (e instanceof ApiError && e.status === 401)) return
    error.value = true
  } finally {
    if (my === gen) loading.value = false
  }
}
watch([scope, status], () => {
  items.value = []
  nextCursor.value = null
  selected.value = null
  load()
})
const setScope = (s: 'to_approve' | 'submitted') => {
  status.value = ''
  scope.value = s
}

async function onDone() {
  selected.value = null
  await load()
}

async function cancel(r: ApprovalRequest) {
  try {
    await cancelApproval(r.id)
    toast('Đã hủy phiếu')
  } catch (e) {
    if (!(e instanceof ApiError)) return void toast('Không thể kết nối máy chủ', 'error')
    if (e.status === 401) return
    toast(e.detail, 'error')
  }
  await refreshSession()
  await onDone()
}

// ---- Tạo đề xuất
const types = ref<ApprovalType[]>([])
const createOpen = ref(false)
const form = reactive({ doc_type: '', title: '', description: '', ref_no: '', amount: '', start_date: '', end_date: '' })
const formError = ref('')
const saving = ref(false)
const curType = computed(() => types.value.find((t) => t.code === form.doc_type))
const noFlow = computed(() => !!curType.value && curType.value.steps.length === 0)

async function openCreate() {
  Object.assign(form, { doc_type: '', title: '', description: '', ref_no: '', amount: '', start_date: '', end_date: '' })
  formError.value = ''
  createOpen.value = true
  if (!types.value.length) {
    try {
      types.value = (await fetchApprovalTypes()).items
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 401)) formError.value = 'Không tải được danh sách loại chứng từ'
    }
  }
}

async function submitCreate() {
  const t = curType.value
  const title = form.title.trim()
  if (saving.value) return
  if (!t) return void (formError.value = 'Vui lòng chọn loại chứng từ')
  if (noFlow.value) return void (formError.value = 'Loại chứng từ chưa được cấu hình quy trình phê duyệt')
  if (!title || title.length > 200) return void (formError.value = 'Tiêu đề bắt buộc, tối đa 200 ký tự')
  if (form.description.length > 5000) return void (formError.value = 'Mô tả tối đa 5000 ký tự')
  const body: ApprovalCreate = { doc_type: t.code, title }
  if (form.description.trim()) body.description = form.description.trim()
  if (form.ref_no.trim()) body.ref_no = form.ref_no.trim()
  if (t.has_amount) {
    const raw = String(form.amount).trim() // v-model type=number có thể trả number
    const a = Number(raw)
    if (!/^\d+$/.test(raw) || a <= 0 || a > 999_999_999_999) return void (formError.value = 'Số tiền phải là số nguyên từ 1 đến 999.999.999.999')
    body.amount = a
  }
  if (t.has_date_range) {
    if (!form.start_date || !form.end_date) return void (formError.value = 'Vui lòng chọn đủ ngày bắt đầu và kết thúc')
    if (form.end_date < form.start_date) return void (formError.value = 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu')
    body.start_date = form.start_date
    body.end_date = form.end_date
  }
  saving.value = true
  formError.value = ''
  try {
    await createApproval(body)
    createOpen.value = false
    toast('Đã gửi đề xuất')
    await refreshSession()
    if (scope.value === 'submitted' && !status.value) await load()
    else setScope('submitted') // đổi tab/chip kích hoạt watch -> load
  } catch (e) {
    if (!(e instanceof ApiError)) formError.value = 'Không thể kết nối máy chủ'
    else if (e.status !== 401) formError.value = e.detail
  } finally {
    saving.value = false
  }
}

function checkNew() {
  if (route.query.new !== '1') return
  openCreate()
  const { new: _n, ...rest } = route.query
  router.replace({ query: rest })
}
watch(() => route.query.new, checkNew)
onMounted(() => {
  load()
  checkNew()
})

const STATUS_CHIPS: { v: ApprovalStatus | ''; label: string }[] = [
  { v: '', label: 'Tất cả' }, { v: 'pending', label: 'Chờ duyệt' }, { v: 'approved', label: 'Đã duyệt' },
  { v: 'rejected', label: 'Từ chối' }, { v: 'cancelled', label: 'Đã hủy' },
]
const inp = 'w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'
</script>

<template>
  <div class="space-y-6">
    <PageHeader title="Trung Tâm Phê Duyệt & Ủy Quyền" subtitle="Quản lý và xử lý các yêu cầu, đề xuất trình duyệt từ tất cả các phòng ban.">
      <button type="button" class="bg-brand-600 text-white px-4 py-2 rounded-xl font-semibold text-xs hover:bg-brand-700 flex items-center shadow-sm" @click="openCreate">
        <i class="fa-solid fa-plus mr-1.5"></i>Tạo Đề Xuất Mới
      </button>
    </PageHeader>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard label="Đang Chờ Duyệt" :value="`${pendingCount} Yêu cầu`" icon="fa-solid fa-clock" tone="bg-amber-50 text-amber-600" note="Cần xử lý trong ngày" note-class="text-amber-600" />
    </div>

    <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div class="px-4 pt-3 border-b border-slate-100 flex gap-2" role="tablist">
        <button type="button" role="tab" :aria-selected="scope === 'to_approve'" class="px-4 py-2 text-xs font-bold border-b-2" :class="scope === 'to_approve' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500'" @click="setScope('to_approve')">Chờ tôi duyệt</button>
        <button type="button" role="tab" :aria-selected="scope === 'submitted'" class="px-4 py-2 text-xs font-bold border-b-2" :class="scope === 'submitted' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500'" @click="setScope('submitted')">Tôi đã gửi</button>
      </div>
      <div class="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        <div class="flex flex-wrap items-center gap-2">
          <template v-if="scope === 'submitted'">
            <button v-for="c in STATUS_CHIPS" :key="c.v" type="button" :aria-pressed="status === c.v" class="px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all" :class="status === c.v ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'" @click="status = c.v">{{ c.label }}</button>
          </template>
        </div>
        <div class="relative w-full sm:w-64">
          <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
          <label for="approval-search" class="sr-only">Tìm kiếm phiếu</label>
          <input id="approval-search" v-model="search" type="text" placeholder="Tìm kiếm phiếu đề xuất..." class="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:bg-white focus:outline-none font-medium" />
        </div>
      </div>

      <div v-if="error" class="p-6 text-center">
        <p class="text-sm font-semibold text-slate-700 mb-3">Không tải được dữ liệu</p>
        <button type="button" class="py-2 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold" @click="load()">Thử lại</button>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 text-slate-500 font-semibold uppercase border-b border-slate-100">
            <tr>
              <th class="px-6 py-3">Mã Phiếu</th>
              <th class="px-6 py-3">Người Đề Xuất</th>
              <th class="px-6 py-3">Loại Yêu Cầu</th>
              <th class="px-6 py-3">Tiêu Đề / Nội Dung</th>
              <th class="px-6 py-3">Giá Trị / Thông Số</th>
              <th class="px-6 py-3">Ngày Trình Duyệt</th>
              <th class="px-6 py-3">Trạng Thái</th>
              <th class="px-6 py-3 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-medium">
            <tr v-if="loading && !items.length"><td colspan="8" class="px-6 py-8 text-center text-brand-600" role="status" aria-label="Đang tải"><i class="fa-solid fa-spinner fa-spin text-xl"></i></td></tr>
            <tr v-else-if="!shown.length"><td colspan="8" class="px-6 py-8 text-center text-slate-400">Không có phiếu nào</td></tr>
            <tr v-for="r in shown" :key="r.id" class="hover:bg-slate-50 cursor-pointer" tabindex="0" @click="selected = r" @keydown.enter="selected = r">
              <td class="px-6 py-3.5 font-bold text-brand-600">{{ refNo(r) }}</td>
              <td class="px-6 py-3.5 font-bold text-slate-800">{{ r.requester.full_name }}</td>
              <td class="px-6 py-3.5"><span class="px-2 py-1 bg-blue-50 text-blue-700 rounded-md font-semibold text-[10px]">{{ r.doc_type_name }}</span></td>
              <td class="px-6 py-3.5 font-bold text-slate-800">{{ r.title }}</td>
              <td class="px-6 py-3.5 font-bold text-emerald-600">{{ valueText(r) }}</td>
              <td class="px-6 py-3.5 text-slate-500">{{ dateTime(r.created_at) }}</td>
              <td class="px-6 py-3.5"><span class="px-2.5 py-1 rounded-full font-bold text-[10px]" :class="STATUS[r.status].cls">{{ STATUS[r.status].label }}</span></td>
              <td class="px-6 py-3.5 text-right space-x-1.5" @click.stop>
                <ApprovalDecision :req="r" @done="onDone" />
                <button v-if="r.can_cancel" type="button" class="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-lg" @click="cancel(r)">Hủy</button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="nextCursor" class="p-4 text-center">
          <button type="button" :disabled="loading" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-700 disabled:opacity-60" @click="load(true)">Tải thêm</button>
        </div>
      </div>
    </div>

    <div v-if="selected" class="fixed inset-0 z-40 bg-slate-900/50 flex justify-end" @click.self="selected = null" @keydown.esc="selected = null">
      <aside role="dialog" aria-modal="true" aria-label="Chi tiết phiếu" class="w-full max-w-md h-full bg-white shadow-2xl overflow-y-auto p-6 space-y-4">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-xs font-bold text-brand-600">{{ refNo(selected) }} · {{ selected.doc_type_name }}</p>
            <h2 class="text-lg font-bold text-slate-900">{{ selected.title }}</h2>
          </div>
          <button type="button" aria-label="Đóng" class="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-500" @click="selected = null"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <p v-if="selected.description" class="text-sm text-slate-600 whitespace-pre-line">{{ selected.description }}</p>
        <p class="text-xs text-slate-500">Người đề xuất: <b>{{ selected.requester.full_name }}</b> · {{ valueText(selected) }}</p>
        <ol class="space-y-3">
          <li v-for="s in selected.steps" :key="s.level" class="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <p class="font-bold text-slate-800">Cấp {{ s.level }}: {{ s.approver.full_name }}</p>
            <p :class="s.decision === 'approved' ? 'text-emerald-600' : s.decision === 'rejected' ? 'text-rose-600' : 'text-amber-600'">
              {{ s.decision === 'approved' ? 'Đã duyệt' : s.decision === 'rejected' ? 'Đã từ chối' : 'Chưa xử lý' }}
              <template v-if="s.decided_at"> · {{ dateTime(s.decided_at) }}</template>
            </p>
            <p v-if="s.comment" class="text-slate-600 mt-1">{{ s.comment }}</p>
          </li>
        </ol>
      </aside>
    </div>

    <FormModal v-if="createOpen" title="Tạo Đề Xuất Mới" :busy="saving" @close="createOpen = false" @submit="submitCreate">
      <div>
        <label for="ap-type" class="block text-xs font-semibold text-slate-600 mb-1">Loại chứng từ *</label>
        <select id="ap-type" v-model="form.doc_type" :class="inp">
          <option value="">-- Chọn --</option>
          <option v-for="t in types" :key="t.code" :value="t.code">{{ t.name }}</option>
        </select>
      </div>
      <p v-if="noFlow" role="alert" class="text-xs text-rose-600">Loại chứng từ chưa được cấu hình quy trình phê duyệt</p>
      <div>
        <label for="ap-title" class="block text-xs font-semibold text-slate-600 mb-1">Tiêu đề *</label>
        <input id="ap-title" v-model="form.title" type="text" maxlength="200" :class="inp" />
      </div>
      <div>
        <label for="ap-desc" class="block text-xs font-semibold text-slate-600 mb-1">Mô tả</label>
        <textarea id="ap-desc" v-model="form.description" rows="3" maxlength="5000" :class="inp"></textarea>
      </div>
      <div>
        <label for="ap-ref" class="block text-xs font-semibold text-slate-600 mb-1">Mã tham chiếu</label>
        <input id="ap-ref" v-model="form.ref_no" type="text" maxlength="50" :class="inp" />
      </div>
      <div v-if="curType?.has_amount">
        <label for="ap-amount" class="block text-xs font-semibold text-slate-600 mb-1">Số tiền (₫) *</label>
        <input id="ap-amount" v-model="form.amount" type="number" min="1" step="1" :class="inp" />
      </div>
      <div v-if="curType?.has_date_range" class="grid grid-cols-2 gap-3">
        <div>
          <label for="ap-start" class="block text-xs font-semibold text-slate-600 mb-1">Từ ngày *</label>
          <input id="ap-start" v-model="form.start_date" type="date" :class="inp" />
        </div>
        <div>
          <label for="ap-end" class="block text-xs font-semibold text-slate-600 mb-1">Đến ngày *</label>
          <input id="ap-end" v-model="form.end_date" type="date" :class="inp" />
        </div>
      </div>
      <p v-if="formError" role="alert" class="text-xs text-rose-600">{{ formError }}</p>
    </FormModal>
  </div>
</template>
