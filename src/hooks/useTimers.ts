import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export type TimerKind = 'egg' | 'tech' | 'forge'

export interface TimerRow {
  id: string
  account_id: string
  kind: TimerKind
  slot: number
  meta: Record<string, unknown>
  auto_sec: number | null
  is_manual: boolean
  started_at: string
  ends_at: string
  notified_at: string | null
  completed_at: string | null
}

export interface StartTimerInput {
  accountId: string
  kind: TimerKind
  slot: number
  meta: Record<string, unknown>
  sec: number
  autoSec: number
}

export function useTimers(accountId?: string) {
  const [timers, setTimers] = useState<TimerRow[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    let q = supabase.from('timers').select('*').is('completed_at', null)
    if (accountId) q = q.eq('account_id', accountId)
    const { data } = await q.order('ends_at')
    setTimers((data ?? []) as TimerRow[])
    setLoading(false)
  }, [accountId])

  useEffect(() => { void reload() }, [reload])

  return { timers, loading, reload }
}

export async function startTimer(input: StartTimerInput): Promise<void> {
  const { data: u } = await supabase.auth.getUser()
  if (!u.user) throw new Error('로그인이 필요합니다')

  const endsAt = new Date(Date.now() + input.sec * 1000).toISOString()
  const { error } = await supabase.from('timers').insert({
    user_id: u.user.id,
    account_id: input.accountId,
    kind: input.kind,
    slot: input.slot,
    meta: input.meta,
    auto_sec: input.autoSec,
    is_manual: input.sec !== input.autoSec,
    ends_at: endsAt,
  })
  // 유니크 인덱스 위반 = 그 슬롯에 이미 타이머가 있음
  if (error) {
    if (error.code === '23505') throw new Error('이 슬롯에 이미 진행 중인 타이머가 있습니다')
    throw error
  }
}

/** 취소 = 기록을 남기지 않고 지운다 */
export async function cancelTimer(id: string): Promise<void> {
  const { error } = await supabase.from('timers').delete().eq('id', id)
  if (error) throw error
}

/** 완료 확인 = 슬롯을 비운다 */
export async function completeTimer(id: string): Promise<void> {
  const { error } = await supabase.from('timers')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}
