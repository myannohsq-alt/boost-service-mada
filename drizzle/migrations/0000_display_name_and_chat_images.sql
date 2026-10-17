CREATE OR REPLACE FUNCTION public.set_display_name(_name text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n text := btrim(coalesce(_name,''));
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF;
  IF char_length(n) < 3 OR char_length(n) > 20 THEN RAISE EXCEPTION 'Le nom doit contenir 3 à 20 caractères'; END IF;
  IF lower(n) = 'admin' AND NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Ce nom est réservé'; END IF;
  UPDATE public.profiles SET name = n WHERE id = auth.uid();
  UPDATE public.chat_messages SET author_name = n WHERE user_id = auth.uid();
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.set_display_name(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.set_display_name(text) TO authenticated;

CREATE POLICY "Members read chat images" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'uploads' AND EXISTS (SELECT 1 FROM public.chat_messages m WHERE m.type = 'image' AND m.media_path = storage.objects.name));