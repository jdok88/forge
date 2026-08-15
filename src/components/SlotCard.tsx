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

interface ContinuePrompt {
  message: string
  /** 확인 버튼 라벨. 없으면 이어서 시작할 수 없는 상태(예: 최대 레벨)로, 확인 버튼 없이 note만 보여준다. */
  confirmLabel?: string
  onConfirm?: () => void
  onDismiss: () => void
  disabled?: boolean
  note?: string
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
  /** 방금 완료한 슬롯에서 "이어서 시작할까요?" 를 묻는 인라인 프롬프트. 있으면 시작 버튼·copyAction 대신 렌더한다. */
  continuePrompt?: ContinuePrompt
}

export function SlotCard({
  label, timer, onStart, onComplete, onCancel, onElapsed, copyAction, continuePrompt,
}: Props) {
  if (!timer) {
    if (continuePrompt) {
      return (
        <Card style={{ marginBottom: 'var(--sp-2)', border: '1px solid var(--success)' }}>
          <div style={{ color: 'var(--text-dim)' }}>{label}</div>
          <p>{continuePrompt.message}</p>
          {continuePrompt.note && (
            <p style={{ color: 'var(--text-dim)', fontSize: 'var(--fs-sm)' }}>{continuePrompt.note}</p>
          )}
          <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
            {continuePrompt.onConfirm && (
              <Button variant="primary" onClick={continuePrompt.onConfirm} disabled={continuePrompt.disabled}>
                {continuePrompt.confirmLabel}
              </Button>
            )}
            <Button variant="ghost" onClick={continuePrompt.onDismiss} disabled={continuePrompt.disabled}>
              {continuePrompt.onConfirm ? '아니요' : '확인'}
            </Button>
          </div>
        </Card>
      )
    }
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
