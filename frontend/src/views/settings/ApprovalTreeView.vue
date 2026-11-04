<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ApiError, fetchApprovalTypes, fetchEmployees, updateApprovalFlow, type ApprovalType, type Employee } from '../../api'
import PageHeader from '../../components/PageHeader.vue'
import FormModal from '../../components/FormModal.vue'
import { toast } from '../../toast'

const MAX = 5
const types = ref<ApprovalType[]>([])
const canEdit = ref(false)
const loading = ref(true)
const error = ref(false)
const employees = ref<Employee[]>([])

const editing = ref<ApprovalType | null>(null)
const chain = ref<Employee[]>([])
const pick = ref('')
const saving = ref(false)

async function load() {
  loading.value = true
  error.value = false
  try {
    const r = await fetchApprovalTypes()
    types.value = r.items
    canEdit.value = r.can_edit
  } catch (e) {
    if (!(e instanceof ApiError && e.status === 401)) error.value = true
  } finally {
    loading.value = false
  }
}

async function edit(t: ApprovalType) {
  if (!employees.value.length) {
    try {
      employees.value = await fetchEmployees()
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 401)) toast('Không tải được danh sách nhân viên', 'error')
      return
    }
  }
  editing.value = t
  chain.value = t.steps.map((s) => s.approver)
  pick.value = ''
}

const available = computed(() => employees.value.filter((e) => !chain.value.some((c) => c.id === e.id)))
const full = computed(() => chain.value.length >= MAX)

function add() {
  const e = employees.value.find((x) => x.id === pick.value)
  if (!e || full.value || chain.value.some((c) => c.id === e.id)) return
  chain.value.push(e)
  pick.value = ''
}
function move(i: number, d: number) {
  const j = i + d
  if (j < 0 || j >= chain.value.length) return
  const c = chain.value
  ;[c[i], c[j]] = [c[j]!, c[i]!]
}

async function save() {
  const t = editing.value
  if (!t || saving.value) return
  if (!chain.value.length && !window.confirm('Chuỗi duyệt đang trống, loại chứng từ này sẽ không thể gửi đề xuất. Tiếp tục lưu?')) return
  saving.value = true
  try {
    const updated = await updateApprovalFlow(t.code, chain.value.map((c) => c.id))
    types.value = types.value.map((x) => (x.code === updated.code ? updated : x))
    editing.value = null
    toast('Đã lưu luồng phê duyệt')
  } catch (e) {
    if (!(e instanceof ApiError)) toast('Không thể kết nối máy chủ', 'error')
    else if (e.status !== 401) toast(e.detail, 'error')
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="space-y-4">
    <PageHeader title="Cấu Hình Cây Phê Duyệt Đa Cấp (Multi-Level Approval Workflow)" subtitle="Thiết lập luồng trình duyệt theo từng loại chứng từ." />

    <div v-if="loading" class="bg-white rounded-2xl p-8 flex justify-center text-brand-600" role="status" aria-label="Đang tải"><i class="fa-solid fa-spinner fa-spin text-2xl"></i></div>
    <div v-else-if="error" class="bg-white rounded-2xl p-6 text-center">
      <p class="text-sm font-semibold text-slate-700 mb-3">Không tải được dữ liệu</p>
      <button type="button" class="py-2 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold" @click="load">Thử lại</button>
    </div>

    <div v-else class="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
      <div v-for="t in types" :key="t.code" class="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
        <div class="flex justify-between items-center">
          <span class="px-2.5 py-0.5 bg-blue-100 text-blue-800 font-bold rounded text-xs">{{ t.name }}</span>
          <button v-if="canEdit" type="button" :aria-label="`Cấu Hình Luồng ${t.name}`" class="px-3 py-1.5 bg-brand-50 text-brand-600 font-bold rounded-lg text-xs hover:bg-brand-100" @click="edit(t)">Cấu Hình Luồng</button>
        </div>
        <p class="text-xs text-slate-700 font-medium">
          <template v-if="t.steps.length">
            <template v-for="(s, i) in t.steps" :key="s.level">
              <span v-if="i" class="mx-1">&rarr;</span>
              <code class="bg-white px-2 py-0.5 rounded border text-slate-800">Cấp {{ s.level }}: {{ s.approver.full_name }}</code>
            </template>
          </template>
          <span v-else class="text-slate-400">Chưa cấu hình</span>
        </p>
      </div>
    </div>

    <FormModal v-if="editing" :title="`Cấu hình luồng: ${editing.name}`" :busy="saving" @close="editing = null" @submit="save">
      <ol class="space-y-2">
        <li v-for="(c, i) in chain" :key="c.id" class="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200 text-sm">
          <span class="font-bold text-slate-500 w-14">Cấp {{ i + 1 }}</span>
          <span class="flex-1 truncate">{{ c.full_name }}</span>
          <button type="button" :aria-label="`Chuyển lên ${c.full_name}`" :disabled="i === 0" class="px-2 disabled:opacity-30" @click="move(i, -1)"><i class="fa-solid fa-arrow-up"></i></button>
          <button type="button" :aria-label="`Chuyển xuống ${c.full_name}`" :disabled="i === chain.length - 1" class="px-2 disabled:opacity-30" @click="move(i, 1)"><i class="fa-solid fa-arrow-down"></i></button>
          <button type="button" :aria-label="`Xóa ${c.full_name}`" class="px-2 text-rose-600" @click="chain.splice(i, 1)"><i class="fa-solid fa-trash"></i></button>
        </li>
        <li v-if="!chain.length" class="text-xs text-slate-400">Chưa có người duyệt</li>
      </ol>
      <div class="flex gap-2 items-center">
        <label for="tree-pick" class="sr-only">Thêm người duyệt</label>
        <select id="tree-pick" v-model="pick" :disabled="full" class="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm">
          <option value="">-- Chọn người duyệt --</option>
          <option v-for="e in available" :key="e.id" :value="e.id">{{ e.full_name }}</option>
        </select>
        <button type="button" :disabled="full || !pick" class="px-3 py-2 rounded-xl bg-brand-600 text-white text-xs font-semibold disabled:opacity-60" @click="add">Thêm</button>
      </div>
      <p v-if="full" class="text-xs text-amber-600">Tối đa {{ MAX }} cấp duyệt</p>
    </FormModal>
  </div>
</template>
