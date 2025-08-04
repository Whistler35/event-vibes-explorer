-- Create trigger to automatically create event chat when first user joins
CREATE OR REPLACE TRIGGER trigger_create_event_chat_on_first_join
  AFTER INSERT ON public.event_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.create_event_chat_on_first_join();