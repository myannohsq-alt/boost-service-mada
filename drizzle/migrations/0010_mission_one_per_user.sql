CREATE OR REPLACE FUNCTION public.claim_mission(_mission_id uuid, _proof_path text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE m public.missions%rowtype; me public.missions%rowtype; today_count int; accts int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF;
  -- serialize claims per user so parallel taps cannot bypass checks
  PERFORM pg_advisory_xact_lock(hashtext('claim:' || auth.uid()::text));
  IF _proof_path IS NULL OR _proof_path NOT LIKE auth.uid()::text || '/proof-%' THEN RAISE EXCEPTION 'Ampidiro ny porofo (capture)'; END IF;
  SELECT count(*) INTO accts FROM public.booster_accounts WHERE user_id = auth.uid() AND status = 'active';
  IF accts = 0 THEN RAISE EXCEPTION 'Ampidiro aloha ny compte Facebook-nao'; END IF;
  SELECT count(*) INTO today_count FROM public.mission_claims WHERE user_id = auth.uid()
    AND (created_at AT TIME ZONE 'Indian/Antananarivo')::date = (now() AT TIME ZONE 'Indian/Antananarivo')::date;
  IF today_count >= 10 THEN RAISE EXCEPTION 'Tratra ny fetra 10 missions/jour'; END IF;
  SELECT * INTO me FROM public.missions WHERE id = _mission_id;
  IF me.id IS NULL THEN RAISE EXCEPTION 'Mission tsy misy intsony'; END IF;
  -- one claim per user per order, and per same link+kind across orders (any status, rejected included)
  IF EXISTS (SELECT 1 FROM public.mission_claims c JOIN public.missions x ON x.id = c.mission_id
             WHERE c.user_id = auth.uid()
               AND (x.order_id = me.order_id OR (lower(trim(x.link)) = lower(trim(me.link)) AND x.kind = me.kind))) THEN
    RAISE EXCEPTION 'Efa nanao an''ity mission ity ianao';
  END IF;
  SELECT * INTO m FROM public.missions WHERE id = _mission_id AND status = 'open' FOR UPDATE SKIP LOCKED;
  IF m.id IS NULL THEN RAISE EXCEPTION 'Mission tsy misy intsony'; END IF;
  UPDATE public.missions SET status = 'claimed' WHERE id = m.id;
  INSERT INTO public.mission_claims (mission_id, user_id, reward, proof_path) VALUES (m.id, auth.uid(), m.reward, _proof_path);
END $function$;

CREATE OR REPLACE FUNCTION public.available_missions()
 RETURNS TABLE(id uuid, reward integer, link text, kind text, order_id uuid, open_count bigint, created_at timestamp with time zone)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT (array_agg(m.id ORDER BY m.created_at))[1], max(m.reward), max(m.link), max(m.kind), m.order_id, count(*), max(o.created_at)
  FROM public.missions m JOIN public.boost_orders o ON o.id = m.order_id
  WHERE m.status = 'open' AND auth.uid() IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.mission_claims c JOIN public.missions x ON x.id = c.mission_id
                    WHERE c.user_id = auth.uid()
                      AND (x.order_id = m.order_id OR (lower(trim(x.link)) = lower(trim(m.link)) AND x.kind = m.kind)))
  GROUP BY m.order_id
  ORDER BY max(o.created_at) DESC
  LIMIT 200
$function$;