-- Applied to Supabase project "VoRaMaN's Project" (pcidpbykoylqbyxgwmyx) (migration "portfolio_features").
-- Tables for the portfolio's interactive features. Visitors (anon) may only insert small, validated rows;
-- everything private (leads, analytics) is readable only by portfolio_is_admin().

-- Mini-game leaderboard -----------------------------------------------------------
create table if not exists public.portfolio_scores (
  id bigint generated always as identity primary key,
  game text not null default 'comet' check (game ~ '^[a-z0-9-]{1,32}$'),
  name text not null check (char_length(btrim(name)) between 1 and 16),
  score integer not null check (score between 0 and 100000),
  created_at timestamptz not null default now()
);
create index if not exists portfolio_scores_game_score_idx on public.portfolio_scores (game, score desc);
alter table public.portfolio_scores enable row level security;
create policy "portfolio_scores public read" on public.portfolio_scores for select to anon, authenticated using (true);
create policy "portfolio_scores public insert" on public.portfolio_scores for insert to anon, authenticated with check (true);
create policy "portfolio_scores admin delete" on public.portfolio_scores for delete to authenticated using ((select public.portfolio_is_admin()));

-- "Hire me" leads (private) ---------------------------------------------------------
create table if not exists public.portfolio_leads (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  email text not null check (char_length(email) <= 160 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  project_type text not null check (char_length(project_type) <= 40),
  budget text check (char_length(budget) <= 40),
  timeline text check (char_length(timeline) <= 40),
  message text check (char_length(message) <= 4000),
  lang text check (char_length(lang) <= 8),
  status text not null default 'new' check (status in ('new', 'replied', 'archived'))
);
create index if not exists portfolio_leads_created_idx on public.portfolio_leads (created_at desc);
alter table public.portfolio_leads enable row level security;
create policy "portfolio_leads public insert" on public.portfolio_leads for insert to anon, authenticated with check (status = 'new');
create policy "portfolio_leads admin read" on public.portfolio_leads for select to authenticated using ((select public.portfolio_is_admin()));
create policy "portfolio_leads admin update" on public.portfolio_leads for update to authenticated using ((select public.portfolio_is_admin())) with check ((select public.portfolio_is_admin()));
create policy "portfolio_leads admin delete" on public.portfolio_leads for delete to authenticated using ((select public.portfolio_is_admin()));

-- UI Lab hearts (counts only; changed through portfolio_vote) -------------------------
create table if not exists public.portfolio_votes (
  item text primary key check (item ~ '^[a-z0-9-]{1,40}$'),
  count integer not null default 0 check (count >= 0),
  updated_at timestamptz not null default now()
);
alter table public.portfolio_votes enable row level security;
create policy "portfolio_votes public read" on public.portfolio_votes for select to anon, authenticated using (true);

create or replace function public.portfolio_vote(p_item text, p_delta integer)
returns integer language plpgsql security definer set search_path = '' as $$
declare v integer;
begin
  if p_item !~ '^[a-z0-9-]{1,40}$' or p_delta not in (-1, 1) then
    raise exception 'invalid vote';
  end if;
  insert into public.portfolio_votes as t (item, count) values (p_item, greatest(p_delta, 0))
  on conflict (item) do update set count = greatest(t.count + p_delta, 0), updated_at = now()
  returning count into v;
  return v;
end; $$;
revoke all on function public.portfolio_vote(text, integer) from public;
grant execute on function public.portfolio_vote(text, integer) to anon, authenticated;

-- Privacy-friendly analytics (no IP, no cookies; random per-tab session id) ---------------
create table if not exists public.portfolio_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null check (name ~ '^[a-z0-9_:.-]{1,40}$'),
  path text check (char_length(path) <= 200),
  ref text check (char_length(ref) <= 200),
  session text check (session ~ '^[a-z0-9]{6,24}$'),
  meta jsonb check (meta is null or pg_column_size(meta) <= 2048)
);
create index if not exists portfolio_events_created_idx on public.portfolio_events (created_at desc);
create index if not exists portfolio_events_name_idx on public.portfolio_events (name, created_at desc);
alter table public.portfolio_events enable row level security;
create policy "portfolio_events public insert" on public.portfolio_events for insert to anon, authenticated with check (true);
create policy "portfolio_events admin read" on public.portfolio_events for select to authenticated using ((select public.portfolio_is_admin()));
create policy "portfolio_events admin delete" on public.portfolio_events for delete to authenticated using ((select public.portfolio_is_admin()));

-- Devlog posts -----------------------------------------------------------------------
create table if not exists public.portfolio_devlog (
  id uuid primary key default gen_random_uuid(),
  game_slug text check (game_slug is null or game_slug ~ '^[a-z0-9-]{1,80}$'),
  title text not null check (char_length(title) between 1 and 160),
  body text not null default '' check (char_length(body) <= 40000),
  cover_url text check (char_length(cover_url) <= 500),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists portfolio_devlog_game_idx on public.portfolio_devlog (game_slug, created_at desc);
alter table public.portfolio_devlog enable row level security;
create policy "portfolio_devlog public read published" on public.portfolio_devlog for select to anon, authenticated using (published or (select public.portfolio_is_admin()));
create policy "portfolio_devlog admin insert" on public.portfolio_devlog for insert to authenticated with check ((select public.portfolio_is_admin()));
create policy "portfolio_devlog admin update" on public.portfolio_devlog for update to authenticated using ((select public.portfolio_is_admin())) with check ((select public.portfolio_is_admin()));
create policy "portfolio_devlog admin delete" on public.portfolio_devlog for delete to authenticated using ((select public.portfolio_is_admin()));
drop trigger if exists portfolio_devlog_touch on public.portfolio_devlog;
create trigger portfolio_devlog_touch before update on public.portfolio_devlog for each row execute function public.portfolio_touch_updated_at();

-- Beat Lab community wall ---------------------------------------------------------------
create table if not exists public.portfolio_beats (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  title text not null check (char_length(btrim(title)) between 1 and 40),
  author text not null check (char_length(btrim(author)) between 1 and 24),
  code text not null check (char_length(code) between 8 and 12000 and code ~ '^[zjs][A-Za-z0-9_-]+$'),
  bpm integer check (bpm between 40 and 240),
  style text check (char_length(style) <= 24),
  likes integer not null default 0 check (likes >= 0),
  hidden boolean not null default false
);
create index if not exists portfolio_beats_created_idx on public.portfolio_beats (created_at desc);
alter table public.portfolio_beats enable row level security;
create policy "portfolio_beats public read" on public.portfolio_beats for select to anon, authenticated using (not hidden or (select public.portfolio_is_admin()));
create policy "portfolio_beats public insert" on public.portfolio_beats for insert to anon, authenticated with check (likes = 0 and not hidden);
create policy "portfolio_beats admin update" on public.portfolio_beats for update to authenticated using ((select public.portfolio_is_admin())) with check ((select public.portfolio_is_admin()));
create policy "portfolio_beats admin delete" on public.portfolio_beats for delete to authenticated using ((select public.portfolio_is_admin()));

create or replace function public.portfolio_like_beat(p_id bigint)
returns integer language sql security definer set search_path = '' as $$
  update public.portfolio_beats set likes = likes + 1 where id = p_id and not hidden returning likes;
$$;
revoke all on function public.portfolio_like_beat(bigint) from public;
grant execute on function public.portfolio_like_beat(bigint) to anon, authenticated;

-- Admin dashboard summary (one call instead of downloading every event) -------------------
create or replace function public.portfolio_stats(p_days integer default 30)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare since timestamptz := now() - make_interval(days => greatest(1, least(p_days, 365)));
begin
  if not public.portfolio_is_admin() then raise exception 'not authorized'; end if;
  return jsonb_build_object(
    'views', (select count(*) from public.portfolio_events where name = 'view' and created_at >= since),
    'sessions', (select count(distinct session) from public.portfolio_events where created_at >= since),
    'by_day', coalesce((select jsonb_agg(d order by d->>'day') from (
        select jsonb_build_object('day', to_char(date_trunc('day', created_at), 'YYYY-MM-DD'), 'views', count(*) filter (where name = 'view'), 'sessions', count(distinct session)) d
        from public.portfolio_events where created_at >= since group by date_trunc('day', created_at)) x), '[]'::jsonb),
    'by_name', coalesce((select jsonb_object_agg(name, c) from (select name, count(*) c from public.portfolio_events where created_at >= since group by name) x), '{}'::jsonb),
    'sections', coalesce((select jsonb_object_agg(k, c) from (select meta->>'id' k, count(*) c from public.portfolio_events where name = 'section' and created_at >= since and meta ? 'id' group by 1) x), '{}'::jsonb),
    'plays', coalesce((select jsonb_object_agg(k, c) from (select meta->>'slug' k, count(*) c from public.portfolio_events where name in ('play', 'download') and created_at >= since and meta ? 'slug' group by 1) x), '{}'::jsonb),
    'refs', coalesce((select jsonb_agg(jsonb_build_object('ref', ref, 'n', c)) from (select ref, count(*) c from public.portfolio_events where name = 'view' and ref is not null and ref <> '' and created_at >= since group by ref order by c desc limit 10) x), '[]'::jsonb),
    'leads_new', (select count(*) from public.portfolio_leads where status = 'new')
  );
end; $$;
revoke all on function public.portfolio_stats(integer) from public;
grant execute on function public.portfolio_stats(integer) to authenticated;
revoke execute on function public.portfolio_stats(integer) from anon;
