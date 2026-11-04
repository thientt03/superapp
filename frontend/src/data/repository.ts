import { normalize } from '../format'

export interface Entity { id: string; code: string }
export interface ListQuery { search?: string; filters?: Record<string, string | undefined> }
export interface Repository<T extends Entity> {
  list(q?: ListQuery): Promise<T[]>
  get(id: string): Promise<T>
  create(input: Omit<T, 'id' | 'code'> & { code?: string }): Promise<T>
  update(id: string, patch: Partial<Omit<T, 'id'>>): Promise<T>
  remove(id: string): Promise<void>
}
export class RepoError extends Error {}

export function createMemoryRepo<T extends Entity>(
  seed: T[],
  opts: { codePrefix: string; searchFields: (keyof T)[] },
): Repository<T> {
  let rows: T[] = structuredClone(seed)
  let nextId = Math.max(0, ...rows.map((r) => Number(r.id) || 0)) + 1
  // seq mã tự sinh bắt đầu sau số lớn nhất có trong seed
  let seq = Math.max(0, ...rows.map((r) => Number(/(\d+)$/.exec(r.code)?.[1] ?? 0)))

  const find = (id: string) => {
    const r = rows.find((x) => x.id === id)
    if (!r) throw new RepoError('Không tìm thấy bản ghi')
    return r
  }
  const dupCode = (code: string, exceptId?: string) => {
    if (rows.some((r) => r.code === code && r.id !== exceptId)) throw new RepoError('Mã đã tồn tại')
  }

  return {
    async list(q = {}) {
      const s = normalize((q.search ?? '').trim())
      const filters = Object.entries(q.filters ?? {}).filter(([, v]) => v)
      return structuredClone(
        rows.filter(
          (r) =>
            filters.every(([k, v]) => String(r[k as keyof T]) === v) &&
            (!s || opts.searchFields.some((f) => normalize(String(r[f] ?? '')).includes(s))),
        ),
      )
    },
    async get(id) {
      return structuredClone(find(id))
    },
    async create(input) {
      let code = input.code
      if (code) dupCode(code)
      else {
        // bỏ qua mã đã có (vd mã nhập tay trùng dạng PREFIX-0005)
        do code = `${opts.codePrefix}-${String(++seq).padStart(4, '0')}`
        while (rows.some((r) => r.code === code))
      }
      const row = { ...structuredClone(input), id: String(nextId++), code } as T
      rows = [...rows, row]
      return structuredClone(row)
    },
    async update(id, patch) {
      const cur = find(id)
      if (patch.code !== undefined) dupCode(patch.code, id)
      Object.assign(cur, structuredClone(patch))
      return structuredClone(cur)
    },
    async remove(id) {
      find(id)
      rows = rows.filter((r) => r.id !== id)
    },
  }
}

// Bọc repo: `rules` kiểm tra bản ghi sau khi gộp (throw RepoError thì không lưu) và có thể trả thêm trường tính toán
export function withRules<T extends Entity>(base: Repository<T>, rules: (r: T) => Partial<T> | void | Promise<Partial<T> | void>): Repository<T> {
  return {
    ...base,
    async create(input) {
      const extra = await rules(input as unknown as T)
      return base.create({ ...input, ...extra })
    },
    async update(id, patch) {
      const merged = { ...(await base.get(id)), ...patch } as T
      return base.update(id, { ...patch, ...(await rules(merged)) })
    },
  }
}
