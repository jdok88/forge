import { describe, it, expect } from 'vitest'
import { DAILY_QUESTS, totalQuestSlots } from '../../src/game/quests'

describe('DAILY_QUESTS', () => {
  it('5종이다', () => {
    expect(DAILY_QUESTS).toHaveLength(5)
  })
  it('게임 표기와 횟수가 맞다', () => {
    expect(DAILY_QUESTS).toEqual([
      { key: 'hammer_thief', label: '망치도둑', max: 2 },
      { key: 'ghost_town', label: '유령마을', max: 2 },
      { key: 'invasion', label: '침략', max: 2 },
      { key: 'zombie_rush', label: '좀비러시', max: 2 },
      { key: 'clan_mission', label: '클랜임무', max: 3 },
    ])
  })
  it('하루 총 11회다', () => {
    expect(totalQuestSlots()).toBe(11)
  })
})
