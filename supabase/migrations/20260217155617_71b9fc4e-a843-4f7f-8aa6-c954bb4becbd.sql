
ALTER TABLE public.profiles
ADD COLUMN political_beliefs text DEFAULT ''::text,
ADD COLUMN favourite_music text DEFAULT ''::text,
ADD COLUMN favourite_film text DEFAULT ''::text,
ADD COLUMN favourite_sport text DEFAULT ''::text,
ADD COLUMN favourite_hobbies text DEFAULT ''::text,
ADD COLUMN personality_type text DEFAULT ''::text;
