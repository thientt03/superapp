import { describe, expect, it } from 'vitest'
import { greeting } from '../greeting'

describe('greeting', () => {
  it.each([
    [0, 'Chào buổi sáng 👋'],
    [10, 'Chào buổi sáng 👋'],
    [11, 'Chào buổi trưa 👋'],
    [12, 'Chào buổi trưa 👋'],
    [13, 'Chào buổi chiều 👋'],
    [17, 'Chào buổi chiều 👋'],
    [18, 'Chào buổi tối 👋'],
    [23, 'Chào buổi tối 👋'],
  ])('giờ %i', (h, text) => {
    expect(greeting(h)).toBe(text)
  })
})
