import { useEffect, useState } from 'react'
import { formatCountdown } from '../game/format'

/** 임박할수록 눈에 띄게 — 30분 미만 빨강, 1시간 미만 주황. 홈 대시보드에서 훑을 때 구분이 목적이다. */
function urgencyColor(sec: number): string {
  if (sec <= 0) return 'var(--success)'
  if (sec < 30 * 60) return 'var(--danger)'
  if (sec < 60 * 60) return 'var(--warn)'
  return 'var(--text)'
}

export function Countdown({ endsAt, onElapsed }: { endsAt: string; onElapsed?: () => void }) {
  const remain = () => Math.floor((new Date(endsAt).getTime() - Date.now()) / 1000)
  const [sec, setSec] = useState(remain)

  useEffect(() => {
    setSec(remain())
    const id = setInterval(() => {
      const r = remain()
      setSec(r)
      if (r <= 0) { clearInterval(id); onElapsed?.() }
    }, 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endsAt])

  return (
    <span style={{ fontVariantNumeric: 'tabular-nums', color: urgencyColor(sec) }}>
      {sec <= 0 ? '완료 대기' : formatCountdown(sec)}
    </span>
  )
}
