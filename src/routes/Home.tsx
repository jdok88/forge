import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAccounts, createServer, createAccount, toConfig } from '../hooks/useAccounts'
import { useTimers, type TimerRow } from '../hooks/useTimers'
import { useSession } from '../hooks/useSession'
import { formatDuration } from '../game/format'
import { forgeDuration } from '../game/durations'
import { resourceEta } from '../game/eta'
import { RARITY_LABEL } from '../game/constants'
import { TECH_NODES } from '../game/nodes'
import type { Rarity } from '../game/types'
import { subscribePush, unsubscribePush, type PushFailure } from '../lib/push'
import { supabase } from '../lib/supabase'
import { GuestUpgradeBanner } from '../components/GuestUpgradeBanner'
import { PushHelp } from '../components/PushHelp'
import { Countdown } from '../components/Countdown'
import { timerIcon } from '../components/SlotCard'
import { isInAppBrowser } from '../lib/browser'
import { useNotificationStatus } from '../hooks/useNotificationStatus'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { SectionTitle } from '../components/ui/SectionTitle'
import { EmptyState } from '../components/ui/EmptyState'
import { GameIcon } from '../components/ui/GameIcon'

const TIER_LABEL = ['I', 'II', 'III', 'IV', 'V'] as const

/** 홈 카드용 짧은 라벨 — 상세 화면(SlotCard)의 표기와는 의도적으로 다르다 */
function timerLabel(t: TimerRow): string {
  if (t.kind === 'egg') return `${RARITY_LABEL[t.meta.rarity as Rarity]}알 · 슬롯 ${t.slot}`
  if (t.kind === 'tech') {
    const node = TECH_NODES.find(n => n.id === t.meta.nodeId)
    return `${node?.name ?? '기술'} ${TIER_LABEL[(t.meta.tier as number) - 1]} ${t.meta.level}/5`
  }
  return `대장간 ${t.meta.targetLevel}레벨`
}

function TimerLine({ t }: { t: TimerRow }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 'var(--sp-2)',
      padding: 'var(--sp-1) 0',
    }}>
      <GameIcon icon={timerIcon(t)} alt={timerLabel(t)} size="sm" />
      <span style={{ flex: 1, fontSize: 'var(--fs-sm)' }}>{timerLabel(t)}</span>
      <Countdown endsAt={t.ends_at} />
    </div>
  )
}

function NotificationBanner() {
  const { active, refresh } = useNotificationStatus()
  const [reason, setReason] = useState<PushFailure | null>(
    isInAppBrowser() ? 'no-serviceworker' : null
  )
  const [detail, setDetail] = useState<string | undefined>(undefined)
  const [okMessage, setOkMessage] = useState<string | null>(null)
  const [offError, setOffError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (active === null) return null

  async function enable() {
    setBusy(true)
    try {
      const r = await subscribePush()
      if (r.ok) {
        setOkMessage('알림이 켜졌습니다.')
        setReason(null)
        setDetail(undefined)
        refresh()
      } else {
        setReason(r.reason)
        setDetail(r.detail)
      }
    } catch (e) {
      setReason('subscribe-failed')
      setDetail(String(e))
    } finally {
      setBusy(false)
    }
  }

  async function disable() {
    setBusy(true)
    setOffError(null)
    try {
      await unsubscribePush()
      refresh()
    } catch (e) {
      setOffError(e instanceof Error ? e.message : '알림을 끄지 못했습니다.')
    } finally {
      setBusy(false)
    }
  }

  if (active) {
    return (
      <div style={{ marginBottom: 'var(--sp-4)', fontSize: 'var(--fs-sm)' }}>
        <span style={{ color: 'var(--text-dim)' }}>알림 켜짐</span>{' '}
        <Button size="sm" onClick={() => void disable()} disabled={busy}>알림 끄기</Button>
        {offError && <p style={{ color: 'var(--danger)' }}>{offError}</p>}
      </div>
    )
  }

  return (
    <Card style={{ border: '1px solid var(--accent)', marginBottom: 'var(--sp-4)' }}>
      <p style={{ color: 'var(--danger)' }}>
        알림이 꺼져 있습니다. <strong>타이머가 완료되어도 알림이 오지 않습니다.</strong>
      </p>
      <Button variant="primary" onClick={() => void enable()} disabled={busy}>알림 켜기</Button>
      {okMessage && <p>{okMessage}</p>}
      {reason && <PushHelp reason={reason} detail={detail} />}
    </Card>
  )
}

async function logout(isAnonymous: boolean) {
  if (isAnonymous) {
    const ok = window.confirm(
      '게스트 계정입니다. 로그아웃하면 이 기기에 저장된 데이터를 복구할 수 없습니다. 계속하시겠습니까?'
    )
    if (!ok) return
  }
  await supabase.auth.signOut()
}

export function Home() {
  const { servers, accounts, loading, error, reload } = useAccounts()
  const { timers } = useTimers()
  const { session } = useSession()
  const [serverName, setServerName] = useState('')
  const [nick, setNick] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // 진행 중/완료 판정을 1초마다 재평가해, 타이머가 끝나는 순간 자동으로 섹션이 바뀌게 한다
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  if (loading) return <p>불러오는 중…</p>

  const anyUser = session?.user as unknown as { is_anonymous?: boolean } | undefined
  const isAnonymous = anyUser?.is_anonymous ?? !session?.user.email

  return (
    <div>
      <h1>Forge 알람</h1>
      <GuestUpgradeBanner />
      <NotificationBanner />
      <Link to="/install">알림이 안 오나요?</Link>
      {' · '}
      <Link to="/notifications">알림 설정</Link>

      {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

      {servers.map(s => {
        const list = accounts.filter(a => a.server_id === s.id)
        return (
          <section key={s.id}>
            <h2>{s.name}</h2>
            {list.map(a => {
              const mine = timers.filter(t => t.account_id === a.id)
              const running = mine
                .filter(t => new Date(t.ends_at).getTime() > now)
                .sort((x, y) => new Date(x.ends_at).getTime() - new Date(y.ends_at).getTime())
              const finished = mine
                .filter(t => new Date(t.ends_at).getTime() <= now)
                .sort((x, y) => new Date(x.ends_at).getTime() - new Date(y.ends_at).getTime())

              // 다음 대장간 레벨까지 골드 ETA
              let goldNote: string | null = null
              if (a.forge_level < 35 && a.gold_per_min) {
                const need = forgeDuration(a.forge_level + 1, toConfig(a)).gold
                const min = resourceEta(need, 0, a.gold_per_min)
                if (min !== null) goldNote = `0부터 모으면 ${formatDuration(min * 60)}`
              }

              return (
                <Card key={a.id} accentColor={a.color} style={{ marginBottom: 'var(--sp-2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                    <Link to={`/account/${a.id}`} style={{
                      flex: 1, color: a.color, fontWeight: 700, fontSize: 'var(--fs-md)',
                      textDecoration: 'none',
                    }}>
                      {a.nickname}
                    </Link>
                    <span style={{ color: 'var(--text-dim)', fontSize: 'var(--fs-xs)' }}>{s.name}</span>
                    <Link to={`/account/${a.id}/settings`} style={{ fontSize: 'var(--fs-sm)' }}>설정</Link>
                  </div>

                  {goldNote && (
                    <div style={{ color: 'var(--text-dim)', fontSize: 'var(--fs-sm)', marginTop: 'var(--sp-1)' }}>
                      {goldNote}
                    </div>
                  )}

                  {running.length === 0 && finished.length === 0 && (
                    <EmptyState message="진행 중인 타이머가 없습니다" />
                  )}

                  {running.length > 0 && (
                    <>
                      <SectionTitle>진행 중 ({running.length})</SectionTitle>
                      <div>
                        {running.map(t => <TimerLine key={t.id} t={t} />)}
                      </div>
                    </>
                  )}

                  {finished.length > 0 && (
                    <>
                      <SectionTitle>완료 · 확인 필요 ({finished.length})</SectionTitle>
                      <div style={{ borderLeft: '2px solid var(--success)', paddingLeft: 'var(--sp-2)' }}>
                        {finished.map(t => <TimerLine key={t.id} t={t} />)}
                      </div>
                    </>
                  )}
                </Card>
              )
            })}

            <form onSubmit={async e => {
              e.preventDefault()
              setFormError(null)
              const v = (nick[s.id] ?? '').trim()
              if (!v) return
              setBusy(true)
              try {
                await createAccount(s.id, v)
                setNick({ ...nick, [s.id]: '' })
                await reload()
              } catch (err) {
                setFormError(err instanceof Error ? err.message : '추가하지 못했습니다.')
              } finally {
                setBusy(false)
              }
            }}>
              <input placeholder="계정 추가" value={nick[s.id] ?? ''}
                onChange={e => setNick({ ...nick, [s.id]: e.target.value })} />
              <Button type="submit" disabled={busy}>추가</Button>
            </form>
          </section>
        )
      })}

      {(() => {
        const existing = new Set(servers.map(s => s.name))
        const available = Array.from({ length: 57 }, (_, i) => i + 1)
          .filter(n => !existing.has(String(n)))
        const full = available.length === 0

        return (
          <form onSubmit={async e => {
            e.preventDefault()
            setFormError(null)
            const v = serverName
            if (!v) return
            setBusy(true)
            try {
              await createServer(v)
              setServerName('')
              await reload()
            } catch (err) {
              setFormError(err instanceof Error ? err.message : '추가하지 못했습니다.')
            } finally {
              setBusy(false)
            }
          }}>
            <select value={serverName} onChange={e => setServerName(e.target.value)} disabled={full}>
              <option value="">서버 선택</option>
              {available.map(n => (
                <option key={n} value={String(n)}>{n}서버</option>
              ))}
            </select>
            <Button type="submit" disabled={busy || full || !serverName}>추가</Button>
            {full && <p style={{ color: 'var(--text-dim)' }}>모든 서버가 추가되었습니다.</p>}
          </form>
        )
      })()}

      {formError && <p style={{ color: 'var(--danger)' }}>{formError}</p>}

      <Button variant="ghost" onClick={() => void logout(isAnonymous)}>로그아웃</Button>
    </div>
  )
}
