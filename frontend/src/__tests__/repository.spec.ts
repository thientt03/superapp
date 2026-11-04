import { describe, expect, it } from 'vitest'
import { createMemoryRepo, RepoError, type Entity } from '../data/repository'

interface P extends Entity { name: string; city: string }
const seed = (): P[] => [
  { id: '1', code: 'KH-0003', name: 'Nguyễn Văn An', city: 'HN' },
  { id: '2', code: 'KH-0001', name: 'Đặng Thu', city: 'HCM' },
]
const repo = () => createMemoryRepo<P>(seed(), { codePrefix: 'KH', searchFields: ['name'] })

describe('createMemoryRepo', () => {
  it('mã tự sinh bỏ qua mã đã tồn tại', async () => {
    const r = repo()
    await r.create({ code: 'KH-0004', name: 'X', city: 'HN' })
    expect((await r.create({ name: 'Y', city: 'HN' })).code).toBe('KH-0005')
    await r.create({ code: 'KH-0006', name: 'Z', city: 'HN' })
    expect((await r.create({ name: 'W', city: 'HN' })).code).toBe('KH-0007')
  })
  it('hồi quy: tạo tay mã prefix-(max+1) rồi tự sinh thì mã khác và không có hai bản ghi cùng code', async () => {
    const r = repo()
    await r.create({ code: 'KH-0004', name: 'tay', city: '' }) // max seed = 3, nhập tay max+1
    const auto = await r.create({ name: 'auto', city: '' })
    expect(auto.code).not.toBe('KH-0004')
    const codes = (await r.list()).map((x) => x.code)
    expect(new Set(codes).size).toBe(codes.length)
  })
  it('biên: nhập tay liên tiếp nhiều mã, hoặc sửa code sang mã phía trước, tự sinh vẫn không trùng', async () => {
    const r = repo()
    for (const c of ['KH-0004', 'KH-0005', 'KH-0006']) await r.create({ code: c, name: c, city: '' })
    await r.update('1', { code: 'KH-0007' })
    const a = await r.create({ name: 'a', city: '' })
    const b = await r.create({ name: 'b', city: '' })
    expect([a.code, b.code]).toEqual(['KH-0008', 'KH-0009'])
    const codes = (await r.list()).map((x) => x.code)
    expect(new Set(codes).size).toBe(codes.length)
  })
  it('tạo, sửa, xoá', async () => {
    const r = repo()
    const c = await r.create({ name: 'Lê Mai', city: 'HN' })
    expect((await r.list()).length).toBe(3)
    expect((await r.update(c.id, { city: 'DN' })).city).toBe('DN')
    await r.remove(c.id)
    expect((await r.list()).length).toBe(2)
  })

  it('sinh code sau số lớn nhất trong seed, rồi tăng dần', async () => {
    const r = repo()
    expect((await r.create({ name: 'a', city: '' })).code).toBe('KH-0004')
    expect((await r.create({ name: 'b', city: '', code: '' })).code).toBe('KH-0005')
  })

  it('trùng code thì ném RepoError', async () => {
    const r = repo()
    await expect(r.create({ name: 'a', city: '', code: 'KH-0001' })).rejects.toThrow('Mã đã tồn tại')
    await expect(r.update('1', { code: 'KH-0001' })).rejects.toBeInstanceOf(RepoError)
    await expect(r.update('1', { code: 'KH-0003' })).resolves.toBeTruthy()
  })

  it('id không tồn tại thì ném RepoError', async () => {
    const r = repo()
    for (const p of [r.get('x'), r.update('x', {}), r.remove('x')]) await expect(p).rejects.toThrow('Không tìm thấy bản ghi')
  })

  it('tìm kiếm bỏ dấu', async () => {
    const r = repo()
    expect((await r.list({ search: 'nguyen' })).map((x) => x.id)).toEqual(['1'])
    expect((await r.list({ search: 'DANG' })).map((x) => x.id)).toEqual(['2'])
  })

  it('filter so bằng tuyệt đối, bỏ qua giá trị rỗng', async () => {
    const r = repo()
    expect((await r.list({ filters: { city: 'HCM' } })).length).toBe(1)
    expect((await r.list({ filters: { city: 'HC' } })).length).toBe(0)
    expect((await r.list({ filters: { city: '' } })).length).toBe(2)
    expect((await r.list({ filters: { city: undefined } })).length).toBe(2)
  })

  it('sửa object trả về không đổi dữ liệu trong kho', async () => {
    const r = repo()
    const a = await r.get('1')
    a.name = 'X'
    ;(await r.list())[0]!.name = 'Y'
    expect((await r.get('1')).name).toBe('Nguyễn Văn An')
  })
})
