CREATE OR REPLACE FUNCTION public.place_boost_order(_name text, _phone text, _link text, _types text[], _qty integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE t text; total numeric := 0; bal numeric; oid uuid; n int := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF;
  IF _types IS NULL OR array_length(_types,1) IS NULL THEN RAISE EXCEPTION 'Mifidiana karazana iray'; END IF;
  IF _qty < 100 OR _qty > 5000 THEN RAISE EXCEPTION 'Quantité 100 - 5000'; END IF;
  FOREACH t IN ARRAY _types LOOP
    IF t NOT IN ('followers','likes','comments') THEN RAISE EXCEPTION 'Karazana diso'; END IF;
    total := total + _qty * CASE WHEN t = 'comments' THEN 60 ELSE 20 END;
  END LOOP;
  SELECT balance INTO bal FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
  IF coalesce(bal,0) < 2000 THEN RAISE EXCEPTION 'Solde tsy ampy: 2000 Ar farafahakeliny. Mameno solde aloha.'; END IF;
  IF bal < total THEN RAISE EXCEPTION 'Solde tsy ampy (% Ar ilaina). Mameno solde aloha.', total; END IF;
  PERFORM set_config('app.allow_balance_change','on',true);
  UPDATE public.profiles SET balance = balance - total WHERE id = auth.uid();
  FOREACH t IN ARRAY _types LOOP
    INSERT INTO public.boost_orders (user_id, client_name, phone, service_type, link, quantity, status)
    VALUES (auth.uid(), _name, _phone, t, _link, _qty, 'processing') RETURNING id INTO oid;
    INSERT INTO public.missions (order_id, reward, link, kind)
    SELECT oid, CASE WHEN t = 'likes' THEN 10 ELSE 15 END, _link, t FROM generate_series(1, _qty);
    n := n + 1;
  END LOOP;
  INSERT INTO public.notifications (user_id, title, body) VALUES (auth.uid(), 'Commande Mitady Vola ✅', 'Voaray ary efa miseho amin''ny missions — ' || total || ' Ar');
  RETURN n;
END $$;

CREATE OR REPLACE FUNCTION public.available_missions()
RETURNS TABLE(id uuid, reward integer, link text, kind text, order_id uuid, open_count bigint, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT (array_agg(m.id ORDER BY m.created_at))[1], max(m.reward), max(m.link), max(m.kind), m.order_id, count(*), max(o.created_at)
  FROM public.missions m JOIN public.boost_orders o ON o.id = m.order_id
  WHERE m.status = 'open' AND auth.uid() IS NOT NULL
  GROUP BY m.order_id
  ORDER BY max(o.created_at) DESC
  LIMIT 200
$$;
REVOKE ALL ON FUNCTION public.available_missions() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.available_missions() TO authenticated;