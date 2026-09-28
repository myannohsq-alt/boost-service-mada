CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.notify_order_sms() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://id-preview--a68234bf-f8e2-434a-b085-9eed7465c878.lovable.app/api/public/order-sms',
    headers := jsonb_build_object('Content-Type','application/json','x-hook-secret','c1f4b9e27a4d48f3a6e0b5d29c18f7a3e94b0d6c52a7f1e8d3b4c6a90e2f5d81'),
    body := jsonb_build_object('record', to_jsonb(NEW))
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS order_sms_on_insert ON public.orders;
CREATE TRIGGER order_sms_on_insert AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.notify_order_sms();