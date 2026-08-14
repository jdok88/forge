import { MAX_NODE_LEVEL } from './constants'

/**
 * 타이머 속도 보정. 게임은 "속도 +N%" 를 나눗셈으로 적용한다.
 * 출처: forgedatarealreal.png 각주 "Time (Second) / (1 + Timer Speed)"
 */
export function applySpeed(baseSec: number, speedPct: number): number {
  return Math.round(baseSec / (1 + speedPct / 100))
}

/**
 * 비용 할인. 시간과 달리 곱셈이다.
 * 출처: 게임 내 30→15(-50%), 400→300(-25%)
 */
export function applyDiscount(baseCost: number, discountPct: number): number {
  return Math.round(baseCost * (1 - discountPct / 100))
}

/**
 * 남은 시간을 젬으로 즉시완료할 때의 비용.
 * 대장간·테크 전 구간 공통 환율 20000초 = 46젬 → 23/10000.
 */
export function gemsToSkip(remainingSec: number): number {
  if (remainingSec <= 0) return 0
  return Math.round((remainingSec * 23) / 10000)
}

export function clampNodeLevel(lv: number): number {
  if (!Number.isFinite(lv)) return 0
  return Math.min(MAX_NODE_LEVEL, Math.max(0, Math.trunc(lv)))
}
