
CREATE OR REPLACE FUNCTION public.auto_unlock_first_month_mutual_likes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _liker_created_at timestamptz;
  _liked_created_at timestamptz;
  _mutual boolean;
  _already_connected boolean;
BEGIN
  -- Check if the other person has also liked this user (mutual like)
  SELECT EXISTS (
    SELECT 1 FROM public.likes
    WHERE liker_id = NEW.liked_id AND liked_id = NEW.liker_id
  ) INTO _mutual;

  IF NOT _mutual THEN
    RETURN NEW;
  END IF;

  -- Check both users are within their first month (using profiles.created_at)
  SELECT created_at INTO _liker_created_at FROM public.profiles WHERE user_id = NEW.liker_id;
  SELECT created_at INTO _liked_created_at FROM public.profiles WHERE user_id = NEW.liked_id;

  IF _liker_created_at IS NULL OR _liked_created_at IS NULL THEN
    RETURN NEW;
  END IF;

  IF _liker_created_at < (now() - interval '30 days') OR _liked_created_at < (now() - interval '30 days') THEN
    RETURN NEW;
  END IF;

  -- Check if already connected
  SELECT EXISTS (
    SELECT 1 FROM public.unlocked_connections
    WHERE (unlocker_id = NEW.liker_id AND target_id = NEW.liked_id)
       OR (unlocker_id = NEW.liked_id AND target_id = NEW.liker_id)
  ) INTO _already_connected;

  IF _already_connected THEN
    RETURN NEW;
  END IF;

  -- Auto-unlock: create connections in both directions
  INSERT INTO public.unlocked_connections (unlocker_id, target_id)
  VALUES (NEW.liker_id, NEW.liked_id)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.unlocked_connections (unlocker_id, target_id)
  VALUES (NEW.liked_id, NEW.liker_id)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_unlock_first_month
AFTER INSERT ON public.likes
FOR EACH ROW
EXECUTE FUNCTION public.auto_unlock_first_month_mutual_likes();
