import { describe, it, expect } from 'vitest'
import { formatDuration, formatCountdown, questDateKst, nextQuestResetAt } from '../../src/game/format'

describe('formatDuration', () => {
  it('일/시/분을 조합한다', () => {
    expect(formatDuration(199_140)).toBe('2일 7시간 19분')
  })
  it('0인 단위는 생략한다', () => {
    expect(formatDuration(7200)).toBe('2시간')
    expect(formatDuration(86_400)).toBe('1일')
    expect(formatDuration(90_000)).toBe('1일 1시간')
  })
  it('1분 미만은 곧', () => {
    expect(formatDuration(30)).toBe('곧')
    expect(formatDuration(0)).toBe('곧')
  })
  it('음수도 곧으로 처리한다', () => {
    expect(formatDuration(-100)).toBe('곧')
  })
})

describe('formatCountdown', () => {
  it('하루 미만은 HH:MM:SS', () => {
    expect(formatCountdown(26_285)).toBe('07:18:05')
  })
  it('하루 이상은 일 접두', () => {
    expect(formatCountdown(112_685)).toBe('1일 07:18:05')
  })
  it('음수는 00:00:00', () => {
    expect(formatCountdown(-5)).toBe('00:00:00')
  })
})

describe('questDateKst — KST 09:00 리셋', () => {
  it('KST 09:00 이후는 그날 날짜', () => {
    // 2026-08-14 09:00 KST = 2026-08-14 00:00 UTC
    expect(questDateKst(new Date('2026-08-14T00:00:00Z'))).toBe('2026-08-14')
  })
  it('KST 09:00 직전은 전날 날짜', () => {
    // 2026-08-14 08:59 KST = 2026-08-13 23:59 UTC
    expect(questDateKst(new Date('2026-08-13T23:59:00Z'))).toBe('2026-08-13')
  })
  it('KST 자정은 아직 전날 퀘스트', () => {
    // 2026-08-14 00:00 KST = 2026-08-13 15:00 UTC
    expect(questDateKst(new Date('2026-08-13T15:00:00Z'))).toBe('2026-08-13')
  })
})

describe('nextQuestResetAt', () => {
  it('리셋 직후면 다음날 09:00 KST', () => {
    const r = nextQuestResetAt(new Date('2026-08-14T00:00:00Z'))
    expect(r.toISOString()).toBe('2026-08-15T00:00:00.000Z')
  })
  it('리셋 전이면 오늘 09:00 KST', () => {
    const r = nextQuestResetAt(new Date('2026-08-13T23:00:00Z'))
    expect(r.toISOString()).toBe('2026-08-14T00:00:00.000Z')
  })
})
