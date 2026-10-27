export function greeting(hour: number): string {
  if (hour <= 10) return 'Chào buổi sáng 👋'
  if (hour <= 12) return 'Chào buổi trưa 👋'
  if (hour <= 17) return 'Chào buổi chiều 👋'
  return 'Chào buổi tối 👋'
}
