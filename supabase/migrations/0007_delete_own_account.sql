-- 회원탈퇴. 클라이언트는 auth.users 를 직접 지울 수 없으므로 security definer 함수로 처리한다.
-- 본문에서 auth.uid() 를 확인하고 호출자 자신만 삭제하므로, 남의 계정은 지울 수 없다.
-- servers/accounts/timers/daily_quests/push_subscriptions/notification_prefs 는
-- 전부 auth.users 에 on delete cascade 로 걸려 있어 함께 정리된다.
create or replace function public.delete_own_account()
returns void
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
  delete from auth.users where id = uid;
end;
$$;

revoke execute on function public.delete_own_account() from public, anon;
grant  execute on function public.delete_own_account() to authenticated;
