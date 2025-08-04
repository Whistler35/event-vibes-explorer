-- Add a default avatar URL to the existing profile
UPDATE profiles 
SET avatar_url = 'https://images.unsplash.com/photo-1494790108755-2616b9b36f21?w=400&h=400&fit=crop&crop=face'
WHERE user_id = '386f5902-cbba-4af1-b230-45bfe61a64b1' AND avatar_url IS NULL;