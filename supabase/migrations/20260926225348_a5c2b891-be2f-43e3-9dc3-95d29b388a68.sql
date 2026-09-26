ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS points integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tours_restants integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_spin_date date;

CREATE OR REPLACE FUNCTION public.protect_profile_balance()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF (NEW.balance IS DISTINCT FROM OLD.balance OR NEW.referral_earnings IS DISTINCT FROM OLD.referral_earnings
      OR NEW.points IS DISTINCT FROM OLD.points OR NEW.tours_restants IS DISTINCT FROM OLD.tours_restants
      OR NEW.last_spin_date IS DISTINCT FROM OLD.last_spin_date)
     AND current_user IN ('authenticated','anon') THEN
    RAISE EXCEPTION 'Modification du solde interdite';
  END IF;
  RETURN NEW;
END; $$;

CREATE TABLE public.wheel_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  author_name text NOT NULL DEFAULT '',
  avatar_url text NOT NULL DEFAULT '',
  type text NOT NULL,
  valeur integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wheel_history TO authenticated;
GRANT ALL ON public.wheel_history TO service_role;
ALTER TABLE public.wheel_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read wheel history" ON public.wheel_history FOR SELECT TO authenticated USING (true);

CREATE TABLE public.saturday_winners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  author_name text NOT NULL DEFAULT '',
  points integer NOT NULL DEFAULT 0,
  gain integer NOT NULL DEFAULT 300,
  week_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.saturday_winners TO authenticated;
GRANT ALL ON public.saturday_winners TO service_role;
ALTER TABLE public.saturday_winners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read winners" ON public.saturday_winners FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage winners" ON public.saturday_winners FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.demo_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  avatar_url text NOT NULL,
  points integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.demo_profiles TO authenticated;
GRANT ALL ON public.demo_profiles TO service_role;
ALTER TABLE public.demo_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read demo" ON public.demo_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins delete demo" ON public.demo_profiles FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.demo_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demo_profile_id uuid NOT NULL REFERENCES public.demo_profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.demo_messages TO authenticated;
GRANT ALL ON public.demo_messages TO service_role;
ALTER TABLE public.demo_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read demo msgs" ON public.demo_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins delete demo msgs" ON public.demo_messages FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

WITH p AS (
  INSERT INTO public.demo_profiles (name, avatar_url, points) VALUES
  ('Miora Andriam','https://i.pravatar.cc/150?img=5',1250),
  ('Aina Safidy','https://i.pravatar.cc/150?img=32',980),
  ('Feno Rakoto','https://i.pravatar.cc/150?img=8',760),
  ('Tsiky R.','https://i.pravatar.cc/150?img=23',1100),
  ('Hery Andria','https://i.pravatar.cc/150?img=15',540),
  ('Lova Razafy','https://i.pravatar.cc/150?img=26',1350),
  ('Niry M.','https://i.pravatar.cc/150?img=16',890),
  ('Boost Master','https://i.pravatar.cc/150?img=12',2100)
  RETURNING id, name)
INSERT INTO public.demo_messages (demo_profile_id, content, created_at)
SELECT p.id, m.c, now() - (m.o || ' minutes')::interval FROM p JOIN (VALUES
  ('Miora Andriam','Salama daholo 😍',50),
  ('Feno Rakoto','Iza no mbola tsy nanodina androany?',40),
  ('Lova Razafy','Tirage Samedi 18h aza adino lesy 🙏',30),
  ('Aina Safidy','Misaotra Boost Mada tena mandeha be!',20),
  ('Boost Master','Mba andramo ny roue lesy',10)
) AS m(n,c,o) ON m.n = p.name;

ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS media_path text,
  ADD COLUMN IF NOT EXISTS duration integer;

DROP FUNCTION IF EXISTS public.send_chat_message(text);
CREATE OR REPLACE FUNCTION public.send_chat_message(_content text, _type text DEFAULT 'text', _media_path text DEFAULT NULL, _duration integer DEFAULT NULL)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE nm text; c text := btrim(coalesce(_content,'')); mid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF;
  IF _type NOT IN ('text','image','vocal') THEN RAISE EXCEPTION 'Type invalide'; END IF;
  IF _type = 'text' AND (char_length(c) < 1) THEN RAISE EXCEPTION 'Message invalide'; END IF;
  IF char_length(c) > 500 THEN RAISE EXCEPTION 'Message trop long'; END IF;
  IF _type <> 'text' AND (_media_path IS NULL OR _media_path NOT LIKE auth.uid()::text || '/%') THEN RAISE EXCEPTION 'Fichier invalide'; END IF;
  SELECT coalesce(nullif(name,''),'Membre') INTO nm FROM public.profiles WHERE id = auth.uid();
  INSERT INTO public.chat_messages(user_id, author_name, content, type, media_path, duration)
  VALUES (auth.uid(), coalesce(nm,'Membre'), c, _type, _media_path, _duration) RETURNING id INTO mid;
  RETURN mid;
END $$;

CREATE OR REPLACE FUNCTION public.spin_wheel()
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE p public.profiles%rowtype; today date := (now() AT TIME ZONE 'Indian/Antananarivo')::date;
  r numeric := random(); slice int; t text; v int; won_ar int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF;
  SELECT * INTO p FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
  IF p.last_spin_date IS DISTINCT FROM today THEN
    UPDATE public.profiles SET last_spin_date = today WHERE id = p.id;
  ELSIF p.tours_restants > 0 THEN
    UPDATE public.profiles SET tours_restants = tours_restants - 1 WHERE id = p.id;
  ELSE
    RAISE EXCEPTION 'Plus de tour aujourd''hui. Invitez un ami pour +1 tour !';
  END IF;
  IF r < 0.40 THEN slice := (CASE WHEN random()<0.5 THEN 0 ELSE 4 END);
  ELSIF r < 0.70 THEN slice := (CASE WHEN random()<0.5 THEN 1 ELSE 6 END);
  ELSIF r < 0.85 THEN slice := 2;
  ELSIF r < 0.95 THEN slice := 5;
  ELSE slice := 3; END IF;
  t := CASE WHEN slice IN (0,1,2,4,6) THEN 'ar' ELSE 'points' END;
  v := (ARRAY[10,20,30,100,10,50,20,150])[slice+1];
  IF t = 'ar' THEN
    SELECT coalesce(sum(valeur),0) INTO won_ar FROM public.wheel_history
      WHERE user_id = p.id AND type='ar' AND (created_at AT TIME ZONE 'Indian/Antananarivo')::date = today;
    IF won_ar + v > 30 THEN slice := 5; t := 'points'; v := 50; END IF;
  END IF;
  IF t = 'ar' THEN UPDATE public.profiles SET balance = balance + v WHERE id = p.id;
  ELSE UPDATE public.profiles SET points = points + v WHERE id = p.id; END IF;
  INSERT INTO public.wheel_history(user_id, author_name, avatar_url, type, valeur)
  VALUES (p.id, coalesce(nullif(p.name,''),'Membre'), coalesce(p.avatar_url,''), t, v);
  RETURN json_build_object('slice', slice, 'type', t, 'valeur', v);
END $$;

CREATE OR REPLACE FUNCTION public.leaderboard(_limit integer DEFAULT 8)
 RETURNS TABLE(id uuid, name text, avatar_url text, points integer)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT id, coalesce(nullif(name,''),'Membre'), avatar_url, points FROM public.profiles
  WHERE auth.uid() IS NOT NULL ORDER BY points DESC, created_at LIMIT least(greatest(_limit,1),100)
$$;

CREATE OR REPLACE FUNCTION public.invited_count()
 RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT count(*)::int FROM public.profiles WHERE referred_by = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
declare new_code text; ref_code text; ref_user uuid; full_name text; avatar text;
begin
  new_code := upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  ref_code := nullif(new.raw_user_meta_data->>'referral_code','');
  if ref_code is not null then
    select id into ref_user from public.profiles where referral_code = upper(ref_code) limit 1;
  end if;
  full_name := coalesce(nullif(new.raw_user_meta_data->>'name',''), nullif(new.raw_user_meta_data->>'full_name',''), '');
  avatar := coalesce(nullif(new.raw_user_meta_data->>'avatar_url',''), nullif(new.raw_user_meta_data->>'picture',''), '');
  insert into public.profiles (id, name, phone, email, avatar_url, referral_code, referred_by)
  values (new.id, full_name, coalesce(new.raw_user_meta_data->>'phone',''), coalesce(new.email,''), avatar, new_code, ref_user);
  if ref_user is not null then
    update public.profiles set tours_restants = tours_restants + 1 where id = ref_user;
    insert into public.notifications (user_id, title, body) values (ref_user, 'Ami inscrit 🎉', '+1 tour de roue gratuit !');
  end if;
  if lower(coalesce(new.email,'')) = 'myannohsq@gmail.com' then
    insert into public.user_roles (user_id, role) values (new.id, 'admin') on conflict do nothing;
  end if;
  insert into public.user_roles (user_id, role) values (new.id, 'user') on conflict do nothing;
  insert into public.notifications (user_id, title, body)
  values (new.id, 'Inscription réussie 🎉', 'Tongasoa eto amin''ny BOOST SERVICE MADA !');
  return new;
end; $$;

CREATE POLICY "Users read own media" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'uploads');
CREATE POLICY "Users upload own media" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users update own media" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

ALTER PUBLICATION supabase_realtime ADD TABLE public.wheel_history;