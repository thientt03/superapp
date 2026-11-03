import { ref } from 'vue'

export interface ToastItem {
  id: number
  msg: string
  kind: 'ok' | 'error'
}

export const toasts = ref<ToastItem[]>([])
let seq = 0

export function toast(msg: string, kind: 'ok' | 'error' = 'ok'): void {
  const id = ++seq
  toasts.value.push({ id, msg, kind })
  setTimeout(() => (toasts.value = toasts.value.filter((t) => t.id !== id)), 3000)
}
