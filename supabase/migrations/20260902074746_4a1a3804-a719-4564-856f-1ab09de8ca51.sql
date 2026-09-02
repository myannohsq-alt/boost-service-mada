-- 1. Auto-enqueue provider fulfillment when an order is created
CREATE OR REPLACE FUNCTION public.enqueue_order_submit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.sync_jobs (kind, payload, dedupe_key)
  VALUES ('submit_order', jsonb_build_object('order_id', NEW.id), 'submit:' || NEW.id::text)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_enqueue_submit ON public.orders;
CREATE TRIGGER orders_enqueue_submit
AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.enqueue_order_submit();

-- 2. Security: block direct balance / referral earnings edits by end users
CREATE OR REPLACE FUNCTION public.protect_profile_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.balance IS DISTINCT FROM OLD.balance
      OR NEW.referral_earnings IS DISTINCT FROM OLD.referral_earnings)
     AND current_user IN ('authenticated', 'anon') THEN
    RAISE EXCEPTION 'Modification du solde interdite';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_balance ON public.profiles;
CREATE TRIGGER profiles_protect_balance
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_balance();