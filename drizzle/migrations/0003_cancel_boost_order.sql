CREATE OR REPLACE FUNCTION public.cancel_boost_order(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.boost_orders SET status = 'cancelled' WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Commande tsy hita'; END IF;
  UPDATE public.missions SET status = 'cancelled' WHERE order_id = _id AND status = 'open';
END $$;
REVOKE ALL ON FUNCTION public.cancel_boost_order(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.cancel_boost_order(uuid) TO authenticated;