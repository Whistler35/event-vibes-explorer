
CREATE TABLE public.conversation_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  conversation_id uuid NOT NULL REFERENCES public.direct_conversations(id) ON DELETE CASCADE,
  last_read_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, conversation_id)
);

ALTER TABLE public.conversation_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reads"
  ON public.conversation_reads FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own reads"
  ON public.conversation_reads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reads"
  ON public.conversation_reads FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);
