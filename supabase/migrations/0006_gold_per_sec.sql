-- 게임 내 표기에 맞춘다: 골드는 초당 획득량, 망치는 분당 획득량으로 안내된다.
-- 기존 값은 분당 기준이었으므로 60 으로 나눠 초당으로 환산한다.
alter table accounts rename column gold_per_min to gold_per_sec;
update accounts set gold_per_sec = gold_per_sec / 60 where gold_per_sec is not null;

comment on column accounts.gold_per_sec  is '초당 골드 획득량 (게임 내 표기 기준)';
comment on column accounts.hammer_per_min is '분당 망치 획득량 (게임 내 표기 기준)';
