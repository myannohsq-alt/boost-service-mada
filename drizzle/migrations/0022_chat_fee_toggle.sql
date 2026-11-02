CREATE TABLE public.chat_settings (id int PRIMARY KEY DEFAULT 1 CHECK (id = 1), fee_enabled boolean NOT NULL DEFAULT true, updated_at timestamptz NOT NULL DEFAULT now());
INSERT INTO public.chat_settings (id) VALUES (1) ON CONFLICT DO NOTHING;
GRANT SELECT, UPDATE ON public.chat_settings TO authenticated;
GRANT ALL ON public.chat_settings TO service_role;
ALTER TABLE public.chat_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat settings readable" ON public.chat_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins update chat settings" ON public.chat_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.send_chat_message(_content text, _type text DEFAULT 'text'::text, _media_path text DEFAULT NULL::text, _duration integer DEFAULT NULL::integer, _reply_to uuid DEFAULT NULL::uuid)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE nm text; bal numeric; c text := btrim(coalesce(_content,'')); mid uuid; fee boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF;
  IF _type NOT IN ('text','image','vocal') THEN RAISE EXCEPTION 'Type invalide'; END IF;
  IF _type = 'text' AND char_length(c) < 1 THEN RAISE EXCEPTION 'Message invalide'; END IF;
  IF char_length(c) > 500 THEN RAISE EXCEPTION 'Message trop long'; END IF;
  IF _type <> 'text' AND (_media_path IS NULL OR _media_path NOT LIKE auth.uid()::text || '/%') THEN RAISE EXCEPTION 'Fichier invalide'; END IF;
  SELECT coalesce(nullif(name,''),'Membre'), balance INTO nm, bal FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
  SELECT coalesce((SELECT fee_enabled FROM public.chat_settings WHERE id = 1), true) INTO fee;
  IF _type = 'text' AND fee AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    IF coalesce(bal,0) < 1 THEN RAISE EXCEPTION 'Solde insuffisant, rechargez'; END IF;
    UPDATE public.profiles SET balance = balance - 1 WHERE id = auth.uid();
  END IF;
  INSERT INTO public.chat_messages(user_id, author_name, content, type, media_path, duration, reply_to)
  VALUES (auth.uid(), coalesce(nm,'Membre'), c, _type, _media_path, _duration, _reply_to) RETURNING id INTO mid;
  RETURN mid;
END $function$;