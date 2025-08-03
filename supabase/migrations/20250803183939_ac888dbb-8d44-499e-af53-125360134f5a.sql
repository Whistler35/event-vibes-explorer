-- Temporär: Events öffentlich zugänglich machen für Demo-Zwecke
-- Diese Policies erlauben es jedem, Events zu erstellen und anzuzeigen

-- Entferne bestehende RLS Policies
DROP POLICY IF EXISTS "Everyone can view events" ON public.events;
DROP POLICY IF EXISTS "Users can create their own events" ON public.events;
DROP POLICY IF EXISTS "Users can update their own events" ON public.events;
DROP POLICY IF EXISTS "Users can delete their own events" ON public.events;

-- Erstelle neue öffentliche Policies
CREATE POLICY "Anyone can view events" 
ON public.events 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create events" 
ON public.events 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update events" 
ON public.events 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete events" 
ON public.events 
FOR DELETE 
USING (true);