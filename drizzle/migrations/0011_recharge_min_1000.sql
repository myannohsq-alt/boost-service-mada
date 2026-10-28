ALTER TABLE public.recharges DROP CONSTRAINT IF EXISTS recharges_amount_min_1000;
ALTER TABLE public.recharges ADD CONSTRAINT recharges_amount_min_1000 CHECK (amount >= 1000) NOT VALID;