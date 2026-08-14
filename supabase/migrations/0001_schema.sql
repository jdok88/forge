create table servers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  server_id uuid not null references servers on delete cascade,
  nickname text not null,
  color text not null default '#7c8cff',
  forge_level int not null default 1 check (forge_level between 1 and 35),
  forge_speed_lv int not null default 0 check (forge_speed_lv between 0 and 25),
  forge_cost_lv  int not null default 0 check (forge_cost_lv  between 0 and 25),
  tech_speed_lv  int not null default 0 check (tech_speed_lv  between 0 and 25),
  tech_cost_lv   int not null default 0 check (tech_cost_lv   between 0 and 25),
  egg_speed_lv jsonb not null default
    '{"common":0,"rare":0,"epic":0,"legendary":0,"ultimate":0,"mythic":0}'::jsonb,
  gold_per_min   numeric,
  hammer_per_min numeric,
  potion_per_day numeric,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table timers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  account_id uuid not null references accounts on delete cascade,
  kind text not null check (kind in ('egg','tech','forge')),
  slot int not null default 1,
  meta jsonb not null default '{}'::jsonb,
  auto_sec int,
  is_manual boolean not null default false,
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  notified_at timestamptz,
  completed_at timestamptz
);

-- 같은 계정의 같은 슬롯에 활성 타이머는 하나뿐
create unique index timers_active_slot_uniq
  on timers (account_id, kind, slot)
  where completed_at is null;

-- 크론이 매분 스캔하는 경로
create index timers_due_idx
  on timers (ends_at)
  where completed_at is null and notified_at is null;

create table daily_quests (
  user_id uuid not null references auth.users on delete cascade,
  account_id uuid not null references accounts on delete cascade,
  quest_date date not null,
  quest_key text not null,
  done_count int not null default 0,
  primary key (account_id, quest_date, quest_key)
);

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create table notification_prefs (
  user_id uuid primary key references auth.users on delete cascade,
  daily_quest_enabled boolean not null default true,
  daily_quest_remind_hours_before int not null default 2
);
