import { supabase } from './supabase'

export function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(normalized)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export type PushResult =
  | 'ok'
  | 'denied'
  | 'no-serviceworker'   // navigator.serviceWorker 없음 — 대개 인앱 브라우저
  | 'no-pushmanager'     // PushManager 없음 — iOS Safari 미설치 상태 등
  | 'insecure'           // 보안 컨텍스트가 아님 (https 아님)

export async function subscribePush(): Promise<PushResult> {
  if (window.isSecureContext === false) return 'insecure'
  if (!('serviceWorker' in navigator)) return 'no-serviceworker'
  if (!('PushManager' in window)) return 'no-pushmanager'

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return 'denied'

  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY),
  })

  const json = sub.toJSON()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('로그인이 필요합니다')

  await supabase.from('push_subscriptions').upsert({
    user_id: userData.user.id,
    endpoint: sub.endpoint,
    p256dh: json.keys!.p256dh,
    auth: json.keys!.auth,
    user_agent: navigator.userAgent,
  }, { onConflict: 'endpoint' })

  return 'ok'
}

export async function unsubscribePush(): Promise<void> {
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return
  await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
  await sub.unsubscribe()
}
