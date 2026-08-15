import { describe, it, expect } from 'vitest'
import { describeTarget, completionBody, preAlertBody, notificationTitle } from '../../src/game/describeTimer'

describe('describeTarget', () => {
  it('알: 등급 + 슬롯', () => {
    expect(describeTarget({ kind: 'egg', slot: 2, meta: { rarity: 'mythic' } }))
      .toEqual({ subject: '신화알 부화', detail: '슬롯 2' })
  })

  it('기술: 티어 로마숫자 + 서브레벨', () => {
    expect(describeTarget({ kind: 'tech', slot: 1, meta: { tier: 3, level: 3 } }))
      .toEqual({ subject: '기술 연구', detail: 'III 3/5' })
  })

  it('대장간: 목표 레벨만, detail 없음', () => {
    expect(describeTarget({ kind: 'forge', slot: 1, meta: { targetLevel: 12 } }))
      .toEqual({ subject: '대장간 12레벨', detail: null })
  })
})

describe('completionBody', () => {
  it('detail 있으면 · 로 이어붙인다', () => {
    expect(completionBody({ kind: 'egg', slot: 2, meta: { rarity: 'mythic' } }))
      .toBe('신화알 부화 완료 · 슬롯 2')
    expect(completionBody({ kind: 'tech', slot: 1, meta: { tier: 3, level: 3 } }))
      .toBe('기술 연구 완료 · III 3/5')
  })

  it('detail 없으면 완료만 붙인다', () => {
    expect(completionBody({ kind: 'forge', slot: 1, meta: { targetLevel: 12 } }))
      .toBe('대장간 12레벨 완료')
  })
})

describe('preAlertBody', () => {
  it('남은 분을 덧붙인다', () => {
    expect(preAlertBody({ kind: 'forge', slot: 1, meta: { targetLevel: 12 } }, 5))
      .toBe('대장간 12레벨 · 5분 후 완료')
    expect(preAlertBody({ kind: 'egg', slot: 2, meta: { rarity: 'mythic' } }, 3))
      .toBe('신화알 부화 · 슬롯 2 · 3분 후 완료')
  })
})

describe('notificationTitle', () => {
  it('서버명 / 계정명', () => {
    expect(notificationTitle('s54', 'skhy')).toBe('s54 / skhy')
  })
})
