import { useEffect, useRef } from 'react'
import { useTimers } from './useTimers'

export function useForegroundAlarm() {
  const { timers } = useTimers()
  const fired = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return

    const handles: number[] = []
    for (const t of timers) {
      if (fired.current.has(t.id)) continue
      const ms = new Date(t.ends_at).getTime() - Date.now()
      // 이미 지난 것은 서버 푸시가 처리한다. 25일 넘는 예약은 setTimeout 한계로 건너뛴다.
      if (ms <= 0 || ms > 2_147_483_647) continue

      handles.push(window.setTimeout(() => {
        fired.current.add(t.id)
        new Notification('타이머 완료', {
          body: t.kind === 'egg' ? '알 부화 완료' : t.kind === 'tech' ? '기술 연구 완료' : '대장간 업그레이드 완료',
          tag: t.id,   // 서버 푸시와 같은 tag → 중복 표시되지 않는다
        })
      }, ms))
    }

    return () => handles.forEach(clearTimeout)
  }, [timers])
}
