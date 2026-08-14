import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { questDateKst } from '../game/format'
import { DAILY_QUESTS } from '../game/quests'

export function useDailyQuests(accountId: string) {
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const date = questDateKst(new Date())

  const reload = useCallback(async () => {
    const { data } = await supabase
      .from('daily_quests').select('quest_key, done_count')
      .eq('account_id', accountId).eq('quest_date', date)
    const next: Record<string, number> = {}
    for (const q of DAILY_QUESTS) next[q.key] = 0
    for (const r of data ?? []) next[r.quest_key as string] = r.done_count as number
    setCounts(next)
    setLoading(false)
  }, [accountId, date])

  useEffect(() => { void reload() }, [reload])

  /** 탭하면 1 증가, 최대치에서 다시 탭하면 0으로 되돌린다 */
  const bump = useCallback(async (key: string, max: number) => {
    const current = counts[key] ?? 0
    const next = current >= max ? 0 : current + 1
    const { data: u } = await supabase.auth.getUser()
    if (!u.user) throw new Error('로그인이 필요합니다')
    await supabase.from('daily_quests').upsert({
      user_id: u.user.id, account_id: accountId,
      quest_date: date, quest_key: key, done_count: next,
    }, { onConflict: 'account_id,quest_date,quest_key' })
    setCounts(c => ({ ...c, [key]: next }))
  }, [accountId, counts, date])

  return { counts, loading, bump, reload }
}
