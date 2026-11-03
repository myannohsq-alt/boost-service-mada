CREATE TABLE public.external_depot_claims (
  depot_id text PRIMARY KEY,
  user_id uuid NOT NULL,
  montant integer NOT NULL,
  phone text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.external_depot_claims TO authenticated;
GRANT ALL ON public.external_depot_claims TO service_role;
ALTER TABLE public.external_depot_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "claims_select_own_or_admin" ON public.external_depot_claims FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));