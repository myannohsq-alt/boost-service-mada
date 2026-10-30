CREATE OR REPLACE FUNCTION public.settle_lottery() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d date; w record; n int; total int;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('lottery_settle'));
  FOR d IN SELECT DISTINCT e.draw_date FROM lottery_entries e
    WHERE e.draw_date < lottery_next_date()
      AND NOT EXISTS (SELECT 1 FROM lottery_draws x WHERE x.draw_date = e.draw_date)
  LOOP
    SELECT count(*), coalesce(sum(amount),0) INTO n, total FROM lottery_entries WHERE draw_date = d;
    SELECT user_id, author_name INTO w FROM lottery_entries WHERE draw_date = d ORDER BY random() LIMIT 1;
    INSERT INTO lottery_draws(draw_date, winner_id, winner_name, participants, prize)
      VALUES (d, w.user_id, w.author_name, n, total);
    UPDATE profiles SET balance = balance + total WHERE id = w.user_id;
    INSERT INTO notifications(user_id, title, body)
      VALUES (w.user_id, '🏆 Nahazo ny Tirage ianao!', 'Tafiditra ao amin''ny solde-nao ny ' || total || ' Ar.');
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.join_lottery() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p profiles%rowtype; d date := lottery_next_date();
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF;
  PERFORM settle_lottery();
  SELECT * INTO p FROM profiles WHERE id = auth.uid() FOR UPDATE;
  IF EXISTS (SELECT 1 FROM lottery_entries WHERE user_id = p.id AND draw_date = d) THEN
    RAISE EXCEPTION 'Efa nandray anjara ianao tamin''ity tirage ity';
  END IF;
  IF p.balance < 200 THEN RAISE EXCEPTION 'Solde tsy ampy (200 Ar ilaina). Manaova RECHARGE.'; END IF;
  UPDATE profiles SET balance = balance - 200, points = points + 10 WHERE id = p.id;
  INSERT INTO lottery_entries(draw_date, user_id, author_name, amount) VALUES (d, p.id, coalesce(nullif(p.name,''),'Membre'), 200);
END $$;