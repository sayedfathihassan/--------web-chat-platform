import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import Pusher from 'pusher';
import crypto from 'crypto';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  
  console.log('[Vite Config] Pusher APP_ID:', env.VITE_PUSHER_APP_ID ? 'Loaded' : 'MISSING');

  // HARDCODED CREDENTIALS (Sourced from user provided data) - TRIMMED to ensure validity
  const appId = '2137485'.trim();
  const key = '1f8abdf61b746773f625'.trim();
  const secret = '68b5df4338a64b23b8d9'.trim();
  const cluster = 'eu'.trim();

  const pusherAuthClient = new Pusher({ appId, key, secret, cluster, useTLS: true });

  return {
    plugins: [
      react(), 
      tailwindcss(),
      {
        name: 'pusher-diagnostic-proxy',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            const url = req.url || '';
            
            // 1. Browser Log Bridge (Diagnostic)
            if (url.includes('/api/log') && req.method === 'POST') {
              let body = '';
              req.on('data', chunk => { body += chunk; });
              req.on('end', () => {
                console.log(`[BROWSER LOG] ${body}`);
                res.end('ok');
              });
              return;
            }

            // 2. Pusher Auth Proxy
            if (url.includes('/api/pusher/auth') && req.method === 'POST') {
              let body = '';
              req.on('data', chunk => { body += chunk; });
              req.on('end', () => {
                try {
                  const params = new URLSearchParams(body);
                  const socketId = params.get('socket_id');
                  const channelName = params.get('channel_name');
                  const identity = params.get('identity') || 'unknown';
                  const userInfoStr = params.get('user_info') || '{}';

                  if (!socketId || !channelName) {
                    res.statusCode = 400;
                    res.end('Missing params');
                    return;
                  }

                  // --- MANUAL HMAC SIGNING (Pusher Protocol V1) ---
                  // For Presence Channels: signature = HMAC-SHA256(secret, socket_id + ":" + channel_name + ":" + channel_data)
                  const channelData = JSON.stringify({
                    user_id: identity,
                    user_info: JSON.parse(userInfoStr),
                  });

                  const stringToSign = `${socketId}:${channelName}:${channelData}`;
                  const signature = crypto
                    .createHmac('sha256', secret)
                    .update(stringToSign)
                    .digest('hex');

                  const authResponse = {
                    auth: `${key}:${signature}`,
                    channel_data: channelData
                  };
                  
                  console.log(`[Pusher Proxy] MANUAL SIGNING SUCCESS for ${channelName}`);
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify(authResponse));
                } catch (error) {
                  console.error('[Pusher Proxy Error]:', error);
                  res.statusCode = 403;
                  res.end(JSON.stringify({ error: 'Forbidden', message: String(error) }));
                }
              });
              return;
            }
            next();
          });
        }
      }
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
