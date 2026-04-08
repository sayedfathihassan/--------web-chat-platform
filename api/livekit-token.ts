import { AccessToken } from 'livekit-server-sdk';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { roomId, userId, username, canPublish } = req.query;

  if (!roomId || !userId || !username) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    return res.status(500).json({ error: 'LiveKit API key or secret not configured' });
  }

  try {
    const at = new AccessToken(apiKey, apiSecret, {
      identity: userId as string,
      name: username as string,
    });

    at.addGrant({
      roomJoin: true,
      room: roomId as string,
      canPublish: canPublish === 'true',
      canSubscribe: true,
    });

    res.status(200).json({ token: await at.toJwt() });
  } catch (error) {
    console.error('LiveKit token error:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
}
