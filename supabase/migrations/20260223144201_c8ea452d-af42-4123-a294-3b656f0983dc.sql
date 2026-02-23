
ALTER TABLE public.profiles ALTER COLUMN favourite_music DROP DEFAULT;
ALTER TABLE public.profiles ALTER COLUMN favourite_music TYPE text[] USING CASE WHEN favourite_music IS NOT NULL AND favourite_music != '' THEN ARRAY[favourite_music] ELSE '{}'::text[] END;
ALTER TABLE public.profiles ALTER COLUMN favourite_music SET DEFAULT '{}'::text[];

ALTER TABLE public.profiles ALTER COLUMN favourite_film DROP DEFAULT;
ALTER TABLE public.profiles ALTER COLUMN favourite_film TYPE text[] USING CASE WHEN favourite_film IS NOT NULL AND favourite_film != '' THEN ARRAY[favourite_film] ELSE '{}'::text[] END;
ALTER TABLE public.profiles ALTER COLUMN favourite_film SET DEFAULT '{}'::text[];

ALTER TABLE public.profiles ALTER COLUMN favourite_sport DROP DEFAULT;
ALTER TABLE public.profiles ALTER COLUMN favourite_sport TYPE text[] USING CASE WHEN favourite_sport IS NOT NULL AND favourite_sport != '' THEN ARRAY[favourite_sport] ELSE '{}'::text[] END;
ALTER TABLE public.profiles ALTER COLUMN favourite_sport SET DEFAULT '{}'::text[];

ALTER TABLE public.profiles ALTER COLUMN favourite_hobbies DROP DEFAULT;
ALTER TABLE public.profiles ALTER COLUMN favourite_hobbies TYPE text[] USING CASE WHEN favourite_hobbies IS NOT NULL AND favourite_hobbies != '' THEN ARRAY[favourite_hobbies] ELSE '{}'::text[] END;
ALTER TABLE public.profiles ALTER COLUMN favourite_hobbies SET DEFAULT '{}'::text[];
