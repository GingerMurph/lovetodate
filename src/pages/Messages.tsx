import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AvatarImage } from "@/components/AvatarImage";
import { MessageSquare, Loader2 } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import VerifiedBadge from "@/components/VerifiedBadge";
import SubscriberBadge from "@/components/SubscriberBadge";

type Conversation = {
  partnerId: string;
  partnerName: string;
  partnerAvatar: string | null;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isVerified?: boolean;
  isSubscribed?: boolean;
};

const Messages = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadConversations();
  }, [user]);

  // Realtime: refresh conversations on new messages
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("messages-list")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => {
          loadConversations();
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const loadConversations = async () => {
    if (!user) return;

    // Strict UUID validation must pass before ANY query using this value
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(user.id)) return;

    // Use the validated, safe userId for queries
    const safeUserId = user.id;

    // Fetch sent and received messages separately to avoid string interpolation in .or()
    const [sentResult, receivedResult] = await Promise.all([
      supabase.from("messages").select("*").eq("sender_id", safeUserId).order("created_at", { ascending: false }),
      supabase.from("messages").select("*").eq("recipient_id", safeUserId).order("created_at", { ascending: false }),
    ]);

    const sentMsgs = sentResult.data ?? [];
    const receivedMsgs = receivedResult.data ?? [];

    // Merge and deduplicate
    const allMsgs = [...sentMsgs, ...receivedMsgs].filter(
      (msg, idx, arr) => arr.findIndex(m => m.id === msg.id) === idx
    ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const msgs = allMsgs;
    const error = sentResult.error || receivedResult.error;

    if (error || !msgs) {
      setLoading(false);
      return;
    }

    // Group by conversation partner
    const convMap = new Map<string, { messages: typeof msgs }>();
    for (const msg of msgs) {
      const partnerId = msg.sender_id === user.id ? msg.recipient_id : msg.sender_id;
      if (!convMap.has(partnerId)) {
        convMap.set(partnerId, { messages: [] });
      }
      convMap.get(partnerId)!.messages.push(msg);
    }

    // Fetch partner profiles
    const partnerIds = Array.from(convMap.keys());
    const convs: Conversation[] = [];

    for (const partnerId of partnerIds) {
      const partnerMsgs = convMap.get(partnerId)!.messages;
      const lastMsg = partnerMsgs[0]; // Already sorted desc
      const unreadCount = partnerMsgs.filter(
        (m) => m.recipient_id === user.id && !m.is_read
      ).length;

      // Fetch partner name via edge function
      const { data } = await supabase.functions.invoke("view-profile", {
        body: { userId: partnerId },
      });

      convs.push({
        partnerId,
        partnerName: data?.profile?.display_name || "Unknown",
        partnerAvatar: data?.profile?.avatar_url || null,
        lastMessage: lastMsg.content,
        lastMessageTime: lastMsg.created_at,
        unreadCount,
      });
    }

    // Sort by most recent message
    convs.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
    setConversations(convs);
    setLoading(false);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <AppLayout>
      <div className="container mx-auto max-w-2xl px-4 py-6">
        <h1 className="mb-6 font-serif text-2xl font-bold text-center">
          <span className="text-gold">Messages</span>
        </h1>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No conversations yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Unlock a connection to start chatting!
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {conversations.map((conv) => (
              <button
                key={conv.partnerId}
                onClick={() => navigate(`/messages/${conv.partnerId}`)}
                className="w-full flex items-center gap-3 rounded-xl px-4 py-3 hover:bg-card transition-colors text-left"
              >
                <div className="h-12 w-12 overflow-hidden rounded-full border border-border bg-secondary shrink-0">
                  <AvatarImage
                    avatarUrl={conv.partnerAvatar}
                    displayName={conv.partnerName}
                    iconSize="h-6 w-6"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm truncate">{conv.partnerName}</span>
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">
                      {formatTime(conv.lastMessageTime)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate mt-0.5">
                    {conv.lastMessage}
                  </p>
                </div>
                {conv.unreadCount > 0 && (
                  <span className="gradient-gold text-primary-foreground text-xs font-bold rounded-full h-5 min-w-5 flex items-center justify-center px-1.5 shrink-0">
                    {conv.unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Messages;
