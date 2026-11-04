import { ref } from 'vue'
import { fetchDashboard, type Attendance, type User } from './api'

export const me = ref<User | null>(null)
export const pendingCount = ref(0)
export const unread = ref(0)
export const attendance = ref<Attendance | null>(null)

export async function refreshSession(): Promise<void> {
  try {
    const d = await fetchDashboard()
    me.value = d.user
    pendingCount.value = d.pending_approval_count
    unread.value = d.notifications.unread_count
    attendance.value = d.attendance
  } catch {
    // lỗi mạng/API (401 đã xử lý trong request): giữ số liệu cũ
  }
}
