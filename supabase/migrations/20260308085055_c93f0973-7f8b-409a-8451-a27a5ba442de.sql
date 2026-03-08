
-- Disable only the custom trigger
ALTER TABLE profiles DISABLE TRIGGER prevent_self_verification_trigger;

UPDATE profiles 
SET is_verified = true, verified_at = now() 
WHERE user_id IN ('5bee673a-55dd-40e5-886f-0e7d2fafda7f', 'e41452ba-b168-46ed-b6b5-cb2fe36d34c2');

ALTER TABLE profiles ENABLE TRIGGER prevent_self_verification_trigger;
