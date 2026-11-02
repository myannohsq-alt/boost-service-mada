CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own push read" ON public.push_subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own push insert" ON public.push_subscriptions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own push update" ON public.push_subscriptions FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own push delete" ON public.push_subscriptions FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.push_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  url text NOT NULL DEFAULT '/services',
  target text NOT NULL DEFAULT 'all',
  exclude_user uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);
GRANT ALL ON public.push_queue TO service_role;
ALTER TABLE public.push_queue ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.push_config (
  id int PRIMARY KEY DEFAULT 1,
  vapid_public text NOT NULL,
  vapid_private text NOT NULL,
  drain_url text NOT NULL,
  hook_secret text NOT NULL
);
GRANT ALL ON public.push_config TO service_role;
ALTER TABLE public.push_config ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.queue_chat_push() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF coalesce(NEW.type,'text') = 'vocal' THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM push_queue WHERE url = '/groupe' AND created_at > now() - interval '2 minutes') THEN RETURN NEW; END IF;
  INSERT INTO push_queue(title, body, url, target, exclude_user)
  VALUES ('💬 ' || coalesce(NEW.author_name,'Groupe'),
          CASE WHEN coalesce(NEW.content,'') = '' THEN '📷 Sary vaovao ao amin''ny Groupe' ELSE left(NEW.content, 120) END,
          '/groupe', 'all', NEW.user_id);
  RETURN NEW;
END $$;
CREATE TRIGGER chat_push AFTER INSERT ON public.chat_messages FOR EACH ROW EXECUTE FUNCTION public.queue_chat_push();

CREATE OR REPLACE FUNCTION public.queue_recharge_push() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO push_queue(title, body, url, target)
  VALUES ('💰 Demande de dépôt', coalesce(NEW.amount::text,'?') || ' Ar • ' || upper(coalesce(NEW.method,'')) || ' — à vérifier', '/admin', 'admins');
  RETURN NEW;
END $$;
CREATE TRIGGER recharge_push AFTER INSERT ON public.recharges FOR EACH ROW EXECUTE FUNCTION public.queue_recharge_push();

CREATE OR REPLACE FUNCTION public.queue_daily_push(_slot int) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE msgs text[][] := ARRAY[
  ARRAY['☀️ Manao ahoana! Boostéo ny pejinao','Followers, réactions, vues — haingana 5-15 min ⚡','/services'],
  ARRAY['💰 Ataovy recharge androany','MVola, Airtel, Orange — dépôt 40.000 Ar = bonus +5% 🎁','/depot'],
  ARRAY['🤝 Asao ny namanao','Zarao ny rohinao: rehefa maro isika dia mihamora ny Boost Malagasy 🇲🇬','/profil'],
  ARRAY['🌙 Commande hariva','Alefaso izao ny boost-nao dia vita rehefa mifoha ianao 🚀','/services'],
  ARRAY['🔥 Aza adino ny pejinao','Réactions sy Followers mora indrindra — 100% Gasy 💯','/services']];
  i int := ((_slot + extract(doy from now())::int) % 5) + 1;
BEGIN
  INSERT INTO push_queue(title, body, url, target) VALUES (msgs[i][1], msgs[i][2], msgs[i][3], 'all');
END $$;

-- Wake the sender as soon as something is queued (no polling).
CREATE OR REPLACE FUNCTION public.wake_push_drain() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c push_config%rowtype;
BEGIN
  SELECT * INTO c FROM push_config WHERE id = 1;
  IF c.id IS NULL THEN RETURN NEW; END IF;
  PERFORM net.http_post(url := c.drain_url,
    headers := jsonb_build_object('content-type','application/json','x-hook-secret', c.hook_secret),
    body := '{}'::jsonb);
  RETURN NEW;
END $$;
CREATE TRIGGER push_queue_wake AFTER INSERT ON public.push_queue FOR EACH ROW EXECUTE FUNCTION public.wake_push_drain();

REVOKE ALL ON FUNCTION public.queue_daily_push(int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wake_push_drain() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.queue_chat_push() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.queue_recharge_push() FROM PUBLIC, anon, authenticated;

-- Antananarivo = UTC+3 : 7h,12h,16h,20h,23h
SELECT cron.schedule('push-daily-07', '0 4 * * *', $$SELECT public.queue_daily_push(0);$$);
SELECT cron.schedule('push-daily-12', '0 9 * * *', $$SELECT public.queue_daily_push(1);$$);
SELECT cron.schedule('push-daily-16', '0 13 * * *', $$SELECT public.queue_daily_push(2);$$);
SELECT cron.schedule('push-daily-20', '0 17 * * *', $$SELECT public.queue_daily_push(3);$$);
SELECT cron.schedule('push-daily-23', '0 20 * * *', $$SELECT public.queue_daily_push(4);$$);