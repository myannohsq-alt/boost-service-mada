ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS reply_to uuid REFERENCES public.chat_messages(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.chat_member_profiles(_ids uuid[])
RETURNS TABLE(id uuid, name text, avatar_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT p.id, p.name, p.avatar_url FROM public.profiles p WHERE auth.uid() IS NOT NULL AND p.id = ANY(_ids) $$;
GRANT EXECUTE ON FUNCTION public.chat_member_profiles(uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.send_chat_message(_content text, _type text DEFAULT 'text', _media_path text DEFAULT NULL, _duration integer DEFAULT NULL, _reply_to uuid DEFAULT NULL)
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
  INSERT INTO public.chat_messages(user_id, author_name, content, type, media_path, duration, reply_to)
  VALUES (auth.uid(), coalesce(nm,'Membre'), c, _type, _media_path, _duration, _reply_to) RETURNING id INTO mid;
  RETURN mid;
END $function$;
DROP FUNCTION IF EXISTS public.send_chat_message(text, text, text, integer);
GRANT EXECUTE ON FUNCTION public.send_chat_message(text, text, text, integer, uuid) TO authenticated;