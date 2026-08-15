export type Rarity =
  | 'common' | 'rare' | 'epic'
  | 'legendary' | 'ultimate' | 'mythic'

export type Branch = 'forge' | 'power' | 'skill'

export interface TechRow {
  tier: number
  level: number
  potions: number
  sec: number
}

export interface ForgeRow {
  sec: number
  gold: number
}

/** 계정별 단축·할인 노드 레벨 (각 0~25) 와 수급률 */
export interface AccountConfig {
  forgeSpeedLv: number
  forgeCostLv: number
  techSpeedLv: number
  techCostLv: number
  eggSpeedLv: Record<Rarity, number>
  goldPerSec: number | null
  hammerPerMin: number | null
  potionPerDay: number | null
}
