-- 완료 n분 전 사전 알림 + 일일퀘스트 리셋 전 알림을 위한 스키마 확장.

-- 사전 알림을 이미 보냈는지 기록한다. 완료 알림의 notified_at 과 별개로 관리해야
-- 사전 1회 + 완료 1회가 각각 정확히 한 번씩 발송된다.
alter table timers add column if not exists pre_notified_at timestamptz;

-- 사전 알림 대상 스캔 경로. 완료 알림용 timers_due_idx 와 조건이 달라 별도 인덱스가 필요하다.
create index if not exists timers_pre_due_idx
  on timers (ends_at)
  where completed_at is null and pre_notified_at is null;

-- 전역 사용자 설정. 계정별이 아니라 사용자당 한 행이다(단순성 우선).
alter table notification_prefs
  add column if not exists pre_alert_min int not null default 5
    check (pre_alert_min between 0 and 120);

-- 일일퀘스트 리셋 전 알림을 보낸 날짜. 하루 한 번만 보내기 위한 멱등 키.
alter table notification_prefs
  add column if not exists quest_alerted_date date;

-- 리셋 몇 시간 전에 알릴지. 기존 daily_quest_remind_hours_before 를 그대로 쓰되
-- 기본값을 1시간으로 낮춘다(사용자 요청).
alter table notification_prefs
  alter column daily_quest_remind_hours_before set default 1;
