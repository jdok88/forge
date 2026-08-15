import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Button } from './ui/Button'

function translateError(message: string): string {
  if (message === 'User already registered') return '이미 가입된 이메일입니다. 다른 이메일을 사용해 주세요.'
  return message
}

/**
 * 게스트 → 정식 계정 전환 폼. supabase.auth.updateUser 로 auth.users.id 를 유지한 채
 * 이메일/비밀번호만 붙이므로 서버·계정·타이머는 그대로 이어진다.
 * 홈 배너와 설정 화면의 계정 섹션이 이 컴포넌트를 함께 쓴다.
 */
export function GuestUpgradeForm() {
  const [expanded, setExpanded] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!email.trim()) {
      setError('이메일을 입력해 주세요.')
      return
    }
    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.')
      return
    }

    setBusy(true)
    try {
      const { error } = await supabase.auth.updateUser({ email, password })
      if (error) {
        setError(translateError(error.message))
        return
      }
      await supabase.auth.getUser()
      setDone(true)
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return <p>계정이 만들어졌습니다. 이제 다른 기기에서도 로그인할 수 있습니다.</p>
  }

  return (
    <>
      <p>
        게스트 모드로 이용 중입니다. 이 기기를 잃어버리거나 브라우저 저장소를 지우면
        데이터를 복구할 수 없습니다. 이메일을 등록하면 지금 데이터를 그대로 유지한 채
        정식 계정으로 전환됩니다.
      </p>
      {!expanded && (
        <Button onClick={() => setExpanded(true)}>계정 만들기</Button>
      )}
      {expanded && (
        <form onSubmit={submit}>
          <input
            type="email" required value={email} placeholder="이메일"
            autoComplete="email"
            onChange={e => setEmail(e.target.value)}
          />
          <input
            type="password" required value={password} placeholder="비밀번호"
            autoComplete="new-password"
            onChange={e => setPassword(e.target.value)}
          />
          <Button type="submit" variant="primary" disabled={busy}>계정 만들기</Button>
          {error && <p role="alert" style={{ color: 'var(--danger)' }}>{error}</p>}
        </form>
      )}
    </>
  )
}
