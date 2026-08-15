import { Capacitor } from '@capacitor/core'
import { LocalNotifications, type LocalNotificationSchema } from '@capacitor/local-notifications'
import { supabase } from './supabase'
import type { TimerRow } from '../hooks/useTimers'
import { completionBody, preAlertBody, notificationTitle } from '../game/describeTimer'

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

/** notification_prefs 가 없으면 웹 푸시와 같은 기본값(5분)을 쓴다. 0 = 사전 알림 사용 안 함. */
async function fetchPreAlertMin(): Promise<number> {
  const { data: u } = await supabase.auth.getUser()
  if (!u.user) return 5
  const { data } = await supabase
    .from('notification_prefs')
    .select('pre_alert_min')
    .eq('user_id', u.user.id)
    .maybeSingle()
  return (data?.pre_alert_min as number | undefined) ?? 5
}

/**
 * 네이티브 앱에서만 동작한다(웹에서는 즉시 반환). 현재 진행 중인 타이머 목록을 기준으로
 * 기기의 예약 알림을 완전히 다시 맞춘다 — 더 이상 진행 중이 아닌 타이머의 알림은 취소하고,
 * 진행 중인 타이머는 완료 시각(+ 설정된 사전 알림 시각)에 하나씩 예약한다.
 * 완료 알림은 웹 푸시(dispatch-push)와 같은 제목/본문을 쓰도록 src/game/describeTimer 를 공유한다.
 */
export async function syncLocalAlarms(timers: TimerRow[]): Promise<void> {
  if (!isNative()) return

  const perm = await LocalNotifications.checkPermissions()
  if (perm.display !== 'granted') {
    const req = await LocalNotifications.requestPermissions()
    if (req.display !== 'granted') return // 거부됨 — 예약 없이 조용히 종료
  }

  const now = Date.now()
  const active = timers.filter(t => new Date(t.ends_at).getTime() > now)

  const pending = await LocalNotifications.getPending()
  const wantedIds = new Set<number>()
  for (const t of active) {
    wantedIds.add(completionId(t.id))
    wantedIds.add(preAlertId(t.id))
  }
  const stale = pending.notifications.filter(n => !wantedIds.has(n.id))
  if (stale.length > 0) {
    await LocalNotifications.cancel({ notifications: stale.map(n => ({ id: n.id })) })
  }

  if (active.length === 0) return

  const accountIds = [...new Set(active.map(t => t.account_id))]
  const [accountInfo, preAlertMin] = await Promise.all([fetchAccountInfo(accountIds), fetchPreAlertMin()])

  const notifications: LocalNotificationSchema[] = []
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
