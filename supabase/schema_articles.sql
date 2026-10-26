-- CarbonPie AI 科普内容中台
-- 用于定时生成、审核、发布动态科普文章。

create table if not exists public.ai_articles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  tag text,
  summary text,
  reading_level text,
  visual_style text default 'encyclopedia',
  hero_image_url text,
  source_url text,
  source_name text,
  source_published_at timestamptz,
  status text not null default 'draft' check (status in ('draft', 'reviewing', 'published', 'archived')),
  facts jsonb not null default '[]'::jsonb,
  comic_panels jsonb not null default '[]'::jsonb,
  paragraphs jsonb not null default '[]'::jsonb,
  image_prompt text,
  source_note text,
  generated_by text,
  generated_at timestamptz default now(),
  published_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.ai_articles enable row level security;

drop policy if exists ai_articles_public_read_published on public.ai_articles;
create policy ai_articles_public_read_published
on public.ai_articles for select
using (status = 'published');

create index if not exists ai_articles_status_published_at_idx
on public.ai_articles (status, published_at desc);

create index if not exists ai_articles_tag_idx
on public.ai_articles (tag);
