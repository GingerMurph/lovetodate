
-- Mark both profiles as verified
UPDATE profiles SET is_verified = true, verified_at = now() WHERE user_id IN ('5bee673a-55dd-40e5-886f-0e7d2fafda7f', 'e41452ba-b168-46ed-b6b5-cb2fe36d34c2');

-- Add/update subscriber cache to mark as paid members
INSERT INTO subscriber_cache (user_id, is_subscribed, checked_at)
VALUES 
  ('5bee673a-55dd-40e5-886f-0e7d2fafda7f', true, now()),
  ('e41452ba-b168-46ed-b6b5-cb2fe36d34c2', true, now())
ON CONFLICT (user_id) DO UPDATE SET is_subscribed = true, checked_at = now();
