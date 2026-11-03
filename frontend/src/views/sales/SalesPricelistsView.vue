<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import FormModal from '../../components/FormModal.vue'
import PageHeader from '../../components/PageHeader.vue'
import { priceListRepo, type PriceList } from '../../data'

const rows = ref<PriceList[]>([])
const open = ref(false)
const editing = ref<PriceList | null>(null)
const form = reactive({ name: '', policy: '', discount: '', note: '' })
const error = ref('')
const TONES = ['bg-purple-100 text-purple-800', 'bg-amber-100 text-amber-800', 'bg-slate-200 text-slate-700']

const load = async () => (rows.value = await priceListRepo.list())
function openForm(p?: PriceList) {
  editing.value = p ?? null
  Object.assign(form, p ? { name: p.name, policy: p.policy, discount: String(p.discount), note: p.note } : { name: '', policy: '', discount: '0', note: '' })
  error.value = ''
  open.value = true
}
async function save() {
  const d = Number(String(form.discount).trim())
  if (!form.name.trim() || !form.policy.trim()) return void (error.value = 'Tên bảng giá và chính sách là bắt buộc')
  if (Number.isNaN(d) || d < 0 || d > 100) return void (error.value = 'Chiết khấu phải từ 0 đến 100')
  const data = { name: form.name.trim(), policy: form.policy.trim(), discount: d, note: form.note.trim() }
  if (editing.value) await priceListRepo.update(editing.value.id, data)
  else await priceListRepo.create(data)
  open.value = false
  await load()
}
async function remove(p: PriceList) {
  if (!window.confirm(`Xóa ${p.name}?`)) return
  await priceListRepo.remove(p.id)
  await load()
}
onMounted(load)
const inp = 'w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'
</script>

<template>
  <div class="space-y-6">
    <PageHeader title="Chính Sách Bảng Giá & Chiết Khấu Bán Hàng" subtitle="Quản lý lập báo giá, đơn hàng, hợp đồng và chính sách giá bán.">
      <button type="button" class="bg-brand-600 text-white px-4 py-2 rounded-xl font-semibold text-xs hover:bg-brand-700 flex items-center shadow-sm" @click="openForm()">
        <i class="fa-solid fa-plus mr-1.5"></i>Thêm Bảng Giá
      </button>
    </PageHeader>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <article v-for="(p, i) in rows" :key="p.id" class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
        <span class="px-2.5 py-0.5 rounded font-bold text-xs" :class="TONES[i % TONES.length]">{{ p.name }}</span>
        <h4 class="font-bold text-slate-800">{{ p.policy }}</h4>
        <p class="text-xs text-slate-500">{{ p.note }}</p>
        <div class="pt-2 space-x-1.5">
          <button type="button" :aria-label="`Sửa ${p.name}`" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg" @click="openForm(p)">Sửa</button>
          <button type="button" :aria-label="`Xóa ${p.name}`" class="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-lg" @click="remove(p)">Xóa</button>
        </div>
      </article>
      <p v-if="!rows.length" class="text-slate-400 text-sm">Không có dữ liệu</p>
    </div>

    <FormModal v-if="open" :title="editing ? 'Sửa bảng giá' : 'Thêm Bảng Giá'" @close="open = false" @submit="save">
      <div><label for="p-name" class="block text-xs font-semibold text-slate-600 mb-1">Tên bảng giá *</label><input id="p-name" v-model="form.name" type="text" :class="inp" /></div>
      <div><label for="p-policy" class="block text-xs font-semibold text-slate-600 mb-1">Chính sách *</label><input id="p-policy" v-model="form.policy" type="text" :class="inp" /></div>
      <div><label for="p-discount" class="block text-xs font-semibold text-slate-600 mb-1">Chiết khấu (%)</label><input id="p-discount" v-model="form.discount" type="number" min="0" max="100" :class="inp" /></div>
      <div><label for="p-note" class="block text-xs font-semibold text-slate-600 mb-1">Áp dụng cho</label><textarea id="p-note" v-model="form.note" rows="2" :class="inp"></textarea></div>
      <p v-if="error" role="alert" class="text-xs text-rose-600">{{ error }}</p>
    </FormModal>
  </div>
</template>
