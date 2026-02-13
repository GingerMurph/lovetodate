import { useSignedAvatarUrl } from "@/hooks/useSignedAvatarUrl";
import { User as UserIcon } from "lucide-react";

interface AvatarImageProps {
  avatarUrl: string | null | undefined;
  displayName: string;
  iconSize?: string;
}

export function AvatarImage({ avatarUrl, displayName, iconSize = "h-16 w-16" }: AvatarImageProps) {
  const signedUrl = useSignedAvatarUrl(avatarUrl);

  if (signedUrl) {
    return <img src={signedUrl} alt={displayName} className="h-full w-full object-cover" />;
  }

  return (
    <div className="flex h-full items-center justify-center">
      <UserIcon className={`${iconSize} text-muted-foreground/30`} />
    </div>
  );
}
