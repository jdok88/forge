import { describe, it, expect } from 'vitest'
import { TECH_NODES, BRANCH_LABEL, CALC_NODE_FIELD, calcFieldForNode } from '../../src/game/nodes'

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

describe('CALC_NODE_FIELD', () => {
  it('계산에 반영되는 10개 노드만 매핑한다', () => {
    expect(Object.keys(CALC_NODE_FIELD)).toHaveLength(10)
  })
  it('컬럼 노드 4개를 올바른 필드에 매핑한다', () => {
    expect(calcFieldForNode('forge_timer')).toEqual({ kind: 'column', column: 'forge_speed_lv' })
    expect(calcFieldForNode('forge_cost')).toEqual({ kind: 'column', column: 'forge_cost_lv' })
    expect(calcFieldForNode('tech_timer')).toEqual({ kind: 'column', column: 'tech_speed_lv' })
    expect(calcFieldForNode('tech_cost')).toEqual({ kind: 'column', column: 'tech_cost_lv' })
  })
  it('알 노드 6개를 등급별로 매핑한다', () => {
    expect(calcFieldForNode('egg_timer_common')).toEqual({ kind: 'egg', rarity: 'common' })
    expect(calcFieldForNode('egg_timer_rare')).toEqual({ kind: 'egg', rarity: 'rare' })
    expect(calcFieldForNode('egg_timer_epic')).toEqual({ kind: 'egg', rarity: 'epic' })
    expect(calcFieldForNode('egg_timer_legendary')).toEqual({ kind: 'egg', rarity: 'legendary' })
    expect(calcFieldForNode('egg_timer_ultimate')).toEqual({ kind: 'egg', rarity: 'ultimate' })
    expect(calcFieldForNode('egg_timer_mythic')).toEqual({ kind: 'egg', rarity: 'mythic' })
  })
  it('계산에 영향을 주지 않는 노드는 null을 반환한다', () => {
    expect(calcFieldForNode('forge_sell')).toBeNull()
    expect(calcFieldForNode('nonexistent')).toBeNull()
  })
})
