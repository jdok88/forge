const DAY = 86_400
const HOUR = 3_600
const MIN = 60

export function formatDuration(sec: number): string {
  if (sec < MIN) return '곧'
  const d = Math.floor(sec / DAY)
  const h = Math.floor((sec % DAY) / HOUR)
  const m = Math.floor((sec % HOUR) / MIN)
  const parts: string[] = []
  if (d > 0) parts.push(`${d}일`)
  if (h > 0) parts.push(`${h}시간`)
  if (m > 0) parts.push(`${m}분`)
  return parts.join(' ')
}

/** value(>0)를 유효숫자 3자리로 반올림한 숫자를 돌려준다 — Number() 변환이 불필요한 trailing 0/소수점을 자동으로 없애 준다 */
function roundSig3(value: number): number {
  if (value === 0) return 0
  const digits = Math.floor(Math.log10(value)) + 1
  const decimals = Math.max(0, 3 - digits)
  return Number(value.toFixed(decimals))
}

/** 골드·물약 같은 자원 수량을 게임 내 표기(83.3k, 3m 등)와 맞춰 유효숫자 약 3자리로 축약한다 */
export function formatAmount(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '0'
  if (n < 1000) return String(Math.floor(n))
  if (n < 1_000_000) {
    const k = roundSig3(n / 1000)
    if (k >= 1000) return `${roundSig3(k / 1000)}m`
    return `${k}k`
  }
  return `${roundSig3(n / 1_000_000)}m`
}

const pad = (n: number) => String(n).padStart(2, '0')

export function formatCountdown(sec: number): string {
  if (sec < 0) sec = 0
  const d = Math.floor(sec / DAY)
  const h = Math.floor((sec % DAY) / HOUR)
  const m = Math.floor((sec % HOUR) / MIN)
  const s = Math.floor(sec % MIN)
  const hms = `${pad(h)}:${pad(m)}:${pad(s)}`
  return d > 0 ? `${d}일 ${hms}` : hms
}

/**
 * 일일퀘스트는 KST 09:00 에 리셋된다.
 * KST(UTC+9) 09:00 == UTC 00:00 이므로, UTC 날짜가 곧 퀘스트 날짜다.
 */
export function questDateKst(at: Date): string {
  return at.toISOString().slice(0, 10)
}

export function nextQuestResetAt(at: Date): Date {
  const next = new Date(at)
  next.setUTCHours(0, 0, 0, 0)
  if (next <= at) next.setUTCDate(next.getUTCDate() + 1)
  return next
}
