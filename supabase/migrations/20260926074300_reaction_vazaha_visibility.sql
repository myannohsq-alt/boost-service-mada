CREATE OR REPLACE FUNCTION public.place_order(_service_id uuid, _quantity integer, _link text, _promo text, _note text DEFAULT '')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE s public.services%rowtype; cost numeric; pc public.promo_codes%rowtype; bal numeric; oid uuid; is_admin boolean; reaction_key text; provider_id text; provider_min integer; provider_max integer;
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
    reaction_key := substring(coalesce(_note, '') FROM '^reaction:(like|love|care|haha|photo-love)(;visibility:invisible)?$');
    IF reaction_key IS NULL THEN RAISE EXCEPTION 'Choisissez un type de réaction'; END IF;
    IF _note LIKE '%;visibility:invisible' AND s.name_fr !~* 'vazah' THEN RAISE EXCEPTION 'Visibilité invalide pour ce service'; END IF;
    IF s.name_fr ~* 'commentaire|comment' THEN
      provider_id := CASE reaction_key WHEN 'like' THEN '12669' WHEN 'love' THEN '12670' WHEN 'care' THEN '12671' WHEN 'haha' THEN '12673' ELSE '12670' END;
    ELSE
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
  cost := ceil((_quantity::numeric / s.unit) * s.price * CASE WHEN s.platform = 'facebook' AND s.name_fr ~* 'réaction|reaction' AND s.name_fr ~* 'vazah' AND _note LIKE '%;visibility:invisible' THEN 0.8 ELSE 1 END);
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
  INSERT INTO public.orders (user_id, service_id, service_label, quantity, target_link, amount, notes)
  VALUES (auth.uid(), s.id, s.name_fr, _quantity, _link, cost, coalesce(_note, '')) RETURNING id INTO oid;
  INSERT INTO public.notifications (user_id, title, body) VALUES (auth.uid(), 'Nouvelle commande 📦', s.name_fr || ' × ' || _quantity || ' — ' || cost || ' Ar');
  INSERT INTO public.activity_log (user_id, action, detail) VALUES (auth.uid(), 'order_created', s.name_fr);
  RETURN oid;
END;
$function$;