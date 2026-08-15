import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAccounts, updateAccount } from '../hooks/useAccounts'
import { useTimers, completeTimer, cancelTimer, type TimerKind } from '../hooks/useTimers'
import { useDailyQuests } from '../hooks/useDailyQuests'
import { DAILY_QUESTS } from '../game/quests'
import { SlotCard } from '../components/SlotCard'
import { TimerStartSheet } from '../components/TimerStartSheet'
import { DailyQuests } from '../components/DailyQuests'
import { TabBar, type TabDef } from '../components/ui/TabBar'

const EGG_SLOTS = [1, 2, 3, 4]
type TabKey = 'pet' | 'tech' | 'forge' | 'quest'

export function AccountDetail() {
  const { id } = useParams<{ id: string }>()
  const { accounts, reload: reloadAccounts } = useAccounts()
  const { timers, error, reload } = useTimers(id)
  const { counts: questCounts } = useDailyQuests(id ?? '')
  const [sheet, setSheet] = useState<{ kind: TimerKind; slot: number } | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [tab, setTab] = useState<TabKey>('pet')

  const account = accounts.find(a => a.id === id)
  if (!account) return <p>계정을 찾을 수 없습니다.</p>

  const find = (kind: TimerKind, slot: number) =>
    timers.find(t => t.kind === kind && t.slot === slot)

  const petOccupied = EGG_SLOTS.filter(slot => find('egg', slot) !== undefined).length
  const questRemaining = DAILY_QUESTS.filter(q => (questCounts[q.key] ?? 0) < q.max).length

  const tabs: TabDef[] = [
    { key: 'pet', label: '펫', badge: `${petOccupied}/${EGG_SLOTS.length}` },
    { key: 'tech', label: '기술' },
    { key: 'forge', label: '대장간' },
    { key: 'quest', label: '일퀘', badge: String(questRemaining) },
  ]

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

      <TabBar tabs={tabs} active={tab} onChange={k => setTab(k as TabKey)} />

      {tab === 'pet' && (
        <>
          <h2>펫 부화</h2>
          {EGG_SLOTS.map(slot => (
            <SlotCard
              key={slot} label={`슬롯 ${slot}`} timer={find('egg', slot)}
              onStart={() => setSheet({ kind: 'egg', slot })}
              onComplete={onComplete} onCancel={onCancel} onElapsed={reload}
            />
          ))}
        </>
      )}

      {tab === 'tech' && (
        <>
          <h2>기술 연구</h2>
          <SlotCard
            label="연구" timer={find('tech', 1)}
            onStart={() => setSheet({ kind: 'tech', slot: 1 })}
            onComplete={onComplete} onCancel={onCancel} onElapsed={reload}
          />
        </>
      )}

      {tab === 'forge' && (
        <>
          <h2>대장간 (레벨 {account.forge_level})</h2>
          <SlotCard
            label="업그레이드" timer={find('forge', 1)}
            onStart={() => setSheet({ kind: 'forge', slot: 1 })}
            onComplete={onComplete} onCancel={onCancel} onElapsed={reload}
          />
        </>
      )}

      {tab === 'quest' && <DailyQuests accountId={account.id} />}

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
