import Pusher from 'pusher';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const pusher = new Pusher({
  appId: process.env.VITE_PUSHER_APP_ID!,
  key: process.env.VITE_PUSHER_KEY!,
  secret: process.env.VITE_PUSHER_SECRET!,
  cluster: process.env.VITE_PUSHER_CLUSTER!,
  useTLS: true,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { socket_id, channel_name, identity, user_info } = req.body;

  if (!socket_id || !channel_name) {
    return res.status(400).send('Missing socket_id or channel_name');
  }

  try {
    const authResponse = pusher.authorizeChannel(socket_id, channel_name, {
      user_id: identity || 'unknown',
      user_info: user_info ? JSON.parse(user_info) : {},
    });
    res.send(authResponse);
  } catch (error) {
    console.error('Pusher auth error:', error);
    res.status(403).send('Forbidden');
  }
}
