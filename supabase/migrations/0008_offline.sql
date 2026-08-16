-- 오프라인 보상 한도 알림.
-- 게임을 끈 뒤 보상이 쌓이다가 한도에서 멈추고, 그 뒤 시간은 그냥 버려진다.
-- 한도에 닿기 전에 알려서 보상을 놓치지 않게 한다.

-- 계정별 "최대 오프라인 시간" 노드 단계. 한도 = 4시간 x (1 + 0.16 x 단계) — 25단계에서 20시간.
alter table accounts
  add column if not exists offline_time_lv int not null default 0
    check (offline_time_lv between 0 and 25);

-- 마지막으로 오프라인 보상을 받은 시각. null 이면 아직 한 번도 안 눌렀다는 뜻이고 알림 대상이 아니다.
alter table accounts add column if not exists offline_claimed_at timestamptz;

-- 이번 사이클의 알림을 보냈는지. 보상을 다시 받을 때 null 로 되돌려 다음 사이클을 연다.
alter table accounts add column if not exists offline_alerted_at timestamptz;

-- 크론이 매분 훑는 경로. 아직 안 알린 계정만 남기므로 발송 대상이 적을수록 짧아진다.
create index if not exists accounts_offline_due_idx
  on accounts (offline_claimed_at)
  where offline_claimed_at is not null and offline_alerted_at is null;

alter table notification_prefs
  add column if not exists offline_enabled boolean not null default true;

-- 한도 도달 몇 분 전에 알릴지. 0 = 도달하는 순간에 알림. 상한 720분(12시간)은 최대 한도 20시간보다 작다.
alter table notification_prefs
  add column if not exists offline_remind_min int not null default 60
    check (offline_remind_min between 0 and 720);
