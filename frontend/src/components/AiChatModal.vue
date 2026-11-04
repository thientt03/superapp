<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'

export interface ChatMessage {
  from: 'user' | 'bot'
  text: string
}

const props = defineProps<{ open: boolean; messages: ChatMessage[] }>()
const emit = defineEmits<{ close: []; send: [text: string] }>()

const draft = ref('')
const input = ref<HTMLInputElement | null>(null)
const list = ref<HTMLElement | null>(null)

function submit() {
  const text = draft.value.trim()
  if (!text) return
  emit('send', text)
  draft.value = ''
}

watch(
  () => [props.open, props.messages.length],
  async () => {
    await nextTick()
    if (list.value) list.value.scrollTop = list.value.scrollHeight
    if (props.open) input.value?.focus()
  },
)
</script>

<template>
  <div
    v-if="open"
    class="absolute inset-0 z-40 bg-black/40 flex items-end"
    @click.self="emit('close')"
    @keydown.esc="emit('close')"
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-title"
      class="w-full h-[70%] bg-white rounded-t-[28px] flex flex-col shadow-2xl"
    >
      <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <h2 id="ai-title" class="text-base font-bold text-slate-800">Trợ lý AI</h2>
        <button
          type="button"
          aria-label="Đóng"
          class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
          @click="emit('close')"
        >
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div ref="list" class="flex-1 overflow-y-auto no-scrollbar px-4 py-3 flex flex-col gap-2">
        <div
          v-for="(m, i) in messages"
          :key="i"
          class="max-w-[80%] px-3 py-2 rounded-2xl text-sm"
          :class="m.from === 'user' ? 'self-end bg-[#be094e] text-white' : 'self-start bg-slate-100 text-slate-800'"
        >
          {{ m.text }}
        </div>
      </div>

      <form class="flex items-center gap-2 px-4 py-3 border-t border-slate-100" @submit.prevent="submit">
        <label for="ai-input" class="sr-only">Nhập câu hỏi</label>
        <input
          id="ai-input"
          ref="input"
          v-model="draft"
          type="text"
          placeholder="Nhập câu hỏi..."
          class="flex-1 px-4 py-2 rounded-full bg-slate-100 text-sm outline-none focus:ring-2 focus:ring-[#be094e]"
        />
        <button
          type="submit"
          aria-label="Gửi"
          class="w-10 h-10 rounded-full bg-[#be094e] hover:bg-[#a00640] text-white flex items-center justify-center transition active:scale-95"
        >
          <i class="fa-solid fa-paper-plane"></i>
        </button>
      </form>
    </div>
  </div>
</template>
