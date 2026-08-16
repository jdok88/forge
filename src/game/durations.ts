import {
  EGG_BASE_SEC, TECH_TABLE, FORGE_TABLE, FORGE_FREE_SKIP_LEVELS,
  FORGE_MAX_LEVEL, RATE_PER_LEVEL, OFFLINE_BASE_SEC,
} from './constants'
import { applySpeed, applyDiscount, applyBonus, clampNodeLevel } from './formulas'
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

/**
 * 오프라인 보상이 가득 차기까지의 시간(초). 이 시간을 넘겨 접속하면 넘친 만큼은 버려진다.
 * 다른 노드와 달리 AccountConfig 를 받지 않는다 — 타이머 계산에는 쓰이지 않는 값이라서다.
 */
export function offlineCapSec(offlineTimeLv: number): number {
  return applyBonus(OFFLINE_BASE_SEC, clampNodeLevel(offlineTimeLv) * RATE_PER_LEVEL.offlineTime)
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
