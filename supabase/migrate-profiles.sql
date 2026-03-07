-- Create profiles table for role management
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'support' check (role in ('admin', 'support')),
  created_at timestamptz not null default now()
);

-- Enable RLS (service role bypasses this)
alter table profiles enable row level security;

-- Allow users to read their own profile
create policy "Users can read own profile"
  on profiles for select
  using (auth.uid() = id);

-- Set kimver.iman@perulatus.com as admin
insert into profiles (id, role)
values ('d4ca9d19-702a-4e5b-a6a1-7dcc6da89437', 'admin')
on conflict (id) do update set role = 'admin';
