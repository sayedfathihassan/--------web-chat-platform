-- Function to handle gift transactions securely on the server
-- This ensures atomicity and prevents client-side manipulation of points

CREATE OR REPLACE FUNCTION handle_gift_transaction(
  p_sender_id UUID,
  p_receiver_id UUID,
  p_gift_id UUID,
  p_points_cost INT,
  p_points_award INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated permissions to update profiles
AS $$
DECLARE
  v_sender_points INT;
  v_sender_gifts_sent INT;
  v_receiver_points INT;
BEGIN
  -- 1. Get sender current points and verify balance
  SELECT points, COALESCE(total_gifts_sent, 0) 
  INTO v_sender_points, v_sender_gifts_sent
  FROM profiles 
  WHERE id = p_sender_id 
  FOR UPDATE; -- Lock row for consistency

  IF v_sender_points < p_points_cost THEN
    RETURN jsonb_build_object('success', false, 'message', 'Insufficient points');
  END IF;

  -- 2. Deduct points from sender and increment stats
  UPDATE profiles 
  SET 
    points = points - p_points_cost,
    total_gifts_sent = v_sender_gifts_sent + 1
  WHERE id = p_sender_id;

  -- 3. Add points to receiver (if exists)
  UPDATE profiles 
  SET points = COALESCE(points, 0) + p_points_award
  WHERE id = p_receiver_id;

  -- 4. Log the transaction
  INSERT INTO gift_logs (sender_id, receiver_id, gift_id, points_cost, points_award)
  VALUES (p_sender_id, p_receiver_id, p_gift_id, p_points_cost, p_points_award);

  RETURN jsonb_build_object(
    'success', true, 
    'new_points', v_sender_points - p_points_cost
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;
