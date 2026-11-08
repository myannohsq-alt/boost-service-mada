CREATE OR REPLACE FUNCTION public.settle_game_weeks()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE w timestamptz; r record; cat text; pz int;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('game_settle'));
  FOR w IN SELECT DISTINCT s.week_end FROM game_spins s WHERE s.week_end <= now()
    AND NOT EXISTS (SELECT 1 FROM game_week_winners x WHERE x.week_end = s.week_end) LOOP
    FOREACH cat IN ARRAY ARRAY['trophy','star','ar'] LOOP
      pz := CASE cat WHEN 'trophy' THEN 1200 WHEN 'star' THEN 1000 ELSE 500 END;
      r := NULL;
      -- 3rd place: next best star collector who has not already won this week.
      SELECT g.user_id, max(g.author_name) AS n, sum(g.value)::int AS sc INTO r FROM game_spins g
        WHERE g.week_end = w AND g.prize_type = CASE WHEN cat = 'ar' THEN 'star' ELSE cat END
          AND NOT EXISTS (SELECT 1 FROM game_week_winners x WHERE x.week_end = w AND x.user_id = g.user_id)
        GROUP BY g.user_id ORDER BY sum(g.value) DESC, min(g.created_at) LIMIT 1;
      IF r.user_id IS NOT NULL THEN
        INSERT INTO game_week_winners(week_end, category, user_id, author_name, score, prize) VALUES (w, cat, r.user_id, r.n, r.sc, pz);
        UPDATE profiles SET balance = balance + pz WHERE id = r.user_id;
        INSERT INTO notifications(user_id, title, body) VALUES (r.user_id, '🏆 Mpandresy amin''ny lalao!', 'Nahazo ' || pz || ' Ar ianao tamin''ity herinandro ity.');
      END IF;
    END LOOP;
  END LOOP;
END $$;
REVOKE EXECUTE ON FUNCTION public.settle_game_weeks() FROM anon;