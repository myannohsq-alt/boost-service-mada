CREATE OR REPLACE FUNCTION public.game_week_end(_ts timestamptz DEFAULT now())
RETURNS timestamptz LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  SELECT CASE WHEN c <= _ts THEN c + interval '7 days' ELSE c END FROM (
    SELECT ((date_trunc('day', _ts AT TIME ZONE 'UTC')
      + make_interval(days => ((6 - extract(dow FROM _ts AT TIME ZONE 'UTC')::int + 7) % 7))
      + interval '15 hours') AT TIME ZONE 'UTC') AS c
  ) t
$$;

CREATE TABLE public.game_spins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  author_name text NOT NULL DEFAULT 'Membre',
  avatar_url text NOT NULL DEFAULT '',
  week_end timestamptz NOT NULL,
  segment int NOT NULL,
  prize_type text NOT NULL,
  value int NOT NULL,
  fee int NOT NULL DEFAULT 200,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX game_spins_week_idx ON public.game_spins(week_end, user_id);
GRANT SELECT ON public.game_spins TO authenticated;
GRANT ALL ON public.game_spins TO service_role;
ALTER TABLE public.game_spins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own spins readable" ON public.game_spins FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.game_week_winners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_end timestamptz NOT NULL,
  category text NOT NULL,
  user_id uuid NOT NULL,
  author_name text NOT NULL,
  score int NOT NULL,
  prize int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (week_end, category)
);
GRANT SELECT ON public.game_week_winners TO authenticated;
GRANT ALL ON public.game_week_winners TO service_role;
ALTER TABLE public.game_week_winners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "winners readable" ON public.game_week_winners FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.settle_game_weeks()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE w timestamptz; r record; cat text; pz int;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('game_settle'));
  FOR w IN SELECT DISTINCT s.week_end FROM game_spins s WHERE s.week_end <= now()
    AND NOT EXISTS (SELECT 1 FROM game_week_winners x WHERE x.week_end = s.week_end) LOOP
    FOREACH cat IN ARRAY ARRAY['trophy','star','ar'] LOOP
      pz := CASE cat WHEN 'trophy' THEN 1200 WHEN 'star' THEN 1000 ELSE 500 END;
      SELECT user_id, max(author_name) AS n, sum(value)::int AS sc INTO r FROM game_spins
        WHERE week_end = w AND prize_type = cat GROUP BY user_id ORDER BY sum(value) DESC, min(created_at) LIMIT 1;
      IF r.user_id IS NOT NULL THEN
        INSERT INTO game_week_winners(week_end, category, user_id, author_name, score, prize) VALUES (w, cat, r.user_id, r.n, r.sc, pz);
        UPDATE profiles SET balance = balance + pz WHERE id = r.user_id;
        INSERT INTO notifications(user_id, title, body) VALUES (r.user_id, '🏆 Mpandresy amin''ny lalao!', 'Nahazo ' || pz || ' Ar ianao tamin''ity herinandro ity.');
      END IF;
    END LOOP;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.play_wheel_game()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE p profiles%rowtype; seg int; t text; v int; we timestamptz := game_week_end();
  types text[] := ARRAY['trophy','ar','star','trophy','ar','star'];
  vals int[] := ARRAY[100,5,100,50,20,50];
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF;
  PERFORM settle_game_weeks();
  SELECT * INTO p FROM profiles WHERE id = auth.uid() FOR UPDATE;
  IF EXISTS (SELECT 1 FROM game_spins WHERE user_id = p.id AND created_at >= date_trunc('day', now() AT TIME ZONE 'Indian/Antananarivo') AT TIME ZONE 'Indian/Antananarivo') THEN
    RAISE EXCEPTION 'Efa nilalao ianao androany. Miverena rahampitso 🙏';
  END IF;
  IF p.balance < 200 THEN RAISE EXCEPTION 'Solde tsy ampy (200 Ar ilaina). Manaova RECHARGE.'; END IF;
  seg := floor(random() * 6)::int;
  t := types[seg + 1]; v := vals[seg + 1];
  UPDATE profiles SET balance = balance - 200 + CASE WHEN t = 'ar' THEN v ELSE 0 END WHERE id = p.id;
  INSERT INTO game_spins(user_id, author_name, avatar_url, week_end, segment, prize_type, value)
    VALUES (p.id, coalesce(nullif(p.name,''),'Membre'), coalesce(p.avatar_url,''), we, seg, t, v);
  RETURN json_build_object('segment', seg, 'type', t, 'value', v);
END $$;

CREATE OR REPLACE FUNCTION public.game_week_board(_limit int DEFAULT 20)
RETURNS TABLE(user_id uuid, author_name text, avatar_url text, plays int, trophies int, stars int, ar int, score int, is_me boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT s.user_id, max(s.author_name), max(s.avatar_url), count(*)::int,
    coalesce(sum(value) FILTER (WHERE prize_type='trophy'),0)::int,
    coalesce(sum(value) FILTER (WHERE prize_type='star'),0)::int,
    coalesce(sum(value) FILTER (WHERE prize_type='ar'),0)::int,
    sum(value)::int, s.user_id = auth.uid()
  FROM game_spins s WHERE s.week_end = game_week_end() AND auth.uid() IS NOT NULL
  GROUP BY s.user_id ORDER BY sum(value) DESC LIMIT least(greatest(_limit,1),100)
$$;

CREATE OR REPLACE FUNCTION public.game_recent_spins(_limit int DEFAULT 30)
RETURNS TABLE(id uuid, author_name text, avatar_url text, prize_type text, value int, created_at timestamptz, is_me boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT id, author_name, avatar_url, prize_type, value, created_at, user_id = auth.uid()
  FROM game_spins WHERE week_end = game_week_end() AND auth.uid() IS NOT NULL
  ORDER BY created_at DESC LIMIT least(greatest(_limit,1),100)
$$;

REVOKE EXECUTE ON FUNCTION public.settle_game_weeks() FROM anon;
REVOKE EXECUTE ON FUNCTION public.play_wheel_game() FROM anon;
REVOKE EXECUTE ON FUNCTION public.game_week_board(int) FROM anon;
REVOKE EXECUTE ON FUNCTION public.game_recent_spins(int) FROM anon;

CREATE OR REPLACE FUNCTION public.claim_referral(_code text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE ref_user uuid; me uuid := auth.uid();
BEGIN
  IF me IS NULL OR coalesce(_code,'')='' THEN RETURN false; END IF;
  SELECT id INTO ref_user FROM profiles WHERE referral_code=upper(trim(_code)) LIMIT 1;
  IF ref_user IS NULL OR ref_user=me THEN RETURN false; END IF;
  UPDATE profiles SET referred_by=ref_user WHERE id=me AND referred_by IS NULL AND created_at > now()-interval '2 days';
  IF NOT FOUND THEN RETURN false; END IF;
  UPDATE profiles SET balance = balance + 100, referral_earnings = referral_earnings + 100 WHERE id=ref_user;
  INSERT INTO notifications(user_id,title,body) VALUES (ref_user,'Ami inscrit 🎉','+100 Ar gratuit ajoutés à votre solde !');
  RETURN true;
END $function$;

CREATE OR REPLACE FUNCTION public.place_custom_comment_order(_service_id uuid, _link text, _comments text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE s public.services%rowtype; lines text[]; qty integer; cost numeric; bal numeric; oid uuid; clean text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF;
  SELECT * INTO s FROM public.services WHERE id = _service_id AND active AND name_fr ILIKE 'Commentaires Custom%';
  IF s.id IS NULL THEN RAISE EXCEPTION 'Service introuvable'; END IF;
  IF _link !~* '^https://[^[:space:]/]+\.[^[:space:]/]+(/[^[:space:]]*)?$' OR length(_link) > 500 THEN RAISE EXCEPTION 'Lien HTTPS invalide'; END IF;
  SELECT array_agg(l) INTO lines FROM (
    SELECT left(btrim(x), 300) AS l FROM unnest(string_to_array(replace(coalesce(_comments,''), E'\r', ''), E'\n')) x WHERE btrim(x) <> ''
  ) t;
  qty := coalesce(array_length(lines, 1), 0);
  IF qty < 10 OR qty > 10000 THEN RAISE EXCEPTION 'Nombre de commentaires invalide (10 à 10000)'; END IF;
  clean := array_to_string(lines, E'\n');
  cost := ceil((qty::numeric / s.unit) * s.price);
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN cost := 0;
  ELSE
    SELECT balance INTO bal FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
    IF bal IS NULL OR bal < cost THEN RAISE EXCEPTION 'Solde insuffisant, rechargez'; END IF;
    UPDATE public.profiles SET balance = balance - cost WHERE id = auth.uid();
  END IF;
  INSERT INTO public.orders (user_id, service_id, service_label, quantity, target_link, amount, notes, comments)
  VALUES (auth.uid(), s.id, s.name_fr, qty, _link, cost, '', clean) RETURNING id INTO oid;
  INSERT INTO public.notifications (user_id, title, body) VALUES (auth.uid(), 'Nouvelle commande 📦', s.name_fr || ' × ' || qty || ' — ' || cost || ' Ar');
  RETURN oid;
END; $function$;
REVOKE EXECUTE ON FUNCTION public.place_custom_comment_order(uuid, text, text) FROM anon;

INSERT INTO public.services (platform, category, name_fr, name_mg, unit, price, note, badge, delivery_time, provider_name, provider_service_id, provider_min, provider_max, sort_order, active)
SELECT v.platform, v.category, v.name, v.name, v.unit, v.price, '⚡ Haingana • Instant', '', '5-30 min', 'SMMGen', v.pid, v.mn, v.mx, v.so, true
FROM (VALUES
  ('twitter','Likes','Boost Likers X',100,500,'12323',100,20000,300),
  ('twitter','Followers','Boost Followers X',100,800,'12327',100,1000000,301),
  ('twitter','Vues','Vues Vidéo X',100,200,'18940',100,100000000,302),
  ('twitter','Retweets','Retweets X',100,850,'9556',100,100000,303),
  ('twitter','Impressions','Tweet Impressions',100,200,'7639',100,100000000,304),
  ('twitter','Pack','Pack Tout-en-un X (Views + Impressions + Engagements + Profile Visits)',100,350,'16294',100,100000000,305),
  ('twitter','Vote','Vote Sondage X (Poll Voting)',100,725,'16652',100,50000,306),
  ('twitter','Clics','Clics Profil / Détails X',100,150,'12130',100,100000000,307),
  ('twitter','Commentaires','Commentaires Custom X',100,8000,'19340',10,20000,308),
  ('twitter','Space','Space Listeners X',100,371,'7789',100,50000,309),
  ('twitter','Likes','Likes Vidéo X',100,655,'12323',100,20000,310),
  ('twitter','Data','Data Scraper X (Username)',100,555,'7625',200,500000,311),
  ('spotify','Plays','Spotify Plays / Écoutes (Mondial)',100,210,'7616',500,20000000,400),
  ('spotify','Plays','Spotify Plays Ciblé (France / Europe)',100,250,'7683',500,20000000,401),
  ('spotify','Followers','Spotify Followers (Artiste / Profil / Playlist)',100,522,'8030',100,9999999,402),
  ('spotify','Saves','Spotify Saves (Mise en favoris)',100,350,'7971',100,9999999,403),
  ('spotify','Podcast','Spotify Podcast Plays (Écoutes Podcast)',100,156,'11798',1000,100000000,404),
  ('spotify','Auditeurs','Spotify Auditeurs Mensuels (Monthly Listeners)',100,315,'8950',1000,5000000,405),
  ('spotify','Pack','Pack Spotify (10k Plays + 1k Saves + 1k Followers)',1000,43700,'8065',1000,1000,406)
) AS v(platform, category, name, unit, price, pid, mn, mx, so)
WHERE NOT EXISTS (SELECT 1 FROM public.services x WHERE x.name_fr = v.name);