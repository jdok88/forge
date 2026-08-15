import { supabase } from './supabase'
import { isNative } from './nativeAlarm'

export function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(normalized)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export type PushFailure =
  | 'denied' | 'no-serviceworker' | 'no-pushmanager' | 'insecure'
  | 'sw-timeout' | 'subscribe-failed' | 'save-failed' | 'not-signed-in'

export type PushOutcome =
  | { ok: true }
  | { ok: false; reason: PushFailure; detail?: string }

const SW_READY_TIMEOUT_MS = 10_000

export async function subscribePush(): Promise<PushOutcome> {
  // 네이티브 앱은 로컬 알림(syncLocalAlarms)이 완료/사전 알림을 모두 처리한다.
  // 웹 푸시 구독 자체가 불필요하므로 아무 것도 하지 않고 성공으로 반환한다.
  if (isNative()) return { ok: true }
  if (window.isSecureContext === false) return { ok: false, reason: 'insecure' }
  if (!('serviceWorker' in navigator)) return { ok: false, reason: 'no-serviceworker' }
  if (!('PushManager' in window)) return { ok: false, reason: 'no-pushmanager' }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return { ok: false, reason: 'denied' }

  let reg: ServiceWorkerRegistration
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    reg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('sw-timeout')), SW_READY_TIMEOUT_MS)
      }),
    ])
  } catch {
    return { ok: false, reason: 'sw-timeout' }
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }

  let sub: PushSubscription
  try {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY),
    })
  } catch (e) {
    return { ok: false, reason: 'subscribe-failed', detail: String(e) }
  }

  const json = sub.toJSON()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return { ok: false, reason: 'not-signed-in' }

  // endpoint의 소유자는 같은 기기에서 가장 최근에 알림을 켠 사용자여야 함.
  // upsert는 endpoint UNIQUE 충돌 시 UPDATE 경로를 타는데, RLS의
  // USING (user_id = auth.uid())가 기존 행(이전 사용자) 기준으로 평가되어
  // 다른 사용자가 소유한 행이면 거부된다. RPC(security definer)가 소유권 이전을 대신 처리.
  const { error } = await supabase.rpc('claim_push_subscription', {
    p_endpoint: sub.endpoint,
    p_p256dh: json.keys!.p256dh,
    p_auth: json.keys!.auth,
    p_user_agent: navigator.userAgent,
  })

  if (error) return { ok: false, reason: 'save-failed', detail: error.message }

  return { ok: true }
}

export async function unsubscribePush(): Promise<void> {
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return
  await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
  await sub.unsubscribe()
}
