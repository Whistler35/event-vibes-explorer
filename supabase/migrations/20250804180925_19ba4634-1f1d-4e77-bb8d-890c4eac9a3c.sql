-- Update existing profile with placeholder data for bio and fun_fact
UPDATE profiles 
SET 
  bio = 'Hier steht deine Bio - bearbeite sie in den Einstellungen',
  fun_fact = 'Hier steht dein Fun Fact - bearbeite ihn in den Einstellungen'
WHERE user_id = '386f5902-cbba-4af1-b230-45bfe61a64b1';