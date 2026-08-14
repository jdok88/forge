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
  const { data: due, error } = await admin
    .from('timers')
    .select('id, user_id, account_id, kind, meta, accounts(nickname, servers(name))')
    .lte('ends_at', new Date().toISOString())
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

    for (const s of subs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ title, body, tag: t.id, url: `/account/${t.account_id}` }),
        )
        sent++
      } catch (e) {
        // 410 Gone / 404 = 만료된 구독. 정리한다.
        const status = (e as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) {
          await admin.from('push_subscriptions').delete().eq('id', s.id)
        }
      }
    }

    await admin.from('timers')
      .update({ notified_at: new Date().toISOString() })
      .eq('id', t.id)
  }

  return Response.json({ sent, timers: due.length })
})
