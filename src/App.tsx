import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { useChatStore } from './store/useChatStore';
import Lobby from './components/Lobby';
import RoomView from './components/RoomView';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import { User, Room, DEFAULT_SHOP_ITEMS, DEFAULT_GIFTS, SiteSettings } from './types';
import { LogOut, User as UserIcon, Shield, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { setPusherUser } from './lib/pusher';
import ProfileModal from './components/ProfileModal';

export default function App() {
  const { 
    user, 
    setUser, 
    currentRoom, 
    setCurrentRoom, 
    disconnectChat, 
    showAdminDashboard, 
    setShowAdminDashboard,
    initGlobalNotice,
    siteSettings,
    setSiteSettings
  } = useChatStore();

  useEffect(() => {
    initGlobalNotice();
  }, [initGlobalNotice]);
  const [loading, setLoading] = useState(true);
  const [profileModalTab, setProfileModalTab] = useState<'profile' | 'shop' | 'inventory' | null>(null);

  useEffect(() => {
    // Seed initial data if needed
    const seedData = async () => {
      try {
        const { data: existingRooms } = await supabase.from('rooms').select('id').limit(1);
        if (!existingRooms || existingRooms.length === 0) {
          await supabase.from('rooms').insert([
            {
              name: 'غرفة الدردشة العامة', slug: 'general',
              description: 'أهلاً بك في الغرفة العامة للجميع. استمتع بالدردشة والتعرف على أصدقاء جدد.',
              owner_id: null, max_mic_seats: 5, max_users: 100,
              is_active: true, is_private: false,
              welcome_message: 'مرحباً بك في الغرفة العامة!',
              cover_image_url: 'https://picsum.photos/seed/general/800/600',
              requires_gateway_approval: false
            },
            {
              name: 'عشاق الموسيقى', slug: 'music',
              description: 'هنا نجتمع لنستمع ونناقش أحدث الأغاني والموسيقى.',
              owner_id: null, max_mic_seats: 3, max_users: 50,
              is_active: true, is_private: false,
              welcome_message: 'استمتع بالألحان!',
              cover_image_url: 'https://picsum.photos/seed/music/800/600',
              requires_gateway_approval: false
            }
          ]);
        }

        // Seed and sync default gifts
        await supabase.from('gifts').upsert(DEFAULT_GIFTS, { onConflict: 'id' });

        // 🟢 SYNC LOGIC V2: Only insert missing items, don't overwrite existing ones
        // This allows the Admin to edit prices/names in the DB without reset.
        
        // 1. Sync Gifts
        const { data: existingGifts } = await supabase.from('gifts').select('id');
        const existingGiftIds = new Set(existingGifts?.map(g => g.id) || []);
        const newGifts = DEFAULT_GIFTS.filter(g => !existingGiftIds.has(g.id));
        if (newGifts.length > 0) {
          await supabase.from('gifts').insert(newGifts);
        }

        // 2. Sync Shop Items
        const { data: existingShop } = await supabase.from('shop_items').select('id');
        const existingShopIds = new Set(existingShop?.map(s => s.id) || []);
        const newShop = DEFAULT_SHOP_ITEMS.filter(s => !existingShopIds.has(s.id));
        if (newShop.length > 0) {
          await supabase.from('shop_items').insert(newShop);
        }

        // Fetch Site Settings
        const { data: settings } = await supabase.from('site_settings').select('*').single();
        if (settings) {
          setSiteSettings(settings);
          document.title = settings.site_name;
        } else {
          // If no settings exist at all, create one
          const { data: newSettings } = await supabase.from('site_settings').insert([{ site_name: 'إمبراطورية الشات' }]).select().single();
          if (newSettings) setSiteSettings(newSettings);
        }

        // Subscribe to Site Settings changes
        supabase.channel('site-settings-changes')
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'site_settings' }, payload => {
            setSiteSettings(payload.new as SiteSettings);
            document.title = (payload.new as SiteSettings).site_name;
          })
          .subscribe();

      } catch (e) {
        console.error('Seeding error:', e);
      }
    };
    seedData();

    // Handle Auth state
    const handleAuthState = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile) {
            const fullUser = { id: session.user.id, ...profile } as User;
            setUser(fullUser);
            setPusherUser({
              id: fullUser.id,
              displayName: fullUser.display_name,
              username: fullUser.username,
              role: fullUser.role || 'member',
              short_id: fullUser.short_id,
              avatar_url: fullUser.avatar_url,
            });
          } else {
            // Create member profile if missing (helps with SignUp race conditions)
            const cleanUsername = session.user.email 
              ? session.user.email.split('@')[0].toLowerCase() 
              : `user_${Math.random().toString(36).substr(2, 6)}`;
              
            const displayName = session.user.user_metadata?.display_name || cleanUsername;
            
            const newProfile = {
              id: session.user.id,
              username: cleanUsername,
              display_name: displayName,
              points: 100,
              is_guest: false,
              role: 'member'
            };
            
            // Upsert safely so we don't conflict with Login.tsx
            const { error: insertErr } = await supabase.from('profiles').upsert(newProfile, { onConflict: 'id', ignoreDuplicates: true });
            
            // Re-fetch to guarantee we get any data Login.tsx might have written
            const { data: latestProfile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
            if (latestProfile) {
              const fullUser = { id: session.user.id, ...latestProfile } as User;
              setUser(fullUser);
              setPusherUser({
                id: fullUser.id,
                displayName: fullUser.display_name,
                username: fullUser.username,
                role: fullUser.role || 'member',
                short_id: fullUser.short_id,
                avatar_url: fullUser.avatar_url,
              });
            } else {
              setUser({ ...newProfile } as User);
            }
          }
        } else {
          setUser(null);
        }
      } catch (e) {
        console.error('Auth handler error:', e);
      } finally {
        setLoading(false);
      }
    };

    handleAuthState();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUser(null);
      } else {
        handleAuthState();
      }
    });

    return () => subscription.unsubscribe();
  }, [setUser]);

  const handleLogout = async () => {
    disconnectChat();
    await supabase.auth.signOut();
    setCurrentRoom(null);
    setShowAdminDashboard(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.15) 0%, transparent 60%), #0d0d1a' }}>
        <div className="flex flex-col items-center gap-5">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center animate-float" style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)', boxShadow: '0 0 40px rgba(124,58,237,0.5)' }}>
            <span className="text-3xl font-black text-white">{siteSettings?.site_name?.charAt(0) || '💬'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#7c3aed' }} />
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#3b82f6', animationDelay: '0.2s' }} />
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#ec4899', animationDelay: '0.4s' }} />
          </div>
          <span className="font-black text-sm tracking-widest" style={{ color: '#64748b' }}>جاري الاتصال...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div
      className={cn("min-h-screen font-sans", currentRoom ? "overflow-hidden flex flex-col h-screen" : "")}
      dir="rtl"
      style={{ background: currentRoom ? '#0d0d1a' : 'radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.12) 0%, transparent 50%), #0d0d1a' }}
    >
      {/* Header - Hidden in room */}
      {!currentRoom && !showAdminDashboard && (
        <header
          className="px-5 py-3 flex items-center justify-between sticky top-0 z-50"
          style={{
            background: 'rgba(13,13,26,0.85)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 4px 30px rgba(0,0,0,0.3)'
          }}
        >
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => { setCurrentRoom(null); setShowAdminDashboard(false); }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-lg text-white"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)', boxShadow: '0 0 15px rgba(124,58,237,0.4)' }}
            >
              {siteSettings?.site_name?.charAt(0) || '💬'}
            </div>
            <h1 className="text-xl font-black tracking-tight" style={{ background: 'linear-gradient(135deg, #a78bfa, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              {siteSettings?.site_name || 'سمايل تو شات'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {(user.role === 'owner' || user.role === 'super_admin' || user.role === 'admin') && (
              <button
                onClick={() => setShowAdminDashboard(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs transition-all"
                style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}
              >
                <Shield size={14} />
                <span>لوحة الإدارة</span>
              </button>
            )}

            <button
              onClick={() => setProfileModalTab('shop')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs transition-all"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)', boxShadow: '0 4px 15px rgba(124,58,237,0.3)', color: 'white' }}
            >
              <ShoppingBag size={14} />
              <span>المتجر</span>
            </button>

            <div
              onClick={() => setProfileModalTab('profile')}
              className="flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(124,58,237,0.08)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}>
                {user.avatar_url?.startsWith('http') || user.avatar_url?.startsWith('/') ? (
                  <img src={user.avatar_url} className="w-full h-full object-cover" alt="" />
                ) : (
                  <UserIcon size={14} className="text-white" />
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-black leading-tight" style={{ color: '#f1f5f9' }}>{user.display_name}</span>
                <span className="text-[10px] font-bold" style={{ color: '#f59e0b' }}>⭐ {user.points?.toLocaleString() || 0} نقطة</span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
              style={{ background: 'rgba(239,68,68,0.08)', color: '#64748b', border: '1px solid rgba(239,68,68,0.15)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.15)'; (e.currentTarget as HTMLButtonElement).style.color = '#f87171'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)'; (e.currentTarget as HTMLButtonElement).style.color = '#64748b'; }}
              title="تسجيل الخروج"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>
      )}

      <main
        className="flex-1 flex flex-col min-h-0"
        style={currentRoom || showAdminDashboard ? { height: '100%', width: '100%', padding: 0 } : { maxWidth: '80rem', margin: '0 auto', padding: '1.5rem', width: '100%' }}
      >
        <AnimatePresence mode="wait">
          {showAdminDashboard ? (
            <motion.div key="admin" className="h-full w-full" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
              <AdminDashboard />
            </motion.div>
          ) : currentRoom ? (
            <motion.div key="room" className="h-full w-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <RoomView />
            </motion.div>
          ) : (
            <motion.div key="lobby" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <Lobby />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Profile Modal */}
      {profileModalTab && (
        <ProfileModal
          userId={user.id}
          initialTab={profileModalTab}
          onClose={() => setProfileModalTab(null)}
        />
      )}
    </div>
  );
}
