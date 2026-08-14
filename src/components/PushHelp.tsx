import { Link } from 'react-router-dom'
import type { PushResult } from '../lib/push'
import { isInAppBrowser, inAppBrowserName, isIos } from '../lib/browser'

type Props = { result: Exclude<PushResult, 'ok'> }

export function PushHelp({ result }: Props) {
  if ((result === 'no-serviceworker' || result === 'no-pushmanager') && isInAppBrowser()) {
    const name = inAppBrowserName() ?? '이 앱'
    return (
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
  }

  if (result === 'no-pushmanager' && !isInAppBrowser() && isIos()) {
    return (
      <div>
        <p style={{ color: 'var(--danger)' }}>iOS에서는 알림을 받으려면 먼저 설치가 필요합니다.</p>
        <p style={{ color: 'var(--text-dim)' }}>
          Safari 에서 <strong>홈 화면에 추가</strong>한 뒤 다시 시도해 주세요.{' '}
          <Link to="/install">설치 안내 보기</Link>
        </p>
      </div>
    )
  }

  if (result === 'no-serviceworker' || result === 'no-pushmanager') {
    return (
      <p style={{ color: 'var(--danger)' }}>
        이 브라우저는 푸시 알림을 지원하지 않습니다. Chrome 또는 Samsung Internet 을 사용해 주세요.
      </p>
    )
  }

  if (result === 'denied') {
    return (
      <div>
        <p style={{ color: 'var(--danger)' }}>브라우저에서 알림이 차단되어 있습니다.</p>
        <p style={{ color: 'var(--text-dim)' }}>
          주소창 왼쪽 자물쇠 아이콘 → <strong>알림</strong> → <strong>허용</strong> 으로 바꾼 뒤
          다시 <strong>알림 켜기</strong>를 눌러 주세요.
        </p>
      </div>
    )
  }

  // 'insecure'
  return (
    <p style={{ color: 'var(--danger)' }}>
      알림은 https 연결에서만 받을 수 있습니다. 주소창의 주소를 확인해 주세요.
    </p>
  )
}
