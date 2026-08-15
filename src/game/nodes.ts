import type { Branch, Rarity } from './types'

export interface TechNode {
  id: string
  branch: Branch
  name: string
  effect: string
}

/** 노드 하나가 계정의 어느 계산 필드를 움직이는지 */
export type CalcField =
  | { kind: 'column'; column: 'forge_speed_lv' | 'forge_cost_lv' | 'tech_speed_lv' | 'tech_cost_lv' }
  | { kind: 'egg'; rarity: Rarity }

/** 타이머 계산에 직접 반영되는 열 개 노드 → 계정 필드 매핑 */
export const CALC_NODE_FIELD: Record<string, CalcField> = {
  forge_timer: { kind: 'column', column: 'forge_speed_lv' },
  forge_cost: { kind: 'column', column: 'forge_cost_lv' },
  tech_timer: { kind: 'column', column: 'tech_speed_lv' },
  tech_cost: { kind: 'column', column: 'tech_cost_lv' },
  egg_timer_common: { kind: 'egg', rarity: 'common' },
  egg_timer_rare: { kind: 'egg', rarity: 'rare' },
  egg_timer_epic: { kind: 'egg', rarity: 'epic' },
  egg_timer_legendary: { kind: 'egg', rarity: 'legendary' },
  egg_timer_ultimate: { kind: 'egg', rarity: 'ultimate' },
  egg_timer_mythic: { kind: 'egg', rarity: 'mythic' },
}

export function calcFieldForNode(nodeId: string): CalcField | null {
  return CALC_NODE_FIELD[nodeId] ?? null
}

export const BRANCH_LABEL: Record<Branch, string> = {
  forge: '대장간',
  power: '힘',
  skill: '스킬, 펫 & 기술',
}

/**
 * 게임 내 한국어 표기 그대로. 출처: docs/reference/tech-nodes.md
 * S-Oil(클랜 기술) 브랜치는 v1 제외.
 */
export const TECH_NODES: readonly TechNode[] = [
  // 대장간 10
  { id: 'forge_timer', branch: 'forge', name: '제련 타이머', effect: '대장간 업그레이드 타이머 속도 +2%/레벨' },
  { id: 'forge_cost', branch: 'forge', name: '제련 업그레이드 비용', effect: '대장간 업그레이드 비용 -1%/레벨' },
  { id: 'forge_sell', branch: 'forge', name: '장비 판매 가격', effect: '장비 판매 가격 +1%/레벨' },
  { id: 'forge_thief_hammer', branch: 'forge', name: '망치 도둑 망치 보너스', effect: '망치 보너스 +1%/레벨' },
  { id: 'forge_thief_coin', branch: 'forge', name: '망치 도둑 코인 보너스', effect: '코인 보너스 +1%/레벨' },
  { id: 'forge_auto', branch: 'forge', name: '자동 제련', effect: '한 번에 사용하는 망치 수 +1' },
  { id: 'forge_free', branch: 'forge', name: '무료 제련 기회', effect: '장비를 무료로 제작할 기회 +1%/레벨' },
  { id: 'forge_offline_time', branch: 'forge', name: '최대 오프라인 시간', effect: '최대 오프라인 보상 시간 +16%/레벨' },
  { id: 'forge_offline_coin', branch: 'forge', name: '코인 오프라인 보상', effect: '코인 오프라인 보상 보너스 +1%/레벨' },
  { id: 'forge_offline_hammer', branch: 'forge', name: '망치 오프라인 보상', effect: '망치 오프라인 보상 보너스 +1%/레벨' },

  // 힘 20 — 장비 숙련 8
  { id: 'power_m_weapon', branch: 'power', name: '무기 숙련', effect: '무기 보너스 피해 +2%/레벨' },
  { id: 'power_m_helmet', branch: 'power', name: '헬멧 숙련', effect: '헬멧 보너스 체력 +2%/레벨' },
  { id: 'power_m_glove', branch: 'power', name: '장갑 숙련', effect: '장갑 보너스 피해 +2%/레벨' },
  { id: 'power_m_body', branch: 'power', name: '갑옷 숙련', effect: '갑옷 보너스 체력 +2%/레벨' },
  { id: 'power_m_necklace', branch: 'power', name: '목걸이 숙련', effect: '목걸이 보너스 피해 +2%/레벨' },
  { id: 'power_m_shoe', branch: 'power', name: '신발 숙련', effect: '신발 보너스 체력 +2%/레벨' },
  { id: 'power_m_ring', branch: 'power', name: '반지 숙련', effect: '반지 보너스 피해 +2%/레벨' },
  { id: 'power_m_belt', branch: 'power', name: '벨트 숙련', effect: '벨트 보너스 체력 +2%/레벨' },
  // 탈것 숙련 2
  { id: 'power_mount_dmg', branch: 'power', name: '탈것 피해 숙련', effect: '탈것 보너스 피해 +2%/레벨' },
  { id: 'power_mount_hp', branch: 'power', name: '탈것 체력 숙련', effect: '탈것 보너스 체력 +2%/레벨' },
  // 레벨 업 8
  { id: 'power_l_weapon', branch: 'power', name: '무기 레벨 업', effect: '무기 최대 레벨 +2/레벨' },
  { id: 'power_l_helmet', branch: 'power', name: '헬멧 레벨 업', effect: '헬멧 최대 레벨 +2/레벨' },
  { id: 'power_l_glove', branch: 'power', name: '장갑 레벨 업', effect: '장갑 최대 레벨 +2/레벨' },
  { id: 'power_l_body', branch: 'power', name: '갑옷 레벨 업', effect: '갑옷 최대 레벨 +2/레벨' },
  { id: 'power_l_necklace', branch: 'power', name: '목걸이 레벨 업', effect: '목걸이 최대 레벨 +2/레벨' },
  { id: 'power_l_shoe', branch: 'power', name: '신발 레벨 업', effect: '신발 최대 레벨 +2/레벨' },
  { id: 'power_l_ring', branch: 'power', name: '반지 레벨 업', effect: '반지 최대 레벨 +2/레벨' },
  { id: 'power_l_belt', branch: 'power', name: '벨트 레벨 업', effect: '벨트 최대 레벨 +2/레벨' },
  // 탈것 소환 2
  { id: 'power_mount_cost', branch: 'power', name: '탈것 소환 비용', effect: '탈것 소환 비용 -1%/레벨' },
  { id: 'power_mount_extra', branch: 'power', name: '추가 탈것 소환 기회', effect: '추가 탈것 소환 기회 +2%/레벨' },

  // 스킬, 펫 & 기술 17
  { id: 'tech_timer', branch: 'skill', name: '기술 연구 타이머', effect: '기술 연구 타이머 속도 +4%/레벨' },
  { id: 'tech_cost', branch: 'skill', name: '기술 노드 업그레이드 비용', effect: '기술 노드 업그레이드 비용 -2%/레벨' },
  { id: 'skill_dmg', branch: 'skill', name: '스킬 피해 숙련', effect: '스킬 피해 +2%/레벨' },
  { id: 'skill_passive_dmg', branch: 'skill', name: '스킬 패시브 피해', effect: '패시브 스킬 기지 피해 +2%/레벨' },
  { id: 'skill_passive_hp', branch: 'skill', name: '스킬 패시브 체력', effect: '패시브 스킬 기지 체력 +2%/레벨' },
  { id: 'skill_summon_cost', branch: 'skill', name: '스킬 소환 비용', effect: '스킬 소환 비용 -1%/레벨' },
  { id: 'pet_dmg', branch: 'skill', name: '펫 피해 숙련', effect: '펫 보너스 피해 +2%/레벨' },
  { id: 'pet_hp', branch: 'skill', name: '펫 체력 숙련', effect: '펫 보너스 체력 +2%/레벨' },
  { id: 'egg_timer_common', branch: 'skill', name: '일반 알 타이머', effect: '일반 알 부화 타이머 속도 +10%/레벨' },
  { id: 'egg_timer_rare', branch: 'skill', name: '희귀 알 타이머', effect: '희귀한 알 부화 타이머 속도 +10%/레벨' },
  { id: 'egg_timer_epic', branch: 'skill', name: '서사시 알 타이머', effect: '서사시 알 부화 타이머 속도 +10%/레벨' },
  { id: 'egg_timer_legendary', branch: 'skill', name: '전설의 알 타이머', effect: '전설 알 부화 타이머 속도 +10%/레벨' },
  { id: 'egg_timer_ultimate', branch: 'skill', name: '궁극의 알 타이머', effect: '궁극의 알 부화 타이머 속도 +10%/레벨' },
  { id: 'egg_timer_mythic', branch: 'skill', name: '신화의 알 타이머', effect: '신화 알 부화 타이머 속도 +10%/레벨' },
  { id: 'egg_extra', branch: 'skill', name: '추가 알 획득 기회', effect: '추가 알 소환 기회 +2%/레벨' },
  { id: 'ghost_ticket', branch: 'skill', name: '유령 마을 스킬 티켓 보너스', effect: '스킬 티켓 보너스 +1%/레벨' },
  { id: 'zombie_potion', branch: 'skill', name: '좀비 러시 기술 물약 보너스', effect: '기술 물약 보너스 +2%/레벨' },
] as const
