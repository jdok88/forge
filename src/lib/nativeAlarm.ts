import { Capacitor } from '@capacitor/core'
import { LocalNotifications, type LocalNotificationSchema } from '@capacitor/local-notifications'
import { supabase } from './supabase'
import type { TimerRow } from '../hooks/useTimers'
import type { AccountRow } from '../hooks/useAccounts'
import { completionBody, preAlertBody, offlineAlertBody, notificationTitle } from '../game/describeTimer'
import { offlineCapSec } from '../game/durations'

export function isNative(): boolean {
  return Capacitor.isNativePlatform()
}

/**
 * 타이머 UUID → 30비트 양의 정수. Capacitor 로컬 알림 id 는 정수(안드로이드에서 32비트)여야 하는데
 * 타이머 id 는 UUID 문자열이라 그대로 못 쓴다. FNV-1a 32비트 해시를 구해 상위 비트를 버리고
 * 30비트로 줄인 뒤, 마지막 비트를 완료(0)/사전알림(1) 구분에 쓴다 — 이렇게 하면 결과가 항상
 * 0~2^31-1 안에 들어와 안전한 양의 int32이고, 같은 타이머의 두 알림도 충돌하지 않는다.
 * (다른 타이머끼리 30비트 해시가 우연히 같을 확률은 극히 낮고, 겹치더라도 한쪽 알림 예약이
 * 덮어써지는 정도라 알람 앱치고 감수할 만한 리스크다)
 */
function hash30(id: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0) & 0x3fffffff
}

function completionId(timerId: string): number {
  return hash30(timerId) * 2
}

function preAlertId(timerId: string): number {
  return hash30(timerId) * 2 + 1
}

/** 오프라인 보상 알림 id — 계정 UUID 로 같은 해시를 쓴다(타이머 id 와 우연히 겹칠 확률은 위와 같은 수준). */
function offlineId(accountId: string): number {
  return hash30(accountId) * 2
}

interface AccountInfo {
  nickname: string
  serverName: string
}

async function fetchAccountInfo(accountIds: string[]): Promise<Map<string, AccountInfo>> {
  const map = new Map<string, AccountInfo>()
  if (accountIds.length === 0) return map
  const { data } = await supabase
    .from('accounts')
    .select('id, nickname, servers(name)')
    .in('id', accountIds)
  for (const row of data ?? []) {
    const r = row as unknown as { id: string; nickname: string; servers: { name: string } }
    map.set(r.id, { nickname: r.nickname, serverName: r.servers.name })
  }
  return map
}

interface AlarmPrefs {
  /** 완료 몇 분 전에 추가로 알릴지. 0 = 사전 알림 사용 안 함. */
  preAlertMin: number
  offlineEnabled: boolean
  offlineRemindMin: number
}

/** notification_prefs 행이 없으면 웹 푸시·DB 기본값과 같은 값을 쓴다. */
const DEFAULT_ALARM_PREFS: AlarmPrefs = { preAlertMin: 5, offlineEnabled: true, offlineRemindMin: 60 }

async function fetchAlarmPrefs(): Promise<AlarmPrefs> {
  const { data: u } = await supabase.auth.getUser()
  if (!u.user) return DEFAULT_ALARM_PREFS
  const { data } = await supabase
    .from('notification_prefs')
    .select('pre_alert_min, offline_enabled, offline_remind_min')
    .eq('user_id', u.user.id)
    .maybeSingle()
  if (!data) return DEFAULT_ALARM_PREFS
  return {
    preAlertMin: (data.pre_alert_min as number | null) ?? DEFAULT_ALARM_PREFS.preAlertMin,
    offlineEnabled: (data.offline_enabled as boolean | null) ?? DEFAULT_ALARM_PREFS.offlineEnabled,
    offlineRemindMin: (data.offline_remind_min as number | null) ?? DEFAULT_ALARM_PREFS.offlineRemindMin,
  }
}

/**
 * 네이티브 앱에서만 동작한다(웹에서는 즉시 반환). 현재 진행 중인 타이머 목록을 기준으로
 * 기기의 예약 알림을 완전히 다시 맞춘다 — 더 이상 진행 중이 아닌 타이머의 알림은 취소하고,
 * 진행 중인 타이머는 완료 시각(+ 설정된 사전 알림 시각)에 하나씩 예약한다.
 * 완료 알림은 웹 푸시(dispatch-push)와 같은 제목/본문을 쓰도록 src/game/describeTimer 를 공유한다.
 */
export async function syncLocalAlarms(timers: TimerRow[], accounts: AccountRow[] = []): Promise<void> {
  if (!isNative()) return

  const perm = await LocalNotifications.checkPermissions()
  if (perm.display !== 'granted') {
    const req = await LocalNotifications.requestPermissions()
    if (req.display !== 'granted') return // 거부됨 — 예약 없이 조용히 종료
  }

  const now = Date.now()
  const active = timers.filter(t => new Date(t.ends_at).getTime() > now)
  const prefs = await fetchAlarmPrefs()

  // 오프라인 보상은 "지금 보상 받음"을 누른 계정만 대상이고, 한도가 이미 지난 계정은 알릴 게 없다.
  const offlineDue = prefs.offlineEnabled
    ? accounts.flatMap(a => {
        if (!a.offline_claimed_at) return []
        const fullAt = new Date(a.offline_claimed_at).getTime() + offlineCapSec(a.offline_time_lv) * 1000
        const at = fullAt - prefs.offlineRemindMin * 60_000
        return at > now ? [{ account: a, at, minutesLeft: prefs.offlineRemindMin }] : []
      })
    : []

  const pending = await LocalNotifications.getPending()
  const wantedIds = new Set<number>()
  for (const t of active) {
    wantedIds.add(completionId(t.id))
    wantedIds.add(preAlertId(t.id))
  }
  for (const o of offlineDue) wantedIds.add(offlineId(o.account.id))
  const stale = pending.notifications.filter(n => !wantedIds.has(n.id))
  if (stale.length > 0) {
    await LocalNotifications.cancel({ notifications: stale.map(n => ({ id: n.id })) })
  }

  if (active.length === 0 && offlineDue.length === 0) return

  const accountIds = [...new Set([...active.map(t => t.account_id), ...offlineDue.map(o => o.account.id)])]
  const accountInfo = await fetchAccountInfo(accountIds)
  const preAlertMin = prefs.preAlertMin

  const notifications: LocalNotificationSchema[] = []

  for (const o of offlineDue) {
    const info = accountInfo.get(o.account.id)
    if (!info) continue
    notifications.push({
      id: offlineId(o.account.id),
      title: notificationTitle(info.serverName, info.nickname),
      body: offlineAlertBody(o.minutesLeft),
      schedule: { at: new Date(o.at), allowWhileIdle: true },
    })
  }

  for (const t of active) {
    const info = accountInfo.get(t.account_id)
    if (!info) continue // 계정 조회 실패 — 이 타이머는 이번 동기화에서 건너뛴다
    const title = notificationTitle(info.serverName, info.nickname)
    const endsAt = new Date(t.ends_at)

    notifications.push({
      id: completionId(t.id),
      title,
      body: completionBody(t),
      schedule: { at: endsAt, allowWhileIdle: true },
    })

    if (preAlertMin > 0) {
      const preAt = new Date(endsAt.getTime() - preAlertMin * 60_000)
      if (preAt.getTime() > now) {
        notifications.push({
          id: preAlertId(t.id),
          title,
          body: preAlertBody(t, preAlertMin),
          schedule: { at: preAt, allowWhileIdle: true },
        })
      }
    }
  }

  if (notifications.length > 0) {
    await LocalNotifications.schedule({ notifications })
  }
}
