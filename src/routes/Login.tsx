import { useState } from 'react'
import { supabase } from '../lib/supabase'

export function Login() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) setError(error.message)
    else setSent(true)
  }

  if (sent) {
    return <p>{email} 로 로그인 링크를 보냈습니다. 메일함을 확인하세요.</p>
  }

  return (
    <form onSubmit={send}>
      <h1>Forge 알람</h1>
      <input
        type="email" required value={email} placeholder="이메일"
        onChange={e => setEmail(e.target.value)}
      />
      <button type="submit">로그인 링크 받기</button>
      {error && <p role="alert">{error}</p>}
    </form>
  )
}
