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
    </form>
  )
}
