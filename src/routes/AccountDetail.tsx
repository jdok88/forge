import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAccounts, updateAccount, toConfig } from '../hooks/useAccounts'
import { useTimers, startTimer, completeTimer, cancelTimer, type TimerKind } from '../hooks/useTimers'
import { useDailyQuests } from '../hooks/useDailyQuests'
import { DAILY_QUESTS } from '../game/quests'
import { eggHatchSec, forgeDuration, isForgeFreeSkip } from '../game/durations'
import { RARITY_LABEL, MAX_NODE_LEVEL } from '../game/constants'
import { TECH_NODES, calcFieldForNode } from '../game/nodes'
import type { Rarity } from '../game/types'
import { SlotCard } from '../components/SlotCard'
import { TimerStartSheet } from '../components/TimerStartSheet'
import { DailyQuests } from '../components/DailyQuests'
import { TabBar, type TabDef } from '../components/ui/TabBar'

const EGG_SLOTS = [1, 2, 3, 4]
const FORGE_MAX_LEVEL = 35
type TabKey = 'pet' | 'tech' | 'forge' | 'quest'

type ContinuePrompt =
  | { kind: 'egg'; slot: number; rarity: Rarity }
  | { kind: 'forge'; slot: number; newLevel: number }
  | { kind: 'tech'; slot: number; message: string }

/** 한글 체언 뒤 이/가 조사 선택 — 받침 있으면 '이', 없으면 '가' */
function josaGa(word: string): '이' | '가' {
  const code = word.charCodeAt(word.length - 1) - 0xac00
  if (code < 0 || code > 11171) return '가'
  return code % 28 === 0 ? '가' : '이'
}

export function AccountDetail() {
  const { id } = useParams<{ id: string }>()
  const { accounts, reload: reloadAccounts } = useAccounts()
  const { timers, error, reload } = useTimers(id)
  const { counts: questCounts } = useDailyQuests(id ?? '')
  const [sheet, setSheet] = useState<{ kind: TimerKind; slot: number } | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [tab, setTab] = useState<TabKey>('pet')
  const [copyingSlot, setCopyingSlot] = useState<number | null>(null)
  const [continuePrompt, setContinuePrompt] = useState<ContinuePrompt | null>(null)
  const [continueBusy, setContinueBusy] = useState(false)

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
      // 레벨을 먼저 올린다. 절대값을 쓰므로 재시도해도 중복 증가가 없다.
      if (t?.kind === 'forge' && account) {
        await updateAccount(account.id, { forge_level: t.meta.targetLevel as number })
        await reloadAccounts()
      }
      let techBumpMessage: string | null = null
      if (t?.kind === 'tech' && account) {
        const nodeId = t.meta.nodeId as string
        const field = calcFieldForNode(nodeId)
        if (field) {
          const tier = t.meta.tier as number
          const level = t.meta.level as number
          const newLevel = Math.min(MAX_NODE_LEVEL, Math.max(0, (tier - 1) * 5 + level))
          const currentLevel = field.kind === 'column' ? account[field.column] : account.egg_speed_lv[field.rarity]
          // 이미 반영된 레벨보다 낮게는 절대 내리지 않는다 — 순서 없는 연구·수동 설정을 덮어쓰면 안 되므로
          if (newLevel > currentLevel) {
            if (field.kind === 'column') {
              await updateAccount(account.id, { [field.column]: newLevel })
            } else {
              await updateAccount(account.id, { egg_speed_lv: { ...account.egg_speed_lv, [field.rarity]: newLevel } })
            }
            await reloadAccounts()
            const nodeName = TECH_NODES.find(n => n.id === nodeId)?.name ?? '노드'
            techBumpMessage = `${nodeName}${josaGa(nodeName)} ${newLevel}단계로 반영되었습니다.`
          }
        }
      }
      await completeTimer(timerId)
      await reload()
      if (t?.kind === 'egg') {
        setContinuePrompt({ kind: 'egg', slot: t.slot, rarity: t.meta.rarity as Rarity })
      } else if (t?.kind === 'forge') {
        setContinuePrompt({ kind: 'forge', slot: t.slot, newLevel: t.meta.targetLevel as number })
      } else if (t && techBumpMessage) {
        setContinuePrompt({ kind: 'tech', slot: t.slot, message: techBumpMessage })
      }
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

  async function onCopyPreviousEgg(slot: number, rarity: Rarity) {
    if (!account) return
    setActionError(null)
    setCopyingSlot(slot)
    try {
      const sec = eggHatchSec(rarity, toConfig(account))
      await startTimer({ accountId: account.id, kind: 'egg', slot, meta: { rarity }, sec, autoSec: sec })
      await reload()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : '복사 시작에 실패했습니다.')
    } finally {
      setCopyingSlot(null)
    }
  }

  async function onContinueEgg(slot: number, rarity: Rarity) {
    if (!account) return
    setActionError(null)
    setContinueBusy(true)
    try {
      const sec = eggHatchSec(rarity, toConfig(account))
      await startTimer({ accountId: account.id, kind: 'egg', slot, meta: { rarity }, sec, autoSec: sec })
      setContinuePrompt(null)
      await reload()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : '이어서 부화 시작에 실패했습니다.')
    } finally {
      setContinueBusy(false)
    }
  }

  async function onContinueForge(slot: number, nextLevel: number) {
    if (!account) return
    setActionError(null)
    setContinueBusy(true)
    try {
      const r = forgeDuration(nextLevel, toConfig(account))
      await startTimer({
        accountId: account.id, kind: 'forge', slot,
        meta: { targetLevel: nextLevel }, sec: r.sec, autoSec: r.sec,
      })
      setContinuePrompt(null)
      await reload()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : '다음 레벨 시작에 실패했습니다.')
    } finally {
      setContinueBusy(false)
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
          {EGG_SLOTS.map(slot => {
            const timer = find('egg', slot)
            const prev = slot > 1 ? find('egg', slot - 1) : undefined

            const continuePromptProp = continuePrompt?.kind === 'egg' && continuePrompt.slot === slot
              ? {
                  message: `방금 부화한 ${RARITY_LABEL[continuePrompt.rarity]} 알을 이어서 부화할까요?`,
                  confirmLabel: '이어서 부화',
                  onConfirm: () => void onContinueEgg(slot, continuePrompt.rarity),
                  onDismiss: () => setContinuePrompt(null),
                  disabled: continueBusy,
                }
              : undefined

            // 방금 완료한 슬롯에 이어서-부화 프롬프트가 떠 있는 동안은 복사 버튼을 같이 보여주지 않는다
            const copyAction = !timer && !continuePromptProp && prev
              ? {
                  label: `슬롯 ${slot - 1} 복사 (${RARITY_LABEL[prev.meta.rarity as Rarity]})`,
                  onClick: () => void onCopyPreviousEgg(slot, prev.meta.rarity as Rarity),
                  disabled: copyingSlot === slot,
                }
              : undefined

            return (
              <SlotCard
                key={slot} label={`슬롯 ${slot}`} timer={timer}
                onStart={() => setSheet({ kind: 'egg', slot })}
                onComplete={onComplete} onCancel={onCancel} onElapsed={reload}
                copyAction={copyAction}
                continuePrompt={continuePromptProp}
              />
            )
          })}
        </>
      )}

      {tab === 'tech' && (() => {
        const techPrompt = continuePrompt?.kind === 'tech' && continuePrompt.slot === 1
          ? {
              message: continuePrompt.message,
              onDismiss: () => setContinuePrompt(null),
              disabled: continueBusy,
            }
          : undefined

        return (
          <>
            <h2>기술 연구</h2>
            <SlotCard
              label="연구" timer={find('tech', 1)}
              onStart={() => setSheet({ kind: 'tech', slot: 1 })}
              onComplete={onComplete} onCancel={onCancel} onElapsed={reload}
              continuePrompt={techPrompt}
              cfg={toConfig(account)}
            />
          </>
        )
      })()}

      {tab === 'forge' && (() => {
        const forgePrompt = continuePrompt?.kind === 'forge' && continuePrompt.slot === 1
          ? (() => {
              const nextLevel = continuePrompt.newLevel + 1
              if (nextLevel > FORGE_MAX_LEVEL) {
                return {
                  message: `대장간 ${continuePrompt.newLevel} 완료.`,
                  note: '최대 레벨입니다. 승천 후 레벨을 1로 되돌리세요.',
                  onDismiss: () => setContinuePrompt(null),
                  disabled: continueBusy,
                }
              }
              return {
                message: `대장간 ${continuePrompt.newLevel} 완료. 다음 레벨(${nextLevel})을 바로 시작할까요?`,
                note: isForgeFreeSkip(nextLevel) ? '게임에서 무료 즉시완료가 가능한 구간입니다.' : undefined,
                confirmLabel: '다음 레벨 시작',
                onConfirm: () => void onContinueForge(1, nextLevel),
                onDismiss: () => setContinuePrompt(null),
                disabled: continueBusy,
              }
            })()
          : undefined

        return (
          <>
            <h2>대장간 (레벨 {account.forge_level})</h2>
            <SlotCard
              label="업그레이드" timer={find('forge', 1)}
              onStart={() => setSheet({ kind: 'forge', slot: 1 })}
              onComplete={onComplete} onCancel={onCancel} onElapsed={reload}
              continuePrompt={forgePrompt}
              cfg={toConfig(account)}
            />
          </>
        )
      })()}

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
