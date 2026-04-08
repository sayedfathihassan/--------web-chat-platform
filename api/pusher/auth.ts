import Pusher from 'pusher';
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const pusher = new Pusher({
  appId: process.env.VITE_PUSHER_APP_ID!,
  key: process.env.VITE_PUSHER_KEY!,
  secret: process.env.VITE_PUSHER_SECRET!,
  cluster: process.env.VITE_PUSHER_CLUSTER!,
  useTLS: true,
});

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { socket_id, channel_name, identity, user_info, access_token } = req.body;

  if (!socket_id) {
    return res.status(400).send('Missing socket_id');
  }

  // 1. Verify token if provided, or reject if missing for authenticated channels
  if (!access_token && identity !== 'unknown') {
    return res.status(401).send('Authentication required');
  }

  if (access_token) {
    const { data: { user }, error } = await supabase.auth.getUser(access_token);
    if (error || !user || user.id !== identity) {
      console.error('Pusher auth: Token verification failed', error);
      return res.status(403).send('Invalid token or identity mismatch');
    }
  }

  try {
    const authResponse = channel_name 
      ? pusher.authorizeChannel(socket_id, channel_name, {
          user_id: identity || 'unknown',
          user_info: user_info ? JSON.parse(user_info) : {},
        })
      : pusher.authenticateUser(socket_id, {
          id: identity || 'unknown',
          user_info: user_info ? JSON.parse(user_info) : {},
        });
    res.send(authResponse);
  } catch (error) {
    console.error('Pusher auth error:', error);
    res.status(403).send('Forbidden');
  }
}
