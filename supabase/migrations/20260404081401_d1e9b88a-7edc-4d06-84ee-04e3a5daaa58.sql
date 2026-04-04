
ALTER TABLE public.profiles ADD COLUMN min_compatibility_score integer DEFAULT NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, min_compatibility_score)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', ''),
    CASE
      WHEN NEW.raw_user_meta_data->>'min_compatibility_score' IS NOT NULL
      THEN (NEW.raw_user_meta_data->>'min_compatibility_score')::integer
      ELSE NULL
    END
  );
  RETURN NEW;
END;
$$;
