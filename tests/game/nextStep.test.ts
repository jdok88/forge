import { describe, it, expect } from 'vitest'
import { nextStepLine } from '../../src/game/nextStep'
import type { AccountConfig } from '../../src/game/types'

const VANILLA: AccountConfig = {
  forgeSpeedLv: 0, forgeCostLv: 0, techSpeedLv: 0, techCostLv: 0,
  eggSpeedLv: { common: 0, rare: 0, epic: 0, legendary: 0, ultimate: 0, mythic: 0 },
  goldPerSec: null, hammerPerMin: null, potionPerDay: null,
}

describe('nextStepLine', () => {
  it('알 타이머는 다음 단계가 없다', () => {
    expect(nextStepLine({ kind: 'egg', meta: { rarity: 'common' } }, VANILLA)).toBeNull()
  })

  it('기술: 같은 티어 안에서는 서브레벨만 올린다', () => {
    const line = nextStepLine({ kind: 'tech', meta: { nodeId: 'forge_timer', tier: 1, level: 4 } }, VANILLA)
    expect(line).toBe('다음: 제련 타이머 I 5/5 · 물약 115 · 1시간 20분')
  })

  it('기술: 서브레벨 5에서는 다음 티어로 넘어간다', () => {
    const line = nextStepLine({ kind: 'tech', meta: { nodeId: 'forge_timer', tier: 1, level: 5 } }, VANILLA)
    expect(line).toContain('제련 타이머 II 1/5')
  })

  it('기술: 티어 V 5/5 는 노드 최대', () => {
    const line = nextStepLine({ kind: 'tech', meta: { nodeId: 'forge_timer', tier: 5, level: 5 } }, VANILLA)
    expect(line).toBe('다음: 노드 최대')
  })

  it('대장간: 다음 레벨의 비용·시간을 보여준다', () => {
    const line = nextStepLine({ kind: 'forge', meta: { targetLevel: 12 } }, VANILLA)
    expect(line).toBe('다음: 대장간 13레벨 · 골드 450,000 · 1일 16시간 53분')
  })

  it('대장간: 목표가 35(최대)면 승천 안내로 대체한다', () => {
    const line = nextStepLine({ kind: 'forge', meta: { targetLevel: 35 } }, VANILLA)
    expect(line).toBe('다음: 최대 레벨 (승천 필요)')
  })
})
