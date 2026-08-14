import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

/**
 * 알림이 실제로 "켜져 있는지" 확인한다.
 * Notification.permission === 'granted' 만으로는 부족하다 — 권한만 허용되고
 * 구독이 저장되지 않은 상태(예: 서버 저장 실패)일 수 있기 때문이다.
 * 아래 네 가지가 모두 참이어야 활성으로 본다:
 *   권한 허용 + 서비스 워커 준비 + 브라우저 구독 존재 + 서버(push_subscriptions)에 저장됨
 */
export function useNotificationStatus() {
  const [active, setActive] = useState<boolean | null>(null)

  const refresh = useCallback(() => {
    setActive(null)
    void (async () => {
      try {
        if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
          setActive(false)
          return
        }
        if (!('serviceWorker' in navigator)) {
          setActive(false)
          return
        }
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (!sub) {
          setActive(false)
          return
        }
        const { data: u } = await supabase.auth.getUser()
        if (!u.user) {
          setActive(false)
          return
        }
        const { data } = await supabase
          .from('push_subscriptions')
          .select('id')
          .eq('user_id', u.user.id)
          .eq('endpoint', sub.endpoint)
          .maybeSingle()
        setActive(!!data)
      } catch {
        setActive(false)
      }
    })()
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return { active, refresh }
}
