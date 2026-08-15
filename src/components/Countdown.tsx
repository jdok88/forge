import { useEffect, useState } from 'react'
import { formatCountdown } from '../game/format'

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
    <span style={{ fontVariantNumeric: 'tabular-nums', color: sec <= 0 ? 'var(--success)' : 'var(--text)' }}>
      {sec <= 0 ? '완료 대기' : formatCountdown(sec)}
    </span>
  )
}
