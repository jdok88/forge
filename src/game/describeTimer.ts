import { RARITY_LABEL } from './constants'
import { formatDuration } from './format'
import type { Rarity } from './types'

const TIER_ROMAN = ['I', 'II', 'III', 'IV', 'V'] as const

export interface DescribableTimer {
  kind: 'egg' | 'tech' | 'forge'
  slot: number
  meta: Record<string, unknown>
}

/**
 * 알림 문구에 쓰는 "무엇이 어떻게 되는지" 설명. 완료·사전 알림이 같은 설명을 공유한다.
 * supabase/functions/dispatch-push/index.ts 의 같은 이름 함수와 동작이 일치해야 한다 —
 * 웹 푸시(서버, Deno)와 네이티브 로컬 알림(앱, 브라우저)이 같은 문구를 내야 하기 때문.
 * Edge Function 은 별도 런타임이라 이 모듈을 import 할 수 없어 로직을 미러링한다.
 */
export function describeTarget(t: DescribableTimer): { subject: string; detail: string | null } {
  if (t.kind === 'egg') {
    const rarity = RARITY_LABEL[t.meta.rarity as Rarity] ?? String(t.meta.rarity)
    return { subject: `${rarity}알 부화`, detail: `슬롯 ${t.slot}` }
  }
  if (t.kind === 'tech') {
    const tier = TIER_ROMAN[Number(t.meta.tier) - 1] ?? String(t.meta.tier)
    return { subject: '기술 연구', detail: `${tier} ${t.meta.level}/5` }
  }
  // forge
  return { subject: `대장간 ${t.meta.targetLevel}레벨`, detail: null }
}

export function completionBody(t: DescribableTimer): string {
  const { subject, detail } = describeTarget(t)
  return detail ? `${subject} 완료 · ${detail}` : `${subject} 완료`
}

export function preAlertBody(t: DescribableTimer, minutesLeft: number): string {
  const { subject, detail } = describeTarget(t)
  const base = detail ? `${subject} · ${detail}` : subject
  return `${base} · ${minutesLeft}분 후 완료`
}

/**
 * 오프라인 보상 한도 알림 문구. dispatch-push 의 d) 분기와 문구가 같아야 한다.
 * 남은 시간이 12시간(설정 상한)을 넘지 않으므로 '일' 단위는 나오지 않는다.
 */
export function offlineAlertBody(minutesLeft: number): string {
  if (minutesLeft <= 0) return '오프라인 보상이 가득 찼습니다. 더 쌓이지 않습니다'
  return `오프라인 보상 한도까지 ${formatDuration(minutesLeft * 60)}. 지금 받으세요`
}

/** 알림 제목 — 서버명 / 계정명. 웹 푸시(dispatch-push)와 동일한 형식. */
export function notificationTitle(serverName: string, accountNickname: string): string {
  return `${serverName} / ${accountNickname}`
}
