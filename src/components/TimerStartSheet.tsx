import { useEffect, useMemo, useState } from 'react'
import { DurationInput } from './DurationInput'
import { RARITIES, RARITY_LABEL } from '../game/constants'
import { TECH_NODES, BRANCH_LABEL } from '../game/nodes'
import { eggHatchSec, techDuration, forgeDuration, isForgeFreeSkip } from '../game/durations'
import { gemsToSkip } from '../game/formulas'
import { startTimer, type TimerKind } from '../hooks/useTimers'
import { toConfig, type AccountRow } from '../hooks/useAccounts'
import { subscribePush } from '../lib/push'
import { useNotificationStatus } from '../hooks/useNotificationStatus'
import { Button } from './ui/Button'
import { GameIcon } from './ui/GameIcon'
import type { Rarity } from '../game/types'

const TIER_LABEL = ['I', 'II', 'III', 'IV', 'V'] as const

interface Props {
  account: AccountRow
  kind: TimerKind
  slot: number
  onDone: () => void
  onCancel: () => void
}

export function TimerStartSheet({ account, kind, slot, onDone, onCancel }: Props) {
  const cfg = useMemo(() => toConfig(account), [account])
  const { active: notifActive, refresh: refreshNotifStatus } = useNotificationStatus()

  // 2단계 입력 상태
  const [rarity, setRarity] = useState<Rarity>('common')
  const [nodeId, setNodeId] = useState(TECH_NODES[0].id)
  const [tier, setTier] = useState(1)
  const [level, setLevel] = useState(1)

  const targetForgeLevel = account.forge_level + 1

  // 자동 계산값
  const auto = useMemo(() => {
    if (kind === 'egg') return { sec: eggHatchSec(rarity, cfg), cost: null as string | null }
    if (kind === 'tech') {
      const r = techDuration(tier, level, cfg)
      return { sec: r.sec, cost: `물약 ${r.potions.toLocaleString()}` }
    }
    if (targetForgeLevel > 35) return { sec: 0, cost: null }
    const r = forgeDuration(targetForgeLevel, cfg)
    return { sec: r.sec, cost: `골드 ${r.gold.toLocaleString()}` }
  }, [kind, rarity, tier, level, cfg, targetForgeLevel])

  // 3단계: 자동값으로 채우되, 손댄 뒤에는 덮어쓰지 않는다
  const [sec, setSec] = useState(auto.sec)
  const [touched, setTouched] = useState(false)
  useEffect(() => { if (!touched) setSec(auto.sec) }, [auto.sec, touched])

  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const forgeMaxed = kind === 'forge' && targetForgeLevel > 35
  const forgeFree = kind === 'forge' && isForgeFreeSkip(targetForgeLevel)

  const title = kind === 'egg' ? '펫 부화' : kind === 'tech' ? '기술 연구' : '대장간 업그레이드'

  async function enableNotifications() {
    try { await subscribePush() } finally { refreshNotifStatus() }
  }

  async function submit() {
    setBusy(true); setError(null)
    try {
      const meta =
        kind === 'egg' ? { rarity }
        : kind === 'tech' ? { nodeId, tier, level }
        : { targetLevel: targetForgeLevel }
      await startTimer({ accountId: account.id, kind, slot, meta, sec, autoSec: auto.sec })
      // 타이머를 막 시작해 알림을 받고 싶은 의도가 가장 뚜렷한 시점이므로,
      // 알림이 꺼져 있으면 여기서 켜기를 시도한다. 거부돼도 타이머 시작 자체는 막지 않는다.
      if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
        // 결과(성공/실패 사유) 모두 무시 — 이건 부가적인 제안일 뿐, 타이머 시작을 막으면 안 된다.
        try { await subscribePush() } catch { /* 무시 — 타이머 시작은 이미 성공 */ }
      }
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        zIndex: 100, padding: 'var(--sp-3)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: 'var(--sp-4)',
          width: '100%', maxWidth: '520px', maxHeight: '85vh', overflowY: 'auto',
          boxShadow: 'var(--shadow-3)',
        }}
      >
        <h2>{title}</h2>
        {/* 2단계 — 대상 입력 */}
        {kind === 'egg' && (
          <fieldset>
            <legend>알 등급</legend>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
              {RARITIES.map(r => (
                <button
                  key={r} type="button"
                  onClick={() => setRarity(r)}
                  style={{
                    border: `2px solid var(--rarity-${r})`,
                    borderRadius: 'var(--r-sm)',
                    padding: 'var(--sp-2) var(--sp-3)',
                    margin: 'var(--sp-1)',
                    cursor: 'pointer',
                    fontSize: 'var(--fs-md)',
                    background: rarity === r ? `var(--rarity-${r})` : 'transparent',
                    color: rarity === r ? 'var(--bg)' : 'var(--text)',
                    fontWeight: rarity === r ? 700 : 400,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 'var(--sp-1)',
                  }}
                >
                  <GameIcon icon={{ kind: 'egg', rarity: r }} alt={`${RARITY_LABEL[r]} 알`} size="sm" />
                  {RARITY_LABEL[r]}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {kind === 'tech' && (
          <fieldset>
            <legend>기술</legend>
            {(() => {
              const node = TECH_NODES.find(n => n.id === nodeId)
              const branch = node?.branch ?? 'skill'
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-2)' }}>
                  <GameIcon icon={{ kind: 'tree', branch }} alt={`${BRANCH_LABEL[branch]} 기술`} size="sm" />
                  <span style={{ color: 'var(--text-dim)' }}>{BRANCH_LABEL[branch]}</span>
                </div>
              )
            })()}
            <select value={nodeId} onChange={e => setNodeId(e.target.value)}>
              {TECH_NODES.map(n => (
                <option key={n.id} value={n.id}>
                  [{BRANCH_LABEL[n.branch]}] {n.name}
                </option>
              ))}
            </select>

            <label>
              티어
              <select value={tier} onChange={e => setTier(Number(e.target.value))}>
                {[1, 2, 3, 4, 5].map(t => (
                  <option key={t} value={t}>{TIER_LABEL[t - 1]}</option>
                ))}
              </select>
            </label>

            <label>
              몇 번째 업그레이드
              <select value={level} onChange={e => setLevel(Number(e.target.value))}>
                {[1, 2, 3, 4, 5].map(l => <option key={l} value={l}>{l}/5</option>)}
              </select>
            </label>
          </fieldset>
        )}

        {kind === 'forge' && (
          <p>
            대장간 {account.forge_level} → <strong>{targetForgeLevel}</strong>
            {forgeMaxed && ' — 이미 최대 레벨입니다. 승천 후 레벨을 1로 되돌리세요.'}
            {forgeFree && ' — 게임에서 무료 즉시완료가 가능한 구간입니다.'}
          </p>
        )}

        {/* 3단계 — 시간 확인·수정 */}
        {!forgeMaxed && (
          <>
            {auto.cost && <p>필요 자원: {auto.cost}</p>}
            <DurationInput
              value={sec}
              autoSec={auto.sec}
              onChange={v => { setTouched(true); setSec(v) }}
            />
            <p style={{ color: 'var(--text-dim)' }}>즉시완료 시 젬 {gemsToSkip(sec).toLocaleString()}</p>
            {notifActive === false && (
              <p style={{ color: 'var(--danger)' }}>
                알림이 꺼져 있어 완료 시 알림을 받을 수 없습니다.{' '}
                <Button size="sm" onClick={() => void enableNotifications()}>알림 켜기</Button>
              </p>
            )}
            <Button variant="primary" onClick={submit} disabled={busy || sec <= 0}>시작</Button>
          </>
        )}
        <Button variant="ghost" onClick={onCancel}>취소</Button>
        {error && <p role="alert" style={{ color: 'var(--danger)' }}>{error}</p>}
      </div>
    </div>
  )
}
