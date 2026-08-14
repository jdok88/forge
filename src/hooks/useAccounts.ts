import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { AccountConfig, Rarity } from '../game/types'

export interface ServerRow {
  id: string
  name: string
  sort_order: number
}

export interface AccountRow {
  id: string
  server_id: string
  nickname: string
  color: string
  forge_level: number
  forge_speed_lv: number
  forge_cost_lv: number
  tech_speed_lv: number
  tech_cost_lv: number
  egg_speed_lv: Record<Rarity, number>
  gold_per_min: number | null
  hammer_per_min: number | null
  potion_per_day: number | null
  sort_order: number
}

export function toConfig(a: AccountRow): AccountConfig {
  return {
    forgeSpeedLv: a.forge_speed_lv,
    forgeCostLv: a.forge_cost_lv,
    techSpeedLv: a.tech_speed_lv,
    techCostLv: a.tech_cost_lv,
    eggSpeedLv: a.egg_speed_lv,
    goldPerMin: a.gold_per_min,
    hammerPerMin: a.hammer_per_min,
    potionPerDay: a.potion_per_day,
  }
}

export function useAccounts() {
  const [servers, setServers] = useState<ServerRow[]>([])
  const [accounts, setAccounts] = useState<AccountRow[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    const [s, a] = await Promise.all([
      supabase.from('servers').select('*').order('sort_order'),
      supabase.from('accounts').select('*').order('sort_order'),
    ])
    setServers((s.data ?? []) as ServerRow[])
    setAccounts((a.data ?? []) as AccountRow[])
    setLoading(false)
  }, [])

  useEffect(() => { void reload() }, [reload])

  return { servers, accounts, loading, reload }
}

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser()
  if (!data.user) throw new Error('로그인이 필요합니다')
  return data.user.id
}

export async function createServer(name: string) {
  const user_id = await currentUserId()
  const { error } = await supabase.from('servers').insert({ user_id, name })
  if (error) throw error
}

export async function createAccount(server_id: string, nickname: string) {
  const user_id = await currentUserId()
  const { error } = await supabase.from('accounts').insert({ user_id, server_id, nickname })
  if (error) throw error
}

export async function updateAccount(id: string, patch: Partial<AccountRow>) {
  const { error } = await supabase.from('accounts').update(patch).eq('id', id)
  if (error) throw error
}
