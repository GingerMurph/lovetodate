
ALTER TABLE public.profiles
  ADD COLUMN religion text DEFAULT '',
  ADD COLUMN ethnicity text DEFAULT '',
  ADD COLUMN languages text[] DEFAULT '{}',
  ADD COLUMN pets text DEFAULT '';
