import { ref } from 'vue'

const KEY = 'superapp_token'

export const token = ref<string | null>(localStorage.getItem(KEY) ?? sessionStorage.getItem(KEY))
export const authNotice = ref('')

export function setToken(t: string, remember = false): void {
  token.value = t
  if (remember) {
    localStorage.setItem(KEY, t)
    sessionStorage.removeItem(KEY)
  } else {
    sessionStorage.setItem(KEY, t)
    localStorage.removeItem(KEY)
  }
  authNotice.value = ''
}

export function clearToken(notice = ''): void {
  authNotice.value = notice
  token.value = null
  localStorage.removeItem(KEY)
  sessionStorage.removeItem(KEY)
}
