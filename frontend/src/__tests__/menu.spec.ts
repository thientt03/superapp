import { describe, expect, it } from 'vitest'
import { LEAVES, MENU } from '../menu'

describe('MENU', () => {
  it('có 46 mục con và không mục nào còn trỏ tới PlaceholderView', async () => {
    expect(MENU.flatMap((e) => (e.kind === 'group' ? e.children : [])).length).toBe(46)
    for (const l of LEAVES) {
      expect(String(l.component), l.path).not.toContain('Placeholder')
      await expect(l.component(), l.path).resolves.toBeTruthy() // file màn tồn tại và biên dịch được
    }
  })

  it('đường dẫn không trùng', () => {
    const paths = LEAVES.map((l) => l.path)
    expect(new Set(paths).size).toBe(paths.length)
  })
})
