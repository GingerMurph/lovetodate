import { useSignedAvatarUrl } from "@/hooks/useSignedAvatarUrl";
import { User as UserIcon } from "lucide-react";

interface AvatarImageProps {
  avatarUrl: string | null | undefined;
  displayName: string;
  iconSize?: string;
}

export function AvatarImage({ avatarUrl, displayName, iconSize = "h-16 w-16" }: AvatarImageProps) {
  // If the URL is already a full HTTP(S) URL (e.g. a pre-signed URL from an edge function),
  // use it directly. Only attempt client-side signing for storage paths.
  const isFullUrl = avatarUrl?.startsWith("http");
  const signedUrl = useSignedAvatarUrl(isFullUrl ? null : avatarUrl);
  const finalUrl = isFullUrl ? avatarUrl : signedUrl;

  if (finalUrl) {
    return <img src={finalUrl} alt={displayName} className="h-full w-full object-cover" />;
  }

  return (
    <div className="flex h-full items-center justify-center">
      <UserIcon className={`${iconSize} text-muted-foreground/30`} />
    </div>
  );
}
