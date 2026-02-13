import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Extracts the storage path from a full public URL or returns the path as-is.
 */
function extractPath(avatarUrl: string): string {
  const marker = "/object/public/profile-photos/";
  const idx = avatarUrl.indexOf(marker);
  if (idx !== -1) {
    return avatarUrl.substring(idx + marker.length);
  }
  return avatarUrl;
}

/**
 * Hook that takes a stored avatar_url (path or legacy public URL)
 * and returns a signed URL for the private bucket.
 */
export function useSignedAvatarUrl(avatarUrl: string | null | undefined): string | null {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!avatarUrl) {
      setSignedUrl(null);
      return;
    }

    const path = extractPath(avatarUrl);
    supabase.storage
      .from("profile-photos")
      .createSignedUrl(path, 3600)
      .then(({ data, error }) => {
        if (error || !data?.signedUrl) {
          setSignedUrl(null);
        } else {
          setSignedUrl(data.signedUrl);
        }
      });
  }, [avatarUrl]);

  return signedUrl;
}
