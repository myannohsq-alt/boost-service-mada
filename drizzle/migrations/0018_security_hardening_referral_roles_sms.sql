CREATE TABLE IF NOT EXISTS public.app_secrets (name text PRIMARY KEY, value text NOT NULL);
GRANT ALL ON public.app_secrets TO service_role;
REVOKE ALL ON public.app_secrets FROM anon, authenticated;
ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;
INSERT INTO public.app_secrets(name, value)
VALUES ('order_sms_hook', encode(extensions.gen_random_bytes(32),'hex'))
ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value;

CREATE OR REPLACE FUNCTION public.notify_order_sms()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE s text;
BEGIN
  SELECT value INTO s FROM public.app_secrets WHERE name='order_sms_hook';
  IF s IS NULL THEN RETURN NEW; END IF;
  PERFORM net.http_post(
    url := 'https://boostmada.app/api/public/order-sms',
    headers := jsonb_build_object('Content-Type','application/json','x-hook-secret', s),
    body := jsonb_build_object('record', jsonb_build_object('id', NEW.id))
  );
  RETURN NEW;
END $$;

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
  insert into public.user_roles (user_id, role) values (new.id, 'user') on conflict do nothing;
  insert into public.notifications (user_id, title, body)
  values (new.id, 'Inscription réussie 🎉', 'Tongasoa eto amin''ny BOOST SERVICE MADA !');
  return new;
end $$;

CREATE OR REPLACE FUNCTION public.claim_referral(_code text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE ref_user uuid; me uuid := auth.uid();
BEGIN
  IF me IS NULL OR coalesce(_code,'')='' THEN RETURN false; END IF;
  SELECT id INTO ref_user FROM profiles WHERE referral_code=upper(trim(_code)) LIMIT 1;
  IF ref_user IS NULL OR ref_user=me THEN RETURN false; END IF;
  UPDATE profiles SET referred_by=ref_user WHERE id=me AND referred_by IS NULL AND created_at > now()-interval '2 days';
  RETURN FOUND;
END $$;

-- Referral reward only after the referred member's first approved deposit
CREATE OR REPLACE FUNCTION public.reward_referral_on_first_deposit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE ref_user uuid;
BEGIN
  IF NEW.status='approved' AND OLD.status IS DISTINCT FROM 'approved'
     AND NOT EXISTS (SELECT 1 FROM recharges WHERE user_id=NEW.user_id AND status='approved' AND id<>NEW.id) THEN
    SELECT referred_by INTO ref_user FROM profiles WHERE id=NEW.user_id;
    IF ref_user IS NOT NULL AND ref_user<>NEW.user_id THEN
      UPDATE profiles SET balance=balance+100, referral_earnings=referral_earnings+100 WHERE id=ref_user;
      INSERT INTO notifications(user_id,title,body) VALUES (ref_user,'Ami parrainé 🎉','+100 Ar ajoutés : votre ami a fait son premier dépôt !');
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.reward_referral_on_first_deposit() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_reward_referral ON public.recharges;
CREATE TRIGGER trg_reward_referral AFTER UPDATE OF status ON public.recharges
FOR EACH ROW EXECUTE FUNCTION public.reward_referral_on_first_deposit();

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT (auth.uid() IS NULL OR _user_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role='admin'))
     AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role)
$$;

CREATE OR REPLACE FUNCTION public.leaderboard(_limit integer DEFAULT 8)
RETURNS TABLE(id uuid, name text, avatar_url text, points integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE WHEN p.id = auth.uid() THEN p.id ELSE md5(p.id::text || 'lb')::uuid END,
         coalesce(nullif(p.name,''),'Membre'), p.avatar_url, p.points
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL AND p.points > 0
  ORDER BY p.points DESC, p.created_at LIMIT least(greatest(_limit,1),50)
$$;

CREATE OR REPLACE FUNCTION public.lottery_participants(_date date)
RETURNS TABLE(is_me boolean, author_name text, amount integer, created_at timestamp with time zone)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT true, e.author_name, e.amount, e.created_at FROM public.lottery_entries e
  WHERE e.user_id = auth.uid() AND e.draw_date = _date ORDER BY e.created_at
$$;

CREATE OR REPLACE FUNCTION public.chat_member_profiles(_ids uuid[])
RETURNS TABLE(id uuid, name text, avatar_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT p.id, p.name, p.avatar_url FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.chat_messages c WHERE c.user_id = auth.uid())
    AND p.id = ANY(_ids[1:200])
    AND EXISTS (SELECT 1 FROM public.chat_messages c WHERE c.user_id = p.id)
$$;