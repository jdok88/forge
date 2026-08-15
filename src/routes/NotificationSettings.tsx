import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'

interface Prefs {
  pre_alert_min: number
  daily_quest_enabled: boolean
  daily_quest_remind_hours_before: number
}

const DEFAULT_PREFS: Prefs = {
  pre_alert_min: 5,
  daily_quest_enabled: true,
  daily_quest_remind_hours_before: 1,
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

export function NotificationSettings() {
  const [draft, setDraft] = useState<Prefs | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const { data: u } = await supabase.auth.getUser()
        if (!u.user) throw new Error('로그인이 필요합니다')
        const { data, error } = await supabase
          .from('notification_prefs')
          .select('pre_alert_min, daily_quest_enabled, daily_quest_remind_hours_before')
          .eq('user_id', u.user.id)
          .maybeSingle()
        if (error) throw error
        if (!cancelled) setDraft(data ? (data as Prefs) : DEFAULT_PREFS)
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : '불러오지 못했습니다.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [])

  const set = (patch: Partial<Prefs>) => {
    setDraft(d => d && { ...d, ...patch })
    setSaved(false)
  }

  async function save() {
    if (!draft) return
    setBusy(true)
    setSaveError(null)
    try {
      const { data: u } = await supabase.auth.getUser()
      if (!u.user) throw new Error('로그인이 필요합니다')
      const { error } = await supabase.from('notification_prefs').upsert({
        user_id: u.user.id,
        pre_alert_min: draft.pre_alert_min,
        daily_quest_enabled: draft.daily_quest_enabled,
        daily_quest_remind_hours_before: draft.daily_quest_remind_hours_before,
      }, { onConflict: 'user_id' })
      if (error) throw error
      setSaved(true)
    } catch (e) {
      setSaved(false)
      setSaveError(e instanceof Error ? e.message : '저장에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <Link to="/">← 홈</Link>
      <h1>알림 설정</h1>

      {loading && <p>불러오는 중…</p>}
      {loadError && <p style={{ color: 'var(--danger)' }}>{loadError}</p>}

      {draft && (
        <>
          <section>
            <h2>완료 n분 전 푸시 알림</h2>
            <p style={{ color: 'var(--text-dim)' }}>
              타이머가 끝나기 전, 휴대폰 알림 창에 한 번 더 표시합니다. 0으로 설정하면 사용하지 않습니다.
            </p>
            <Field label="완료 몇 분 전에 알릴지 (0~120, 0 = 사용 안 함)">
              <input
                type="number" min={0} max={120} value={draft.pre_alert_min}
                onChange={e => {
                  const v = Number(e.target.value)
                  set({ pre_alert_min: Number.isFinite(v) ? clamp(Math.trunc(v), 0, 120) : 0 })
                }}
              />
            </Field>
          </section>

          <section>
            <h2>일일퀘스트 푸시 알림</h2>
            <label>
              <input
                type="checkbox" checked={draft.daily_quest_enabled}
                onChange={e => set({ daily_quest_enabled: e.target.checked })}
              />
              리셋 전에 미완료 퀘스트를 알림 창에 표시
            </label>
            <Field label="리셋 몇 시간 전에 알릴지 (1~12)">
              <input
                type="number" min={1} max={12} value={draft.daily_quest_remind_hours_before}
                disabled={!draft.daily_quest_enabled}
                onChange={e => {
                  const v = Number(e.target.value)
                  set({ daily_quest_remind_hours_before: Number.isFinite(v) ? clamp(Math.trunc(v), 1, 12) : 1 })
                }}
              />
            </Field>
          </section>

          <Button variant="primary" onClick={() => void save()} disabled={busy}>저장</Button>
          {saved && <span style={{ color: 'var(--success)' }}>저장됨</span>}
          {saveError && <span style={{ color: 'var(--danger)' }}>{saveError}</span>}
        </>
      )}
    </div>
  )
}
