
-- Create messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users can only view messages they sent or received, AND only if an unlocked connection exists
CREATE POLICY "Users can view their messages"
  ON public.messages FOR SELECT
  USING (
    (auth.uid() = sender_id OR auth.uid() = recipient_id)
    AND EXISTS (
      SELECT 1 FROM public.unlocked_connections
      WHERE (
        (unlocker_id = messages.sender_id AND target_id = messages.recipient_id)
        OR (unlocker_id = messages.recipient_id AND target_id = messages.sender_id)
      )
    )
  );

-- Users can only send messages to unlocked connections
CREATE POLICY "Users can send messages to unlocked connections"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND sender_id <> recipient_id
    AND EXISTS (
      SELECT 1 FROM public.unlocked_connections
      WHERE (
        (unlocker_id = sender_id AND target_id = recipient_id)
        OR (unlocker_id = recipient_id AND target_id = sender_id)
      )
    )
  );

-- Users can update only messages they received (to mark as read)
CREATE POLICY "Users can mark received messages as read"
  ON public.messages FOR UPDATE
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Add index for faster conversation queries
CREATE INDEX idx_messages_conversation ON public.messages (sender_id, recipient_id, created_at DESC);
CREATE INDEX idx_messages_recipient ON public.messages (recipient_id, created_at DESC);
