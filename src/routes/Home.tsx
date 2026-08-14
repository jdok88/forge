import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAccounts, createServer, createAccount, toConfig } from '../hooks/useAccounts'
import { useTimers } from '../hooks/useTimers'
import { useSession } from '../hooks/useSession'
import { formatDuration } from '../game/format'
import { forgeDuration } from '../game/durations'
import { resourceEta } from '../game/eta'
import { subscribePush, type PushFailure } from '../lib/push'
import { supabase } from '../lib/supabase'
import { GuestUpgradeBanner } from '../components/GuestUpgradeBanner'
import { PushHelp } from '../components/PushHelp'
import { Countdown } from '../components/Countdown'
import { isInAppBrowser } from '../lib/browser'

const KIND_ICON = { egg: '🥚', tech: '⚗️', forge: '⚒️' } as const

function notificationsActive() {
  return typeof Notification !== 'undefined' && Notification.permission === 'granted'
}

function NotificationBanner() {
  const [active, setActive] = useState(notificationsActive())
  const [reason, setReason] = useState<PushFailure | null>(
    isInAppBrowser() ? 'no-serviceworker' : null
  )
  const [detail, setDetail] = useState<string | undefined>(undefined)
  const [okMessage, setOkMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (active) return null

  async function enable() {
    setBusy(true)
    try {
      const r = await subscribePush()
      if (r.ok) {
        setOkMessage('알림이 켜졌습니다.')
        setReason(null)
        setDetail(undefined)
        setActive(true)
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

  return (
    <div style={{
      background: 'var(--surface-2)', border: '1px solid var(--accent)',
      borderRadius: 'var(--r-md)', padding: 'var(--sp-3)', marginBottom: 'var(--sp-4)',
    }}>
      <p>알림이 꺼져 있습니다. 켜지 않으면 타이머가 끝나도 알려드릴 수 없습니다.</p>
      <button type="button" onClick={() => void enable()} disabled={busy}>알림 켜기</button>
      {okMessage && <p>{okMessage}</p>}
      {reason && <PushHelp reason={reason} detail={detail} />}
    </div>
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
              const soonest = mine
                .slice()
                .sort((x, y) => new Date(x.ends_at).getTime() - new Date(y.ends_at).getTime())[0]

              // 다음 대장간 레벨까지 골드 ETA
              let goldNote: string | null = null
              if (a.forge_level < 35 && a.gold_per_min) {
                const need = forgeDuration(a.forge_level + 1, toConfig(a)).gold
                const min = resourceEta(need, 0, a.gold_per_min)
                if (min !== null) goldNote = `0부터 모으면 ${formatDuration(min * 60)}`
              }

              const counts = { egg: 0, tech: 0, forge: 0 }
              for (const t of mine) counts[t.kind]++

              return (
                <Link key={a.id} to={`/account/${a.id}`}
                  style={{
                    display: 'block', background: 'var(--surface)',
                    borderLeft: `4px solid ${a.color}`, borderRadius: 'var(--r-md)',
                    padding: 'var(--sp-3)', marginBottom: 'var(--sp-2)',
                    color: 'var(--text)', textDecoration: 'none',
                  }}>
                  <strong>{a.nickname}</strong>
                  <div style={{ color: 'var(--text-dim)', fontSize: 'var(--fs-sm)' }}>
                    {(['egg', 'tech', 'forge'] as const)
                      .filter(k => counts[k] > 0)
                      .map(k => `${KIND_ICON[k]}${counts[k]}`)
                      .join(' ') || '진행 중인 타이머 없음'}
                  </div>
                  {soonest !== undefined && (
                    <div>가장 빠른 완료: <Countdown endsAt={soonest.ends_at} /></div>
                  )}
                  {goldNote && (
                    <div style={{ color: 'var(--text-dim)', fontSize: 'var(--fs-sm)' }}>{goldNote}</div>
                  )}
                </Link>
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
              <button type="submit" disabled={busy}>추가</button>
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
            <button type="submit" disabled={busy || full || !serverName}>추가</button>
            {full && <p style={{ color: 'var(--text-dim)' }}>모든 서버가 추가되었습니다.</p>}
          </form>
        )
      })()}

      {formError && <p style={{ color: 'var(--danger)' }}>{formError}</p>}

      <button type="button" onClick={() => void logout(isAnonymous)}>로그아웃</button>
    </div>
  )
}
