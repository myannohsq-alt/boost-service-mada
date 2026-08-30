-- Deposit method + duplicate reference protection
ALTER TABLE public.recharges ADD COLUMN IF NOT EXISTS method text NOT NULL DEFAULT 'mvola';
CREATE UNIQUE INDEX IF NOT EXISTS recharges_reference_unique ON public.recharges (lower(reference));

-- Community group
CREATE TABLE IF NOT EXISTS public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null default '',
  category text not null default 'general',
  content text not null,
  pinned boolean not null default false,
  locked boolean not null default false,
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_posts TO authenticated;
GRANT ALL ON public.community_posts TO service_role;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS posts_read ON public.community_posts;
CREATE POLICY posts_read ON public.community_posts FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS posts_insert_own ON public.community_posts;
CREATE POLICY posts_insert_own ON public.community_posts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS posts_update ON public.community_posts;
CREATE POLICY posts_update ON public.community_posts FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::public.app_role));
DROP POLICY IF EXISTS posts_delete ON public.community_posts;
CREATE POLICY posts_delete ON public.community_posts FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::public.app_role));

CREATE TABLE IF NOT EXISTS public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null default '',
  content text not null,
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_comments TO authenticated;
GRANT ALL ON public.community_comments TO service_role;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS comments_read ON public.community_comments;
CREATE POLICY comments_read ON public.community_comments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS comments_insert_own ON public.community_comments;
CREATE POLICY comments_insert_own ON public.community_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS comments_delete ON public.community_comments;
CREATE POLICY comments_delete ON public.community_comments FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::public.app_role));

CREATE TABLE IF NOT EXISTS public.community_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (post_id, user_id, emoji)
);
GRANT SELECT, INSERT, DELETE ON public.community_reactions TO authenticated;
GRANT ALL ON public.community_reactions TO service_role;
ALTER TABLE public.community_reactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS reactions_read ON public.community_reactions;
CREATE POLICY reactions_read ON public.community_reactions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS reactions_write_own ON public.community_reactions;
CREATE POLICY reactions_write_own ON public.community_reactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS reactions_delete_own ON public.community_reactions;
CREATE POLICY reactions_delete_own ON public.community_reactions FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Reject deposit helper: notify user
CREATE OR REPLACE FUNCTION public.reject_recharge(_recharge_id uuid, _reason text DEFAULT '')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
declare r public.recharges%rowtype;
begin
  if not public.has_role(auth.uid(),'admin'::public.app_role) then
    raise exception 'Forbidden';
  end if;
  select * into r from public.recharges where id = _recharge_id;
  if r.id is null or r.status <> 'pending' then raise exception 'Recharge invalide'; end if;
  update public.recharges set status = 'rejected' where id = r.id;
  insert into public.notifications (user_id, title, body)
  values (r.user_id, 'Dépôt refusé ❌', coalesce(nullif(_reason,''), 'Votre demande de dépôt a été refusée.'));
end; $$;
REVOKE ALL ON FUNCTION public.reject_recharge(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.reject_recharge(uuid, text) TO authenticated;