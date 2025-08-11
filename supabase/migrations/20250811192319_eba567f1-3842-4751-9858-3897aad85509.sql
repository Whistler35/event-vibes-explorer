-- Insert the mock events into the real database
INSERT INTO public.events (
  title, 
  description, 
  event_date, 
  location_name, 
  image_url,
  max_participants,
  current_participants,
  created_by
) VALUES 
(
  'NAMASTE FOR ALL',
  'Sunset Yoga in the Park – Berlin Edition',
  '2025-07-23 20:00:00+00',
  'Boxhagener Straße 79, 10245 Berlin (Friedrichshain)',
  '/lovable-uploads/f4be3766-dd26-4f5d-b31a-0fc8dc6465d1.png',
  50,
  0,
  '00000000-0000-0000-0000-000000000000'
),
(
  'CLOSING PARTY',
  'Party Closing : Last dance event',
  '2025-06-27 22:00:00+00',
  'Club Venue, Berlin',
  '/lovable-uploads/a0af2c47-46da-41a8-8282-d3ba5998ab1a.png',
  100,
  0,
  '00000000-0000-0000-0000-000000000000'
),
(
  'SUMMER BEATS',
  'Amazing electronic music festival',
  '2025-07-25 21:00:00+00',
  'Outdoor Stage, Berlin',
  '/lovable-uploads/cd408aae-af95-4d17-a1f0-20dae1b117d4.png',
  200,
  0,
  '00000000-0000-0000-0000-000000000000'
),
(
  'VIENNA CLASSICAL NIGHT',
  'Classical concert in Vienna',
  '2025-07-28 19:00:00+00',
  'Wiener Staatsoper, Vienna',
  '/lovable-uploads/b5f1b986-aaa0-4148-933c-cabcd3bb5e00.png',
  300,
  0,
  '00000000-0000-0000-0000-000000000000'
),
(
  'KUNST & KULTUR',
  'Gallery opening event',
  '2025-07-30 18:00:00+00',
  'Modern Art Gallery, Vienna',
  '/lovable-uploads/c5cfa817-d10d-4311-808f-e2d1cb7de838.png',
  80,
  0,
  '00000000-0000-0000-0000-000000000000'
);