create extension if not exists pg_cron;
create extension if not exists pg_net;

-- dispatch-push 는 --no-verify-jwt 로 배포되므로 Authorization 헤더가 필요 없다.
-- 프로젝트 참조값은 클라이언트 번들에도 포함되는 공개 값이라 커밋해도 무방하다.
-- 다른 프로젝트로 옮길 때는 아래 URL 의 서브도메인만 바꾸면 된다.
select cron.schedule(
  'dispatch-push-every-minute',
  '* * * * *',
  $$
  select net.http_post(
    url     := 'https://khzliuwullyvfhfdeuvu.supabase.co/functions/v1/dispatch-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body    := '{}'::jsonb
  );
  $$
);
