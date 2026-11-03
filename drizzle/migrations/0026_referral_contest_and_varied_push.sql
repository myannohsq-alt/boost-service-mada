CREATE TABLE public.referral_contests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'Concours Parrainage',
  ends_at timestamptz NOT NULL,
  prize integer NOT NULL DEFAULT 5000,
  min_invites integer NOT NULL DEFAULT 5,
  starts_at timestamptz NOT NULL DEFAULT now(),
  settled boolean NOT NULL DEFAULT false,
  winner_id uuid,
  winner_name text NOT NULL DEFAULT '',
  winner_invites integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.referral_contests TO anon, authenticated;
GRANT INSERT, UPDATE ON public.referral_contests TO authenticated;
GRANT ALL ON public.referral_contests TO service_role;
ALTER TABLE public.referral_contests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contests readable" ON public.referral_contests FOR SELECT USING (true);
CREATE POLICY "admins insert contests" ON public.referral_contests FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins update contests" ON public.referral_contests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- Leaderboard: real invites made during the contest window
CREATE OR REPLACE FUNCTION public.contest_board(_limit int DEFAULT 10)
RETURNS TABLE(author_name text, invites int, eligible boolean, is_me boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  WITH c AS (SELECT * FROM referral_contests ORDER BY created_at DESC LIMIT 1)
  SELECT coalesce(nullif(r.name,''),'Membre'), count(p.id)::int, count(p.id) >= (SELECT min_invites FROM c), r.id = auth.uid()
  FROM c JOIN profiles p ON p.created_at BETWEEN c.starts_at AND c.ends_at AND p.referred_by IS NOT NULL
  JOIN profiles r ON r.id = p.referred_by
  GROUP BY r.id, r.name ORDER BY count(p.id) DESC LIMIT _limit
$$;
GRANT EXECUTE ON FUNCTION public.contest_board(int) TO anon, authenticated;

-- Settle: pick top inviter (>= min), credit prize, notify everyone, stop pushes
CREATE OR REPLACE FUNCTION public.settle_referral_contest()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c referral_contests; w record;
BEGIN
  SELECT * INTO c FROM referral_contests WHERE NOT settled AND ends_at <= now() ORDER BY ends_at LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT r.id, coalesce(nullif(r.name,''),'Membre') nm, count(p.id)::int n INTO w
  FROM profiles p JOIN profiles r ON r.id=p.referred_by
  WHERE p.created_at BETWEEN c.starts_at AND c.ends_at
  GROUP BY r.id, r.name HAVING count(p.id) >= c.min_invites
  ORDER BY count(p.id) DESC, min(p.created_at) LIMIT 1;
  IF w.id IS NOT NULL THEN
    UPDATE profiles SET balance = balance + c.prize WHERE id = w.id;
    INSERT INTO notifications(user_id,title,body) VALUES (w.id,'🏆 Nandresy ianao!', 'Nahazo '||c.prize||' Ar tao amin''ny soldenao ianao. Afaka manao retrait ianao.');
    INSERT INTO push_queue(title,body,url,target) VALUES ('🏆 Mpandresy Concours Parrainage', w.nm||' no nandresy ('||w.n||' namana) ka nahazo '||c.prize||' Ar! Arahabaina 🎉','/profil','all');
  ELSE
    INSERT INTO push_queue(title,body,url,target) VALUES ('🏁 Vita ny Concours Parrainage','Tsy nisy nahatratra '||c.min_invites||' namana. Andraso ny concours manaraka! 🎁','/profil','all');
  END IF;
  UPDATE referral_contests SET settled=true, winner_id=w.id, winner_name=coalesce(w.nm,''), winner_invites=coalesce(w.n,0) WHERE id=c.id;
END $$;
REVOKE EXECUTE ON FUNCTION public.settle_referral_contest() FROM public, anon, authenticated;

-- Every 3h reminder with rotating texts while a contest is running
CREATE OR REPLACE FUNCTION public.queue_contest_push()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c referral_contests; d int; msgs text[][]; i int;
BEGIN
  PERFORM settle_referral_contest();
  SELECT * INTO c FROM referral_contests WHERE NOT settled AND ends_at > now() ORDER BY ends_at LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;
  d := greatest(0, extract(day from c.ends_at - now())::int);
  msgs := ARRAY[
    ARRAY['🏆 Concours '||c.prize||' Ar','Asao namana '||c.min_invites||' farafahakeliny dia tafiditra amin''ny tirage ianao!'],
    ARRAY['⏳ Andro '||d||' sisa','Mifarana '||to_char(c.ends_at at time zone 'Indian/Antananarivo','DD/MM')||' ny concours parrainage. Zarao ny rohinao 🔗'],
    ARRAY['🎁 '||c.prize||' Ar ho anao?','Izay manasa namana betsaka indrindra no mandresy. Retrait mobile money avy hatrany 💸'],
    ARRAY['🤝 Ampio ny namanao hiboost','Rehefa misoratra anarana amin''ny rohinao izy dia isaina ho anao 📈'],
    ARRAY['🔥 Mbola afaka mandresy ianao','Jereo ny laharanao ao amin''ny Profil ary asao namana vaovao!'],
    ARRAY['📲 Zarao amin''ny Facebook','Alefaso amin''ny groupe sy namana ny rohinao — '||c.prize||' Ar no loka 🏆'],
    ARRAY['💪 Aza mitsahatra','Namana '||c.min_invites||' fotsiny dia tafiditra ao amin''ny lisitry ny tirage ianao ✅']];
  i := (floor(random()*7))::int + 1;
  INSERT INTO push_queue(title,body,url,target) VALUES (msgs[i][1], msgs[i][2], '/profil', 'all');
END $$;
REVOKE EXECUTE ON FUNCTION public.queue_contest_push() FROM public, anon, authenticated;

-- Varied daily push: random among many texts per slot
CREATE OR REPLACE FUNCTION public.queue_daily_push(_slot integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE msgs text[][] := ARRAY[
  ARRAY['☀️ Manao ahoana! Boostéo ny pejinao','Followers, réactions, vues — haingana 5-15 min ⚡','/services'],
  ARRAY['💰 Ataovy recharge androany','MVola, Airtel, Orange — dépôt 40.000 Ar = bonus +5% 🎁','/depot'],
  ARRAY['🤝 Asao ny namanao','Zarao ny rohinao: rehefa maro isika dia mihamora ny Boost Malagasy 🇲🇬','/profil'],
  ARRAY['🌙 Commande hariva','Alefaso izao ny boost-nao dia vita rehefa mifoha ianao 🚀','/services'],
  ARRAY['🔥 Aza adino ny pejinao','Réactions sy Followers mora indrindra — 100% Gasy 💯','/services'],
  ARRAY['🎯 Lazao ny marikao','Pejy be mpanaraka = mpividy maro. Andramo 100 followers izao 📈','/services'],
  ARRAY['❤️ Réactions haingana','Ataovy mamirapiratra ny publication-nao vaovao 👍❤️😆','/services'],
  ARRAY['🎵 TikTok ve?','Vues sy Likes TikTok mora — ataovy viral ny vidéo-nao 🚀','/services'],
  ARRAY['💸 Bonus +5%','Dépôt 40.000 Ar na mihoatra dia mahazo bonus avy hatrany 🎁','/depot'],
  ARRAY['💬 Groupe de discussion','Mivory ao amin''ny groupe ny mpampiasa BoostMada — midira! 👋','/groupe'],
  ARRAY['📣 Vente ve androany?','Boost com''s « Vente 🎀 » hanintona mpividy amin''ny publication-nao','/services'],
  ARRAY['🎂 Fety na Hdb?','Commentaires « Hdb ✨🎂 » ho an''ny namanao — mora sady haingana','/services'],
  ARRAY['▶️ YouTube','Vues sy abonnés YouTube ho an''ny chaîne-nao 📺','/services'],
  ARRAY['🎁 Asao namana iray','Isaky ny namana manao dépôt voalohany dia mahazo tombony ianao 💰','/profil']];
  i int := (floor(random()*14))::int + 1;
BEGIN
  INSERT INTO push_queue(title, body, url, target) VALUES (msgs[i][1], msgs[i][2], msgs[i][3], 'all');
END $$;

-- Count of users with app notifications enabled (admin)
CREATE OR REPLACE FUNCTION public.app_user_stats()
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN json_build_object(
    'users', (SELECT count(*) FROM profiles),
    'push_users', (SELECT count(DISTINCT user_id) FROM push_subscriptions),
    'new_today', (SELECT count(*) FROM profiles WHERE created_at > now()-interval '1 day'),
    'active_7d', (SELECT count(DISTINCT user_id) FROM orders WHERE created_at > now()-interval '7 days'));
END $$;
GRANT EXECUTE ON FUNCTION public.app_user_stats() TO authenticated;