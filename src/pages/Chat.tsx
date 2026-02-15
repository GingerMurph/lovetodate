import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AvatarImage } from "@/components/AvatarImage";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { toast } from "sonner";

type Message = {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
};

type PartnerProfile = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
};

const Chat = () => {
  const { userId: partnerId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [partner, setPartner] = useState<PartnerProfile | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Load partner profile
  useEffect(() => {
    if (!partnerId || !user) return;
    const loadPartner = async () => {
      const { data } = await supabase.functions.invoke("view-profile", {
        body: { userId: partnerId },
      });
      if (data?.profile) {
        setPartner({
          user_id: data.profile.user_id,
          display_name: data.profile.display_name,
          avatar_url: data.profile.avatar_url,
        });
      }
    };
    loadPartner();
  }, [partnerId, user]);

  // Load messages
  useEffect(() => {
    if (!partnerId || !user) return;
    const loadMessages = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user.id},recipient_id.eq.${partnerId}),and(sender_id.eq.${partnerId},recipient_id.eq.${user.id})`
        )
        .order("created_at", { ascending: true });

      if (!error && data) {
        setMessages(data);
        // Mark unread messages as read
        const unread = data.filter(m => m.recipient_id === user.id && !m.is_read);
        if (unread.length > 0) {
          await supabase
            .from("messages")
            .update({ is_read: true })
            .in("id", unread.map(m => m.id));
        }
      }
      setLoading(false);
    };
    loadMessages();
  }, [partnerId, user]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Realtime subscription
  useEffect(() => {
    if (!partnerId || !user) return;

    const channel = supabase
      .channel(`chat-${user.id}-${partnerId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const msg = payload.new as Message;
          // Only add if it's part of this conversation
          if (
            (msg.sender_id === user.id && msg.recipient_id === partnerId) ||
            (msg.sender_id === partnerId && msg.recipient_id === user.id)
          ) {
            setMessages((prev) => {
              if (prev.some(m => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
            // Mark as read if we're the recipient
            if (msg.recipient_id === user.id) {
              supabase.from("messages").update({ is_read: true }).eq("id", msg.id);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [partnerId, user]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user || !partnerId) return;
    setSending(true);
    const msgContent = newMessage.trim();
    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      recipient_id: partnerId,
      content: msgContent,
    });
    setSending(false);
    if (error) {
      toast.error("Failed to send message. Make sure you have an unlocked connection.");
      return;
    }
    // Trigger notification (fire and forget)
    supabase.functions.invoke("send-message-notification", {
      body: {
        recipientId: partnerId,
        senderName: partner?.display_name || "Someone",
        messagePreview: msgContent,
      },
    }).catch(() => {}); // Silent fail
    setNewMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" }) +
      " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-3.5rem)]">
        {/* Chat header */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3 bg-card">
          <Button variant="ghost" size="sm" onClick={() => navigate("/messages")} className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          {partner && (
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => navigate(`/profile/${partnerId}`)}
            >
              <div className="h-10 w-10 overflow-hidden rounded-full border border-border bg-secondary shrink-0">
                <AvatarImage avatarUrl={partner.avatar_url} displayName={partner.display_name} iconSize="h-5 w-5" />
              </div>
              <span className="font-serif font-semibold">{partner.display_name}</span>
            </div>
          )}
        </div>

        {/* Messages */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">
              No messages yet. Say hello! 👋
            </p>
          ) : (
            messages.map((msg) => {
              const isOwn = msg.sender_id === user?.id;
              return (
                <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                      isOwn
                        ? "gradient-gold text-primary-foreground rounded-br-md"
                        : "bg-card border border-border rounded-bl-md"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                    <p className={`text-[10px] mt-1 ${isOwn ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border bg-card px-4 py-3">
          <div className="flex items-center gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="flex-1"
              disabled={sending}
            />
            <Button
              onClick={handleSend}
              disabled={!newMessage.trim() || sending}
              size="sm"
              className="gradient-gold text-primary-foreground shrink-0"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Chat;
