
-- Create enums
CREATE TYPE public.body_build AS ENUM ('slim', 'athletic', 'average', 'curvy', 'muscular', 'heavyset', 'petite');
CREATE TYPE public.gender AS ENUM ('male', 'female', 'non_binary', 'other');
CREATE TYPE public.looking_for AS ENUM ('male', 'female', 'everyone');
CREATE TYPE public.relationship_goal AS ENUM ('long_term', 'short_term', 'casual', 'friendship', 'not_sure');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT NOT NULL DEFAULT '',
  date_of_birth DATE,
  gender gender,
  looking_for looking_for DEFAULT 'everyone',
  relationship_goal relationship_goal,
  bio TEXT DEFAULT '',
  height_cm INTEGER,
  weight_kg INTEGER,
  body_build body_build,
  nationality TEXT DEFAULT '',
  location_city TEXT DEFAULT '',
  location_country TEXT DEFAULT '',
  occupation TEXT DEFAULT '',
  education TEXT DEFAULT '',
  smoking TEXT DEFAULT '',
  drinking TEXT DEFAULT '',
  children TEXT DEFAULT '',
  interests TEXT[] DEFAULT '{}',
  avatar_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Likes table
CREATE TABLE public.likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  liker_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  liked_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(liker_id, liked_id),
  CHECK (liker_id != liked_id)
);

ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see likes involving them"
  ON public.likes FOR SELECT TO authenticated
  USING (auth.uid() = liker_id OR auth.uid() = liked_id);

CREATE POLICY "Users can insert own likes"
  ON public.likes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = liker_id AND liker_id != liked_id);

CREATE POLICY "Users can delete own likes"
  ON public.likes FOR DELETE TO authenticated
  USING (auth.uid() = liker_id);

-- Unlocked connections (paid £1)
CREATE TABLE public.unlocked_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unlocker_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  target_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(unlocker_id, target_id),
  CHECK (unlocker_id != target_id)
);

ALTER TABLE public.unlocked_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see own connections"
  ON public.unlocked_connections FOR SELECT TO authenticated
  USING (auth.uid() = unlocker_id OR auth.uid() = target_id);

CREATE POLICY "Users can insert own connections"
  ON public.unlocked_connections FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = unlocker_id);

-- Profile photos storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('profile-photos', 'profile-photos', true);

CREATE POLICY "Anyone can view profile photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-photos');

CREATE POLICY "Users can upload own photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
