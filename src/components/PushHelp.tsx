import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { PushFailure } from '../lib/push'
import { isInAppBrowser, inAppBrowserName, isIos } from '../lib/browser'

type Props = { reason: PushFailure; detail?: string }

function Detail({ detail }: { detail?: string }) {
  if (!detail) return null
  return (
    <p style={{ color: 'var(--text-dim)', fontSize: 'var(--fs-sm)' }}>
      오류: <code style={{ wordBreak: 'break-all' }}>{detail}</code>
    </p>
  )
}

export function PushHelp({ reason, detail }: Props) {
  const result = reason
  let body: ReactNode

  if ((result === 'no-serviceworker' || result === 'no-pushmanager') && isInAppBrowser()) {
    const name = inAppBrowserName() ?? '이 앱'
    body = (
      <div>
        <p style={{ color: 'var(--danger)' }}>
          {name}의 인앱 브라우저에서 열려 있어 알림을 받을 수 없습니다.
        </p>
        <p style={{ color: 'var(--text-dim)' }}>
          우측 상단 <strong>⋮ 또는 ⋯ 메뉴</strong> → <strong>다른 브라우저로 열기</strong> /{' '}
          <strong>Chrome으로 열기</strong>를 눌러 주세요.
        </p>
        <p style={{ color: 'var(--text-dim)' }}>
          또는 Chrome 을 직접 열고 주소창에 <strong>forgealarm.pages.dev</strong> 를 입력하세요.
        </p>
      </div>
    )
  } else if (result === 'no-pushmanager' && !isInAppBrowser() && isIos()) {
    body = (
      <div>
        <p style={{ color: 'var(--danger)' }}>iOS에서는 알림을 받으려면 먼저 설치가 필요합니다.</p>
        <p style={{ color: 'var(--text-dim)' }}>
          Safari 에서 <strong>홈 화면에 추가</strong>한 뒤 다시 시도해 주세요.{' '}
          <Link to="/install">설치 안내 보기</Link>
        </p>
      </div>
    )
  } else if (result === 'no-serviceworker' || result === 'no-pushmanager') {
    body = (
      <p style={{ color: 'var(--danger)' }}>
        이 브라우저는 푸시 알림을 지원하지 않습니다. Chrome 또는 Samsung Internet 을 사용해 주세요.
      </p>
    )
  } else if (result === 'denied') {
    body = (
      <div>
        <p style={{ color: 'var(--danger)' }}>브라우저에서 알림이 차단되어 있습니다.</p>
        <p style={{ color: 'var(--text-dim)' }}>
          주소창 왼쪽 자물쇠 아이콘 → <strong>알림</strong> → <strong>허용</strong> 으로 바꾼 뒤
          다시 <strong>푸시 알림 켜기</strong>를 눌러 주세요.
        </p>
      </div>
    )
  } else if (result === 'insecure') {
    body = (
      <p style={{ color: 'var(--danger)' }}>
        알림은 https 연결에서만 받을 수 있습니다. 주소창의 주소를 확인해 주세요.
      </p>
    )
  } else if (result === 'sw-timeout') {
    body = (
      <p style={{ color: 'var(--danger)' }}>
        서비스 워커가 준비되지 않았습니다. 페이지를 완전히 닫았다가 다시 열어 주세요.
        그래도 안 되면 브라우저의 사이트 데이터를 지운 뒤 다시 시도해 주세요.
      </p>
    )
  } else if (result === 'subscribe-failed') {
    body = (
      <p style={{ color: 'var(--danger)' }}>
        알림 등록에 실패했습니다. 기기가 오프라인이거나 브라우저가 푸시 서비스에 연결하지 못했을 수 있습니다.
        잠시 후 다시 시도해 주세요.
      </p>
    )
  } else if (result === 'save-failed') {
    body = (
      <p style={{ color: 'var(--danger)' }}>
        알림 설정을 저장하지 못했습니다. 연결을 확인한 뒤 다시 시도해 주세요.
      </p>
    )
  } else {
    // 'not-signed-in'
    body = (
      <p style={{ color: 'var(--danger)' }}>
        로그인이 필요합니다. 다시 로그인한 뒤 시도해 주세요.
      </p>
    )
  }

  return (
    <div>
      {body}
      <Detail detail={detail} />
    </div>
  )
}
