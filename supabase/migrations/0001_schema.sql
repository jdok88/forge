create table servers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  constraint servers_id_user_uniq unique (id, user_id)
);

create table accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  server_id uuid not null,
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
  created_at timestamptz not null default now(),
  constraint accounts_id_user_uniq unique (id, user_id),
  constraint accounts_server_fk foreign key (server_id, user_id)
    references servers (id, user_id) on delete cascade
);

create table timers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  account_id uuid not null,
  kind text not null check (kind in ('egg','tech','forge')),
  slot int not null default 1,
  meta jsonb not null default '{}'::jsonb,
  auto_sec int,
  is_manual boolean not null default false,
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  notified_at timestamptz,
  completed_at timestamptz,
  constraint timers_account_fk foreign key (account_id, user_id)
    references accounts (id, user_id) on delete cascade
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
  account_id uuid not null,
  quest_date date not null,
  quest_key text not null,
  done_count int not null default 0,
  primary key (account_id, quest_date, quest_key),
  constraint daily_quests_account_fk foreign key (account_id, user_id)
    references accounts (id, user_id) on delete cascade
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

create index accounts_server_id_idx on accounts (server_id);
create index accounts_user_id_idx on accounts (user_id);
create index timers_account_id_idx on timers (account_id);
create index timers_user_id_idx on timers (user_id);
create index servers_user_id_idx on servers (user_id);
create index daily_quests_account_id_idx on daily_quests (account_id);
create index push_subscriptions_user_id_idx on push_subscriptions (user_id);
