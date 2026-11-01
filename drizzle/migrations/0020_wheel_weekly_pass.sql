CREATE OR REPLACE FUNCTION public.play_wheel_game()
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE p profiles%rowtype; seg int; t text; v int; we timestamptz := game_week_end(); fee int := 200;
  types text[] := ARRAY['trophy','ar','star','trophy','ar','star'];
  vals int[] := ARRAY[100,5,100,50,20,50];
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF;
  PERFORM settle_game_weeks();
  SELECT * INTO p FROM profiles WHERE id = auth.uid() FOR UPDATE;
  IF EXISTS (SELECT 1 FROM game_spins WHERE user_id = p.id AND created_at >= date_trunc('day', now() AT TIME ZONE 'Indian/Antananarivo') AT TIME ZONE 'Indian/Antananarivo') THEN
    RAISE EXCEPTION 'Efa nilalao ianao androany. Miverena rahampitso 🙏';
  END IF;
  IF EXISTS (SELECT 1 FROM game_spins WHERE user_id = p.id AND week_end = we) THEN fee := 0; END IF;
  IF p.balance < fee THEN RAISE EXCEPTION 'Solde tsy ampy (200 Ar ilaina). Manaova RECHARGE.'; END IF;
  seg := floor(random() * 6)::int;
  t := types[seg + 1]; v := vals[seg + 1];
  UPDATE profiles SET balance = balance - fee + CASE WHEN t = 'ar' THEN v ELSE 0 END WHERE id = p.id;
  INSERT INTO game_spins(user_id, author_name, avatar_url, week_end, segment, prize_type, value)
    VALUES (p.id, coalesce(nullif(p.name,''),'Membre'), coalesce(p.avatar_url,''), we, seg, t, v);
  RETURN json_build_object('segment', seg, 'type', t, 'value', v, 'fee', fee);
END $function$;