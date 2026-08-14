export interface DailyQuest {
  key: string
  label: string
  max: number
}

/** KST 09:00 리셋. 전 서버 공통. */
export const DAILY_QUESTS: readonly DailyQuest[] = [
  { key: 'hammer_thief', label: '망치도둑', max: 2 },
  { key: 'ghost_town', label: '유령마을', max: 2 },
  { key: 'invasion', label: '침략', max: 2 },
  { key: 'zombie_rush', label: '좀비러시', max: 2 },
  { key: 'clan_mission', label: '클랜임무', max: 3 },
] as const

export function totalQuestSlots(): number {
  return DAILY_QUESTS.reduce((a, q) => a + q.max, 0)
}
