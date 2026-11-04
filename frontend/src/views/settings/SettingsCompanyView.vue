<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import PageHeader from '../../components/PageHeader.vue'
import { companyRepo, RepoError } from '../../data'
import { toast } from '../../toast'

// Form cho một bản ghi duy nhất của companyRepo
const FIELDS = [
  { key: 'name', label: 'Tên Đầy Đủ Doanh Nghiệp' },
  { key: 'tax_code', label: 'Mã Số Thuế' },
  { key: 'legal_rep', label: 'Đại Diện Pháp Luật (CEO)' },
  { key: 'phone', label: 'Số Điện Thoại Doanh Nghiệp' },
  { key: 'address', label: 'Địa Chỉ Trụ Sở Chính Đăng Ký' },
] as const
const id = ref('')
const form = reactive({ name: '', tax_code: '', legal_rep: '', phone: '', address: '' })
const saving = ref(false)

onMounted(async () => {
  const [c] = await companyRepo.list()
  if (!c) return
  id.value = c.id
  Object.assign(form, { name: c.name, tax_code: c.tax_code, legal_rep: c.legal_rep, phone: c.phone, address: c.address })
})

async function save() {
  if (saving.value || !id.value) return
  saving.value = true
  try {
    await companyRepo.update(id.value, { ...form })
    toast('Đã lưu thông tin doanh nghiệp')
  } catch (e) {
    if (!(e instanceof RepoError)) throw e
    toast(e.message, 'error')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <form class="space-y-6" novalidate @submit.prevent="save">
    <PageHeader title="Thông Tin Pháp Lý & Cấu Hình Doanh Nghiệp" subtitle="Thông tin sử dụng trên hóa đơn điện tử, hợp đồng kinh tế và báo cáo tài chính.">
      <button type="submit" :disabled="saving" class="bg-brand-600 text-white px-4 py-2 rounded-xl font-semibold text-xs hover:bg-brand-700 disabled:opacity-60 flex items-center shadow-sm">
        <i class="fa-solid fa-floppy-disk mr-1.5"></i>Lưu Thay Đổi
      </button>
    </PageHeader>
    <div class="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
      <div v-for="f in FIELDS" :key="f.key" :class="f.key === 'name' || f.key === 'address' ? 'md:col-span-2' : ''">
        <label :for="`c-${f.key}`" class="block text-xs font-semibold text-slate-600 mb-1">{{ f.label }}</label>
        <input :id="`c-${f.key}`" v-model="form[f.key]" type="text" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
      </div>
    </div>
  </form>
</template>
