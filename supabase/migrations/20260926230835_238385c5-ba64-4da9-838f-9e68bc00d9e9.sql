DELETE FROM public.demo_messages WHERE id IS NOT NULL;
DELETE FROM public.demo_profiles WHERE id IS NOT NULL;
CREATE OR REPLACE FUNCTION public.send_chat_message(_content text, _type text DEFAULT 'text', _media_path text DEFAULT NULL, _duration integer DEFAULT NULL)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE nm text; bal numeric; c text := btrim(coalesce(_content,'')); mid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF;
  IF _type NOT IN ('text','image','vocal') THEN RAISE EXCEPTION 'Type invalide'; END IF;
  IF _type = 'text' AND char_length(c) < 1 THEN RAISE EXCEPTION 'Message invalide'; END IF;
  IF char_length(c) > 500 THEN RAISE EXCEPTION 'Message trop long'; END IF;
  IF _type <> 'text' AND (_media_path IS NULL OR _media_path NOT LIKE auth.uid()::text || '/%') THEN RAISE EXCEPTION 'Fichier invalide'; END IF;
  SELECT coalesce(nullif(name,''),'Membre'), balance INTO nm, bal FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
  IF _type = 'text' THEN
    IF coalesce(bal,0) < 1 THEN RAISE EXCEPTION 'Solde insuffisant, rechargez'; END IF;
    UPDATE public.profiles SET balance = balance - 1 WHERE id = auth.uid();
  END IF;
  INSERT INTO public.chat_messages(user_id, author_name, content, type, media_path, duration)
  VALUES (auth.uid(), coalesce(nm,'Membre'), c, _type, _media_path, _duration) RETURNING id INTO mid;
  RETURN mid;
END $function$;