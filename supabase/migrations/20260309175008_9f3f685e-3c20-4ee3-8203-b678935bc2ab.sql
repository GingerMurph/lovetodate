CREATE UNIQUE INDEX idx_one_active_game_per_type
ON public.games (LEAST(creator_id, opponent_id), GREATEST(creator_id, opponent_id), game_type)
WHERE status IN ('pending', 'active');