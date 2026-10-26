-- 碳果派 Supabase 初始化脚本（在 SQL Editor 中一次性执行）

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_self" on public.profiles;
create policy "profiles_select_self"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
  on public.profiles for update
  using (auth.uid() = id);

create table if not exists public.behavior_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  avoided_kg_co2e numeric(12,4) not null default 0,
  included_in_summary boolean not null default true,
  ef_version text,
  client_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, client_id)
);

create index if not exists behavior_logs_user_created_idx
  on public.behavior_logs (user_id, created_at desc);

alter table public.behavior_logs enable row level security;

drop policy if exists "behavior_logs_select_own" on public.behavior_logs;
create policy "behavior_logs_select_own"
  on public.behavior_logs for select
  using (auth.uid() = user_id);

drop policy if exists "behavior_logs_insert_own" on public.behavior_logs;
create policy "behavior_logs_insert_own"
  on public.behavior_logs for insert
  with check (auth.uid() = user_id);

drop policy if exists "behavior_logs_delete_own" on public.behavior_logs;
create policy "behavior_logs_delete_own"
  on public.behavior_logs for delete
  using (auth.uid() = user_id);

create table if not exists public.log_photos (
  id uuid primary key default gen_random_uuid(),
  log_client_id text not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null,
  source text not null,
  ai_category text not null,
  ai_title text not null,
  ai_summary text not null,
  ai_encouragement text not null,
  ai_confidence text not null,
  ai_tags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, log_client_id)
);

create index if not exists log_photos_user_created_idx
  on public.log_photos (user_id, created_at desc);

alter table public.log_photos enable row level security;

drop policy if exists "log_photos_select_own" on public.log_photos;
create policy "log_photos_select_own"
  on public.log_photos for select
  using (auth.uid() = user_id);

drop policy if exists "log_photos_insert_own" on public.log_photos;
create policy "log_photos_insert_own"
  on public.log_photos for insert
  with check (auth.uid() = user_id);

drop policy if exists "log_photos_update_own" on public.log_photos;
create policy "log_photos_update_own"
  on public.log_photos for update
  using (auth.uid() = user_id);

drop policy if exists "log_photos_delete_own" on public.log_photos;
create policy "log_photos_delete_own"
  on public.log_photos for delete
  using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('checkin-photos', 'checkin-photos', true)
on conflict (id) do nothing;

drop policy if exists "checkin_photos_select_own" on storage.objects;
create policy "checkin_photos_select_own"
  on storage.objects for select
  using (
    bucket_id = 'checkin-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "checkin_photos_insert_own" on storage.objects;
create policy "checkin_photos_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'checkin-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "checkin_photos_update_own" on storage.objects;
create policy "checkin_photos_update_own"
  on storage.objects for update
  using (
    bucket_id = 'checkin-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "checkin_photos_delete_own" on storage.objects;
create policy "checkin_photos_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'checkin-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
