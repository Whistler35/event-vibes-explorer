-- Create event participants table
CREATE TABLE public.event_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Create event chats table
CREATE TABLE public.event_chats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE UNIQUE,
  chat_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat messages table
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES public.event_chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_participants
CREATE POLICY "Anyone can view event participants" 
ON public.event_participants 
FOR SELECT 
USING (true);

CREATE POLICY "Users can join events" 
ON public.event_participants 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave events" 
ON public.event_participants 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for event_chats
CREATE POLICY "Users can view chats for events they joined" 
ON public.event_chats 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.event_participants ep 
    WHERE ep.event_id = event_chats.event_id 
    AND ep.user_id = auth.uid()
  )
);

CREATE POLICY "Anyone can create event chats" 
ON public.event_chats 
FOR INSERT 
WITH CHECK (true);

-- RLS Policies for chat_messages
CREATE POLICY "Users can view messages in chats they have access to" 
ON public.chat_messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.event_chats ec
    JOIN public.event_participants ep ON ec.event_id = ep.event_id
    WHERE ec.id = chat_messages.chat_id 
    AND ep.user_id = auth.uid()
  )
);

CREATE POLICY "Users can send messages to chats they have access to" 
ON public.chat_messages 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.event_chats ec
    JOIN public.event_participants ep ON ec.event_id = ep.event_id
    WHERE ec.id = chat_messages.chat_id 
    AND ep.user_id = auth.uid()
  )
);

-- Create indexes for better performance
CREATE INDEX idx_event_participants_event_id ON public.event_participants(event_id);
CREATE INDEX idx_event_participants_user_id ON public.event_participants(user_id);
CREATE INDEX idx_chat_messages_chat_id ON public.chat_messages(chat_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at);

-- Add trigger for updated_at
CREATE TRIGGER update_event_chats_updated_at
BEFORE UPDATE ON public.event_chats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create chat when first user joins event
CREATE OR REPLACE FUNCTION public.create_event_chat_on_first_join()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if chat already exists for this event
  IF NOT EXISTS (SELECT 1 FROM public.event_chats WHERE event_id = NEW.event_id) THEN
    -- Create chat with event title as name
    INSERT INTO public.event_chats (event_id, chat_name)
    SELECT NEW.event_id, events.title
    FROM public.events 
    WHERE events.id = NEW.event_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create chat when user joins event
CREATE TRIGGER create_chat_on_join
AFTER INSERT ON public.event_participants
FOR EACH ROW
EXECUTE FUNCTION public.create_event_chat_on_first_join();