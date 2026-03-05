
-- Games system tables

-- Game types enum
CREATE TYPE public.game_type AS ENUM ('noughts_crosses', 'connect4', 'hypothetical_questions');

-- Game status enum  
CREATE TYPE public.game_status AS ENUM ('pending', 'active', 'completed', 'declined');

-- Games table
CREATE TABLE public.games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_type game_type NOT NULL,
  creator_id UUID NOT NULL,
  opponent_id UUID NOT NULL,
  status game_status NOT NULL DEFAULT 'pending',
  current_turn UUID,
  game_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  winner_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT different_players CHECK (creator_id <> opponent_id)
);

-- Game moves table for turn history
CREATE TABLE public.game_moves (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL,
  move_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_moves ENABLE ROW LEVEL SECURITY;

-- Games policies
CREATE POLICY "Players can view own games" ON public.games
  FOR SELECT TO authenticated
  USING (auth.uid() = creator_id OR auth.uid() = opponent_id);

CREATE POLICY "Users can create games" ON public.games
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Players can update own games" ON public.games
  FOR UPDATE TO authenticated
  USING (auth.uid() = creator_id OR auth.uid() = opponent_id);

-- Game moves policies
CREATE POLICY "Players can view game moves" ON public.game_moves
  FOR SELECT TO authenticated
  USING (game_id IN (SELECT id FROM public.games WHERE creator_id = auth.uid() OR opponent_id = auth.uid()));

CREATE POLICY "Players can insert moves" ON public.game_moves
  FOR INSERT TO authenticated
  WITH CHECK (game_id IN (SELECT id FROM public.games WHERE creator_id = auth.uid() OR opponent_id = auth.uid()) AND auth.uid() = player_id);

-- Enable realtime for games
ALTER PUBLICATION supabase_realtime ADD TABLE public.games;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_moves;

-- Update trigger for games
CREATE TRIGGER update_games_updated_at
  BEFORE UPDATE ON public.games
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
