REVOKE EXECUTE ON FUNCTION public.spin_wheel() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.leaderboard(integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.invited_count() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.send_chat_message(text,text,text,integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.spin_wheel() TO authenticated;
GRANT EXECUTE ON FUNCTION public.leaderboard(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.invited_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_chat_message(text,text,text,integer) TO authenticated;