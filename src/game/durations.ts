import {
  EGG_BASE_SEC, TECH_TABLE, FORGE_TABLE, FORGE_FREE_SKIP_LEVELS,
  FORGE_MAX_LEVEL, RATE_PER_LEVEL,
} from './constants'
import { applySpeed, applyDiscount, clampNodeLevel } from './formulas'
import type { AccountConfig, Rarity } from './types'

/** (티어, 서브레벨) → TECH_TABLE 인덱스 */
export function techIndex(tier: number, level: number): number {
  if (tier < 1 || tier > 5) throw new Error(`티어 범위 밖: ${tier}`)
  if (level < 1 || level > 5) throw new Error(`서브레벨 범위 밖: ${level}`)
  return (tier - 1) * 5 + (level - 1)
}

export function eggHatchSec(rarity: Rarity, cfg: AccountConfig): number {
  const lv = clampNodeLevel(cfg.eggSpeedLv[rarity])
  return applySpeed(EGG_BASE_SEC[rarity], lv * RATE_PER_LEVEL.eggSpeed)
}

export function techDuration(
  tier: number, level: number, cfg: AccountConfig,
): { sec: number; potions: number } {
  const row = TECH_TABLE[techIndex(tier, level)]
  const speedLv = clampNodeLevel(cfg.techSpeedLv)
  const costLv = clampNodeLevel(cfg.techCostLv)
  return {
    sec: applySpeed(row.sec, speedLv * RATE_PER_LEVEL.techSpeed),
    potions: applyDiscount(row.potions, costLv * RATE_PER_LEVEL.techCost),
  }
}

export function isForgeFreeSkip(targetLevel: number): boolean {
  return FORGE_FREE_SKIP_LEVELS.includes(targetLevel)
}

export function forgeDuration(
  targetLevel: number, cfg: AccountConfig,
): { sec: number; gold: number } {
  if (targetLevel < 2 || targetLevel > FORGE_MAX_LEVEL) {
    throw new Error(`대장간 목표 레벨 범위 밖: ${targetLevel}`)
  }
  const row = FORGE_TABLE[targetLevel]
  const speedLv = clampNodeLevel(cfg.forgeSpeedLv)
  const costLv = clampNodeLevel(cfg.forgeCostLv)
  return {
    sec: applySpeed(row.sec, speedLv * RATE_PER_LEVEL.forgeSpeed),
    gold: applyDiscount(row.gold, costLv * RATE_PER_LEVEL.forgeCost),
  }
}
