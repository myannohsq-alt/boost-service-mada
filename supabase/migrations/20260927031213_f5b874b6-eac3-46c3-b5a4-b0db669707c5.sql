-- 1) Drop unused demo tables (fake demo data, no longer referenced by the app)
drop table if exists public.demo_messages;
drop table if exists public.demo_profiles;

-- 2) wheel_history: direct reads limited to owner/admin; public feed via definer RPC
drop policy if exists "Members read wheel history" on public.wheel_history;
create policy "Users read own wheel history"
  on public.wheel_history for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

create or replace function public.recent_wheel_wins(_since timestamptz, _limit integer default 15)
returns table(id uuid, author_name text, avatar_url text, type text, valeur integer, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select w.id, w.author_name, w.avatar_url, w.type, w.valeur, w.created_at
  from public.wheel_history w
  where w.created_at >= _since
  order by w.created_at desc
  limit greatest(1, least(_limit, 50))
$$;

-- 3) saturday_winners: direct reads limited to owner/admin; public board via definer RPC
drop policy if exists "Members read winners" on public.saturday_winners;
create policy "Users read own winner rows"
  on public.saturday_winners for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

create or replace function public.recent_saturday_winners(_limit integer default 3)
returns table(id uuid, author_name text, points integer, gain integer, week_date date)
language sql stable security definer set search_path = public as $$
  select s.id, s.author_name, s.points, s.gain, s.week_date
  from public.saturday_winners s
  order by s.week_date desc
  limit greatest(1, least(_limit, 20))
$$;

-- 4) storage: bind uploads reads to the owner's folder
drop policy if exists "Users read own media" on storage.objects;
create policy "Users read own media"
  on storage.objects for select to authenticated
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = (auth.uid())::text);