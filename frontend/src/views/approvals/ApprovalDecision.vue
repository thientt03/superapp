<script setup lang="ts">
import { ref } from 'vue'
import { ApiError, approveApproval, rejectApproval, type ApprovalRequest } from '../../api'
import FormModal from '../../components/FormModal.vue'
import { refreshSession } from '../../session'
import { toast } from '../../toast'

const props = defineProps<{ req: ApprovalRequest }>()
const emit = defineEmits<{ done: [] }>()

const mode = ref<'' | 'approve' | 'reject'>('')
const comment = ref('')
const error = ref('')
const busy = ref(false)

function start(m: 'approve' | 'reject') {
  mode.value = m
  comment.value = ''
  error.value = ''
}

async function submit() {
  if (busy.value) return
  const c = comment.value.trim()
  if (c.length > 1000) return void (error.value = 'Nội dung tối đa 1000 ký tự')
  if (mode.value === 'reject' && !c) return void (error.value = 'Vui lòng nhập lý do từ chối')
  busy.value = true
  try {
    if (mode.value === 'approve') await approveApproval(props.req.id, c || undefined)
    else await rejectApproval(props.req.id, c)
    toast(mode.value === 'approve' ? 'Đã phê duyệt phiếu' : 'Đã từ chối phiếu')
  } catch (e) {
    if (!(e instanceof ApiError)) return void toast('Không thể kết nối máy chủ', 'error')
    if (e.status === 401) return
    toast(e.detail, 'error')
    if (e.status === 422) return void (error.value = e.detail)
  } finally {
    busy.value = false
  }
  mode.value = ''
  await refreshSession()
  emit('done')
}
</script>

<template>
  <template v-if="req.can_approve">
    <button type="button" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors" @click.stop="start('approve')">Duyệt</button>
    <button type="button" class="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition-colors" @click.stop="start('reject')">Từ chối</button>
  </template>
  <FormModal v-if="mode" :title="mode === 'approve' ? 'Phê duyệt phiếu' : 'Từ chối phiếu'" :busy="busy" :submit-label="mode === 'approve' ? 'Xác nhận duyệt' : 'Xác nhận từ chối'" @click.stop @close="mode = ''" @submit="submit">
    <div>
      <label for="decision-comment" class="block text-xs font-semibold text-slate-600 mb-1">
        {{ mode === 'approve' ? 'Ý kiến (tùy chọn)' : 'Lý do từ chối' }}<span v-if="mode === 'reject'" class="text-rose-500"> *</span>
      </label>
      <textarea id="decision-comment" v-model="comment" rows="3" maxlength="1000" class="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"></textarea>
      <p v-if="error" role="alert" class="text-xs text-rose-600 mt-1">{{ error }}</p>
    </div>
  </FormModal>
</template>
