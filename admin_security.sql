-- Table for real-time administrative actions
-- Replacing insecure client-side broadcasts

CREATE TABLE IF NOT EXISTS room_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES profiles(id),
  target_id UUID NOT NULL REFERENCES profiles(id),
  action TEXT NOT NULL, -- 'kick', 'ban', 'mute', 'unmute', 'clear'
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE room_actions ENABLE ROW LEVEL SECURITY;

-- Policy: Only Admins/Owners can insert actions for their rooms
CREATE POLICY "Admins can insert room actions" ON room_actions
FOR INSERT WITH CHECK (
  EXISTS (
    -- Check if user is room owner
    SELECT 1 FROM rooms WHERE id = room_actions.room_id AND owner_id = auth.uid()
  ) OR EXISTS (
    -- Check if user is room moderator with adequate permissions
    SELECT 1 FROM room_moderators 
    WHERE room_id = room_actions.room_id 
    AND user_id = auth.uid()
    AND (permissions->>'can_kick')::boolean = true -- Example permission check
  ) OR EXISTS (
    -- Check if user is a global admin
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'super_admin')
  )
);

-- Policy: Everyone in the room can read actions (to receive them in real-time)
CREATE POLICY "Users can read actions for their rooms" ON room_actions
FOR SELECT USING (true); -- Or restrict to room members if needed
