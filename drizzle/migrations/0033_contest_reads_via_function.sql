DROP POLICY IF EXISTS "contests readable by signed-in users" ON public.referral_contests;
CREATE POLICY "admins read contests" ON public.referral_contests FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE OR REPLACE FUNCTION public.current_contest()
RETURNS TABLE(id uuid, title text, starts_at timestamptz, ends_at timestamptz, prize integer, min_invites integer, settled boolean, winner_name text, winner_invites integer, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT id, title, starts_at, ends_at, prize, min_invites, settled, winner_name, winner_invites, created_at
  FROM public.referral_contests WHERE auth.uid() IS NOT NULL ORDER BY created_at DESC LIMIT 1
$$;
REVOKE EXECUTE ON FUNCTION public.current_contest() FROM anon;
GRANT EXECUTE ON FUNCTION public.current_contest() TO authenticated;