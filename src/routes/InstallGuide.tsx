import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { subscribePush, type PushFailure } from '../lib/push'
import { isNative } from '../lib/nativeAlarm'
import { isIos } from '../lib/browser'
import { PushHelp } from '../components/PushHelp'
import { supabase } from '../lib/supabase'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  // iOS Safari 전용 플래그
  (navigator as unknown as { standalone?: boolean }).standalone === true

interface Diagnostics {
  secure: boolean
  serviceWorker: boolean
  pushManager: boolean
  permission: NotificationPermission | 'unsupported'
  subscription: boolean
  serverSaved: boolean
}

/** 원격 사용자가 "알림이 안 와요" 라고 할 때, 어느 단계에서 끊겼는지 진단한다. */
function useDiagnostics() {
  const [diag, setDiag] = useState<Diagnostics | null>(null)

  useEffect(() => {
    let cancelled = false
    async function run() {
      const secure = window.isSecureContext !== false
      const serviceWorker = 'serviceWorker' in navigator
      const pushManager = 'PushManager' in window
      const permission = typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'

      let subscription = false
      let serverSaved = false
      try {
        if (serviceWorker && pushManager) {
          const reg = await navigator.serviceWorker.ready
          const sub = await reg.pushManager.getSubscription()
          subscription = !!sub
          if (sub) {
            const { data: u } = await supabase.auth.getUser()
            if (u.user) {
              const { data } = await supabase
                .from('push_subscriptions')
                .select('id')
                .eq('user_id', u.user.id)
                .eq('endpoint', sub.endpoint)
                .maybeSingle()
              serverSaved = !!data
            }
          }
        }
      } catch {
        // 진단 중 오류는 해당 항목을 미확인(✗)으로 남긴다
      }

      if (!cancelled) setDiag({ secure, serviceWorker, pushManager, permission, subscription, serverSaved })
    }
    void run()
    return () => { cancelled = true }
  }, [])

  return diag
}

function DiagRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li style={{ color: ok ? 'var(--success)' : 'var(--danger)' }}>
      {ok ? '✓' : '✗'} {label}
    </li>
  )
}

function Diagnostics() {
  const diag = useDiagnostics()
  if (!diag) return <p style={{ color: 'var(--text-dim)' }}>진단 확인 중…</p>

  const permissionLabel =
    diag.permission === 'granted' ? '허용'
    : diag.permission === 'denied' ? '차단'
    : '미결정'

  return (
    <ul style={{ listStyle: 'none', padding: 0 }}>
      <DiagRow ok={diag.secure} label="보안 연결" />
      <DiagRow ok={diag.serviceWorker} label="서비스 워커" />
      <DiagRow ok={diag.pushManager} label="푸시 지원" />
      <DiagRow ok={diag.permission === 'granted'} label={`권한 (${permissionLabel})`} />
      <DiagRow ok={diag.subscription} label={`브라우저 구독 (${diag.subscription ? '있음' : '없음'})`} />
      <DiagRow ok={diag.serverSaved} label={`서버 저장 (${diag.serverSaved ? '있음' : '없음'})`} />
    </ul>
  )
}

export function InstallGuide() {
  const [okMessage, setOkMessage] = useState<string | null>(null)
  const [reason, setReason] = useState<PushFailure | null>(null)
  const [detail, setDetail] = useState<string | undefined>(undefined)
  const [busy, setBusy] = useState(false)

  async function enable() {
    setBusy(true)
    try {
      const r = await subscribePush()
      if (r.ok) {
        setOkMessage('푸시 알림이 켜졌습니다.')
        setReason(null)
        setDetail(undefined)
      } else {
        setOkMessage(null)
        setReason(r.reason)
        setDetail(r.detail)
      }
    } catch (e) {
      setOkMessage(null)
      setReason('subscribe-failed')
      setDetail(String(e))
    } finally {
      setBusy(false)
    }
  }

  if (isNative()) {
    return (
      <div>
        <Link to="/">← 홈</Link>
        <h1>알림 설정</h1>
        <p>
          이 앱은 타이머가 완료되면 기기가 직접 알림을 울립니다. 브라우저 푸시 알림과 달리
          별도로 켤 필요가 없습니다.
        </p>
      </div>
    )
  }

  return (
    <div>
      <Link to="/">← 홈</Link>
      <h1>알림 설정</h1>

      {isIos() && !isStandalone() && (
        <Card style={{ marginBottom: 'var(--sp-3)' }}>
          <h2>iPhone / iPad</h2>
          <p>
            iOS는 <strong>홈 화면에 추가</strong>한 뒤에만 알림을 받을 수 있습니다.
            (브라우저 탭 상태로는 불가능합니다)
          </p>
          <p>
            <strong>Safari 에서 열어야 합니다.</strong> Chrome·Firefox 등 다른 브라우저에서는
            홈 화면에 추가해도 알림을 받을 수 없습니다.
          </p>
          <ol>
            <li>Safari 하단의 <strong>공유</strong> 버튼을 누릅니다</li>
            <li><strong>홈 화면에 추가</strong>를 선택합니다</li>
            <li>홈 화면에 생긴 아이콘으로 앱을 다시 엽니다</li>
            <li>이 화면에서 <strong>푸시 알림 켜기</strong>를 누릅니다</li>
          </ol>
        </Card>
      )}

      {isIos() && isStandalone() && (
        <Card style={{ marginBottom: 'var(--sp-3)' }}>
          <h2>iPhone / iPad</h2>
          <p>이미 홈 화면에 추가된 상태입니다. 아래 버튼으로 알림을 켜세요.</p>
        </Card>
      )}

      {!isIos() && (
        <section>
          <h2>Android</h2>
          <p>아래 버튼을 누르고 알림을 허용하면 됩니다. 홈 화면에 추가하면 더 안정적입니다.</p>
        </section>
      )}

      <p style={{ color: 'var(--text-dim)' }}>
        타이머가 완료되면 휴대폰 알림 창에 표시됩니다. 앱을 닫아도 옵니다.
      </p>
      <Button variant="primary" onClick={() => void enable()} disabled={busy}>푸시 알림 켜기</Button>
      <p style={{ color: 'var(--text-dim)', fontSize: 'var(--fs-sm)' }}>
        시계 알람처럼 크게 울리지는 않습니다. 기본 알림음이 울리며, 휴대폰의 알림 설정에 따라 무음일 수 있습니다.
      </p>
      {okMessage && <p>{okMessage}</p>}
      {reason && <PushHelp reason={reason} detail={detail} />}

      <h2>진단</h2>
      <p style={{ color: 'var(--text-dim)' }}>알림이 안 온다고 느껴지면 아래 항목을 확인해 주세요.</p>
      <Diagnostics />
    </div>
  )
}
