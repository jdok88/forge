import { useState } from 'react'
import { supabase } from '../lib/supabase'

function translateError(message: string): string {
  if (message === 'Invalid login credentials') return '이메일 또는 비밀번호가 올바르지 않습니다.'
  if (message === 'User already registered') return '이미 가입된 이메일입니다. 로그인해 주세요.'
  return message
}

export function Login() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [guestBusy, setGuestBusy] = useState(false)
  const [guestError, setGuestError] = useState<string | null>(null)

  async function startGuest() {
    setGuestError(null)
    setGuestBusy(true)
    try {
      const { error } = await supabase.auth.signInAnonymously()
      if (error) setGuestError(translateError(error.message))
    } finally {
      setGuestBusy(false)
    }
  }

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
      const { error } =
        mode === 'login'
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({ email, password })
      if (error) setError(translateError(error.message))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit}>
      <h1>Forge 알람</h1>
      <input
        type="email" required value={email} placeholder="이메일"
        autoComplete="email"
        onChange={e => setEmail(e.target.value)}
      />
      <input
        type="password" required value={password} placeholder="비밀번호"
        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        onChange={e => setPassword(e.target.value)}
      />
      <button type="submit" disabled={busy}>
        {mode === 'login' ? '로그인' : '회원가입'}
      </button>
      {error && <p role="alert" style={{ color: 'var(--danger)' }}>{error}</p>}
      <p>
        <button
          type="button"
          onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null) }}
        >
          {mode === 'login' ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
        </button>
      </p>

      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: 'var(--sp-4) 0' }} />
      <p style={{ color: 'var(--text-dim)', fontSize: 'var(--fs-sm)', textAlign: 'center' }}>또는</p>

      <button type="button" disabled={guestBusy} onClick={() => void startGuest()}>
        게스트로 시작
      </button>
      <p style={{ color: 'var(--text-dim)', fontSize: 'var(--fs-sm)' }}>
        가입 없이 바로 사용할 수 있습니다. 다만 <strong>이 기기에서만</strong> 데이터가 유지되며,
        브라우저 저장소를 지우거나 다른 기기에서 접속하면 복구할 수 없습니다.
        나중에 설정에서 이메일을 등록하면 정식 계정으로 전환됩니다.
      </p>
      {guestError && <p role="alert" style={{ color: 'var(--danger)' }}>{guestError}</p>}
    </form>
  )
}
