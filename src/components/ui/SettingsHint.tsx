import { Link } from 'react-router-dom'

interface Props {
  accountId: string
  message: string
}

/** 계정별 설정 확인이 필요할 때 보여주는 정보성 안내 — 에러가 아니라 힌트 */
export function SettingsHint({ accountId, message }: Props) {
  return (
    <p style={{ color: 'var(--text-dim)', fontSize: 'var(--fs-sm)' }}>
      {message}{' '}
      <Link to={`/account/${accountId}/settings`}>계정별 상세설정</Link>
    </p>
  )
}
