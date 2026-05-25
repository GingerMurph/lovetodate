DROP POLICY IF EXISTS "Players can update own games" ON public.games;

CREATE POLICY "No client update games"
ON public.games
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS "Players can insert moves" ON public.game_moves;

CREATE POLICY "No client insert moves"
ON public.game_moves
FOR INSERT
TO authenticated
WITH CHECK (false);