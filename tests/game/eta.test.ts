import { describe, it, expect } from 'vitest'
import { resourceEta } from '../../src/game/eta'

describe('resourceEta', () => {
  it('이미 충족했으면 0', () => {
    expect(resourceEta(100, 150, 10)).toBe(0)
    expect(resourceEta(100, 100, 10)).toBe(0)
  })
  it('부족분을 분당 수급으로 나눈다', () => {
    expect(resourceEta(100, 40, 10)).toBe(6)
  })
  it('올림한다 — 모자란 채로 도달했다고 하면 안 된다', () => {
    expect(resourceEta(100, 0, 3)).toBe(34) // 33.33 → 34
  })
  it('수급률이 없으면 null', () => {
    expect(resourceEta(100, 0, null)).toBeNull()
  })
  it('수급률이 0 이하면 null — 영원히 못 모은다', () => {
    expect(resourceEta(100, 0, 0)).toBeNull()
    expect(resourceEta(100, 0, -5)).toBeNull()
  })
})
