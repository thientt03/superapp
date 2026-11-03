<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  ApiError, createTask, deleteTask, fetchEmployees, listTasks, updateTask,
  type Employee, type Task, type TaskPriority, type TaskStatus, type TaskUpdate,
} from '../api'
import FormModal from '../components/FormModal.vue'
import PageHeader from '../components/PageHeader.vue'
import { date } from '../format'
import { toast } from '../toast'

const STATUS: Record<TaskStatus, { label: string; cls: string }> = {
  todo: { label: 'Cần làm', cls: 'bg-slate-200 text-slate-700' },
  in_progress: { label: 'Đang làm', cls: 'bg-blue-100 text-blue-800' },
  done: { label: 'Hoàn thành', cls: 'bg-emerald-100 text-emerald-800' },
}
const PRIORITY: Record<TaskPriority, { label: string; cls: string }> = {
  low: { label: 'Thấp', cls: 'bg-slate-100 text-slate-600' },
  medium: { label: 'Trung bình', cls: 'bg-amber-100 text-amber-800' },
  high: { label: 'Cao', cls: 'bg-rose-100 text-rose-800' },
}
const CHIPS: { v: TaskStatus | ''; label: string }[] = [{ v: '', label: 'Tất cả' }, ...(Object.keys(STATUS) as TaskStatus[]).map((v) => ({ v, label: STATUS[v].label }))]

const scope = ref<'assigned_to_me' | 'assigned_by_me'>('assigned_to_me')
const status = ref<TaskStatus | ''>('')
const items = ref<Task[]>([])
const nextCursor = ref<string | null>(null)
const loading = ref(true)
const error = ref(false)

let gen = 0
async function load(more = false) {
  const my = ++gen
  loading.value = true
  error.value = false
  try {
    const page = await listTasks({
      scope: scope.value,
      status: status.value || undefined,
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
  load()
})

// 403/404/422 -> toast detail; 404 thì tải lại danh sách
async function fail(e: unknown) {
  if (!(e instanceof ApiError)) return toast('Không thể kết nối máy chủ', 'error')
  if (e.status === 401) return
  toast(e.detail, 'error')
  if (e.status === 404) await load()
}

const employees = ref<Employee[]>([])
const open = ref(false)
const editing = ref<Task | null>(null)
const form = reactive({ title: '', description: '', assignee_id: '', due_date: '', priority: 'medium' as TaskPriority, status: 'todo' as TaskStatus })
const formError = ref('')
const saving = ref(false)
const readOnly = computed(() => !!editing.value && !editing.value.can_edit) // chỉ được đổi status

async function openForm(t?: Task) {
  editing.value = t ?? null
  formError.value = ''
  Object.assign(form, t
    ? { title: t.title, description: t.description ?? '', assignee_id: t.assignee.id, due_date: t.due_date ?? '', priority: t.priority, status: t.status }
    : { title: '', description: '', assignee_id: '', due_date: '', priority: 'medium', status: 'todo' })
  open.value = true
  if (!employees.value.length) {
    try {
      employees.value = await fetchEmployees()
    } catch {
      formError.value = 'Không tải được danh sách nhân viên'
    }
  }
}

async function save() {
  if (saving.value) return
  const title = form.title.trim()
  const description = form.description.trim()
  const t = editing.value
  if (!readOnly.value) {
    if (!title || title.length > 200) return void (formError.value = 'Tiêu đề bắt buộc, tối đa 200 ký tự')
    if (description.length > 5000) return void (formError.value = 'Mô tả tối đa 5000 ký tự')
    if (!form.assignee_id) return void (formError.value = 'Vui lòng chọn người thực hiện')
  }
  saving.value = true
  try {
    if (!t) {
      await createTask({
        title,
        assignee_id: form.assignee_id,
        priority: form.priority,
        ...(description && { description }),
        ...(form.due_date && { due_date: form.due_date }),
      })
    } else {
      const patch: TaskUpdate = {}
      if (form.status !== t.status) patch.status = form.status
      if (!readOnly.value) {
        if (title !== t.title) patch.title = title
        if (description !== (t.description ?? '')) patch.description = description || null
        if (form.assignee_id !== t.assignee.id) patch.assignee_id = form.assignee_id
        if (form.due_date !== (t.due_date ?? '')) patch.due_date = form.due_date || null
        if (form.priority !== t.priority) patch.priority = form.priority
      }
      if (Object.keys(patch).length) await updateTask(t.id, patch)
    }
    open.value = false
    await load()
  } catch (e) {
    if (e instanceof ApiError && e.status === 422) formError.value = e.detail
    else {
      if (e instanceof ApiError && e.status !== 401) open.value = false
      await fail(e)
    }
  } finally {
    saving.value = false
  }
}

async function remove(t: Task) {
  if (!window.confirm(`Xóa công việc "${t.title}"?`)) return
  try {
    await deleteTask(t.id)
    await load()
  } catch (e) {
    await fail(e)
  }
}

onMounted(load)
const inp = 'w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-slate-50'
</script>

<template>
  <div class="space-y-6">
    <PageHeader title="Công Việc" subtitle="Theo dõi công việc được giao và công việc bạn giao cho người khác.">
      <button type="button" class="bg-brand-600 text-white px-4 py-2 rounded-xl font-semibold text-xs hover:bg-brand-700 flex items-center shadow-sm" @click="openForm()">
        <i class="fa-solid fa-plus mr-1.5"></i>Tạo Công Việc
      </button>
    </PageHeader>

    <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div class="px-4 pt-3 border-b border-slate-100 flex gap-2" role="tablist">
        <button type="button" role="tab" :aria-selected="scope === 'assigned_to_me'" class="px-4 py-2 text-xs font-bold border-b-2" :class="scope === 'assigned_to_me' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500'" @click="scope = 'assigned_to_me'">Việc của tôi</button>
        <button type="button" role="tab" :aria-selected="scope === 'assigned_by_me'" class="px-4 py-2 text-xs font-bold border-b-2" :class="scope === 'assigned_by_me' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500'" @click="scope = 'assigned_by_me'">Tôi giao</button>
      </div>
      <div class="p-4 border-b border-slate-100 flex flex-wrap items-center gap-2">
        <button v-for="c in CHIPS" :key="c.v" type="button" :aria-pressed="status === c.v" class="px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all" :class="status === c.v ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'" @click="status = c.v">{{ c.label }}</button>
      </div>

      <div v-if="error" class="p-6 text-center">
        <p class="text-sm font-semibold text-slate-700 mb-3">Không tải được dữ liệu</p>
        <button type="button" class="py-2 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold" @click="load()">Thử lại</button>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 text-slate-500 font-semibold uppercase border-b border-slate-100">
            <tr>
              <th class="px-6 py-3">Tiêu đề</th>
              <th class="px-6 py-3">{{ scope === 'assigned_to_me' ? 'Người giao' : 'Người thực hiện' }}</th>
              <th class="px-6 py-3">Ưu tiên</th>
              <th class="px-6 py-3">Hạn chót</th>
              <th class="px-6 py-3">Trạng thái</th>
              <th class="px-6 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-medium">
            <tr v-if="loading && !items.length"><td colspan="6" class="px-6 py-8 text-center text-brand-600" role="status" aria-label="Đang tải"><i class="fa-solid fa-spinner fa-spin text-xl"></i></td></tr>
            <tr v-else-if="!items.length"><td colspan="6" class="px-6 py-8 text-center text-slate-400">Không có công việc nào</td></tr>
            <tr v-for="t in items" :key="t.id" class="hover:bg-slate-50">
              <td class="px-6 py-3.5 font-bold text-slate-800">{{ t.title }}</td>
              <td class="px-6 py-3.5">{{ scope === 'assigned_to_me' ? t.assigner.full_name : t.assignee.full_name }}</td>
              <td class="px-6 py-3.5"><span class="px-2.5 py-1 rounded-full font-bold text-[10px]" :class="PRIORITY[t.priority].cls">{{ PRIORITY[t.priority].label }}</span></td>
              <td class="px-6 py-3.5" :class="t.is_overdue ? 'text-rose-600 font-bold' : 'text-slate-500'">{{ t.due_date ? date(t.due_date) : '' }}</td>
              <td class="px-6 py-3.5"><span class="px-2.5 py-1 rounded-full font-bold text-[10px]" :class="STATUS[t.status].cls">{{ STATUS[t.status].label }}</span></td>
              <td class="px-6 py-3.5 text-right space-x-1.5">
                <button type="button" :aria-label="`Sửa ${t.title}`" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg" @click="openForm(t)">Sửa</button>
                <button v-if="t.can_edit" type="button" :aria-label="`Xóa ${t.title}`" class="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-lg" @click="remove(t)">Xóa</button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="nextCursor" class="p-4 text-center">
          <button type="button" :disabled="loading" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-700 disabled:opacity-60" @click="load(true)">Tải thêm</button>
        </div>
      </div>
    </div>

    <FormModal v-if="open" :title="editing ? 'Sửa công việc' : 'Tạo Công Việc'" :busy="saving" @close="open = false" @submit="save">
      <div>
        <label for="t-title" class="block text-xs font-semibold text-slate-600 mb-1">Tiêu đề *</label>
        <input id="t-title" v-model="form.title" type="text" maxlength="200" :disabled="readOnly" :class="inp" />
      </div>
      <div>
        <label for="t-desc" class="block text-xs font-semibold text-slate-600 mb-1">Mô tả</label>
        <textarea id="t-desc" v-model="form.description" rows="3" maxlength="5000" :disabled="readOnly" :class="inp"></textarea>
      </div>
      <div>
        <label for="t-assignee" class="block text-xs font-semibold text-slate-600 mb-1">Người thực hiện *</label>
        <select id="t-assignee" v-model="form.assignee_id" :disabled="readOnly" :class="inp">
          <option value="">-- Chọn --</option>
          <option v-for="e in employees" :key="e.id" :value="e.id">{{ e.full_name }}</option>
        </select>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label for="t-due" class="block text-xs font-semibold text-slate-600 mb-1">Hạn chót</label>
          <input id="t-due" v-model="form.due_date" type="date" :disabled="readOnly" :class="inp" />
        </div>
        <div>
          <label for="t-prio" class="block text-xs font-semibold text-slate-600 mb-1">Ưu tiên</label>
          <select id="t-prio" v-model="form.priority" :disabled="readOnly" :class="inp">
            <option v-for="(p, k) in PRIORITY" :key="k" :value="k">{{ p.label }}</option>
          </select>
        </div>
      </div>
      <div v-if="editing">
        <label for="t-status" class="block text-xs font-semibold text-slate-600 mb-1">Trạng thái</label>
        <select id="t-status" v-model="form.status" :class="inp">
          <option v-for="(s, k) in STATUS" :key="k" :value="k">{{ s.label }}</option>
        </select>
      </div>
      <p v-if="formError" role="alert" class="text-xs text-rose-600">{{ formError }}</p>
    </FormModal>
  </div>
</template>
