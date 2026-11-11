ALTER TABLE public.boost_orders ADD COLUMN IF NOT EXISTS order_id uuid;

CREATE OR REPLACE FUNCTION public.gasy_order_to_missions() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE s public.services%rowtype; p public.profiles%rowtype; k text; bid uuid;
BEGIN
  SELECT * INTO s FROM public.services WHERE id = NEW.service_id;
  IF s.id IS NULL OR lower(s.provider_name) <> 'manuel' THEN RETURN NEW; END IF;
  SELECT * INTO p FROM public.profiles WHERE id = NEW.user_id;
  k := CASE WHEN s.name_fr ~* 'follow' THEN 'followers' ELSE 'likes' END;
  INSERT INTO public.boost_orders (user_id, client_name, phone, service_type, link, quantity, status, order_id)
  VALUES (NEW.user_id, coalesce(nullif(p.name,''),'Client'), coalesce(p.phone,''), k, NEW.target_link, NEW.quantity, 'processing', NEW.id) RETURNING id INTO bid;
  INSERT INTO public.missions (order_id, reward, link, kind)
  SELECT bid, CASE WHEN k = 'followers' THEN 15 ELSE 10 END, NEW.target_link, k FROM generate_series(1, NEW.quantity);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS orders_gasy_missions ON public.orders;
CREATE TRIGGER orders_gasy_missions AFTER INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.gasy_order_to_missions();

-- Linked mission order finished -> main order done
CREATE OR REPLACE FUNCTION public.boost_order_sync_main() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.order_id IS NOT NULL AND NEW.status = 'completed' AND OLD.status <> 'completed' THEN
    UPDATE public.orders SET status = 'done' WHERE id = NEW.order_id AND status NOT IN ('done','completed','cancelled');
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS boost_orders_sync_main ON public.boost_orders;
CREATE TRIGGER boost_orders_sync_main AFTER UPDATE OF status ON public.boost_orders FOR EACH ROW EXECUTE FUNCTION public.boost_order_sync_main();

-- Notify + push on order created / completed (all services)
CREATE OR REPLACE FUNCTION public.order_notify_events() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.push_queue(title, body, url, target) VALUES ('Kaomandy voaray 📦', NEW.service_label || ' × ' || NEW.quantity || ' — efa eo am-panatanterahana', '/commandes', 'user:' || NEW.user_id);
  ELSIF NEW.status IN ('done','completed') AND OLD.status NOT IN ('done','completed') THEN
    INSERT INTO public.notifications (user_id, title, body) VALUES (NEW.user_id, 'Vita ny kaomandinao 🎉', NEW.service_label || ' × ' || NEW.quantity || ' — vita soa aman-tsara!');
    INSERT INTO public.push_queue(title, body, url, target) VALUES ('Vita ny kaomandinao 🎉', NEW.service_label || ' × ' || NEW.quantity || ' — vita soa aman-tsara!', '/commandes', 'user:' || NEW.user_id);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS orders_notify_events ON public.orders;
CREATE TRIGGER orders_notify_events AFTER INSERT OR UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.order_notify_events();

-- Mission review: avoid duplicate notification for linked orders
CREATE OR REPLACE FUNCTION public.review_mission_claim(_claim_id uuid, _approve boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
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
      IF o.order_id IS NULL THEN
        INSERT INTO public.notifications (user_id, title, body) VALUES (o.user_id, 'Vita commande-nao! ✅', o.service_type || ' × ' || o.quantity);
      END IF;
    END IF;
  ELSE
    UPDATE public.mission_claims SET status = 'rejected' WHERE id = c.id;
    UPDATE public.missions SET status = 'open' WHERE id = c.mission_id;
  END IF;
END $function$;

-- Hourly rotating push when missions are open
CREATE OR REPLACE FUNCTION public.queue_missions_push() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE n bigint; msgs text[][] := ARRAY[
  ARRAY['💰 Misy mission vaovao!','Mahazoa 10-15 Ar isaky ny mission — ataovy izao fa mety ho lany 🏃','/mitady-vola'],
  ARRAY['🎯 Mission miandry anao','Like na Follow tsotra dia vola MVola ho anao 💸','/mitady-vola'],
  ARRAY['⚡ Haingana!','Mbola misy missions tsy vita — iza no voalohany? 🥇','/mitady-vola'],
  ARRAY['🇲🇬 Boost Gasy','Mpanjifa miandry ny réaction-nao — mahazoa vola androany 💰','/mitady-vola'],
  ARRAY['📲 5 minitra = vola','Ataovy missions vitsivitsy dia mahazo bonus +10 Ar 🎁','/mitady-vola'],
  ARRAY['🔥 Missions mafana','Followers sy Réactions vaovao — midira ao amin''ny Mitady Vola 👉','/mitady-vola']];
  i int := (floor(random()*6))::int + 1;
BEGIN
  SELECT count(*) INTO n FROM public.missions WHERE status = 'open';
  IF n = 0 THEN RETURN; END IF;
  INSERT INTO push_queue(title, body, url, target) VALUES (msgs[i][1], msgs[i][2] || ' (' || n || ' sisa)', msgs[i][3], 'all');
END $$;

-- After 2 days, send the unfinished part of a Gasy order to SMMGen
CREATE OR REPLACE FUNCTION public.escalate_gasy_orders() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r record; fb uuid; rem int;
BEGIN
  FOR r IN SELECT o.*, b.id AS bid, b.done_count, b.service_type FROM public.orders o JOIN public.boost_orders b ON b.order_id = o.id
           WHERE o.provider = 'manuel' AND o.provider_order_id IS NULL AND o.status IN ('pending','processing')
             AND b.status = 'processing' AND o.created_at < now() - interval '2 days' LOOP
    SELECT id INTO fb FROM public.services WHERE name_fr = CASE WHEN r.service_type = 'followers' THEN 'Fallback Gasy Followers' ELSE 'Fallback Gasy Likes' END LIMIT 1;
    IF fb IS NULL THEN CONTINUE; END IF;
    rem := greatest(100, r.quantity - r.done_count);
    UPDATE public.missions SET status = 'cancelled' WHERE order_id = r.bid AND status = 'open';
    UPDATE public.boost_orders SET status = 'escalated' WHERE id = r.bid;
    UPDATE public.orders SET service_id = fb, quantity = rem, notes = '', provider = 'smmgen', status = 'pending', retry_count = 0,
      admin_note = coalesce(admin_note,'') || ' [Gasy→SMMGen apres 48h, ' || r.done_count || ' vita tamin''ny missions]' WHERE id = r.id;
    INSERT INTO public.sync_jobs (kind, payload, dedupe_key) VALUES ('submit_order', jsonb_build_object('order_id', r.id), 'submit-esc:' || r.id::text) ON CONFLICT DO NOTHING;
  END LOOP;
END $$;
REVOKE EXECUTE ON FUNCTION public.escalate_gasy_orders() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.queue_missions_push() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.place_boost_order(text,text,text,text[],integer) FROM anon, authenticated;