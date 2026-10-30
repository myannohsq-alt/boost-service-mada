DROP POLICY IF EXISTS "members read draws" ON public.lottery_draws;
DROP POLICY IF EXISTS "members read entries" ON public.lottery_entries;
CREATE POLICY "own or admin read entries" ON public.lottery_entries FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "winner or admin read draws" ON public.lottery_draws FOR SELECT TO authenticated
  USING (auth.uid() = winner_id OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.lottery_participants(_date date)
RETURNS TABLE(is_me boolean, author_name text, amount integer, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.user_id = auth.uid(), e.author_name, e.amount, e.created_at
  FROM public.lottery_entries e
  WHERE auth.uid() IS NOT NULL AND e.draw_date = _date
  ORDER BY e.created_at
$$;

CREATE OR REPLACE FUNCTION public.lottery_recent_draws(_limit integer DEFAULT 10)
RETURNS TABLE(draw_date date, winner_name text, participants integer, prize integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT d.draw_date, d.winner_name, d.participants, d.prize
  FROM public.lottery_draws d
  WHERE auth.uid() IS NOT NULL
  ORDER BY d.draw_date DESC LIMIT LEAST(GREATEST(_limit,1),50)
$$;
REVOKE ALL ON FUNCTION public.lottery_participants(date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.lottery_recent_draws(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lottery_participants(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lottery_recent_draws(integer) TO authenticated;