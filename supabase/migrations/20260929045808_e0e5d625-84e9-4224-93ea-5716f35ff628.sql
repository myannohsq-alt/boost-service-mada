CREATE OR REPLACE FUNCTION public.place_order(_service_id uuid, _quantity integer, _link text, _promo text, _note text DEFAULT ''::text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE s public.services%rowtype; cost numeric; pc public.promo_codes%rowtype; bal numeric; oid uuid; is_admin boolean; reaction_key text; provider_id text; provider_min integer; provider_max integer; target_name text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF;
  SELECT * INTO s FROM public.services WHERE id = _service_id AND active;
  IF s.id IS NULL THEN RAISE EXCEPTION 'Service introuvable'; END IF;
  IF s.platform <> 'protection' THEN
    IF _quantity < 100 OR _quantity > 10000000 THEN RAISE EXCEPTION 'Quantité hors limites (100 à 10000000)'; END IF;
    IF _link !~* '^https://[^[:space:]/]+\.[^[:space:]/]+(/[^[:space:]]*)?$' OR length(_link) > 500 THEN RAISE EXCEPTION 'Lien HTTPS invalide'; END IF;
  END IF;
  IF _quantity < 1 THEN RAISE EXCEPTION 'Quantité invalide'; END IF;
  IF s.platform = 'facebook' AND (s.name_fr ~* 'réaction|reaction') THEN
    IF coalesce(_note,'') !~ '^reaction:(like|love|care|haha|wow|sad|angry|photo-love)(;visibility:invisible)?(;target:[^;]{1,100})?(;cible:(pub|pdp|pdc))?(;tier:(gasy|vazah))?$' THEN RAISE EXCEPTION 'Choisissez un type de réaction'; END IF;
    reaction_key := substring(_note FROM '^reaction:([a-z-]+)');
    IF _note LIKE '%;visibility:invisible%' AND s.name_fr !~* 'vazah' THEN RAISE EXCEPTION 'Visibilité invalide pour ce service'; END IF;
    target_name := (regexp_match(_note, ';target:([^;]{1,100})'))[1];
    IF s.name_fr ~* 'commentaire|comment' THEN
      IF s.name_fr ~* 'réactions sur commentaires' AND target_name IS NULL THEN RAISE EXCEPTION 'Indiquez le nom de la personne'; END IF;
      provider_id := CASE reaction_key WHEN 'like' THEN '12669' WHEN 'love' THEN '12670' WHEN 'care' THEN '12671' WHEN 'wow' THEN '12672' WHEN 'haha' THEN '12673' WHEN 'sad' THEN '12674' WHEN 'angry' THEN '12675' ELSE '12670' END;
    ELSE
      IF target_name IS NOT NULL OR _note ~ ';(cible|tier):' THEN RAISE EXCEPTION 'Cible invalide pour ce service'; END IF;
      IF reaction_key IN ('wow','sad','angry') THEN RAISE EXCEPTION 'Type de réaction invalide pour ce service'; END IF;
      provider_id := CASE reaction_key WHEN 'like' THEN '16823' WHEN 'love' THEN '16824' WHEN 'care' THEN '16825' WHEN 'haha' THEN '16827' ELSE '16824' END;
    END IF;
    SELECT min_qty, max_qty INTO provider_min, provider_max FROM public.provider_services WHERE provider_service_id = provider_id;
    IF provider_min IS NULL OR _quantity < provider_min OR _quantity > provider_max THEN RAISE EXCEPTION 'Quantité hors limites fournisseur'; END IF;
  ELSIF s.platform <> 'protection' THEN
    IF coalesce(_note, '') <> '' THEN RAISE EXCEPTION 'Type de réaction invalide pour ce service'; END IF;
    IF s.provider_min IS NOT NULL AND _quantity < s.provider_min THEN RAISE EXCEPTION 'Quantité minimum fournisseur: %', s.provider_min; END IF;
    IF s.provider_max IS NOT NULL AND _quantity > s.provider_max THEN RAISE EXCEPTION 'Quantité maximum fournisseur: %', s.provider_max; END IF;
  ELSE
    IF _quantity < s.unit THEN RAISE EXCEPTION 'Quantité minimum: %', s.unit; END IF;
  END IF;
  cost := ceil((_quantity::numeric / s.unit) * s.price);
  IF s.name_fr ~* 'réactions sur commentaires' THEN
    cost := ceil(_quantity::numeric / 100 * CASE WHEN _note LIKE '%;tier:vazah%' THEN 15000 ELSE 20000 END);
  END IF;
  IF _promo IS NOT NULL AND _promo <> '' THEN
    SELECT * INTO pc FROM public.promo_codes WHERE code = upper(_promo) AND active AND (expires_at IS NULL OR expires_at > now()) AND uses < max_uses;
    IF pc.id IS NOT NULL THEN
      cost := ceil(cost * (100 - pc.discount_percent) / 100.0);
      UPDATE public.promo_codes SET uses = uses + 1 WHERE id = pc.id;
    END IF;
  END IF;
  is_admin := public.has_role(auth.uid(), 'admin'::app_role);
  IF is_admin THEN cost := 0;
  ELSE
    SELECT balance INTO bal FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
    IF bal IS NULL OR bal < cost THEN RAISE EXCEPTION 'Solde insuffisant'; END IF;
    UPDATE public.profiles SET balance = balance - cost WHERE id = auth.uid();
  END IF;
  INSERT INTO public.orders (user_id, service_id, service_label, quantity, target_link, amount, notes, comments)
  VALUES (auth.uid(), s.id, s.name_fr, _quantity, _link, cost, coalesce(_note, ''), target_name) RETURNING id INTO oid;
  INSERT INTO public.notifications (user_id, title, body) VALUES (auth.uid(), 'Nouvelle commande 📦', s.name_fr || ' × ' || _quantity || ' — ' || cost || ' Ar');
  INSERT INTO public.activity_log (user_id, action, detail) VALUES (auth.uid(), 'order_created', s.name_fr);
  RETURN oid;
END;
$function$;

CREATE TABLE public.booster_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  fb_name text NOT NULL CHECK (char_length(fb_name) BETWEEN 2 AND 100),
  fb_link text NOT NULL CHECK (fb_link ~* '^https://' AND char_length(fb_link) <= 300),
  mvola text NOT NULL CHECK (mvola ~ '^0[0-9]{9}$'),
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.booster_accounts TO authenticated;
GRANT ALL ON public.booster_accounts TO service_role;
ALTER TABLE public.booster_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own booster read" ON public.booster_accounts FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own booster insert" ON public.booster_accounts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'active');
CREATE POLICY "own booster delete" ON public.booster_accounts FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE OR REPLACE FUNCTION public.booster_max_two() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(NEW.user_id::text));
  IF (SELECT count(*) FROM public.booster_accounts WHERE user_id = NEW.user_id) >= 2 THEN RAISE EXCEPTION 'Efa feno 2'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER booster_max_two BEFORE INSERT ON public.booster_accounts FOR EACH ROW EXECUTE FUNCTION public.booster_max_two();

CREATE TABLE public.boost_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  client_name text NOT NULL CHECK (char_length(client_name) BETWEEN 2 AND 100),
  phone text NOT NULL CHECK (phone ~ '^0[0-9]{9}$'),
  service_type text NOT NULL CHECK (service_type IN ('followers','likes','comments')),
  link text NOT NULL CHECK (link ~* '^https://' AND char_length(link) <= 500),
  quantity integer NOT NULL CHECK (quantity BETWEEN 10 AND 5000),
  price numeric NOT NULL DEFAULT 0,
  done_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending_payment',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.boost_orders TO authenticated;
GRANT ALL ON public.boost_orders TO service_role;
ALTER TABLE public.boost_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own boost orders read" ON public.boost_orders FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own boost orders insert" ON public.boost_orders FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'pending_payment' AND done_count = 0);
CREATE OR REPLACE FUNCTION public.boost_order_price() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN NEW.price := NEW.quantity * CASE WHEN NEW.service_type = 'comments' THEN 60 ELSE 20 END; RETURN NEW; END $$;
CREATE TRIGGER boost_order_price BEFORE INSERT ON public.boost_orders FOR EACH ROW EXECUTE FUNCTION public.boost_order_price();

CREATE TABLE public.missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.boost_orders(id) ON DELETE CASCADE,
  reward integer NOT NULL,
  link text NOT NULL,
  kind text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.missions TO authenticated;
GRANT ALL ON public.missions TO service_role;
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read open missions" ON public.missions FOR SELECT TO authenticated USING (status = 'open' OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.mission_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reward integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mission_id)
);
GRANT SELECT ON public.mission_claims TO authenticated;
GRANT ALL ON public.mission_claims TO service_role;
ALTER TABLE public.mission_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own claims read" ON public.mission_claims FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.booster_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  mvola text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.booster_withdrawals TO authenticated;
GRANT ALL ON public.booster_withdrawals TO service_role;
ALTER TABLE public.booster_withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own withdrawals read" ON public.booster_withdrawals FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.mark_boost_paid(_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.boost_orders SET status = 'pending_approval' WHERE id = _id AND user_id = auth.uid() AND status = 'pending_payment';
  IF NOT FOUND THEN RAISE EXCEPTION 'Commande invalide'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.approve_boost_order(_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE o public.boost_orders%rowtype;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT * INTO o FROM public.boost_orders WHERE id = _id FOR UPDATE;
  IF o.id IS NULL OR o.status NOT IN ('pending_payment','pending_approval') THEN RAISE EXCEPTION 'Commande invalide'; END IF;
  UPDATE public.boost_orders SET status = 'processing' WHERE id = o.id;
  INSERT INTO public.missions (order_id, reward, link, kind)
  SELECT o.id, CASE WHEN o.service_type = 'comments' THEN 30 ELSE 10 END, o.link, o.service_type FROM generate_series(1, o.quantity);
END $$;

CREATE OR REPLACE FUNCTION public.claim_mission(_mission_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE m public.missions%rowtype; today_count int; accts int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF;
  SELECT count(*) INTO accts FROM public.booster_accounts WHERE user_id = auth.uid() AND status = 'active';
  IF accts = 0 THEN RAISE EXCEPTION 'Ampidiro aloha ny compte Facebook-nao'; END IF;
  SELECT count(*) INTO today_count FROM public.mission_claims WHERE user_id = auth.uid()
    AND (created_at AT TIME ZONE 'Indian/Antananarivo')::date = (now() AT TIME ZONE 'Indian/Antananarivo')::date;
  IF today_count >= 10 * accts THEN RAISE EXCEPTION 'Tratra ny fetra 10 missions/jour/compte'; END IF;
  IF EXISTS (SELECT 1 FROM public.mission_claims c JOIN public.missions x ON x.id = c.mission_id
             JOIN public.missions me ON me.id = _mission_id WHERE c.user_id = auth.uid() AND x.order_id = me.order_id AND c.status <> 'rejected') THEN
    RAISE EXCEPTION 'Efa nanao an''ity commande ity ianao';
  END IF;
  SELECT * INTO m FROM public.missions WHERE id = _mission_id AND status = 'open' FOR UPDATE SKIP LOCKED;
  IF m.id IS NULL THEN RAISE EXCEPTION 'Mission tsy misy intsony'; END IF;
  UPDATE public.missions SET status = 'claimed' WHERE id = m.id;
  INSERT INTO public.mission_claims (mission_id, user_id, reward) VALUES (m.id, auth.uid(), m.reward);
END $$;

CREATE OR REPLACE FUNCTION public.review_mission_claim(_claim_id uuid, _approve boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE c public.mission_claims%rowtype; o public.boost_orders%rowtype;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT * INTO c FROM public.mission_claims WHERE id = _claim_id AND status = 'pending' FOR UPDATE;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Mission invalide'; END IF;
  IF _approve THEN
    UPDATE public.mission_claims SET status = 'approved' WHERE id = c.id;
    UPDATE public.missions SET status = 'done' WHERE id = c.mission_id;
    UPDATE public.boost_orders SET done_count = done_count + 1 WHERE id = (SELECT order_id FROM public.missions WHERE id = c.mission_id) RETURNING * INTO o;
    IF o.done_count >= o.quantity AND o.status <> 'completed' THEN
      UPDATE public.boost_orders SET status = 'completed' WHERE id = o.id;
      INSERT INTO public.notifications (user_id, title, body) VALUES (o.user_id, 'Vita commande-nao! ✅', o.service_type || ' × ' || o.quantity);
    END IF;
  ELSE
    UPDATE public.mission_claims SET status = 'rejected' WHERE id = c.id;
    UPDATE public.missions SET status = 'open' WHERE id = c.mission_id;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.booster_wallet() RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT json_build_object(
    'today', coalesce((SELECT sum(reward) FROM public.mission_claims WHERE user_id = auth.uid() AND status = 'approved'
       AND (created_at AT TIME ZONE 'Indian/Antananarivo')::date = (now() AT TIME ZONE 'Indian/Antananarivo')::date),0),
    'total', coalesce((SELECT sum(reward) FROM public.mission_claims WHERE user_id = auth.uid() AND status = 'approved'),0),
    'pending', coalesce((SELECT sum(reward) FROM public.mission_claims WHERE user_id = auth.uid() AND status = 'pending'),0),
    'withdrawn', coalesce((SELECT sum(amount) FROM public.booster_withdrawals WHERE user_id = auth.uid() AND status <> 'rejected'),0))
$$;

CREATE OR REPLACE FUNCTION public.request_booster_withdrawal(_amount integer) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE avail numeric; mv text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF;
  IF _amount < 1000 THEN RAISE EXCEPTION 'Retrait minimum 1000 Ar'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('wd' || auth.uid()::text));
  SELECT coalesce((SELECT sum(reward) FROM public.mission_claims WHERE user_id = auth.uid() AND status = 'approved'),0)
       - coalesce((SELECT sum(amount) FROM public.booster_withdrawals WHERE user_id = auth.uid() AND status <> 'rejected'),0) INTO avail;
  IF avail < _amount THEN RAISE EXCEPTION 'Vola tsy ampy'; END IF;
  SELECT mvola INTO mv FROM public.booster_accounts WHERE user_id = auth.uid() ORDER BY created_at LIMIT 1;
  IF mv IS NULL THEN RAISE EXCEPTION 'Tsy misy compte booster'; END IF;
  INSERT INTO public.booster_withdrawals (user_id, amount, mvola) VALUES (auth.uid(), _amount, mv);
END $$;

CREATE OR REPLACE FUNCTION public.review_booster_withdrawal(_id uuid, _approve boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.booster_withdrawals SET status = CASE WHEN _approve THEN 'paid' ELSE 'rejected' END WHERE id = _id AND status = 'pending';
END $$;

REVOKE EXECUTE ON FUNCTION public.mark_boost_paid(uuid), public.approve_boost_order(uuid), public.claim_mission(uuid), public.review_mission_claim(uuid,boolean), public.booster_wallet(), public.request_booster_withdrawal(integer), public.review_booster_withdrawal(uuid,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_boost_paid(uuid), public.approve_boost_order(uuid), public.claim_mission(uuid), public.review_mission_claim(uuid,boolean), public.booster_wallet(), public.request_booster_withdrawal(integer), public.review_booster_withdrawal(uuid,boolean) TO authenticated;