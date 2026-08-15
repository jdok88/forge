import { formatDuration } from '../game/format'
import { Button } from './ui/Button'

export function splitDuration(sec: number): { d: number; h: number; m: number } {
  if (sec <= 0) return { d: 0, h: 0, m: 0 }
  return {
    d: Math.floor(sec / 86_400),
    h: Math.floor((sec % 86_400) / 3_600),
    m: Math.floor((sec % 3_600) / 60),
  }
}

export function joinDuration(p: { d: number; h: number; m: number }): number {
  const n = (v: number) => (Number.isFinite(v) && v > 0 ? Math.trunc(v) : 0)
  return n(p.d) * 86_400 + n(p.h) * 3_600 + n(p.m) * 60
}

interface Props {
  /** 현재 값(초) */
  value: number
  /** 자동 계산된 값(초). value 와 다르면 대조 표시한다. */
  autoSec: number
  onChange: (sec: number) => void
}

export function DurationInput({ value, autoSec, onChange }: Props) {
  const parts = splitDuration(value)
  const set = (k: 'd' | 'h' | 'm', v: string) =>
    onChange(joinDuration({ ...parts, [k]: Number(v) }))

  return (
    <div>
      <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
        {(['d', 'h', 'm'] as const).map(k => (
          <label key={k} style={{ flex: 1 }}>
            <input
              type="number" min={0} inputMode="numeric"
              value={parts[k]}
              onChange={e => set(k, e.target.value)}
              style={{ width: '100%' }}
            />
            <span style={{ color: 'var(--text-dim)', fontSize: 'var(--fs-sm)' }}>
              {k === 'd' ? '일' : k === 'h' ? '시간' : '분'}
            </span>
          </label>
        ))}
      </div>

      {value !== autoSec && (
        <p style={{ color: 'var(--text-dim)', fontSize: 'var(--fs-sm)' }}>
          자동 계산: {formatDuration(autoSec)}
          <Button size="sm" onClick={() => onChange(autoSec)}>되돌리기</Button>
        </p>
      )}
    </div>
  )
}
