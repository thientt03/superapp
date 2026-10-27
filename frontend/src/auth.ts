import { ref } from 'vue'

const KEY = 'superapp_token'

export const token = ref<string | null>(sessionStorage.getItem(KEY))
export const authNotice = ref('')

export function setToken(t: string): void {
  token.value = t
  sessionStorage.setItem(KEY, t)
  authNotice.value = ''
}

export function clearToken(notice = ''): void {
  token.value = null
  sessionStorage.removeItem(KEY)
  authNotice.value = notice
}
