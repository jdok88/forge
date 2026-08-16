import { createClient } from 'jsr:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT')!,      // 예: mailto:you@example.com
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
)

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const RARITY_LABEL: Record<string, string> = {
  common: '일반', rare: '희귀', epic: '서사시',
  legendary: '전설', ultimate: '궁극', mythic: '신화',
}
const TIER_ROMAN = ['I', 'II', 'III', 'IV', 'V']

// 일일퀘스트 카탈로그: 망치도둑2 + 유령마을2 + 침략2 + 좀비러시2 + 클랜임무3 = 11
const QUEST_SLOTS_TOTAL = 11

// 오프라인 보상 한도 = 4시간 x (1 + 0.16 x 노드단계). src/game/durations.ts offlineCapSec 과 같은 식이다.
const OFFLINE_BASE_SEC = 14_400
const OFFLINE_PCT_PER_LEVEL = 16

function offlineCapSec(lv: number): number {
  const clamped = Math.min(25, Math.max(0, Math.trunc(lv)))
  return Math.round(OFFLINE_BASE_SEC * (1 + (clamped * OFFLINE_PCT_PER_LEVEL) / 100))
}

type TimerLike = { kind: string; slot: number; meta: Record<string, unknown> }

/** 알림 문구에 쓰는 "무엇이 어떻게 되는지" 설명. 완료·사전 알림이 같은 설명을 공유한다. */
function describeTarget(t: TimerLike): { subject: string; detail: string | null } {
  if (t.kind === 'egg') {
    const rarity = RARITY_LABEL[String(t.meta.rarity)] ?? String(t.meta.rarity)
    return { subject: `${rarity}알 부화`, detail: `슬롯 ${t.slot}` }
  }
  if (t.kind === 'tech') {
    const tier = TIER_ROMAN[Number(t.meta.tier) - 1] ?? String(t.meta.tier)
    return { subject: '기술 연구', detail: `${tier} ${t.meta.level}/5` }
  }
  // forge
  return { subject: `대장간 ${t.meta.targetLevel}레벨`, detail: null }
}

function completionBody(t: TimerLike): string {
  const { subject, detail } = describeTarget(t)
  return detail ? `${subject} 완료 · ${detail}` : `${subject} 완료`
}

function preAlertBody(t: TimerLike, minutesLeft: number): string {
  const { subject, detail } = describeTarget(t)
  const base = detail ? `${subject} · ${detail}` : subject
  return `${base} · ${minutesLeft}분 후 완료`
}

function formatHoursLeft(hours: number): string {
  const totalMin = Math.max(0, Math.round(hours * 60))
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h > 0 && m > 0) return `${h}시간 ${m}분`
  if (h > 0) return `${h}시간`
  return `${m}분`
}

/** 유저의 모든 구독에 발송하고 결과를 집계한다. 만료(404/410) 구독은 정리한다. */
async function pushToUser(userId: string, payload: Record<string, unknown>) {
  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId)

  let delivered = 0
  let gone = 0
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
      )
      delivered++
    } catch (e) {
      // 410 Gone / 404 = 만료된 구독. 정리한다.
      const status = (e as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) {
        await admin.from('push_subscriptions').delete().eq('id', s.id)
        gone++
      }
      // 그 외 오류는 일시적일 수 있으므로 다음 틱에 재시도한다
    }
  }
  return { delivered, gone, total: subs?.length ?? 0 }
}

/** 보낼 구독이 없거나, 하나라도 성공했거나, 남은 구독이 전부 만료 정리된 경우 = 더 재시도할 게 없음 */
function nothingLeftToRetry(r: { delivered: number; gone: number; total: number }): boolean {
  return r.total === 0 || r.delivered > 0 || r.gone === r.total
}

Deno.serve(async () => {
  const now = new Date()

  // ── a) 완료 알림 ──────────────────────────────────────────
  // 24시간 넘게 발송 실패로 재시도 중인 타이머는 더 이상 의미가 없으므로 스캔에서 제외한다.
  const giveUpBefore = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

  const { data: due, error } = await admin
    .from('timers')
    .select('id, user_id, account_id, kind, slot, meta, accounts(nickname, servers(name))')
    .lte('ends_at', now.toISOString())
    .gte('ends_at', giveUpBefore)
    .is('notified_at', null)
    .is('completed_at', null)
    .limit(500)

  if (error) return new Response(error.message, { status: 500 })

  let sent = 0
  for (const t of due ?? []) {
    const acc = t.accounts as unknown as { nickname: string; servers: { name: string } }
    const title = `${acc.servers.name} / ${acc.nickname}`
    const payload = {
      title, body: completionBody(t), tag: t.id, url: `account/${t.account_id}`,
      silent: false, vibrate: [200, 100, 200],
    }

    const r = await pushToUser(t.user_id, payload)
    if (nothingLeftToRetry(r)) {
      await admin.from('timers')
        .update({ notified_at: new Date().toISOString() })
        .eq('id', t.id)
      sent += r.delivered
    }
  }

  // ── b) 완료 n분 전 사전 알림 ──────────────────────────────
  // pre_alert_min 최댓값(120분) 범위까지만 스캔하고, 유저별 실제 임계값은 아래에서 다시 거른다.
  const preWindowEnd = new Date(now.getTime() + 120 * 60_000).toISOString()
  const { data: preDue } = await admin
    .from('timers')
    .select('id, user_id, account_id, kind, slot, meta, ends_at, accounts(nickname, servers(name))')
    .is('completed_at', null)
    .is('pre_notified_at', null)
    .gte('ends_at', now.toISOString())
    .lte('ends_at', preWindowEnd)
    .limit(500)

  const preUserIds = [...new Set((preDue ?? []).map(t => t.user_id))]
  const preAlertMinByUser = new Map<string, number>()
  if (preUserIds.length > 0) {
    const { data: prefRows } = await admin
      .from('notification_prefs')
      .select('user_id, pre_alert_min')
      .in('user_id', preUserIds)
    for (const p of prefRows ?? []) preAlertMinByUser.set(p.user_id, p.pre_alert_min)
  }

  let preSent = 0
  for (const t of preDue ?? []) {
    // 설정 행이 없으면 기본값 5분. 0 = 사전 알림 사용 안 함.
    const preAlertMin = preAlertMinByUser.get(t.user_id) ?? 5
    if (preAlertMin === 0) continue

    const minutesLeft = Math.max(0, Math.round((new Date(t.ends_at).getTime() - now.getTime()) / 60_000))
    if (minutesLeft > preAlertMin) continue

    const acc = t.accounts as unknown as { nickname: string; servers: { name: string } }
    const title = `${acc.servers.name} / ${acc.nickname}`
    const payload = {
      title, body: preAlertBody(t, minutesLeft),
      tag: `${t.id}-pre`, url: `account/${t.account_id}`,
      silent: false, vibrate: [200, 100, 200],
    }

    // pre_notified_at 은 completed_at 의 notified_at 과 별개 컬럼이므로,
    // 사전 1회 + 완료 1회가 각각 정확히 한 번씩만 발송된다(중복 발송 없음).
    const r = await pushToUser(t.user_id, payload)
    if (nothingLeftToRetry(r)) {
      await admin.from('timers')
        .update({ pre_notified_at: new Date().toISOString() })
        .eq('id', t.id)
      preSent += r.delivered
    }
  }

  // ── c) 일일퀘스트 리셋 전 알림 ────────────────────────────
  // 리셋은 KST 09:00 = UTC 00:00. 따라서 오늘 날짜(UTC)가 곧 오늘의 퀘스트 날짜다.
  const todayQuestDate = now.toISOString().slice(0, 10)
  const nextReset = new Date(now)
  nextReset.setUTCHours(0, 0, 0, 0)
  if (nextReset <= now) nextReset.setUTCDate(nextReset.getUTCDate() + 1)
  const hoursUntilReset = (nextReset.getTime() - now.getTime()) / 3_600_000

  // quest_alerted_date 가 오늘이면 이미 보낸 것이므로 후보에서 제외 = 하루 한 번만 발송(중복 없음).
  const { data: questPrefs } = await admin
    .from('notification_prefs')
    .select('user_id, daily_quest_remind_hours_before')
    .eq('daily_quest_enabled', true)
    .or(`quest_alerted_date.is.null,quest_alerted_date.neq.${todayQuestDate}`)

  let questSent = 0
  for (const p of questPrefs ?? []) {
    if (hoursUntilReset > p.daily_quest_remind_hours_before) continue

    const { data: accounts } = await admin.from('accounts').select('id').eq('user_id', p.user_id)
    if (!accounts?.length) continue

    const { data: doneRows } = await admin
      .from('daily_quests')
      .select('account_id, done_count')
      .eq('quest_date', todayQuestDate)
      .in('account_id', accounts.map(a => a.id))

    const doneByAccount = new Map<string, number>()
    for (const r of doneRows ?? []) {
      doneByAccount.set(r.account_id, (doneByAccount.get(r.account_id) ?? 0) + r.done_count)
    }
    const incomplete = accounts.filter(a => (doneByAccount.get(a.id) ?? 0) < QUEST_SLOTS_TOTAL).length
    if (incomplete === 0) continue

    const payload = {
      title: '일일퀘스트',
      body: `리셋까지 ${formatHoursLeft(hoursUntilReset)}. 미완료 ${incomplete}개 계정`,
      tag: `quest-${todayQuestDate}`, url: '/',
      silent: false, vibrate: [200, 100, 200],
    }

    const r = await pushToUser(p.user_id, payload)
    if (nothingLeftToRetry(r)) {
      // 발송(또는 재시도할 것 없음)이 확정된 뒤에만 오늘 발송 완료로 표시한다.
      await admin.from('notification_prefs')
        .update({ quest_alerted_date: todayQuestDate })
        .eq('user_id', p.user_id)
      questSent += r.delivered
    }
  }

  // ── d) 오프라인 보상 한도 알림 ────────────────────────────
  // "지금 보상 받음"을 누른 시각(offline_claimed_at)부터 한도까지 차오른다.
  // offline_alerted_at 이 비어 있는 계정만 후보라서, 사이클당 정확히 한 번만 발송된다.
  const { data: offlineDue } = await admin
    .from('accounts')
    .select('id, user_id, nickname, offline_time_lv, offline_claimed_at, servers(name)')
    .not('offline_claimed_at', 'is', null)
    .is('offline_alerted_at', null)
    .limit(500)

  const offlineUserIds = [...new Set((offlineDue ?? []).map(a => a.user_id))]
  const offlinePrefByUser = new Map<string, { enabled: boolean; remindMin: number }>()
  if (offlineUserIds.length > 0) {
    const { data: prefRows } = await admin
      .from('notification_prefs')
      .select('user_id, offline_enabled, offline_remind_min')
      .in('user_id', offlineUserIds)
    for (const p of prefRows ?? []) {
      offlinePrefByUser.set(p.user_id, { enabled: p.offline_enabled, remindMin: p.offline_remind_min })
    }
  }

  let offlineSent = 0
  for (const a of offlineDue ?? []) {
    // 설정 행이 없으면 DB 기본값과 같은 값(켜짐, 1시간 전)을 쓴다.
    const pref = offlinePrefByUser.get(a.user_id) ?? { enabled: true, remindMin: 60 }
    if (!pref.enabled) continue

    const fullAt = new Date(a.offline_claimed_at).getTime() + offlineCapSec(a.offline_time_lv) * 1000
    const minutesLeft = Math.max(0, Math.round((fullAt - now.getTime()) / 60_000))
    if (minutesLeft > pref.remindMin) continue

    const srv = a.servers as unknown as { name: string }
    const payload = {
      title: `${srv.name} / ${a.nickname}`,
      body: minutesLeft > 0
        ? `오프라인 보상 한도까지 ${formatHoursLeft(minutesLeft / 60)}. 지금 받으세요`
        : '오프라인 보상이 가득 찼습니다. 더 쌓이지 않습니다',
      tag: `offline-${a.id}`, url: `account/${a.id}`,
      silent: false, vibrate: [200, 100, 200],
    }

    const r = await pushToUser(a.user_id, payload)
    if (nothingLeftToRetry(r)) {
      await admin.from('accounts')
        .update({ offline_alerted_at: new Date().toISOString() })
        .eq('id', a.id)
      offlineSent += r.delivered
    }
  }

  return Response.json({
    sent, timers: due?.length ?? 0,
    preSent, preTimers: preDue?.length ?? 0,
    questSent, questUsers: questPrefs?.length ?? 0,
    offlineSent, offlineAccounts: offlineDue?.length ?? 0,
  })
})
