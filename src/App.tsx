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
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-white border-2 border-brand-light-blue rounded-2xl flex items-center justify-center shadow-xl animate-bounce">
            <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center text-white font-black text-2xl">
              {siteSettings?.site_name?.charAt(0) || 'S'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
            <span className="text-brand-blue font-black text-sm tracking-widest">جاري الاتصال...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className={cn(
      "min-h-screen bg-brand-bg text-brand-blue font-sans",
      currentRoom ? "overflow-hidden flex flex-col h-screen" : ""
    )} dir="rtl">
      {/* Header - Hidden in room */}
      {!currentRoom && !showAdminDashboard && (
        <header className="bg-white border-b border-brand-light-blue px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
          <div className="flex items-center gap-4" onClick={() => {setCurrentRoom(null); setShowAdminDashboard(false);}} style={{cursor: 'pointer'}}>
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center font-black text-xl text-white shadow-lg shadow-orange-500/20">
              {siteSettings?.site_name?.charAt(0) || 'S'}
            </div>
            <h1 className="text-2xl font-black tracking-tighter text-brand-blue italic">{siteSettings?.site_name || 'سمايل تو شات'}</h1>
          </div>

          <div className="flex items-center gap-4">
            {(user.role === 'owner' || user.role === 'super_admin' || user.role === 'admin') && (
              <button
                onClick={() => setShowAdminDashboard(true)}
                className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-2xl hover:bg-brand-blue/90 transition-all text-xs font-black shadow-lg shadow-brand-blue/20 active:scale-95"
              >
                <Shield size={16} className="text-orange-400" />
                <span>لوحة الإدارة</span>
              </button>
            )}

            <button
              onClick={() => setProfileModalTab('shop')}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl hover:from-purple-600 hover:to-pink-600 transition-all text-xs font-black shadow-lg shadow-purple-500/20 active:scale-95"
            >
              <ShoppingBag size={16} />
              <span>المتجر</span>
            </button>

            <div 
              onClick={() => setProfileModalTab('profile')}
              className="flex items-center gap-3 px-4 py-2 bg-brand-surface rounded-2xl border border-brand-light-blue/30 shadow-sm cursor-pointer hover:bg-[#eef4f9] transition-all"
            >
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-brand-light-blue/20">
                <UserIcon size={16} className="text-orange-500" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-black text-brand-blue leading-tight">{user.display_name}</span>
                <span className="text-[10px] font-bold text-brand-light-blue">
                  {user.points} نقطة ذهبية
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-3 hover:bg-red-50 rounded-2xl transition-all text-brand-light-blue hover:text-red-600 border border-transparent hover:border-red-100 active:scale-95"
              title="تسجيل الخروج"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>
      )}

      <main className={cn(
        "flex-1 flex flex-col min-h-0",
        currentRoom || showAdminDashboard ? "h-full w-full p-0" : "max-w-7xl mx-auto p-4 md:p-6 w-full"
      )}>
        <AnimatePresence mode="wait">
          {showAdminDashboard ? (
            <motion.div
              key="admin"
              className="h-full w-full"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <AdminDashboard />
            </motion.div>
          ) : currentRoom ? (
            <motion.div
              key="room"
              className="h-full w-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <RoomView />
            </motion.div>
          ) : (
            <motion.div
              key="lobby"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
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
