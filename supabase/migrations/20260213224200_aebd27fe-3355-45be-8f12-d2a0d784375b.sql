-- Tighten storage SELECT policy: only allow users to directly access their own photos
-- Other users' photos are served via signed URLs from edge functions (service role)
DROP POLICY IF EXISTS "Authenticated users can view profile photos" ON storage.objects;

CREATE POLICY "Users can view own profile photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'profile-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );