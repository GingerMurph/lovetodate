-- Fix: Restrict voice-intros read access to own folder only
-- Edge functions use service_role to generate signed URLs for other users
DROP POLICY IF EXISTS "Authenticated users can read voice intros" ON storage.objects;

CREATE POLICY "Users can read own voice intros"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'voice-intros' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);