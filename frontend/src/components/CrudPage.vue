<script lang="ts">
import type { Entity, Repository } from '../data/repository'

export interface Column<T> {
  key: keyof T & string
  label: string
  format?: 'vnd' | 'date' | 'badge'
  badge?: Record<string, { label: string; cls: string }>
  unitKey?: keyof T & string // nối thêm đơn vị, vd 12 Tấm
  value?: (row: T) => string | number // giá trị tính từ cả dòng (thay cho row[key])
  text?: (row: T) => string // nội dung hiển thị của badge (mặc định lấy nhãn trong badge)
}
export type Option = { value: string; label: string }
export interface Field<T> {
  key: keyof T & string; label: string
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'checks'
  required?: boolean; min?: number
  options?: Option[] | ((form: Record<string, string>) => Option[]) // dạng hàm: tính lại theo form đang nhập
}
export interface CrudConfig<T extends Entity> {
  title: string
  subtitle?: string
  entityLabel: string
  createLabel: string
  repo: Repository<T>
  columns: Column<T>[]
  fields: Field<T>[]
  filter?: { key: keyof T & string; options: { value: string; label: string }[] }
  filter2?: { key: keyof T & string; options: { value: string; label: string }[] }
  countLabel?: string
  extraFilters?: () => Record<string, string | undefined> // lọc cố định (vd tháng đang xem)
  accent?: 'brand' | 'amber' | 'cyan' | 'indigo'
  // layout thẻ thay cho bảng: tag/title/desc là tên trường của bản ghi
  card?: { tag: keyof T & string; title: keyof T & string; desc: keyof T & string }
  rowClass?: (row: T) => string
}
</script>

<script setup lang="ts" generic="T extends Entity">
import { onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { RepoError } from '../data/repository'
import { date, vnd } from '../format'
import { toast } from '../toast'
import FormModal from './FormModal.vue'
import PageHeader from './PageHeader.vue'

const props = defineProps<{ config: CrudConfig<T> }>()
const emit = defineEmits<{ changed: [] }>()
defineSlots<{ top?(p: { rows: T[]; reload: () => Promise<void> }): unknown; header?(p: { reload: () => Promise<void> }): unknown; actions?(p: { row: T; reload: () => Promise<void> }): unknown }>()
const route = useRoute()
const router = useRouter()

const rows = ref<T[]>([]) as { value: T[] }
const search = ref('')
const filterValue = ref('')
const filterValue2 = ref('')
let debounce: ReturnType<typeof setTimeout> | undefined

async function load() {
  const { filter: f, filter2: g } = props.config
  rows.value = await props.config.repo.list({
    search: search.value,
    filters: { ...props.config.extraFilters?.(), ...(f && { [f.key]: filterValue.value || undefined }), ...(g && { [g.key]: filterValue2.value || undefined }) },
  })
  emit('changed')
}
watch(search, () => {
  clearTimeout(debounce)
  debounce = setTimeout(load, 200)
})
watch([filterValue, filterValue2], load)

const editing = ref<T | null>(null)
const open = ref(false)
const form = reactive<Record<string, string>>({})
const errors = reactive<Record<string, string>>({})
const saving = ref(false)

function openForm(row?: T) {
  editing.value = row ?? null
  for (const k of Object.keys(errors)) delete errors[k]
  for (const f of props.config.fields) form[f.key] = row ? String(row[f.key] ?? '') : ''
  open.value = true
}

const optionsOf = (f: Field<T>): Option[] => (typeof f.options === 'function' ? f.options(form) : (f.options ?? []))
// Ô chọn có options theo form: đổi field khác làm giá trị không còn hợp lệ thì xoá trắng
watch(form, () => {
  for (const f of props.config.fields)
    if (f.type === 'select' && typeof f.options === 'function' && form[f.key] && !optionsOf(f).some((o) => o.value === form[f.key])) form[f.key] = ''
}, { deep: true })
function toggleCheck(f: Field<T>, value: string, on: boolean) {
  const cur = (form[f.key] ?? '').split(',')
  form[f.key] = optionsOf(f).filter((o) => (o.value === value ? on : cur.includes(o.value))).map((o) => o.value).join(',')
}

function validate(): boolean {
  for (const k of Object.keys(errors)) delete errors[k]
  for (const f of props.config.fields) {
    const v = String(form[f.key] ?? '').trim()
    if (f.required && !v) errors[f.key] = `${f.label} là bắt buộc`
    else if (v && f.type === 'number') {
      if (Number.isNaN(Number(v))) errors[f.key] = `${f.label} phải là số`
      else if (f.min !== undefined && Number(v) < f.min) errors[f.key] = `${f.label} phải ≥ ${f.min}`
    }
  }
  return Object.keys(errors).length === 0
}

async function save() {
  if (saving.value || !validate()) return
  const data: Record<string, unknown> = {}
  for (const f of props.config.fields) {
    const v = String(form[f.key] ?? '').trim()
    data[f.key] = f.type === 'number' ? (v === '' ? undefined : Number(v)) : v
  }
  saving.value = true
  try {
    if (editing.value) await props.config.repo.update(editing.value.id, data as Partial<Omit<T, 'id'>>)
    else await props.config.repo.create(data as Omit<T, 'id' | 'code'> & { code?: string })
    open.value = false
    await load()
  } catch (e) {
    if (!(e instanceof RepoError)) throw e
    toast(e.message, 'error')
  } finally {
    saving.value = false
  }
}

async function remove(row: T) {
  if (!window.confirm(`Xóa ${props.config.entityLabel} ${row.code}?`)) return
  try {
    await props.config.repo.remove(row.id)
    await load()
  } catch (e) {
    if (!(e instanceof RepoError)) throw e
    toast(e.message, 'error')
  }
}

const rawOf = (row: T, c: Column<T>) => (c.value ? c.value(row) : row[c.key])
const ACCENT = { brand: 'bg-brand-600 hover:bg-brand-700', amber: 'bg-amber-600 hover:bg-amber-700', cyan: 'bg-cyan-600 hover:bg-cyan-700', indigo: 'bg-indigo-600 hover:bg-indigo-700' }

function cell(row: T, c: Column<T>): string {
  const v = rawOf(row, c)
  if (v === undefined || v === null || v === '') return ''
  if (c.unitKey) return `${v} ${row[c.unitKey]}`
  if (c.format === 'vnd') return vnd(Number(v))
  if (c.format === 'date') return date(String(v))
  if (c.format === 'badge') return c.text ? c.text(row) : (c.badge?.[String(v)]?.label ?? String(v))
  return String(v)
}

function checkNew() {
  if (route.query.new !== '1') return
  openForm()
  const { new: _n, ...rest } = route.query
  router.replace({ query: rest })
}
watch(() => route.query.new, checkNew)
onMounted(async () => {
  await load()
  checkNew()
})
onUnmounted(() => clearTimeout(debounce))
</script>

<template>
  <div class="space-y-6">
    <PageHeader :title="config.title" :subtitle="config.subtitle">
      <slot name="header" :reload="load" />
      <span class="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full font-bold text-xs" data-testid="count">{{ rows.length }}{{ config.countLabel ? ` ${config.countLabel}` : '' }}</span>
      <button type="button" class="text-white px-4 py-2 rounded-xl font-semibold text-xs flex items-center shadow-sm" :class="ACCENT[config.accent ?? 'brand']" @click="openForm()">
        <i class="fa-solid fa-plus mr-1.5"></i>{{ config.createLabel }}
      </button>
    </PageHeader>

    <slot name="top" :rows="rows" :reload="load" />

    <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div class="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        <div v-if="config.filter" class="flex flex-wrap items-center gap-2">
          <button
            v-for="o in [{ value: '', label: 'Tất cả' }, ...config.filter.options]"
            :key="o.value"
            type="button"
            :aria-pressed="filterValue === o.value"
            class="px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all"
            :class="filterValue === o.value ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
            @click="filterValue = o.value"
          >{{ o.label }}</button>
        </div>
        <div v-if="config.filter2" class="flex flex-wrap items-center gap-2">
          <button
            v-for="o in [{ value: '', label: 'Tất cả' }, ...config.filter2.options]"
            :key="o.value"
            type="button"
            :aria-pressed="filterValue2 === o.value"
            class="px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all"
            :class="filterValue2 === o.value ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
            @click="filterValue2 = o.value"
          >{{ o.label }}</button>
        </div>
        <div class="relative w-full sm:w-64">
          <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
          <label for="crud-search" class="sr-only">Tìm kiếm</label>
          <input id="crud-search" v-model="search" type="text" placeholder="Tìm kiếm..." class="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:bg-white focus:outline-none font-medium" />
        </div>
      </div>

      <div v-if="config.card" class="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <p v-if="!rows.length" class="text-slate-400 text-sm">Không có dữ liệu</p>
        <article v-for="r in rows" :key="r.id" class="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
          <span class="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 rounded font-bold text-xs">{{ r[config.card.tag] }}</span>
          <h4 class="font-bold text-slate-800">{{ r[config.card.title] }}</h4>
          <p class="text-xs text-slate-500">{{ r[config.card.desc] }}</p>
          <div class="pt-2 space-x-1.5">
            <button type="button" :aria-label="`Sửa ${r.code}`" class="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg" @click="openForm(r)">Sửa</button>
            <button type="button" :aria-label="`Xóa ${r.code}`" class="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-lg" @click="remove(r)">Xóa</button>
          </div>
        </article>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 text-slate-500 font-semibold uppercase border-b border-slate-100">
            <tr>
              <th class="px-6 py-3">Mã</th>
              <th v-for="(c, i) in config.columns" :key="c.key + i" class="px-6 py-3">{{ c.label }}</th>
              <th class="px-6 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-medium">
            <tr v-if="!rows.length"><td :colspan="config.columns.length + 2" class="px-6 py-8 text-center text-slate-400">Không có dữ liệu</td></tr>
            <tr v-for="r in rows" :key="r.id" class="hover:bg-slate-50" :class="config.rowClass?.(r)">
              <td class="px-6 py-3.5 font-bold text-brand-600">{{ r.code }}</td>
              <td v-for="(c, i) in config.columns" :key="c.key + i" class="px-6 py-3.5">
                <span v-if="c.format === 'badge'" class="px-2.5 py-1 rounded-full font-bold text-[10px]" :class="c.badge?.[String(rawOf(r, c))]?.cls ?? 'bg-slate-100 text-slate-700'">{{ cell(r, c) }}</span>
                <template v-else>{{ cell(r, c) }}</template>
              </td>
              <td class="px-6 py-3.5 text-right space-x-1.5">
                <slot name="actions" :row="r" :reload="load" />
                <button type="button" :aria-label="`Sửa ${r.code}`" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg" @click="openForm(r)">Sửa</button>
                <button type="button" :aria-label="`Xóa ${r.code}`" class="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-lg" @click="remove(r)">Xóa</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <FormModal v-if="open" :title="editing ? `Sửa ${config.entityLabel}` : config.createLabel" :busy="saving" @close="open = false" @submit="save">
      <div v-for="f in config.fields" :key="f.key">
        <fieldset v-if="f.type === 'checks'">
          <legend class="block text-xs font-semibold text-slate-600 mb-1">{{ f.label }}<span v-if="f.required" class="text-rose-500"> *</span></legend>
          <label v-for="o in optionsOf(f)" :key="o.value" class="flex items-center gap-2 text-sm text-slate-700 py-0.5">
            <input type="checkbox" :name="`f-${f.key}`" :value="o.value" :checked="(form[f.key] ?? '').split(',').includes(o.value)" class="rounded border-slate-300" @change="toggleCheck(f, o.value, ($event.target as HTMLInputElement).checked)" />{{ o.label }}
          </label>
        </fieldset>
        <template v-else>
        <label :for="`f-${f.key}`" class="block text-xs font-semibold text-slate-600 mb-1">{{ f.label }}<span v-if="f.required" class="text-rose-500"> *</span></label>
        <select v-if="f.type === 'select'" :id="`f-${f.key}`" v-model="form[f.key]" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">-- Chọn --</option>
          <option v-for="o in optionsOf(f)" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
        <textarea v-else-if="f.type === 'textarea'" :id="`f-${f.key}`" v-model="form[f.key]" rows="3" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"></textarea>
        <input v-else :id="`f-${f.key}`" v-model="form[f.key]" :type="f.type" :min="f.min" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </template>
        <p v-if="errors[f.key]" role="alert" class="text-xs text-rose-600 mt-1">{{ errors[f.key] }}</p>
      </div>
    </FormModal>
  </div>
</template>
