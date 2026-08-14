create extension if not exists pg_cron;
create extension if not exists pg_net;

-- dispatch-push 는 --no-verify-jwt 로 배포되므로 Authorization 헤더가 필요 없다.
-- 배포 시 아래 <PROJECT_REF> 를 실제 프로젝트 참조값으로 바꾼 뒤 실행할 것.
select cron.schedule(
  'dispatch-push-every-minute',
  '* * * * *',
  $$
  select net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/dispatch-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body    := '{}'::jsonb
  );
  $$
);
