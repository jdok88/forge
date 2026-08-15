import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { Card } from './ui/Card'
import { Button } from './ui/Button'

function isAnonymous(session: Session | null): boolean {
  if (!session) return false
  const anyUser = session.user as unknown as { is_anonymous?: boolean }
  if (typeof anyUser.is_anonymous === 'boolean') return anyUser.is_anonymous
  return !session.user.email
}

function translateError(message: string): string {
  if (message === 'User already registered') return '이미 가입된 이메일입니다. 다른 이메일을 사용해 주세요.'
  return message
}

export function GuestUpgradeBanner() {
  const [anonymous, setAnonymous] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAnonymous(isAnonymous(data.session)))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAnonymous(isAnonymous(s)))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (!anonymous || done) return null

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

  return (
    <Card style={{ marginBottom: 'var(--sp-3)' }}>
      {done ? (
        <p>계정이 만들어졌습니다. 이제 다른 기기에서도 로그인할 수 있습니다.</p>
      ) : (
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
      )}
    </Card>
  )
}
