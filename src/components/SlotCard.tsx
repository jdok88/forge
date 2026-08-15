import { Countdown } from './Countdown'
import { gemsToSkip } from '../game/formulas'
import { RARITY_LABEL } from '../game/constants'
import { TECH_NODES } from '../game/nodes'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import { GameIcon, type GameIconSpec } from './ui/GameIcon'
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

export function timerIcon(t: TimerRow): GameIconSpec {
  if (t.kind === 'egg') return { kind: 'egg', rarity: t.meta.rarity as Rarity }
  if (t.kind === 'tech') {
    const node = TECH_NODES.find(n => n.id === t.meta.nodeId)
    return { kind: 'tree', branch: node?.branch ?? 'skill' }
  }
  return { kind: 'forge' }
}

interface CopyAction {
  label: string
  onClick: () => void
  disabled?: boolean
}

interface Props {
  label: string
  timer?: TimerRow
  onStart: () => void
  onComplete: (id: string) => void
  onCancel: (id: string) => void
  onElapsed: () => void
  /** 빈 슬롯에서 이전 슬롯 값을 복사해 바로 시작하는 보조 버튼 */
  copyAction?: CopyAction
}

export function SlotCard({ label, timer, onStart, onComplete, onCancel, onElapsed, copyAction }: Props) {
  if (!timer) {
    return (
      <Card style={{ marginBottom: 'var(--sp-2)' }}>
        <div style={{ color: 'var(--text-dim)' }}>{label}</div>
        <div style={{ color: 'var(--text-dim)' }}>비어 있음</div>
        <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
          <Button onClick={onStart}>시작</Button>
          {copyAction && (
            <Button variant="ghost" onClick={copyAction.onClick} disabled={copyAction.disabled}>
              {copyAction.label}
            </Button>
          )}
        </div>
      </Card>
    )
  }

  const remain = Math.floor((new Date(timer.ends_at).getTime() - Date.now()) / 1000)

  return (
    <Card style={{ marginBottom: 'var(--sp-2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
        <GameIcon icon={timerIcon(timer)} alt={describe(timer)} size="sm" />
        <div>
          <div style={{ color: 'var(--text-dim)' }}>{label}</div>
          <div>{describe(timer)}</div>
        </div>
      </div>
      <Countdown endsAt={timer.ends_at} onElapsed={onElapsed} />
      {remain > 0 && (
        <div style={{ color: 'var(--text-dim)', fontSize: 'var(--fs-sm)' }}>
          즉시완료 젬 {gemsToSkip(remain).toLocaleString()}
        </div>
      )}
      <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-2)' }}>
        <Button variant="primary" size="sm" onClick={() => onComplete(timer.id)}>완료</Button>
        <Button variant="danger" size="sm" onClick={() => onCancel(timer.id)}>취소</Button>
      </div>
    </Card>
  )
}
