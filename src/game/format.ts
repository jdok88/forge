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
