DROP POLICY IF EXISTS orders_insert_own ON public.orders;
REVOKE INSERT ON public.orders FROM authenticated, anon;