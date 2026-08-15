import type { Session } from '@supabase/supabase-js'
import { useSession } from './useSession'

function isAnonymousSession(session: Session | null): boolean {
  if (!session) return false
  const anyUser = session.user as unknown as { is_anonymous?: boolean }
  if (typeof anyUser.is_anonymous === 'boolean') return anyUser.is_anonymous
  return !session.user.email
}

/** 현재 세션이 게스트(익명) 계정인지 — 홈 배너와 설정 화면의 계정 섹션이 공유한다 */
export function useIsAnonymous() {
  const { session, loading } = useSession()
  return { anonymous: isAnonymousSession(session), session, loading }
}
