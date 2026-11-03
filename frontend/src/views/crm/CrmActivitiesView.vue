<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import FormModal from '../../components/FormModal.vue'
import { activityRepo, type Activity } from '../../data'

const route = useRoute()
const router = useRouter()

const rows = ref<Activity[]>([])
const mode = ref<'month' | 'week'>('month')
const anchor = ref(new Date())
const load = async () => (rows.value = await activityRepo.list())

const p2 = (n: number) => String(n).padStart(2, '0')
const iso = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
const mondayOf = (d: Date) => addDays(d, -((d.getDay() + 6) % 7))

const cells = computed(() => {
  const a = anchor.value
  let start: Date
  let n: number
  if (mode.value === 'week') {
    start = mondayOf(a)
    n = 7
  } else {
    const first = new Date(a.getFullYear(), a.getMonth(), 1)
    start = mondayOf(first)
    const last = new Date(a.getFullYear(), a.getMonth() + 1, 0)
    n = Math.ceil(((last.getTime() - start.getTime()) / 86400000 + 1) / 7) * 7
  }
  return Array.from({ length: n }, (_, i) => {
    const d = addDays(start, i)
    const events = rows.value.filter((e) => e.date === iso(d)).sort((x, y) => x.time.localeCompare(y.time))
    return { d, key: iso(d), events, other: mode.value === 'month' && d.getMonth() !== a.getMonth() }
  })
})

const label = computed(() => {
  const a = anchor.value
  if (mode.value === 'month') return `Tháng ${a.getMonth() + 1}, ${a.getFullYear()}`
  const s = mondayOf(a)
  const e = addDays(s, 6)
  const jan1 = new Date(s.getFullYear(), 0, 1)
  const wk = Math.ceil(((s.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7)
  return `Tuần ${wk} (${p2(s.getDate())}/${p2(s.getMonth() + 1)} - ${p2(e.getDate())}/${p2(e.getMonth() + 1)}/${e.getFullYear()})`
})

function shift(dir: number) {
  const a = anchor.value
  anchor.value = mode.value === 'month' ? new Date(a.getFullYear(), a.getMonth() + dir, 1) : addDays(a, 7 * dir)
}

// màu theo số việc: 0 trống, 1-2 ít, 3-4 bận, >=5 rất bận
function tone(n: number) {
  if (n >= 5) return { box: 'bg-rose-50 border-rose-300', badge: 'bg-rose-200 text-rose-900' }
  if (n >= 3) return { box: 'bg-amber-50 border-amber-300', badge: 'bg-amber-200 text-amber-900' }
  if (n >= 1) return { box: 'bg-blue-50 border-blue-300', badge: 'bg-blue-200 text-blue-900' }
  return { box: 'bg-slate-50 border-slate-200/80', badge: '' }
}
const LEGEND = [
  ['bg-slate-200', 'Trống (0)'],
  ['bg-blue-300', 'Ít việc (1-2)'],
  ['bg-amber-300', 'Bận (3-4)'],
  ['bg-rose-300', 'Rất bận (>=5)'],
]

const open = ref(false)
const editing = ref<Activity | null>(null)
const form = reactive({ title: '', customer: '', date: '', time: '', location: '' })
const error = ref('')
function openForm(a?: Activity, date = iso(new Date())) {
  editing.value = a ?? null
  Object.assign(form, a ? { title: a.title, customer: a.customer, date: a.date, time: a.time, location: a.location } : { title: '', customer: '', date, time: '', location: '' })
  error.value = ''
  open.value = true
}
async function save() {
  if (!form.title.trim()) return void (error.value = 'Nội dung là bắt buộc')
  if (!form.date) return void (error.value = 'Ngày là bắt buộc')
  const data = { title: form.title.trim(), customer: form.customer.trim(), date: form.date, time: form.time.trim(), location: form.location.trim() }
  if (editing.value) await activityRepo.update(editing.value.id, data)
  else await activityRepo.create(data)
  open.value = false
  await load()
}
async function remove(a: Activity) {
  if (!window.confirm(`Xóa lịch hẹn ${a.code}?`)) return
  await activityRepo.remove(a.id)
  open.value = false
  await load()
}

function checkNew() {
  if (route.query.new !== '1') return
  openForm()
  const { new: _n, ...rest } = route.query
  router.replace({ query: rest })
}
onMounted(async () => {
  await load()
  checkNew()
})
const inp = 'w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'
const DAYS = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật']
</script>

<template>
  <div class="space-y-6">
    <div class="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <div class="p-3 bg-brand-50 text-brand-600 rounded-xl"><i class="fa-regular fa-calendar-days text-xl"></i></div>
        <div>
          <h1 class="text-xl font-bold text-slate-900">Hoạt Động & Lịch Hẹn Chăm Sóc Khách Hàng</h1>
          <p class="text-xs text-slate-500">Quản lý lịch biểu dạng Google Calendar, tự động phân màu sắc theo số lượng công việc.</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <div class="bg-slate-100 p-1 rounded-xl flex" role="group" aria-label="Chế độ lịch">
          <button type="button" :aria-pressed="mode === 'month'" class="px-3 py-1.5 rounded-lg text-xs font-bold" :class="mode === 'month' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-600'" @click="mode = 'month'">Tháng</button>
          <button type="button" :aria-pressed="mode === 'week'" class="px-3 py-1.5 rounded-lg text-xs font-bold" :class="mode === 'week' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-600'" @click="mode = 'week'">Tuần</button>
        </div>
        <button type="button" class="bg-brand-600 text-white px-4 py-2 rounded-xl font-semibold text-xs hover:bg-brand-700 flex items-center shadow-sm" @click="openForm()">
          <i class="fa-solid fa-plus mr-1.5"></i>Thêm Lịch Hẹn
        </button>
      </div>
    </div>

    <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <button type="button" aria-label="Kỳ trước" class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200" @click="shift(-1)"><i class="fa-solid fa-chevron-left text-xs"></i></button>
          <span data-testid="period" class="font-bold text-slate-800">{{ label }}</span>
          <button type="button" aria-label="Kỳ sau" class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200" @click="shift(1)"><i class="fa-solid fa-chevron-right text-xs"></i></button>
        </div>
        <div class="flex flex-wrap gap-3 text-[11px] text-slate-500">
          <span v-for="[c, t] in LEGEND" :key="t" class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded" :class="c"></span>{{ t }}</span>
        </div>
      </div>
      <div class="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-400 uppercase py-2 bg-slate-50 rounded-xl">
        <div v-for="d in DAYS" :key="d">{{ d }}</div>
      </div>
      <div class="grid grid-cols-7 gap-2 text-xs">
        <div
          v-for="c in cells"
          :key="c.key"
          :data-date="c.key"
          class="p-2 rounded-xl border flex flex-col gap-1 cursor-pointer hover:shadow-md transition-all"
          :class="[tone(c.events.length).box, c.other ? 'opacity-40' : '', mode === 'week' ? 'min-h-40' : 'min-h-24']"
          @click="openForm(undefined, c.key)"
        >
          <div class="flex justify-between items-center">
            <span class="font-bold text-slate-700">{{ c.d.getDate() }}</span>
            <span v-if="c.events.length" class="px-1.5 py-0.5 rounded font-bold text-[9px]" :class="tone(c.events.length).badge">{{ c.events.length }} việc</span>
          </div>
          <button
            v-for="e in mode === 'week' ? c.events : c.events.slice(0, 1)"
            :key="e.id"
            type="button"
            class="bg-white p-1.5 rounded border border-slate-200 text-left text-[10px] shadow-sm"
            @click.stop="openForm(e)"
          >
            <span class="block font-bold text-slate-800 truncate">{{ e.title }}</span>
            <span class="block text-slate-500 truncate">{{ e.time }} - {{ e.location || e.customer }}</span>
          </button>
          <p v-if="mode === 'month' && c.events.length > 1" class="text-[9px] text-brand-600 font-bold">+{{ c.events.length - 1 }} đầu việc khác...</p>
        </div>
      </div>
    </div>

    <FormModal v-if="open" :title="editing ? 'Sửa lịch hẹn' : 'Thêm Lịch Hẹn'" @close="open = false" @submit="save">
      <div><label for="a-title" class="block text-xs font-semibold text-slate-600 mb-1">Nội dung *</label><input id="a-title" v-model="form.title" type="text" :class="inp" /></div>
      <div><label for="a-customer" class="block text-xs font-semibold text-slate-600 mb-1">Khách hàng</label><input id="a-customer" v-model="form.customer" type="text" :class="inp" /></div>
      <div class="grid grid-cols-2 gap-3">
        <div><label for="a-date" class="block text-xs font-semibold text-slate-600 mb-1">Ngày *</label><input id="a-date" v-model="form.date" type="date" :class="inp" /></div>
        <div><label for="a-time" class="block text-xs font-semibold text-slate-600 mb-1">Giờ (HH:MM)</label><input id="a-time" v-model="form.time" type="text" :class="inp" /></div>
      </div>
      <div><label for="a-loc" class="block text-xs font-semibold text-slate-600 mb-1">Địa điểm</label><input id="a-loc" v-model="form.location" type="text" :class="inp" /></div>
      <p v-if="error" role="alert" class="text-xs text-rose-600">{{ error }}</p>
      <button v-if="editing" type="button" class="text-xs font-semibold text-rose-600 hover:underline" @click="remove(editing)">Xóa lịch hẹn này</button>
    </FormModal>
  </div>
</template>
