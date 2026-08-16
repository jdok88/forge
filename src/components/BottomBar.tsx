import { useNavigate, useLocation } from 'react-router-dom'

/**
 * 화면 아래 고정된 뒤로/홈 바. 폰에서 화면 맨 위 링크는 엄지가 닿지 않아 아래로 내렸다.
 * 홈에서는 돌아갈 곳이 없으므로 표시하지 않는다.
 */
export function BottomBar() {
  const navigate = useNavigate()
  const { pathname, key } = useLocation()

  if (pathname === '/') return null

  // key === 'default' = 이 주소로 바로 들어온 첫 화면(알림 클릭 등). 뒤로 갈 기록이 없으므로 홈으로 보낸다.
  const goBack = () => (key === 'default' ? navigate('/') : navigate(-1))

  return (
    <>
      <div className="ui-bottom-bar-spacer" />
      <nav className="ui-bottom-bar">
        <button onClick={goBack}>← 뒤로</button>
        <button onClick={() => navigate('/')}>홈</button>
      </nav>
    </>
  )
}
