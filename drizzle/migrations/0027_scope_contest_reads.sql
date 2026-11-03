DROP POLICY IF EXISTS "contests readable" ON public.referral_contests;
REVOKE SELECT ON public.referral_contests FROM anon;
CREATE POLICY "contests readable by signed-in users" ON public.referral_contests
FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);