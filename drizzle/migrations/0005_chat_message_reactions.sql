CREATE TABLE public.chat_message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL CHECK (emoji IN ('👍','❤️','😂','😮','😢','🔥')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_message_reactions TO authenticated;
GRANT ALL ON public.chat_message_reactions TO service_role;
ALTER TABLE public.chat_message_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read reactions" ON public.chat_message_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Own reaction insert" ON public.chat_message_reactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own reaction update" ON public.chat_message_reactions FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own reaction delete" ON public.chat_message_reactions FOR DELETE TO authenticated USING (user_id = auth.uid());
ALTER TABLE public.chat_message_reactions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message_reactions;