import type { Rarity, TechRow, ForgeRow } from './types'

export const RARITIES: readonly Rarity[] = [
  'common', 'rare', 'epic', 'legendary', 'ultimate', 'mythic',
] as const

export const RARITY_LABEL: Record<Rarity, string> = {
  common: '일반',
  rare: '희귀',
  epic: '에픽',
  legendary: '전설',
  ultimate: '궁극',
  mythic: '신화',
}

/** 알 등급별 기본 부화시간(초). 등급마다 정확히 2배. */
export const EGG_BASE_SEC: Record<Rarity, number> = {
  common: 1800,
  rare: 7200,
  epic: 14400,
  legendary: 28800,
  ultimate: 57600,
  mythic: 115200,
}

/**
 * 기술 노드 1개의 티어 I-1/5 → V-5/5 전체 25단계.
 * 출처: image/tech cost and time_realreal.png (게임 내 3회 교차검증 완료)
 * 각 행은 "그 단계에 도달하기 위한" 비용/시간이다.
 */
export const TECH_TABLE: readonly TechRow[] = [
  { tier: 1, level: 1, potions: 30, sec: 300 },
  { tier: 1, level: 2, potions: 42, sec: 600 },
  { tier: 1, level: 3, potions: 59, sec: 1200 },
  { tier: 1, level: 4, potions: 82, sec: 2400 },
  { tier: 1, level: 5, potions: 115, sec: 4800 },
  { tier: 2, level: 1, potions: 161, sec: 9600 },
  { tier: 2, level: 2, potions: 226, sec: 19200 },
  { tier: 2, level: 3, potions: 316, sec: 38400 },
  { tier: 2, level: 4, potions: 443, sec: 76800 },
  { tier: 2, level: 5, potions: 620, sec: 84480 },
  { tier: 3, level: 1, potions: 868, sec: 92880 },
  { tier: 3, level: 2, potions: 1007, sec: 102180 },
  { tier: 3, level: 3, potions: 1168, sec: 112440 },
  { tier: 3, level: 4, potions: 1354, sec: 123660 },
  { tier: 3, level: 5, potions: 1571, sec: 136020 },
  { tier: 4, level: 1, potions: 1823, sec: 149640 },
  { tier: 4, level: 2, potions: 2114, sec: 164580 },
  { tier: 4, level: 3, potions: 2452, sec: 181080 },
  { tier: 4, level: 4, potions: 2845, sec: 199140 },
  { tier: 4, level: 5, potions: 3300, sec: 219060 },
  { tier: 5, level: 1, potions: 3828, sec: 241020 },
  { tier: 5, level: 2, potions: 4441, sec: 265080 },
  { tier: 5, level: 3, potions: 5151, sec: 291600 },
  { tier: 5, level: 4, potions: 5975, sec: 320760 },
  { tier: 5, level: 5, potions: 6931, sec: 352860 },
] as const

/**
 * 대장간 레벨 N 도달에 필요한 시간(초)과 총 골드.
 * 승천(Ascend) 후에도 같은 표를 재사용한다.
 * 레벨 2·3·4 는 게임이 무료 즉시완료를 제공하므로 타이머를 걸지 않는다.
 */
export const FORGE_FREE_SKIP_LEVELS: readonly number[] = [2, 3, 4] as const
export const FORGE_MAX_LEVEL = 35

export const FORGE_TABLE: Record<number, ForgeRow> = {
  2: { sec: 300, gold: 400 },
  3: { sec: 900, gold: 700 },
  4: { sec: 1800, gold: 1_500 },
  5: { sec: 3600, gold: 3_500 },
  6: { sec: 7200, gold: 10_000 },
  7: { sec: 27200, gold: 25_000 },
  8: { sec: 47200, gold: 50_000 },
  9: { sec: 67200, gold: 100_000 },
  10: { sec: 87200, gold: 150_000 },
  11: { sec: 107200, gold: 250_000 },
  12: { sec: 127200, gold: 350_000 },
  13: { sec: 147200, gold: 450_000 },
  14: { sec: 167200, gold: 600_000 },
  15: { sec: 187200, gold: 800_000 },
  16: { sec: 207200, gold: 910_000 },
  17: { sec: 227200, gold: 1_020_000 },
  18: { sec: 247200, gold: 1_130_000 },
  19: { sec: 277200, gold: 1_240_000 },
  20: { sec: 307200, gold: 1_350_000 },
  21: { sec: 337200, gold: 1_460_000 },
  22: { sec: 367200, gold: 1_570_000 },
  23: { sec: 397200, gold: 1_680_000 },
  24: { sec: 427200, gold: 1_790_000 },
  25: { sec: 457200, gold: 1_900_000 },
  26: { sec: 487200, gold: 2_010_000 },
  27: { sec: 517200, gold: 2_120_000 },
  28: { sec: 547200, gold: 2_230_000 },
  29: { sec: 577200, gold: 2_340_000 },
  30: { sec: 607200, gold: 2_450_000 },
  31: { sec: 637200, gold: 2_560_000 },
  32: { sec: 667200, gold: 2_670_000 },
  33: { sec: 697200, gold: 2_780_000 },
  34: { sec: 727200, gold: 2_890_000 },
  35: { sec: 757200, gold: 3_000_000 },
}

/** 노드 레벨(0~25) 당 효과 증가폭(%p) */
export const RATE_PER_LEVEL = {
  eggSpeed: 10,
  techSpeed: 4,
  techCost: 2,
  forgeSpeed: 2,
  forgeCost: 1,
} as const

export const MAX_NODE_LEVEL = 25
