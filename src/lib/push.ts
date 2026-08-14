import { supabase } from './supabase'

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

  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: userData.user.id,
    endpoint: sub.endpoint,
    p256dh: json.keys!.p256dh,
    auth: json.keys!.auth,
    user_agent: navigator.userAgent,
  }, { onConflict: 'endpoint' })

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
