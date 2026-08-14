alter table servers            enable row level security;
alter table accounts           enable row level security;
alter table timers             enable row level security;
alter table daily_quests       enable row level security;
alter table push_subscriptions enable row level security;
alter table notification_prefs enable row level security;

create policy own_servers on servers
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_accounts on accounts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_timers on timers
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_quests on daily_quests
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_subs on push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_prefs on notification_prefs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
