CREATE OR REPLACE FUNCTION public.admin_cancel_order(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE o public.orders%rowtype;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'Admin uniquement'; END IF;
  SELECT * INTO o FROM public.orders WHERE id = _id FOR UPDATE;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Commande introuvable'; END IF;
  IF o.status IN ('done','rejected','cancelled') THEN RAISE EXCEPTION 'Commande déjà clôturée'; END IF;
  UPDATE public.orders SET status = 'rejected', admin_note = 'Annulée par l''admin', next_retry_at = NULL WHERE id = _id;
  UPDATE public.sync_jobs SET status = 'done', processed_at = now() WHERE kind = 'submit_order' AND status <> 'done' AND payload->>'order_id' = _id::text;
  IF o.amount > 0 THEN
    UPDATE public.profiles SET balance = balance + o.amount WHERE id = o.user_id;
    INSERT INTO public.notifications (user_id, title, body) VALUES (o.user_id, 'Commande annulée ↩️', o.service_label || ' — ' || o.amount || ' Ar remboursés');
  END IF;
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_cancel_order(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_cancel_order(uuid) TO authenticated;