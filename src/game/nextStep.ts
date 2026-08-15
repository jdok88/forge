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

/** "다음 단계" 안내 — lead(왜 보여주는 줄)와 detail(수치 줄)로 나뉜다. 최대 단계면 detail 없이 lead만 안내 문구가 된다. */
export interface NextStepInfo {
  lead: string
  detail?: string
}

/**
 * 진행 중인 타이머 옆에 보여줄 "다음 단계" 안내.
 * 알 타이머는 다음이 정해져 있지 않으므로(등급을 자유롭게 고름) null.
 */
export function nextStepLine(t: RunningTimer, cfg: AccountConfig): NextStepInfo | null {
  if (t.kind === 'tech') {
    const tier = t.meta.tier as number
    const level = t.meta.level as number
    if (tier >= 5 && level >= 5) return { lead: '이 기술은 최대 단계입니다.' }
    const [nextTier, nextLevel] = level >= 5 ? [tier + 1, 1] : [tier, level + 1]
    const node = TECH_NODES.find(n => n.id === t.meta.nodeId)
    const r = techDuration(nextTier, nextLevel, cfg)
    return {
      lead: '다음에도 같은 기술을 올리려면',
      detail: `${node?.name ?? '기술'} ${TIER_LABEL[nextTier - 1]} ${nextLevel}/5 · 물약 ${r.potions.toLocaleString()} · ${formatDuration(r.sec)}`,
    }
  }
  if (t.kind === 'forge') {
    const nextTarget = (t.meta.targetLevel as number) + 1
    if (nextTarget > FORGE_MAX_LEVEL) return { lead: '대장간 최대 레벨입니다. 승천이 필요합니다.' }
    const r = forgeDuration(nextTarget, cfg)
    return {
      lead: '다음 레벨을 올리려면',
      detail: `대장간 ${nextTarget}레벨 · 골드 ${r.gold.toLocaleString()} · ${formatDuration(r.sec)}`,
    }
  }
  return null
}
