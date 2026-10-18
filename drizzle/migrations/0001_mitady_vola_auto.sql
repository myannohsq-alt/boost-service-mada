ALTER TABLE public.mission_claims ADD COLUMN IF NOT EXISTS proof_path text;

DROP POLICY IF EXISTS "own boost orders insert" ON public.boost_orders;

CREATE OR REPLACE FUNCTION public.place_boost_order(_name text, _phone text, _link text, _types text[], _qty integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE t text; total numeric := 0; bal numeric; is_admin boolean; oid uuid; n int := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF;
  IF _types IS NULL OR array_length(_types,1) IS NULL THEN RAISE EXCEPTION 'Mifidiana karazana iray'; END IF;
  IF _qty < 100 OR _qty > 5000 THEN RAISE EXCEPTION 'Quantité 100 - 5000'; END IF;
  FOREACH t IN ARRAY _types LOOP
    IF t NOT IN ('followers','likes','comments') THEN RAISE EXCEPTION 'Karazana diso'; END IF;
    total := total + _qty * CASE WHEN t = 'comments' THEN 60 ELSE 20 END;
  END LOOP;
  is_admin := public.has_role(auth.uid(),'admin');
  IF NOT is_admin THEN
    SELECT balance INTO bal FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
    IF coalesce(bal,0) < 2000 THEN RAISE EXCEPTION 'Solde tsy ampy: 2000 Ar farafahakeliny. Mameno solde aloha.'; END IF;
    IF bal < total THEN RAISE EXCEPTION 'Solde tsy ampy (% Ar ilaina). Mameno solde aloha.', total; END IF;
    UPDATE public.profiles SET balance = balance - total WHERE id = auth.uid();
  END IF;
  FOREACH t IN ARRAY _types LOOP
    INSERT INTO public.boost_orders (user_id, client_name, phone, service_type, link, quantity, status)
    VALUES (auth.uid(), _name, _phone, t, _link, _qty, 'processing') RETURNING id INTO oid;
    INSERT INTO public.missions (order_id, reward, link, kind)
    SELECT oid, CASE WHEN t = 'comments' THEN 15 WHEN t = 'followers' THEN 15 ELSE 10 END, _link, t FROM generate_series(1, _qty);
    n := n + 1;
  END LOOP;
  INSERT INTO public.notifications (user_id, title, body) VALUES (auth.uid(), 'Commande Mitady Vola ✅', 'Voaray ary efa miseho amin''ny missions — ' || total || ' Ar');
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.place_boost_order(text,text,text,text[],integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.place_boost_order(text,text,text,text[],integer) TO authenticated;

DROP FUNCTION IF EXISTS public.claim_mission(uuid);
CREATE OR REPLACE FUNCTION public.claim_mission(_mission_id uuid, _proof_path text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE m public.missions%rowtype; today_count int; accts int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF;
  IF _proof_path IS NULL OR _proof_path NOT LIKE auth.uid()::text || '/proof-%' THEN RAISE EXCEPTION 'Ampidiro ny porofo (capture)'; END IF;
  SELECT count(*) INTO accts FROM public.booster_accounts WHERE user_id = auth.uid() AND status = 'active';
  IF accts = 0 THEN RAISE EXCEPTION 'Ampidiro aloha ny compte Facebook-nao'; END IF;
  SELECT count(*) INTO today_count FROM public.mission_claims WHERE user_id = auth.uid()
    AND (created_at AT TIME ZONE 'Indian/Antananarivo')::date = (now() AT TIME ZONE 'Indian/Antananarivo')::date;
  IF today_count >= 10 THEN RAISE EXCEPTION 'Tratra ny fetra 10 missions/jour'; END IF;
  IF EXISTS (SELECT 1 FROM public.mission_claims c JOIN public.missions x ON x.id = c.mission_id
             JOIN public.missions me ON me.id = _mission_id WHERE c.user_id = auth.uid() AND x.order_id = me.order_id AND c.status <> 'rejected') THEN
    RAISE EXCEPTION 'Efa nanao an''ity commande ity ianao';
  END IF;
  SELECT * INTO m FROM public.missions WHERE id = _mission_id AND status = 'open' FOR UPDATE SKIP LOCKED;
  IF m.id IS NULL THEN RAISE EXCEPTION 'Mission tsy misy intsony'; END IF;
  UPDATE public.missions SET status = 'claimed' WHERE id = m.id;
  INSERT INTO public.mission_claims (mission_id, user_id, reward, proof_path) VALUES (m.id, auth.uid(), m.reward, _proof_path);
END $$;
REVOKE ALL ON FUNCTION public.claim_mission(uuid,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.claim_mission(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.order_proofs(_order_id uuid)
RETURNS TABLE(id uuid, proof_path text, status text, created_at timestamptz, fb_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT c.id, c.proof_path, c.status, c.created_at,
    (SELECT b.fb_name FROM public.booster_accounts b WHERE b.user_id = c.user_id ORDER BY b.created_at LIMIT 1)
  FROM public.mission_claims c JOIN public.missions m ON m.id = c.mission_id JOIN public.boost_orders o ON o.id = m.order_id
  WHERE o.id = _order_id AND (o.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  ORDER BY c.created_at DESC LIMIT 200
$$;
REVOKE ALL ON FUNCTION public.order_proofs(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.order_proofs(uuid) TO authenticated;

CREATE POLICY "Order owners read proofs" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'uploads' AND EXISTS (
  SELECT 1 FROM public.mission_claims c JOIN public.missions m ON m.id = c.mission_id JOIN public.boost_orders o ON o.id = m.order_id
  WHERE c.proof_path = storage.objects.name AND (o.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

CREATE OR REPLACE FUNCTION public.booster_max_two()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(NEW.user_id::text));
  IF EXISTS (SELECT 1 FROM public.booster_accounts WHERE user_id = NEW.user_id) THEN RAISE EXCEPTION 'Compte Facebook 1 ihany isaky ny olona'; END IF;
  RETURN NEW;
END $$;