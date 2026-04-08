import Pusher from 'pusher-js';

// --- Diagnostic Bridge: Sends browser console logs to the server terminal ---
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

const sendToServer = (level: string, args: any[]) => {
  const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
  const xhr = new XMLHttpRequest();
  xhr.open('POST', '/api/log', true);
  xhr.send(`[${level}] ${msg}`);
};

console.log = (...args) => { originalLog(...args); sendToServer('LOG', args); };
console.error = (...args) => { originalError(...args); sendToServer('ERROR', args); };
console.warn = (...args) => { originalWarn(...args); sendToServer('WARN', args); };

window.addEventListener('error', (event) => {
  sendToServer('WINDOW_ERROR', [event.message, event.filename, event.lineno]);
});
// --------------------------------------------------------------------------

const pusherKey = '1f8abdf61b746773f625';
const pusherCluster = 'eu';

console.log(`[Pusher Client] Initializing with Hardcoded Key and Cluster: ${pusherCluster}`);

// We store user info here so the auth handler can include it
let _currentUser: { id: string; displayName: string; username: string; role: string; short_id?: number; avatar_url?: string } | null = null;

export function setPusherUser(user: { id: string; displayName: string; username: string; role: string; short_id?: number; avatar_url?: string } | null) {
  _currentUser = user;
}

export const pusher = new Pusher(pusherKey, {
  cluster: pusherCluster,
  userAuthentication: {
    customHandler: ({ socketId }, callback) => {
      console.log(`[Pusher Client] Global User Auth for Socket: ${socketId}`);
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/pusher/auth', true);
      xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            callback(null, JSON.parse(xhr.responseText));
          } else {
            console.error(`[Pusher Client] User Auth Failed: ${xhr.status} - ${xhr.responseText}`);
            callback(new Error(`Auth failed: ${xhr.status}`), null);
          }
        }
      };
      
      const getSession = async () => {
        try {
          const { data } = await (await import('./supabase')).supabase.auth.getSession();
          return data.session?.access_token || '';
        } catch {
          return '';
        }
      };

      getSession().then(token => {
        const body = new URLSearchParams({ 
          socket_id: socketId,
          identity: _currentUser?.id || 'unknown',
          access_token: token,
          user_info: JSON.stringify({
            displayName: _currentUser?.displayName || 'مستخدم',
            username: _currentUser?.username || 'unknown',
          })
        });
        xhr.send(body.toString());
      });
    }
  },
  channelAuthorization: {
    customHandler: ({ socketId, channelName }, callback) => {
      console.log(`[Pusher Client] Starting Channel Auth for: ${channelName} (Socket: ${socketId})`);
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/pusher/auth', true);
      xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            console.log(`[CLIENT AUTH DATA] ${channelName}: ${xhr.responseText}`);
            const data = JSON.parse(xhr.responseText);
            callback(null, data);
          } else {
            console.error(`[Pusher Client] Channel Auth Failed: ${xhr.status} - ${xhr.responseText}`);
            callback(new Error(`Auth failed: ${xhr.status}`), null);
          }
        }
      };
      
      const getSession = async () => {
        try {
          const { data } = await (await import('./supabase')).supabase.auth.getSession();
          return data.session?.access_token || '';
        } catch {
          return '';
        }
      };

      getSession().then(token => {
        const body = new URLSearchParams({
          socket_id: socketId,
          channel_name: channelName,
          identity: _currentUser?.id || 'unknown',
          access_token: token,
          user_info: JSON.stringify({
            displayName: _currentUser?.displayName || 'مستخدم',
            username: _currentUser?.username || 'unknown',
            role: _currentUser?.role || 'guest',
            short_id: _currentUser?.short_id,
            avatar_url: _currentUser?.avatar_url,
          })
        });
        xhr.send(body.toString());
      });
    }
  },
});
