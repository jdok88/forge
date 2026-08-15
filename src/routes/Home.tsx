import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAccounts, createServer, createAccount, deleteServer, toConfig } from '../hooks/useAccounts'
import { useTimers, type TimerRow } from '../hooks/useTimers'
import { useSession } from '../hooks/useSession'
import { formatDuration } from '../game/format'
import { forgeDuration } from '../game/durations'
import { resourceEta } from '../game/eta'
import { nextStepLine } from '../game/nextStep'
import { RARITY_LABEL } from '../game/constants'
import { TECH_NODES } from '../game/nodes'
import type { AccountConfig, Rarity } from '../game/types'
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
import { Field } from '../components/ui/Field'
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

/** cfg 를 주면(진행 중인 타이머만) 다음 단계 안내를 그 아래 작은 글씨로 덧붙인다 */
function TimerLine({ t, cfg }: { t: TimerRow; cfg?: AccountConfig }) {
  const nextLine = cfg ? nextStepLine(t, cfg) : null
  return (
    <div style={{ padding: 'var(--sp-1) 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
        <GameIcon icon={timerIcon(t)} alt={timerLabel(t)} size="sm" />
        <span style={{ flex: 1, fontSize: 'var(--fs-sm)' }}>{timerLabel(t)}</span>
        <Countdown endsAt={t.ends_at} />
      </div>
      {nextLine && (
        <div style={{ color: 'var(--text-dim)', fontSize: 'var(--fs-sm)', paddingLeft: 'calc(1em + var(--sp-2))' }}>
          {nextLine}
        </div>
      )}
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
        setOkMessage('푸시 알림이 켜졌습니다.')
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
      setOffError(e instanceof Error ? e.message : '푸시 알림을 끄지 못했습니다.')
    } finally {
      setBusy(false)
    }
  }

  if (active) {
    return (
      <div style={{ marginBottom: 'var(--sp-4)', fontSize: 'var(--fs-sm)' }}>
        <span style={{ color: 'var(--text-dim)' }}>푸시 알림 켜짐</span>{' '}
        <Button size="sm" onClick={() => void disable()} disabled={busy}>푸시 알림 끄기</Button>
        {offError && <p style={{ color: 'var(--danger)' }}>{offError}</p>}
      </div>
    )
  }

  return (
    <Card style={{ border: '1px solid var(--accent)', marginBottom: 'var(--sp-4)' }}>
      <p style={{ color: 'var(--danger)' }}>
        푸시 알림이 꺼져 있습니다. <strong>타이머가 완료돼도 휴대폰 알림 창에 표시되지 않습니다.</strong>
      </p>
      <Button variant="primary" onClick={() => void enable()} disabled={busy}>푸시 알림 켜기</Button>
      <p style={{ color: 'var(--text-dim)', fontSize: 'var(--fs-sm)' }}>
        시계 알람처럼 크게 울리지는 않습니다. 기본 알림음이 울리며, 휴대폰의 알림 설정에 따라 무음일 수 있습니다.
      </p>
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
  const { timers, reload: reloadTimers } = useTimers()
  const { session } = useSession()
  const [serverName, setServerName] = useState('')
  const [nick, setNick] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmingServerId, setConfirmingServerId] = useState<string | null>(null)
  const [serverDeleteBusy, setServerDeleteBusy] = useState(false)

  async function onDeleteServer(serverId: string) {
    setFormError(null)
    setServerDeleteBusy(true)
    try {
      await deleteServer(serverId)
      setConfirmingServerId(null)
      await Promise.all([reload(), reloadTimers()])
    } catch (e) {
      setFormError(e instanceof Error ? e.message : '서버 삭제에 실패했습니다.')
    } finally {
      setServerDeleteBusy(false)
    }
  }

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
      <p style={{ color: 'var(--text-dim)', fontSize: 'var(--fs-sm)' }}>제작자: s54 skhy</p>
      <GuestUpgradeBanner />
      <NotificationBanner />
      <Link to="/install">알림이 안 오나요?</Link>
      {' · '}
      <Link to="/notifications">추가기능 설정</Link>

      {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

      {servers.map(s => {
        const list = accounts.filter(a => a.server_id === s.id)
        const listIds = new Set(list.map(a => a.id))
        const serverTimerCount = timers.filter(t => listIds.has(t.account_id)).length
        return (
          <section key={s.id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
              <h2 style={{ flex: 1 }}>{s.name}</h2>
              <Button
                variant="ghost" size="sm"
                style={{ color: 'var(--danger)', fontSize: 'var(--fs-sm)' }}
                onClick={() => setConfirmingServerId(s.id)}
              >
                삭제
              </Button>
            </div>
            {confirmingServerId === s.id && (
              <p style={{ color: 'var(--danger)', fontSize: 'var(--fs-sm)' }}>
                {s.name}서버와 계정 {list.length}개, 타이머 {serverTimerCount}개가 모두 삭제됩니다. 되돌릴 수 없습니다.{' '}
                <Button variant="danger" size="sm" onClick={() => void onDeleteServer(s.id)} disabled={serverDeleteBusy}>삭제</Button>{' '}
                <Button variant="ghost" size="sm" onClick={() => setConfirmingServerId(null)} disabled={serverDeleteBusy}>취소</Button>
              </p>
            )}
            {list.map(a => {
              const mine = timers.filter(t => t.account_id === a.id)
              const running = mine
                .filter(t => new Date(t.ends_at).getTime() > now)
                .sort((x, y) => new Date(x.ends_at).getTime() - new Date(y.ends_at).getTime())
              const finished = mine
                .filter(t => new Date(t.ends_at).getTime() <= now)
                .sort((x, y) => new Date(x.ends_at).getTime() - new Date(y.ends_at).getTime())

              const cfg = toConfig(a)

              // 다음 대장간 레벨까지 골드 ETA — resourceEta 는 분당 단위이므로 초당 값을 60배해 변환한다
              let goldNote: string | null = null
              if (a.forge_level < 35 && a.gold_per_sec) {
                const need = forgeDuration(a.forge_level + 1, cfg).gold
                const min = resourceEta(need, 0, a.gold_per_sec * 60)
                if (min !== null) goldNote = `0부터 모으면 ${formatDuration(min * 60)}`
              }

              return (
                <Card key={a.id} accentColor={a.color} style={{ marginBottom: 'var(--sp-2)', padding: 0, position: 'relative' }}>
                  <Link to={`/account/${a.id}`} className="ui-account-link">
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 'var(--sp-2)',
                      paddingRight: 'calc(var(--sp-6) * 3)',
                    }}>
                      <span style={{ flex: 1, color: a.color, fontWeight: 700, fontSize: 'var(--fs-md)' }}>
                        {a.nickname}
                      </span>
                      <span style={{ color: 'var(--text-dim)', fontSize: 'var(--fs-lg)', lineHeight: 1 }} aria-hidden="true">›</span>
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
                          {running.map(t => <TimerLine key={t.id} t={t} cfg={cfg} />)}
                        </div>
                      </>
                    )}

                    {finished.length > 0 && (
                      <>
                        <SectionTitle>완료 대기 ({finished.length})</SectionTitle>
                        <div style={{ borderLeft: '2px solid var(--success)', paddingLeft: 'var(--sp-2)' }}>
                          {finished.map(t => <TimerLine key={t.id} t={t} />)}
                        </div>
                      </>
                    )}
                  </Link>

                  <Link
                    to={`/account/${a.id}/settings`}
                    className="ui-account-settings-link"
                    onClick={e => e.stopPropagation()}
                  >
                    계정별 상세설정
                  </Link>
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
              <Field label="동일 서버 계정 추가">
                <input placeholder="계정 닉네임" value={nick[s.id] ?? ''}
                  onChange={e => setNick({ ...nick, [s.id]: e.target.value })} />
              </Field>
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
          <Card style={{ marginTop: 'var(--sp-6)' }}>
            <SectionTitle>다른 서버 추가</SectionTitle>
            <p style={{ color: 'var(--text-dim)', fontSize: 'var(--fs-sm)' }}>
              다른 서버에서도 플레이 중이라면 서버를 추가하세요.
            </p>
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
          </Card>
        )
      })()}

      {formError && <p style={{ color: 'var(--danger)' }}>{formError}</p>}

      <Button variant="ghost" onClick={() => void logout(isAnonymous)}>로그아웃</Button>
    </div>
  )
}
