-- Function to update user's preferred translation
CREATE OR REPLACE FUNCTION update_user_translation(user_id UUID, new_translation VARCHAR(10))
RETURNS VOID AS $$
BEGIN
  UPDATE user_profiles 
  SET preferred_translation = new_translation 
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_user_translation TO authenticated;
