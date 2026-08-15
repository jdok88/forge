import { TECH_NODES } from './nodes'
import { techDuration, forgeDuration } from './durations'
import { formatDuration } from './format'
import { FORGE_MAX_LEVEL } from './constants'
import type { AccountConfig } from './types'

const TIER_LABEL = ['I', 'II', 'III', 'IV', 'V'] as const

interface RunningTimer {
  kind: 'egg' | 'tech' | 'forge'
  meta: Record<string, unknown>
}

/**
 * 진행 중인 타이머 옆에 보여줄 "다음 단계" 안내 한 줄.
 * 알 타이머는 다음이 정해져 있지 않으므로(등급을 자유롭게 고름) null.
 */
export function nextStepLine(t: RunningTimer, cfg: AccountConfig): string | null {
  if (t.kind === 'tech') {
    const tier = t.meta.tier as number
    const level = t.meta.level as number
    if (tier >= 5 && level >= 5) return '다음: 노드 최대'
    const [nextTier, nextLevel] = level >= 5 ? [tier + 1, 1] : [tier, level + 1]
    const node = TECH_NODES.find(n => n.id === t.meta.nodeId)
    const r = techDuration(nextTier, nextLevel, cfg)
    return `다음: ${node?.name ?? '기술'} ${TIER_LABEL[nextTier - 1]} ${nextLevel}/5 · 물약 ${r.potions.toLocaleString()} · ${formatDuration(r.sec)}`
  }
  if (t.kind === 'forge') {
    const nextTarget = (t.meta.targetLevel as number) + 1
    if (nextTarget > FORGE_MAX_LEVEL) return '다음: 최대 레벨 (승천 필요)'
    const r = forgeDuration(nextTarget, cfg)
    return `다음: 대장간 ${nextTarget}레벨 · 골드 ${r.gold.toLocaleString()} · ${formatDuration(r.sec)}`
  }
  return null
}
