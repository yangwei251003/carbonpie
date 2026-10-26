-- 碳果派 P1：小队 / 动态 / 周报快照（先建表，再启用 RLS 与策略；在基础 schema.sql 之后执行）

-- ========= 仅建表 =========
create table if not exists public.circles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.circle_members (
  circle_id uuid not null references public.circles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member',
  primary key (circle_id, user_id)
);

create table if not exists public.circle_posts (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  content text not null,
  kind text not null default 'text',
  created_at timestamptz not null default now()
);

create table if not exists public.circle_post_likes (
  post_id uuid not null references public.circle_posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (post_id, user_id)
);

create table if not exists public.circle_week_stats (
  circle_id uuid not null references public.circles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  week_start date not null,
  avoided_sum numeric(14,6) not null default 0,
  log_count int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (circle_id, user_id, week_start)
);

-- ========= RLS =========
alter table public.circles enable row level security;
alter table public.circle_members enable row level security;
alter table public.circle_posts enable row level security;
alter table public.circle_post_likes enable row level security;
alter table public.circle_week_stats enable row level security;

drop policy if exists "circles_insert_owner" on public.circles;
drop policy if exists "circles_select_member" on public.circles;

create policy "circles_insert_owner"
  on public.circles for insert
  with check (auth.uid() = created_by);

create policy "circles_select_member"
  on public.circles for select
  using (
    exists (
      select 1 from public.circle_members m
      where m.circle_id = circles.id and m.user_id = auth.uid()
    )
  );

drop policy if exists "circle_members_select_same_circle" on public.circle_members;
drop policy if exists "circle_members_no_direct_insert" on public.circle_members;
drop policy if exists "circle_members_no_direct_delete" on public.circle_members;

create policy "circle_members_select_same_circle"
  on public.circle_members for select
  using (
    exists (
      select 1 from public.circle_members me
      where me.circle_id = circle_members.circle_id and me.user_id = auth.uid()
    )
  );

create policy "circle_members_no_direct_insert"
  on public.circle_members for insert
  with check (false);

create policy "circle_members_no_direct_delete"
  on public.circle_members for delete
  using (false);

drop policy if exists "circle_posts_select_member" on public.circle_posts;
drop policy if exists "circle_posts_insert_member" on public.circle_posts;

create policy "circle_posts_select_member"
  on public.circle_posts for select
  using (
    exists (
      select 1 from public.circle_members m
      where m.circle_id = circle_posts.circle_id and m.user_id = auth.uid()
    )
  );

create policy "circle_posts_insert_member"
  on public.circle_posts for insert
  with check (
    auth.uid() = user_id and exists (
      select 1 from public.circle_members m
      where m.circle_id = circle_posts.circle_id and m.user_id = auth.uid()
    )
  );

drop policy if exists "likes_select_visible_posts" on public.circle_post_likes;
drop policy if exists "likes_insert_own" on public.circle_post_likes;
drop policy if exists "likes_delete_own" on public.circle_post_likes;

create policy "likes_select_visible_posts"
  on public.circle_post_likes for select
  using (
    exists (
      select 1 from public.circle_posts p
      join public.circle_members m on m.circle_id = p.circle_id and m.user_id = auth.uid()
      where p.id = circle_post_likes.post_id
    )
  );

create policy "likes_insert_own"
  on public.circle_post_likes for insert
  with check (auth.uid() = user_id);

create policy "likes_delete_own"
  on public.circle_post_likes for delete
  using (auth.uid() = user_id);

drop policy if exists "week_stats_select_member" on public.circle_week_stats;
drop policy if exists "week_stats_upsert_own" on public.circle_week_stats;
drop policy if exists "week_stats_update_own" on public.circle_week_stats;

create policy "week_stats_select_member"
  on public.circle_week_stats for select
  using (
    exists (
      select 1 from public.circle_members m
      where m.circle_id = circle_week_stats.circle_id and m.user_id = auth.uid()
    )
  );

create policy "week_stats_upsert_own"
  on public.circle_week_stats for insert
  with check (
    auth.uid() = user_id and exists (
      select 1 from public.circle_members m
      where m.circle_id = circle_week_stats.circle_id and m.user_id = auth.uid()
    )
  );

create policy "week_stats_update_own"
  on public.circle_week_stats for update
  using (
    auth.uid() = user_id and exists (
      select 1 from public.circle_members m
      where m.circle_id = circle_week_stats.circle_id and m.user_id = auth.uid()
    )
  );

create or replace function public.after_circle_created()
returns trigger as $$
begin
  insert into public.circle_members (circle_id, user_id, role)
  values (new.id, new.created_by, 'owner');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists tr_circle_owner on public.circles;

create trigger tr_circle_owner
  after insert on public.circles
  for each row execute function public.after_circle_created();

create or replace function public.join_circle(invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  cid uuid;
  needle text := invite_code;
begin
  select id into cid from public.circles c where upper(c.invite_code) = upper(needle) limit 1;
  if cid is null then
    raise exception 'invalid_invite';
  end if;
  insert into public.circle_members (circle_id, user_id, role)
  values (cid, auth.uid(), 'member')
  on conflict (circle_id, user_id) do nothing;
  return cid;
end;
$$;

grant execute on function public.join_circle(text) to authenticated;
