import { describe, it, expect } from 'vitest'
import { splitDuration, joinDuration } from '../../src/components/DurationInput'

describe('splitDuration', () => {
  it('초를 일/시/분으로 나눈다 — 초는 버린다', () => {
    expect(splitDuration(199_140)).toEqual({ d: 2, h: 7, m: 19 })
    expect(splitDuration(500)).toEqual({ d: 0, h: 0, m: 8 })
  })
  it('음수는 0', () => {
    expect(splitDuration(-10)).toEqual({ d: 0, h: 0, m: 0 })
  })
})

describe('joinDuration', () => {
  it('일/시/분을 초로 합친다', () => {
    expect(joinDuration({ d: 2, h: 7, m: 19 })).toBe(199_140)
  })
  it('음수 입력은 0으로 취급한다', () => {
    expect(joinDuration({ d: -1, h: 2, m: -5 })).toBe(7200)
  })
})

describe('왕복', () => {
  it('분 단위로 끊으면 왕복이 보존된다', () => {
    const sec = 199_140
    expect(joinDuration(splitDuration(sec))).toBe(sec)
  })
})
