import { useState } from 'react'
import { Link } from 'react-router-dom'
import { subscribePush, type PushFailure } from '../lib/push'
import { isIos } from '../lib/browser'
import { PushHelp } from '../components/PushHelp'

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  // iOS Safari 전용 플래그
  (navigator as unknown as { standalone?: boolean }).standalone === true

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
        setOkMessage('알림이 켜졌습니다.')
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

  return (
    <div>
      <Link to="/">← 홈</Link>
      <h1>알림 설정</h1>

      {isIos() && !isStandalone() && (
        <section style={{ background: 'var(--surface-2)', padding: 'var(--sp-4)', borderRadius: 'var(--r-md)' }}>
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
            <li>이 화면에서 <strong>알림 켜기</strong>를 누릅니다</li>
          </ol>
        </section>
      )}

      {isIos() && isStandalone() && (
        <section style={{ background: 'var(--surface-2)', padding: 'var(--sp-4)', borderRadius: 'var(--r-md)' }}>
          <h2>iPhone / iPad</h2>
          <p>이미 홈 화면에 추가된 상태입니다. 아래 버튼으로 알림을 켜세요.</p>
        </section>
      )}

      {!isIos() && (
        <section>
          <h2>Android</h2>
          <p>아래 버튼을 누르고 알림을 허용하면 됩니다. 홈 화면에 추가하면 더 안정적입니다.</p>
        </section>
      )}

      <button type="button" onClick={() => void enable()} disabled={busy}>알림 켜기</button>
      {okMessage && <p>{okMessage}</p>}
      {reason && <PushHelp reason={reason} detail={detail} />}
    </div>
  )
}
