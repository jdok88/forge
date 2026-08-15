import { useEffect, useRef } from 'react'
import { useTimers } from './useTimers'
import { isNative, syncLocalAlarms } from '../lib/nativeAlarm'

export function useForegroundAlarm() {
  const { timers, reload } = useTimers()
  const fired = useRef<Set<string>>(new Set())

  // useTimers 는 최초 1회만 조회한다. 앱이 열려 있는 동안 새로 시작된 타이머를
  // 예약하려면 주기적으로 다시 읽어야 한다. 30초면 8분짜리 알도 넉넉히 앞서 잡힌다.
  // (네이티브에서도 필요하다 — 새로 시작된 타이머를 syncLocalAlarms 가 알아채는 유일한 경로다)
  useEffect(() => {
    const id = window.setInterval(() => { void reload() }, 30_000)
    return () => clearInterval(id)
  }, [reload])

  useEffect(() => {
    // 네이티브: OS 가 예약된 로컬 알림을 직접 울리므로 브라우저 Notification/setTimeout 은 필요 없다.
    if (isNative()) {
      void syncLocalAlarms(timers)
      return
    }

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
