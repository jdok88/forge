import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAccounts, createServer, createAccount, toConfig } from '../hooks/useAccounts'
import { useTimers } from '../hooks/useTimers'
import { formatCountdown, formatDuration } from '../game/format'
import { forgeDuration } from '../game/durations'
import { resourceEta } from '../game/eta'

const KIND_ICON = { egg: '🥚', tech: '⚗️', forge: '⚒️' } as const

export function Home() {
  const { servers, accounts, loading, error, reload } = useAccounts()
  const { timers } = useTimers()
  const [serverName, setServerName] = useState('')
  const [nick, setNick] = useState<Record<string, string>>({})

  if (loading) return <p>불러오는 중…</p>

  return (
    <div>
      <h1>Forge 알람</h1>
      <Link to="/install">알림이 안 오나요?</Link>

      {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

      {servers.map(s => {
        const list = accounts.filter(a => a.server_id === s.id)
        return (
          <section key={s.id}>
            <h2>{s.name}</h2>
            {list.map(a => {
              const mine = timers.filter(t => t.account_id === a.id)
              const soonest = mine
                .map(t => Math.floor((new Date(t.ends_at).getTime() - Date.now()) / 1000))
                .sort((x, y) => x - y)[0]

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
                    <div>가장 빠른 완료: {formatCountdown(soonest)}</div>
                  )}
                  {goldNote && (
                    <div style={{ color: 'var(--text-dim)', fontSize: 'var(--fs-sm)' }}>{goldNote}</div>
                  )}
                </Link>
              )
            })}

            <form onSubmit={async e => {
              e.preventDefault()
              const v = (nick[s.id] ?? '').trim()
              if (!v) return
              await createAccount(s.id, v)
              setNick({ ...nick, [s.id]: '' })
              await reload()
            }}>
              <input placeholder="계정 추가" value={nick[s.id] ?? ''}
                onChange={e => setNick({ ...nick, [s.id]: e.target.value })} />
              <button type="submit">추가</button>
            </form>
          </section>
        )
      })}

      <form onSubmit={async e => {
        e.preventDefault()
        const v = serverName.trim()
        if (!v) return
        await createServer(v)
        setServerName('')
        await reload()
      }}>
        <input placeholder="서버 추가" value={serverName}
          onChange={e => setServerName(e.target.value)} />
        <button type="submit">추가</button>
      </form>
    </div>
  )
}
