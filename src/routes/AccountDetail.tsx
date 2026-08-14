import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAccounts, updateAccount } from '../hooks/useAccounts'
import { useTimers, completeTimer, cancelTimer, type TimerKind } from '../hooks/useTimers'
import { SlotCard } from '../components/SlotCard'
import { TimerStartSheet } from '../components/TimerStartSheet'
import { DailyQuests } from '../components/DailyQuests'

const EGG_SLOTS = [1, 2, 3, 4]

export function AccountDetail() {
  const { id } = useParams<{ id: string }>()
  const { accounts, reload: reloadAccounts } = useAccounts()
  const { timers, error, reload } = useTimers(id)
  const [sheet, setSheet] = useState<{ kind: TimerKind; slot: number } | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const account = accounts.find(a => a.id === id)
  if (!account) return <p>계정을 찾을 수 없습니다.</p>

  const find = (kind: TimerKind, slot: number) =>
    timers.find(t => t.kind === kind && t.slot === slot)

  async function onComplete(timerId: string) {
    const t = timers.find(x => x.id === timerId)
    setActionError(null)
    try {
      // 레벨을 먼저 올린다. forge_level 에 절대값을 쓰므로 재시도해도 중복 증가가 없다.
      if (t?.kind === 'forge' && account) {
        await updateAccount(account.id, { forge_level: t.meta.targetLevel as number })
        await reloadAccounts()
      }
      await completeTimer(timerId)
      await reload()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : '완료 처리에 실패했습니다.')
    }
  }

  async function onCancel(timerId: string) {
    setActionError(null)
    try {
      await cancelTimer(timerId)
      await reload()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : '취소 처리에 실패했습니다.')
    }
  }

  return (
    <div>
      <Link to="/">← 홈</Link>
      <h1 style={{ color: account.color }}>{account.nickname}</h1>
      <Link to={`/account/${account.id}/settings`}>설정</Link>

      {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
      {actionError && <p style={{ color: 'var(--danger)' }}>{actionError}</p>}

      <h2>펫 부화</h2>
      {EGG_SLOTS.map(slot => (
        <SlotCard
          key={slot} label={`슬롯 ${slot}`} timer={find('egg', slot)}
          onStart={() => setSheet({ kind: 'egg', slot })}
          onComplete={onComplete} onCancel={onCancel} onElapsed={reload}
        />
      ))}

      <h2>기술 연구</h2>
      <SlotCard
        label="연구" timer={find('tech', 1)}
        onStart={() => setSheet({ kind: 'tech', slot: 1 })}
        onComplete={onComplete} onCancel={onCancel} onElapsed={reload}
      />

      <h2>대장간 (레벨 {account.forge_level})</h2>
      <SlotCard
        label="업그레이드" timer={find('forge', 1)}
        onStart={() => setSheet({ kind: 'forge', slot: 1 })}
        onComplete={onComplete} onCancel={onCancel} onElapsed={reload}
      />

      <DailyQuests accountId={account.id} />

      {sheet && (
        <TimerStartSheet
          account={account} kind={sheet.kind} slot={sheet.slot}
          onDone={() => { setSheet(null); void reload() }}
          onCancel={() => setSheet(null)}
        />
      )}
    </div>
  )
}
