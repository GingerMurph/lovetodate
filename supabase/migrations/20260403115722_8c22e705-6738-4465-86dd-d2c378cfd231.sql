
-- Add voice_intro_url column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS voice_intro_url text DEFAULT NULL;

-- Create voice-intros storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-intros', 'voice-intros', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: Users can upload their own voice intros
CREATE POLICY "Users can upload own voice intros"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'voice-intros' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: Users can update/overwrite their own voice intros
CREATE POLICY "Users can update own voice intros"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'voice-intros' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: Users can delete their own voice intros
CREATE POLICY "Users can delete own voice intros"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'voice-intros' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: Authenticated users can read voice intros (needed for playback on profiles)
CREATE POLICY "Authenticated users can read voice intros"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'voice-intros');
