import { Countdown } from './Countdown'
import { gemsToSkip } from '../game/formulas'
import { RARITY_LABEL } from '../game/constants'
import { TECH_NODES } from '../game/nodes'
import type { TimerRow } from '../hooks/useTimers'
import type { Rarity } from '../game/types'

const TIER_LABEL = ['I', 'II', 'III', 'IV', 'V'] as const

function describe(t: TimerRow): string {
  if (t.kind === 'egg') return `${RARITY_LABEL[t.meta.rarity as Rarity]} 알`
  if (t.kind === 'tech') {
    const node = TECH_NODES.find(n => n.id === t.meta.nodeId)
    return `${node?.name ?? '기술'} ${TIER_LABEL[(t.meta.tier as number) - 1]} ${t.meta.level}/5`
  }
  return `대장간 → ${t.meta.targetLevel}`
}

interface Props {
  label: string
  timer?: TimerRow
  onStart: () => void
  onComplete: (id: string) => void
  onCancel: (id: string) => void
  onElapsed: () => void
}

export function SlotCard({ label, timer, onStart, onComplete, onCancel, onElapsed }: Props) {
  if (!timer) {
    return (
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-md)', padding: 'var(--sp-3)' }}>
        <div style={{ color: 'var(--text-dim)' }}>{label}</div>
        <div style={{ color: 'var(--text-dim)' }}>비어 있음</div>
        <button type="button" onClick={onStart}>시작</button>
      </div>
    )
  }

  const remain = Math.floor((new Date(timer.ends_at).getTime() - Date.now()) / 1000)

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-md)', padding: 'var(--sp-3)' }}>
      <div style={{ color: 'var(--text-dim)' }}>{label}</div>
      <div>{describe(timer)}</div>
      <Countdown endsAt={timer.ends_at} onElapsed={onElapsed} />
      {remain > 0 && (
        <div style={{ color: 'var(--text-dim)', fontSize: 'var(--fs-sm)' }}>
          즉시완료 젬 {gemsToSkip(remain).toLocaleString()}
        </div>
      )}
      <button type="button" onClick={() => onComplete(timer.id)}>완료</button>
      <button type="button" onClick={() => onCancel(timer.id)}>취소</button>
    </div>
  )
}
