ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS comments text NOT NULL DEFAULT '';

INSERT INTO public.services (platform, category, name_fr, name_mg, unit, price, active, sort_order, provider_service_id, provider_name, badge, delivery_time, provider_min, provider_max)
SELECT 'facebook', 'Commentaires IA', 'Commentaires Gasy IA', 'Commentaires Gasy IA', 100, 2000, true, 99, '18819', 'SMMGen', '', '0-2 h', 1, 10000
WHERE NOT EXISTS (SELECT 1 FROM public.services WHERE name_fr = 'Commentaires Gasy IA');

CREATE OR REPLACE FUNCTION public.place_comment_order(_link text, _comments text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE s public.services%rowtype; lines text[]; qty integer; cost numeric; bal numeric; oid uuid; clean text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF;
  SELECT * INTO s FROM public.services WHERE name_fr = 'Commentaires Gasy IA' AND active LIMIT 1;
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
  INSERT INTO public.activity_log (user_id, action, detail) VALUES (auth.uid(), 'order_created', s.name_fr);
  RETURN oid;
END; $$;
REVOKE EXECUTE ON FUNCTION public.place_comment_order(text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.place_comment_order(text, text) TO authenticated;