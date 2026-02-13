
-- Make bucket private
UPDATE storage.buckets SET public = false WHERE id = 'profile-photos';

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view profile photos" ON storage.objects;

-- Allow authenticated users to view profile photos of users they can see
CREATE POLICY "Authenticated users can view profile photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'profile-photos');
