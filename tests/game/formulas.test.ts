import { describe, it, expect } from 'vitest'
import { applySpeed, applyDiscount, gemsToSkip, clampNodeLevel } from '../../src/game/formulas'

describe('applySpeed — 시간은 나눗셈', () => {
  it('+100% 면 절반', () => {
    expect(applySpeed(76800, 100)).toBe(38400)
  })
  it('+50% 면 2/3', () => {
    expect(applySpeed(757200, 50)).toBe(504800)
  })
  it('+2% 는 반올림한다', () => {
    expect(applySpeed(300, 2)).toBe(294) // 294.1176
  })
  it('+250% 면 1/3.5', () => {
    expect(applySpeed(115200, 250)).toBe(32914) // 32914.28
  })
  it('0% 면 그대로', () => {
    expect(applySpeed(9600, 0)).toBe(9600)
  })
})

describe('applyDiscount — 비용은 곱셈', () => {
  it('-50% 면 절반', () => {
    expect(applyDiscount(30, 50)).toBe(15)
  })
  it('-25% 면 3/4', () => {
    expect(applyDiscount(100_000, 25)).toBe(75_000)
  })
  it('-10% 를 반올림한다', () => {
    expect(applyDiscount(42, 10)).toBe(38) // 37.8
    expect(applyDiscount(161, 10)).toBe(145) // 144.9
  })
  it('0.5 는 올림한다', () => {
    expect(applyDiscount(59, 50)).toBe(30) // 29.5
    expect(applyDiscount(1571, 50)).toBe(786) // 785.5
  })
})

describe('gemsToSkip', () => {
  it('테크 V-5/5 전체는 812젬', () => {
    expect(gemsToSkip(352860)).toBe(812)
  })
  it('테크 II-1/5 는 22젬', () => {
    expect(gemsToSkip(9600)).toBe(22)
  })
  it('대장간 L7 은 63젬', () => {
    expect(gemsToSkip(27200)).toBe(63)
  })
  it('대장간 L35 는 1742젬', () => {
    expect(gemsToSkip(757200)).toBe(1742)
  })
  it('0초는 0젬', () => {
    expect(gemsToSkip(0)).toBe(0)
  })
})

describe('clampNodeLevel', () => {
  it('0~25 로 자른다', () => {
    expect(clampNodeLevel(-3)).toBe(0)
    expect(clampNodeLevel(30)).toBe(25)
    expect(clampNodeLevel(12)).toBe(12)
  })
  it('소수는 절사한다 — 올림하면 찍지 않은 레벨을 인정하게 된다', () => {
    expect(clampNodeLevel(12.7)).toBe(12)
    expect(clampNodeLevel(0.9)).toBe(0)
    expect(clampNodeLevel(24.99)).toBe(24)
  })
  it('NaN 과 Infinity 는 0 으로 떨어뜨린다', () => {
    expect(clampNodeLevel(NaN)).toBe(0)
    expect(clampNodeLevel(Infinity)).toBe(0)
    expect(clampNodeLevel(-Infinity)).toBe(0)
  })
})
