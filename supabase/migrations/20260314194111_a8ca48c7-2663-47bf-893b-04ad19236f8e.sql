
-- Function to get or create event chat (bypasses RLS since it's SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_or_create_event_chat(p_event_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chat_id uuid;
BEGIN
  -- Check if chat exists
  SELECT id INTO v_chat_id FROM event_chats WHERE event_id = p_event_id;
  
  IF v_chat_id IS NULL THEN
    INSERT INTO event_chats (event_id, chat_name)
    SELECT p_event_id, e.title
    FROM events e WHERE e.id = p_event_id
    RETURNING id INTO v_chat_id;
  END IF;
  
  RETURN v_chat_id;
END;
$$;

-- Enable realtime for chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
