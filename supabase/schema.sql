-- ============================================
-- AZH Monitoring - Full Schema Setup
-- Run this in Supabase SQL Editor
-- ============================================

-- EKV Records
create table if not exists ekv_records (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending' check (status in ('pending', 'success', 'failed')),
  payload jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Letter Records
create table if not exists letter_records (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending' check (status in ('pending', 'success', 'failed')),
  recipient text,
  payload jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Activity Logs
create table if not exists activity_logs (
  id uuid primary key default gen_random_uuid(),
  module text not null check (module in ('ekv', 'letter')),
  action text not null,
  record_id uuid,
  user_id uuid references auth.users(id) on delete set null,
  timestamp timestamptz not null default now()
);

-- ============================================
-- Auto-update updated_at on row changes
-- ============================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists ekv_records_updated_at on ekv_records;
create trigger ekv_records_updated_at
  before update on ekv_records
  for each row execute function update_updated_at();

drop trigger if exists letter_records_updated_at on letter_records;
create trigger letter_records_updated_at
  before update on letter_records
  for each row execute function update_updated_at();

-- ============================================
-- Indexes for faster queries
-- ============================================
create index if not exists ekv_records_status_idx on ekv_records (status);
create index if not exists ekv_records_created_at_idx on ekv_records (created_at desc);
create index if not exists letter_records_status_idx on letter_records (status);
create index if not exists letter_records_created_at_idx on letter_records (created_at desc);
create index if not exists activity_logs_timestamp_idx on activity_logs (timestamp desc);
create index if not exists activity_logs_module_idx on activity_logs (module);

-- ============================================
-- Row Level Security (only authenticated users)
-- ============================================
alter table ekv_records enable row level security;
alter table letter_records enable row level security;
alter table activity_logs enable row level security;

-- Authenticated users can read all records
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'ekv_records' and policyname = 'Authenticated read ekv') then
    create policy "Authenticated read ekv" on ekv_records for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'letter_records' and policyname = 'Authenticated read letters') then
    create policy "Authenticated read letters" on letter_records for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'activity_logs' and policyname = 'Authenticated read logs') then
    create policy "Authenticated read logs" on activity_logs for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'ekv_records' and policyname = 'Authenticated write ekv') then
    create policy "Authenticated write ekv" on ekv_records for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'letter_records' and policyname = 'Authenticated write letters') then
    create policy "Authenticated write letters" on letter_records for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'activity_logs' and policyname = 'Authenticated write logs') then
    create policy "Authenticated write logs" on activity_logs for all to authenticated using (true) with check (true);
  end if;
end $$;

-- ============================================
-- Seed sample data for testing
-- ============================================
insert into ekv_records (status, payload, error_message) values
  ('success', '{"ref": "EKV-001", "type": "standard"}', null),
  ('success', '{"ref": "EKV-002", "type": "express"}', null),
  ('pending', '{"ref": "EKV-003", "type": "standard"}', null),
  ('pending', '{"ref": "EKV-004", "type": "express"}', null),
  ('failed',  '{"ref": "EKV-005", "type": "standard"}', 'Connection timeout'),
  ('failed',  '{"ref": "EKV-006", "type": "express"}', 'Validation error: missing field');

insert into letter_records (status, recipient, payload, error_message) values
  ('success', 'Ahmad bin Ali',    '{"template": "welcome", "lang": "ms"}', null),
  ('success', 'Siti binti Omar',  '{"template": "reminder", "lang": "ms"}', null),
  ('pending', 'Lim Wei Ming',     '{"template": "notice", "lang": "en"}', null),
  ('pending', 'Raj Kumar',        '{"template": "welcome", "lang": "en"}', null),
  ('failed',  'Nurul Huda',       '{"template": "reminder", "lang": "ms"}', 'SMTP delivery failed'),
  ('failed',  'Hassan Ibrahim',   '{"template": "notice", "lang": "ms"}', 'Invalid recipient address');

insert into activity_logs (module, action, record_id) values
  ('ekv',    'Record created',        null),
  ('ekv',    'Status changed to success', null),
  ('letter', 'Record created',        null),
  ('letter', 'Delivery failed',       null),
  ('ekv',    'Record retried',        null),
  ('letter', 'Status changed to success', null);
