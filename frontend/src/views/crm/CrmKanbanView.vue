<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import FormModal from '../../components/FormModal.vue'
import PageHeader from '../../components/PageHeader.vue'
import { opportunityRepo, RepoError, STAGES, type Opportunity } from '../../data'
import { vnd } from '../../format'
import { toast } from '../../toast'

const rows = ref<Opportunity[]>([])
const dragId = ref('')
const overStage = ref('')

const load = async () => (rows.value = await opportunityRepo.list())
const byStage = (s: string) => rows.value.filter((r) => r.stage === s)
const total = (s: string) => byStage(s).reduce((sum, r) => sum + r.value, 0)

async function drop(stage: string) {
  const id = dragId.value
  dragId.value = overStage.value = ''
  const cur = rows.value.find((r) => r.id === id)
  if (!cur || cur.stage === stage) return
  try {
    await opportunityRepo.update(id, { stage })
    await load()
  } catch (e) {
    if (e instanceof RepoError) toast(e.message, 'error')
    else throw e
  }
}

const open = ref(false)
const editing = ref<Opportunity | null>(null)
const form = reactive({ title: '', customer: '', value: '', owner: '', stage: '1' })
const error = ref('')
const title = computed(() => (editing.value ? 'Sửa cơ hội' : 'Thêm Cơ Hội'))

function openForm(o?: Opportunity, stage = '1') {
  editing.value = o ?? null
  Object.assign(form, o ? { title: o.title, customer: o.customer, value: String(o.value), owner: o.owner, stage: o.stage } : { title: '', customer: '', value: '', owner: '', stage })
  error.value = ''
  open.value = true
}

async function save() {
  const v = Number(String(form.value).trim() || 0)
  if (!form.title.trim()) return void (error.value = 'Tên cơ hội là bắt buộc')
  if (Number.isNaN(v) || v < 0) return void (error.value = 'Giá trị phải là số ≥ 0')
  const data = { title: form.title.trim(), customer: form.customer.trim(), value: v, owner: form.owner.trim(), stage: form.stage }
  if (editing.value) await opportunityRepo.update(editing.value.id, data)
  else await opportunityRepo.create({ ...data, age: 'Hôm nay' })
  open.value = false
  await load()
}

async function remove(o: Opportunity) {
  if (!window.confirm(`Xóa cơ hội ${o.code}?`)) return
  await opportunityRepo.remove(o.id)
  open.value = false
  await load()
}

onMounted(load)
const inp = 'w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'
</script>

<template>
  <div class="space-y-6">
    <PageHeader title="Cơ Hội" subtitle="Quản lý quy trình đàm phán và cơ hội kinh doanh.">
      <button type="button" class="bg-brand-600 text-white px-4 py-2 rounded-xl font-semibold text-xs hover:bg-brand-700 flex items-center shadow-sm" @click="openForm()">
        <i class="fa-solid fa-plus mr-1.5"></i>Thêm Cơ Hội
      </button>
    </PageHeader>

    <div class="flex gap-4 overflow-x-auto pb-2">
      <section
        v-for="s in STAGES"
        :key="s.value"
        :data-stage="s.value"
        :aria-label="s.label"
        class="w-72 shrink-0 bg-slate-100 rounded-2xl p-3 border-2 transition-colors"
        :class="overStage === s.value ? 'border-brand-500 bg-brand-50' : 'border-transparent'"
        @dragover.prevent="overStage = s.value"
        @dragleave="overStage = ''"
        @drop.prevent="drop(s.value)"
      >
        <div class="flex items-center justify-between mb-1">
          <div class="flex items-center space-x-2">
            <span class="w-2.5 h-2.5 rounded-full" :class="s.dot"></span>
            <span class="font-bold text-sm text-slate-800">{{ s.label }}</span>
          </div>
          <div class="flex items-center space-x-1">
            <span class="px-2 py-0.5 bg-white rounded-full text-xs font-bold text-slate-600" data-testid="stage-count">{{ byStage(s.value).length }}</span>
            <button type="button" :aria-label="`Thêm cơ hội vào ${s.label}`" class="w-6 h-6 rounded-full hover:bg-white text-slate-500" @click="openForm(undefined, s.value)"><i class="fa-solid fa-plus text-xs"></i></button>
          </div>
        </div>
        <p class="text-xs font-semibold text-slate-500 mb-3" data-testid="stage-total">{{ vnd(total(s.value)) }}</p>
        <div class="space-y-3 min-h-16">
          <article
            v-for="o in byStage(s.value)"
            :key="o.id"
            draggable="true"
            tabindex="0"
            class="bg-white p-3 rounded-xl border border-slate-200 shadow-sm cursor-grab hover:shadow-md"
            @dragstart="dragId = o.id"
            @dragend="dragId = overStage = ''"
            @click="openForm(o)"
            @keydown.enter="openForm(o)"
          >
            <span class="text-[10px] font-semibold text-brand-600">{{ o.customer }}</span>
            <h4 class="font-bold text-sm text-slate-800">{{ o.title }}</h4>
            <p class="text-xs font-bold text-emerald-600 mt-1"><i class="fa-solid fa-coins mr-1"></i>{{ vnd(o.value) }}</p>
            <div class="flex justify-between text-[10px] text-slate-400 mt-2"><span>{{ o.owner }}</span><span>{{ o.age }}</span></div>
          </article>
        </div>
      </section>
    </div>

    <FormModal v-if="open" :title="title" @close="open = false" @submit="save">
      <div>
        <label for="o-title" class="block text-xs font-semibold text-slate-600 mb-1">Tên cơ hội *</label>
        <input id="o-title" v-model="form.title" type="text" :class="inp" />
      </div>
      <div>
        <label for="o-customer" class="block text-xs font-semibold text-slate-600 mb-1">Khách hàng</label>
        <input id="o-customer" v-model="form.customer" type="text" :class="inp" />
      </div>
      <div>
        <label for="o-value" class="block text-xs font-semibold text-slate-600 mb-1">Giá trị (₫)</label>
        <input id="o-value" v-model="form.value" type="number" min="0" :class="inp" />
      </div>
      <div>
        <label for="o-owner" class="block text-xs font-semibold text-slate-600 mb-1">Phụ trách</label>
        <input id="o-owner" v-model="form.owner" type="text" :class="inp" />
      </div>
      <div>
        <label for="o-stage" class="block text-xs font-semibold text-slate-600 mb-1">Giai đoạn</label>
        <select id="o-stage" v-model="form.stage" :class="inp">
          <option v-for="s in STAGES" :key="s.value" :value="s.value">{{ s.label }}</option>
        </select>
      </div>
      <p v-if="error" role="alert" class="text-xs text-rose-600">{{ error }}</p>
      <button v-if="editing" type="button" class="text-xs font-semibold text-rose-600 hover:underline" @click="remove(editing)">Xóa cơ hội này</button>
    </FormModal>
  </div>
</template>
