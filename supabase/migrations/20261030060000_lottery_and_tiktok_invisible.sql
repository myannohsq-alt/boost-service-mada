CREATE TABLE public.lottery_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_date date NOT NULL,
  user_id uuid NOT NULL,
  author_name text NOT NULL DEFAULT 'Membre',
  amount integer NOT NULL DEFAULT 300,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.lottery_draws (
  draw_date date PRIMARY KEY,
  winner_id uuid,
  winner_name text NOT NULL DEFAULT '',
  participants integer NOT NULL DEFAULT 0,
  prize integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.lottery_entries TO authenticated;
GRANT SELECT ON public.lottery_draws TO authenticated;
GRANT ALL ON public.lottery_entries TO service_role;
GRANT ALL ON public.lottery_draws TO service_role;
ALTER TABLE public.lottery_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lottery_draws ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read entries" ON public.lottery_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "members read draws" ON public.lottery_draws FOR SELECT TO authenticated USING (true);
CREATE INDEX lottery_entries_date_idx ON public.lottery_entries(draw_date);

CREATE OR REPLACE FUNCTION public.lottery_next_date() RETURNS date LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT CASE WHEN (now() AT TIME ZONE 'Indian/Antananarivo')::time < time '19:30'
    THEN (now() AT TIME ZONE 'Indian/Antananarivo')::date
    ELSE (now() AT TIME ZONE 'Indian/Antananarivo')::date + 1 END
$$;

CREATE OR REPLACE FUNCTION public.settle_lottery() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d date; w record; n int; total int;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('lottery_settle'));
  FOR d IN SELECT DISTINCT e.draw_date FROM lottery_entries e
    WHERE e.draw_date < lottery_next_date()
      AND NOT EXISTS (SELECT 1 FROM lottery_draws x WHERE x.draw_date = e.draw_date)
  LOOP
    SELECT count(*), coalesce(sum(amount),0) INTO n, total FROM lottery_entries WHERE draw_date = d;
    SELECT user_id, author_name INTO w FROM lottery_entries WHERE draw_date = d ORDER BY random() LIMIT 1;
    INSERT INTO lottery_draws(draw_date, winner_id, winner_name, participants, prize)
      VALUES (d, w.user_id, w.author_name, n, floor(total * 0.5));
    UPDATE profiles SET balance = balance + floor(total * 0.5) WHERE id = w.user_id;
    INSERT INTO notifications(user_id, title, body)
      VALUES (w.user_id, '🏆 Nahazo ny Tirage ianao!', 'Tafiditra ao amin''ny solde-nao ny ' || floor(total*0.5)::int || ' Ar.');
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.join_lottery() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p profiles%rowtype; d date := lottery_next_date();
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF;
  PERFORM settle_lottery();
  SELECT * INTO p FROM profiles WHERE id = auth.uid() FOR UPDATE;
  IF EXISTS (SELECT 1 FROM lottery_entries WHERE user_id = p.id AND draw_date = d) THEN
    RAISE EXCEPTION 'Efa nandray anjara ianao tamin''ity tirage ity';
  END IF;
  IF p.balance < 300 THEN RAISE EXCEPTION 'Solde tsy ampy (300 Ar ilaina). Manaova RECHARGE.'; END IF;
  UPDATE profiles SET balance = balance - 300 WHERE id = p.id;
  INSERT INTO lottery_entries(draw_date, user_id, author_name) VALUES (d, p.id, coalesce(nullif(p.name,''),'Membre'));
END $$;

REVOKE ALL ON FUNCTION public.settle_lottery() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.join_lottery() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.settle_lottery() TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_lottery() TO authenticated;
GRANT EXECUTE ON FUNCTION public.lottery_next_date() TO authenticated;

INSERT INTO public.services(platform, category, name_fr, name_mg, unit, price, provider_service_id, active, sort_order, badge, delivery_time, provider_name)
SELECT 'tiktok', 'Likes', 'Likes TikTok Invisible', 'Likes TikTok Invisible', 100, 500, '18282', true, 21, 'RAPIDE', '5-20 min', 'SMMGen'
WHERE NOT EXISTS (SELECT 1 FROM public.services WHERE name_fr = 'Likes TikTok Invisible');
