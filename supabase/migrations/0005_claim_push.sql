-- 브라우저 푸시 endpoint 는 기기 1개당 1개이며, 소유자는 "마지막으로 알림을 켠 사용자"다.
-- 같은 기기에서 로그아웃 후 다른 계정(게스트 포함)으로 알림을 켜면 endpoint 는 그대로인데
-- 행 소유자가 달라, RLS 의 USING 조건 때문에 upsert 의 UPDATE 경로가 막힌다.
-- (실제 오류: new row violates row-level security policy (USING expression))
--
-- 소유권 이전을 명시적으로 처리하는 함수를 둔다. security definer 로 RLS 를 우회하지만
-- 본문에서 auth.uid() 를 직접 확인하고, 호출자 자신의 행만 만들 수 있으므로 안전하다.
create or replace function public.claim_push_subscription(
  p_endpoint   text,
  p_p256dh     text,
  p_auth       text,
  p_user_agent text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception '로그인이 필요합니다';
  end if;

  -- 이 기기의 기존 구독은 소유자가 누구였든 회수한다.
  delete from public.push_subscriptions where endpoint = p_endpoint;

  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (uid, p_endpoint, p_p256dh, p_auth, p_user_agent);
end;
$$;

-- 비로그인(anon) 은 호출할 수 없다. 익명 로그인 사용자는 authenticated 역할이므로 포함된다.
revoke execute on function public.claim_push_subscription(text, text, text, text) from public, anon;
grant  execute on function public.claim_push_subscription(text, text, text, text) to authenticated;
