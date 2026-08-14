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

/**
 * 노드 레벨 입력을 0~25 정수로 정규화한다.
 *
 * 계산이 아니라 입력 위생 처리이므로 반올림이 아닌 절사를 쓴다. 노드 레벨은
 * 정수만 유효한데(DB CHECK 0..25, UI 스테퍼), 만약 소수가 흘러들어오면
 * 올림은 플레이어가 찍지 않은 레벨을 인정해 소요시간을 실제보다 짧게
 * 만든다 — 알림이 일찍 울리는 쪽이라 더 나쁘다. 절사가 보수적이다.
 */
export function clampNodeLevel(lv: number): number {
  if (!Number.isFinite(lv)) return 0
  return Math.min(MAX_NODE_LEVEL, Math.max(0, Math.trunc(lv)))
}
