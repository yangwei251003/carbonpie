-- 碳果派 P2：个人资料扩展 / 好友系统 / 好友可见动态（在 schema.sql 与 schema_p1.sql 之后执行）

create extension if not exists "pgcrypto";

-- ========= profiles 扩展字段 =========
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists intro text;
alter table public.profiles add column if not exists friend_code text;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

-- friend_code 唯一（存在时才创建）
do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'profiles_friend_code_unique'
  ) then
    create unique index profiles_friend_code_unique on public.profiles (friend_code);
  end if;
end $$;

create or replace function public.gen_friend_code()
returns text
language sql
stable
as $$
  select upper(substring(encode(gen_random_bytes(6), 'hex') from 1 for 8));
$$;

-- 补全历史用户的 friend_code
update public.profiles
set friend_code = public.gen_friend_code(),
    updated_at = now()
where friend_code is null or friend_code = '';

-- 确保新用户也有 friend_code（重写 handle_new_user，保持原逻辑兼容）
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, friend_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    public.gen_friend_code()
  )
  on conflict (id) do update set
    display_name = excluded.display_name,
    friend_code = coalesce(nullif(public.profiles.friend_code, ''), excluded.friend_code),
    updated_at = now();
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ========= 好友关系 =========
create table if not exists public.friendships (
  user_low uuid not null references public.profiles (id) on delete cascade,
  user_high uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_low, user_high)
);

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references public.profiles (id) on delete cascade,
  to_user uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending', -- pending/accepted/rejected/cancelled
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists friend_requests_to_status_idx
  on public.friend_requests (to_user, status, created_at desc);

alter table public.friendships enable row level security;
alter table public.friend_requests enable row level security;

drop policy if exists "friendships_select_involved" on public.friendships;
create policy "friendships_select_involved"
  on public.friendships for select
  using (auth.uid() = user_low or auth.uid() = user_high);

drop policy if exists "friendships_no_direct_write" on public.friendships;
create policy "friendships_no_direct_write"
  on public.friendships for all
  using (false)
  with check (false);

drop policy if exists "friend_requests_select_involved" on public.friend_requests;
create policy "friend_requests_select_involved"
  on public.friend_requests for select
  using (auth.uid() = from_user or auth.uid() = to_user);

drop policy if exists "friend_requests_insert_self" on public.friend_requests;
create policy "friend_requests_insert_self"
  on public.friend_requests for insert
  with check (auth.uid() = from_user and from_user <> to_user);

drop policy if exists "friend_requests_update_receiver" on public.friend_requests;
create policy "friend_requests_update_receiver"
  on public.friend_requests for update
  using (auth.uid() = to_user);

-- ========= 通过好友码查人 / 发送好友申请 / 接受申请 =========
create or replace function public.find_profile_by_friend_code(code text)
returns table (
  id uuid,
  display_name text,
  bio text,
  intro text,
  friend_code text
)
language sql
security definer
set search_path = public
as $$
  select p.id, p.display_name, p.bio, p.intro, p.friend_code
  from public.profiles p
  where upper(p.friend_code) = upper(code)
  limit 1;
$$;

create or replace function public.send_friend_request_by_code(code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid;
  rid uuid;
begin
  select p.id into target from public.profiles p where upper(p.friend_code) = upper(code) limit 1;
  if target is null then
    raise exception 'invalid_friend_code';
  end if;
  if target = auth.uid() then
    raise exception 'cannot_add_self';
  end if;

  -- already friends?
  if exists (
    select 1 from public.friendships f
    where (f.user_low = least(auth.uid(), target) and f.user_high = greatest(auth.uid(), target))
  ) then
    raise exception 'already_friends';
  end if;

  insert into public.friend_requests (from_user, to_user, status)
  values (auth.uid(), target, 'pending')
  returning id into rid;
  return rid;
end;
$$;

create or replace function public.respond_friend_request(req_id uuid, accept boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  fr public.friend_requests%rowtype;
begin
  select * into fr from public.friend_requests where id = req_id limit 1;
  if fr.id is null then
    raise exception 'not_found';
  end if;
  if fr.to_user <> auth.uid() then
    raise exception 'not_allowed';
  end if;
  if fr.status <> 'pending' then
    return false;
  end if;

  if accept then
    update public.friend_requests
      set status = 'accepted', updated_at = now()
      where id = req_id;
    insert into public.friendships (user_low, user_high)
      values (least(fr.from_user, fr.to_user), greatest(fr.from_user, fr.to_user))
      on conflict (user_low, user_high) do nothing;
    return true;
  else
    update public.friend_requests
      set status = 'rejected', updated_at = now()
      where id = req_id;
    return true;
  end if;
end;
$$;

grant execute on function public.find_profile_by_friend_code(text) to authenticated;
grant execute on function public.send_friend_request_by_code(text) to authenticated;
grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;

-- ========= 好友可见数据策略 =========
-- profiles：允许好友互看（保持 self 的 select/update/insert 不变）
drop policy if exists "profiles_select_friends" on public.profiles;
create policy "profiles_select_friends"
  on public.profiles for select
  using (
    exists (
      select 1 from public.friendships f
      where (f.user_low = least(auth.uid(), profiles.id) and f.user_high = greatest(auth.uid(), profiles.id))
    )
  );

-- behavior_logs：允许好友查看（用于好友动态）
drop policy if exists "behavior_logs_select_friends" on public.behavior_logs;
create policy "behavior_logs_select_friends"
  on public.behavior_logs for select
  using (
    exists (
      select 1 from public.friendships f
      where (f.user_low = least(auth.uid(), behavior_logs.user_id) and f.user_high = greatest(auth.uid(), behavior_logs.user_id))
    )
  );

-- log_photos：允许好友查看照片元数据（图片文件仍走 Storage 策略）
drop policy if exists "log_photos_select_friends" on public.log_photos;
create policy "log_photos_select_friends"
  on public.log_photos for select
  using (
    exists (
      select 1 from public.friendships f
      where (f.user_low = least(auth.uid(), log_photos.user_id) and f.user_high = greatest(auth.uid(), log_photos.user_id))
    )
  );
