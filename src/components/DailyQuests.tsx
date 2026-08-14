import { useEffect, useState } from 'react'
import { DAILY_QUESTS } from '../game/quests'
import { useDailyQuests } from '../hooks/useDailyQuests'
import { nextQuestResetAt, formatDuration } from '../game/format'

export function DailyQuests({ accountId }: { accountId: string }) {
  const { counts, bump } = useDailyQuests(accountId)
  const [until, setUntil] = useState(0)

  useEffect(() => {
    const tick = () =>
      setUntil(Math.floor((nextQuestResetAt(new Date()).getTime() - Date.now()) / 1000))
    tick()
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [])

  return (
    <section>
      <h2>일일퀘스트</h2>
      <p style={{ color: 'var(--text-dim)' }}>리셋까지 {formatDuration(until)}</p>
      {DAILY_QUESTS.map(q => {
        const done = counts[q.key] ?? 0
        const complete = done >= q.max
        return (
          <button
            key={q.key} type="button"
            onClick={() => void bump(q.key, q.max)}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              background: 'var(--surface)', color: complete ? 'var(--success)' : 'var(--text)',
              border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
              padding: 'var(--sp-3)', marginBottom: 'var(--sp-2)',
            }}
          >
            {q.label} {done}/{q.max} {complete && '✓'}
          </button>
        )
      })}
    </section>
  )
}
