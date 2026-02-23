
-- Change relationship_goal from enum to text array to support multiple selections
ALTER TABLE public.profiles 
  ALTER COLUMN relationship_goal DROP DEFAULT,
  ALTER COLUMN relationship_goal TYPE text[] USING 
    CASE WHEN relationship_goal IS NULL THEN NULL 
         ELSE ARRAY[relationship_goal::text] 
    END,
  ALTER COLUMN relationship_goal SET DEFAULT NULL;
