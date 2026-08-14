import { describe, it, expect } from 'vitest'
import { TECH_NODES, BRANCH_LABEL } from '../../src/game/nodes'

describe('TECH_NODES', () => {
  it('47개다', () => {
    expect(TECH_NODES).toHaveLength(47)
  })
  it('브랜치별 개수가 맞다', () => {
    const count = (b: string) => TECH_NODES.filter(n => n.branch === b).length
    expect(count('forge')).toBe(10)
    expect(count('power')).toBe(20)
    expect(count('skill')).toBe(17)
  })
  it('id 가 중복되지 않는다', () => {
    expect(new Set(TECH_NODES.map(n => n.id)).size).toBe(47)
  })
  it('계산에 쓰이는 노드가 존재한다', () => {
    const ids = TECH_NODES.map(n => n.id)
    expect(ids).toContain('forge_timer')
    expect(ids).toContain('forge_cost')
    expect(ids).toContain('tech_timer')
    expect(ids).toContain('tech_cost')
    expect(ids).toContain('egg_timer_common')
    expect(ids).toContain('egg_timer_mythic')
  })
  it('브랜치 라벨은 게임 표기를 쓴다', () => {
    expect(BRANCH_LABEL.forge).toBe('대장간')
    expect(BRANCH_LABEL.power).toBe('힘')
    expect(BRANCH_LABEL.skill).toBe('스킬, 펫 & 기술')
  })
})
