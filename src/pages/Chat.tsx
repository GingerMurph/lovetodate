import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AvatarImage } from "@/components/AvatarImage";
import { ArrowLeft, Send, Loader2, Lightbulb, Sparkles, Video } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
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
  const { userId: rawPartnerId } = useParams();
  const { user } = useAuth();
  // Validate UUID format strictly before using in any query
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const partnerId = rawPartnerId && uuidRegex.test(rawPartnerId) ? rawPartnerId : null;
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [partner, setPartner] = useState<PartnerProfile | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [icebreakers, setIcebreakers] = useState<string[]>([]);
  const [loadingIcebreakers, setLoadingIcebreakers] = useState(false);
  const { subscribed } = useSubscription();
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
    // Validate user.id before use (partnerId is already validated at component level)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(user.id)) return;
    const safeUserId = user.id;
    const loadMessages = async () => {
      setLoading(true);
      // Fetch both directions separately to avoid string interpolation in .or()
      const [sentResult, receivedResult] = await Promise.all([
        supabase.from("messages").select("*").eq("sender_id", safeUserId).eq("recipient_id", partnerId).order("created_at", { ascending: true }),
        supabase.from("messages").select("*").eq("sender_id", partnerId).eq("recipient_id", safeUserId).order("created_at", { ascending: true }),
      ]);
      const data = [...(sentResult.data ?? []), ...(receivedResult.data ?? [])].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      const error = sentResult.error || receivedResult.error;

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
    setNewMessage("");

    // Optimistic: show the message immediately
    const optimisticId = crypto.randomUUID();
    const optimisticMsg: Message = {
      id: optimisticId,
      sender_id: user.id,
      recipient_id: partnerId,
      content: msgContent,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      recipient_id: partnerId,
      content: msgContent,
    });
    setSending(false);

    if (error) {
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      toast.error("Failed to send message. Make sure you have an unlocked connection.");
      return;
    }

    toast.success("Message sent!", { duration: 1500 });

    // Trigger notification (fire and forget)
    supabase.functions.invoke("send-message-notification", {
      body: {
        recipientId: partnerId,
        messagePreview: msgContent,
      },
    }).catch(() => {}); // Silent fail
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleGetIcebreakers = async () => {
    if (!partnerId || loadingIcebreakers) return;
    setLoadingIcebreakers(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-icebreaker", {
        body: { partnerId },
      });
      if (error) throw error;
      if (data?.icebreakers?.length) {
        setIcebreakers(data.icebreakers);
      } else {
        toast.error("Couldn't generate suggestions. Try again!");
      }
    } catch (err: any) {
      console.error("Icebreaker error:", err);
      toast.error("Failed to generate icebreakers");
    } finally {
      setLoadingIcebreakers(false);
    }
  };

  const handleSelectIcebreaker = (text: string) => {
    setNewMessage(text);
    setIcebreakers([]);
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
          <div className="ml-auto">
            <Button
              variant="ghost"
              size="sm"
              className="text-gold hover:text-gold/80"
              onClick={() => navigate(`/video-call/${partnerId}`)}
              title={subscribed ? "Video call" : "Subscribe for video calls"}
            >
              <Video className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <p className="text-center text-muted-foreground text-sm">
                No messages yet. Say hello! 👋
              </p>
              {icebreakers.length === 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGetIcebreakers}
                  disabled={loadingIcebreakers}
                  className="gap-2"
                >
                  {loadingIcebreakers ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Suggest an icebreaker
                </Button>
              )}
              {icebreakers.length > 0 && (
                <div className="w-full space-y-2 max-w-sm">
                  <p className="text-xs text-muted-foreground text-center font-medium">Tap one to use it:</p>
                  {icebreakers.map((text, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelectIcebreaker(text)}
                      className="w-full text-left text-sm px-4 py-3 rounded-xl border border-border bg-card hover:bg-accent transition-colors"
                    >
                      {text}
                    </button>
                  ))}
                </div>
              )}
            </div>
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

        {/* Icebreaker suggestions (shown above input when not empty chat) */}
        {icebreakers.length > 0 && messages.length > 0 && (
          <div className="border-t border-border bg-card/50 px-4 py-2 space-y-1.5">
            <p className="text-xs text-muted-foreground font-medium">Tap to use:</p>
            {icebreakers.map((text, i) => (
              <button
                key={i}
                onClick={() => handleSelectIcebreaker(text)}
                className="w-full text-left text-sm px-3 py-2 rounded-lg border border-border bg-card hover:bg-accent transition-colors"
              >
                {text}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="border-t border-border bg-card px-4 py-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGetIcebreakers}
              disabled={loadingIcebreakers}
              className="shrink-0 px-2"
              title="Get icebreaker suggestions"
            >
              {loadingIcebreakers ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Lightbulb className="h-4 w-4" />
              )}
            </Button>
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
