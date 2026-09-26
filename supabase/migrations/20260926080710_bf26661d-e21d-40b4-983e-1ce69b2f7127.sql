CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text NOT NULL DEFAULT 'Membre',
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read chat" ON public.chat_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins delete chat" ON public.chat_messages FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
GRANT DELETE ON public.chat_messages TO authenticated;
CREATE INDEX ON public.chat_messages (created_at DESC);
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

CREATE OR REPLACE FUNCTION public.send_chat_message(_content text)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE bal numeric; nm text; c text := btrim(coalesce(_content,''));
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF;
  IF char_length(c) < 1 OR char_length(c) > 500 THEN RAISE EXCEPTION 'Message invalide'; END IF;
  SELECT balance, coalesce(nullif(name,''),'Membre') INTO bal, nm FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
  IF bal IS NULL OR bal < 1 THEN RAISE EXCEPTION 'Solde insuffisant, rechargez'; END IF;
  UPDATE public.profiles SET balance = balance - 1 WHERE id = auth.uid();
  INSERT INTO public.chat_messages(user_id, author_name, content) VALUES (auth.uid(), nm, c);
  RETURN bal - 1;
END $$;
REVOKE ALL ON FUNCTION public.send_chat_message(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.send_chat_message(text) TO authenticated;