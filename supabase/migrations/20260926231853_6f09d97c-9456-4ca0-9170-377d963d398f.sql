CREATE OR REPLACE FUNCTION public.spin_wheel()
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE p public.profiles%rowtype; today date := (now() AT TIME ZONE 'Indian/Antananarivo')::date;
  r numeric := random(); slice int; t text; v int; won_ar int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF;
  SELECT * INTO p FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
  IF p.last_spin_date IS DISTINCT FROM today THEN
    UPDATE public.profiles SET last_spin_date = today WHERE id = p.id;
  ELSIF p.tours_restants > 0 THEN
    UPDATE public.profiles SET tours_restants = tours_restants - 1 WHERE id = p.id;
  ELSE
    RAISE EXCEPTION 'Plus de tour aujourd''hui. Invitez un ami pour +1 tour !';
  END IF;
  IF r < 0.40 THEN slice := (CASE WHEN random()<0.5 THEN 0 ELSE 3 END);
  ELSIF r < 0.70 THEN slice := (CASE WHEN random()<0.5 THEN 1 ELSE 7 END);
  ELSIF r < 0.85 THEN slice := 2;
  ELSIF r < 0.95 THEN slice := 4;
  ELSE slice := 5; END IF;
  t := CASE WHEN slice IN (0,1,2,3,7) THEN 'ar' ELSE 'points' END;
  v := (ARRAY[10,20,30,10,50,100,150,20])[slice+1];
  IF t = 'ar' THEN
    SELECT coalesce(sum(valeur),0) INTO won_ar FROM public.wheel_history
      WHERE user_id = p.id AND type='ar' AND (created_at AT TIME ZONE 'Indian/Antananarivo')::date = today;
    IF won_ar + v > 30 THEN slice := 4; t := 'points'; v := 50; END IF;
  END IF;
  IF t = 'ar' THEN UPDATE public.profiles SET balance = balance + v WHERE id = p.id;
  ELSE UPDATE public.profiles SET points = points + v WHERE id = p.id; END IF;
  INSERT INTO public.wheel_history(user_id, author_name, avatar_url, type, valeur)
  VALUES (p.id, coalesce(nullif(p.name,''),'Membre'), coalesce(p.avatar_url,''), t, v);
  RETURN json_build_object('slice', slice, 'type', t, 'valeur', v);
END $$;