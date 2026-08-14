import { createClient } from 'jsr:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT')!,      // 예: mailto:you@example.com
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
)

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const KIND_LABEL: Record<string, string> = {
  egg: '알 부화', tech: '기술 연구', forge: '대장간 업그레이드',
}

Deno.serve(async () => {
  const now = new Date()
  // 24시간 넘게 발송 실패로 재시도 중인 타이머는 더 이상 의미가 없으므로 스캔에서 제외한다.
  const giveUpBefore = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

  const { data: due, error } = await admin
    .from('timers')
    .select('id, user_id, account_id, kind, meta, accounts(nickname, servers(name))')
    .lte('ends_at', now.toISOString())
    .gte('ends_at', giveUpBefore)
    .is('notified_at', null)
    .is('completed_at', null)
    .limit(500)

  if (error) return new Response(error.message, { status: 500 })
  if (!due?.length) return Response.json({ sent: 0 })

  let sent = 0
  for (const t of due) {
    const acc = t.accounts as unknown as { nickname: string; servers: { name: string } }
    const title = `${acc.servers.name} / ${acc.nickname}`
    const body = `${KIND_LABEL[t.kind] ?? t.kind} 완료`

    const { data: subs } = await admin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', t.user_id)

    let delivered = 0
    let gone = 0
    for (const s of subs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ title, body, tag: t.id, url: `/account/${t.account_id}` }),
        )
        delivered++
      } catch (e) {
        // 410 Gone / 404 = 만료된 구독. 정리한다.
        const status = (e as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) {
          await admin.from('push_subscriptions').delete().eq('id', s.id)
          gone++
        }
        // 그 외 오류는 일시적일 수 있으므로 notified_at 을 찍지 않고 다음 틱에 재시도한다
      }
    }

    // 보낼 구독이 아예 없거나(보낼 곳 없음), 하나라도 성공했거나,
    // 남은 구독이 전부 만료(404/410)로 정리된 경우에만 발송 완료로 표시한다.
    const nothingLeftToRetry = (subs?.length ?? 0) === 0 || delivered > 0 || gone === (subs?.length ?? 0)
    if (nothingLeftToRetry) {
      await admin.from('timers')
        .update({ notified_at: new Date().toISOString() })
        .eq('id', t.id)
      sent += delivered
    }
  }

  return Response.json({ sent, timers: due.length })
})
