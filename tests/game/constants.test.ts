import { describe, it, expect } from 'vitest'
import { TECH_TABLE, FORGE_TABLE, EGG_BASE_SEC } from '../../src/game/constants'

describe('TECH_TABLE', () => {
  it('25행이다', () => {
    expect(TECH_TABLE).toHaveLength(25)
  })

  it('티어 I 1/5 은 30물약 300초', () => {
    expect(TECH_TABLE[0]).toEqual({ tier: 1, level: 1, potions: 30, sec: 300 })
  })

  it('티어 V 5/5 은 6931물약 352860초', () => {
    expect(TECH_TABLE[24]).toEqual({ tier: 5, level: 5, potions: 6931, sec: 352860 })
  })

  it('물약 합계는 46922', () => {
    const sum = TECH_TABLE.reduce((a, r) => a + r.potions, 0)
    expect(sum).toBe(46922)
  })

  it('시간 합계는 3189780초', () => {
    const sum = TECH_TABLE.reduce((a, r) => a + r.sec, 0)
    expect(sum).toBe(3189780)
  })
})

describe('FORGE_TABLE', () => {
  it('레벨 2~35 를 가진다', () => {
    expect(Object.keys(FORGE_TABLE).map(Number).sort((a, b) => a - b))
      .toEqual(Array.from({ length: 34 }, (_, i) => i + 2))
  })

  it('레벨 35 는 757200초 300만골드', () => {
    expect(FORGE_TABLE[35]).toEqual({ sec: 757200, gold: 3_000_000 })
  })

  it('레벨 9 는 67200초 10만골드', () => {
    expect(FORGE_TABLE[9]).toEqual({ sec: 67200, gold: 100_000 })
  })

  it('골드 합계는 41891100', () => {
    const sum = Object.values(FORGE_TABLE).reduce((a, r) => a + r.gold, 0)
    expect(sum).toBe(41_891_100)
  })
})

describe('EGG_BASE_SEC', () => {
  it('등급별 기본 부화시간이 2배씩 증가한다', () => {
    expect(EGG_BASE_SEC).toEqual({
      common: 1800, rare: 7200, epic: 14400,
      legendary: 28800, ultimate: 57600, mythic: 115200,
    })
  })
})
