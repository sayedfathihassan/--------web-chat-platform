import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Room } from '../types';
import HallOfFame from './HallOfFame';
import { useChatStore } from '../store/useChatStore';
import { Users, Lock, MessageSquare, Plus, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Lobby() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [pendingGateway, setPendingGateway] = useState<Room | null>(null);
  const { setCurrentRoom, connectChat, user } = useChatStore();

  useEffect(() => {
    // Initial fetch
    const fetchRooms = async () => {
      const { data } = await supabase.from('rooms').select('*').eq('is_active', true);
      if (data) setRooms(data as Room[]);
    };
    fetchRooms();

    // Subscribe to changes
    const channel = supabase
      .channel('public:rooms')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setRooms((prev) => [...prev, payload.new as Room]);
        } else if (payload.eventType === 'UPDATE') {
          setRooms((prev) => prev.map(r => r.id === (payload.new as any).id ? (payload.new as Room) : r));
        } else if (payload.eventType === 'DELETE') {
          setRooms((prev) => prev.filter(r => r.id !== (payload.old as any).id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleJoinRoom = async (room: Room) => {
    if (!user) return;

    const isGlobalAdmin = user.role === 'admin' || user.role === 'owner' || user.role === 'super_admin';
    const isRoomOwner = room.owner_id === user.id;

    // Check if banned - Global Admins ignore bans
    if (!isGlobalAdmin) {
      const { data: banData } = await supabase
        .from('room_bans')
        .select('id, reason')
        .eq('room_id', room.id)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();
        
      if (banData) {
        alert(`عذراً، أنت محظور من هذه الغرفة.\nالسبب: ${banData.reason || 'غير محدد'}`);
        return;
      }
    }

    // Check Room Settings Permissions (Lock, Gateway)
    const { data: modData } = await supabase
      .from('room_moderators')
      .select('id')
      .eq('room_id', room.id)
      .eq('user_id', user.id)
      .single();
      
    const isRoomMod = !!modData;
    const isAuthorizedAdmin = isGlobalAdmin || isRoomOwner || isRoomMod;

    if (room.settings?.room_locked === 'members' && !isAuthorizedAdmin) {
      alert('الغرفة مقفلة بالوقت الحالي ومقتصرة على المشرفين فقط.');
      return;
    }

    // Global admins skip the gateway entirely
    if (room.settings?.gateway_enabled && !isAuthorizedAdmin) {
      setPendingGateway(room);

      // Create or update gateway request
      const { data: reqData } = await supabase.from('room_gateway_requests').upsert({
        room_id: room.id,
        user_id: user.id,
        status: 'pending'
      }, { onConflict: 'room_id,user_id' }).select().single();

      // INSTANT Broadcast to admin gateway channel so they see it immediately
      const adminChannel = supabase.channel(`gateway_admin_${room.id}`);
      adminChannel.send({
        type: 'broadcast',
        event: 'new-gateway-request',
        payload: {
          requestId: reqData?.id,
          userId: user.id,
          displayName: user.display_name,
          username: user.username,
          shortId: user.short_id,
        }
      });

      // Subscribe to approval response
      const gatewaySub = supabase.channel(`gateway_user_${user.id}_${room.id}`)
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'room_gateway_requests',
          filter: `room_id=eq.${room.id}`
        }, async (payload) => {
          const req = payload.new as any;
          if (req && req.user_id === user.id) {
            if (req.status === 'accepted') {
              supabase.removeChannel(gatewaySub);
              setPendingGateway(null);
              await supabase.from('room_gateway_requests').delete().eq('id', req.id);
              await executeJoin(room);
            } else if (req.status === 'rejected') {
              supabase.removeChannel(gatewaySub);
              setPendingGateway(null);
              alert('عذراً، تم رفض طلب الدخول من قبل مشرفي الغرفة.');
            }
          }
        }).subscribe();
        
      return;
    }

    await executeJoin(room);
  };

  const executeJoin = async (room: Room) => {
    if (!user) return;
    
    // Record room visit entry with IP and Country
    let ip = 'Unknown';
    let country = 'Unknown';
    try {
      const res = await fetch('https://ipwho.is/');
      const ipData = await res.json();
      if (ipData.success) {
        ip = ipData.ip;
        country = ipData.country;
      }
    } catch(e) { console.error('Failed to get IP', e); }

    await supabase.from('room_visits').insert({ 
      room_id: room.id, 
      user_id: user.id,
      ip_address: ip,
      country: country
    });

    setCurrentRoom(room);
    connectChat(room.id);
  };

  return (
    <div className="space-y-8 font-sans" dir="rtl">
      <div className="flex flex-col md:flex-row items-center justify-between bg-white border border-[#84a9d1]/30 p-6 rounded-3xl shadow-sm gap-6">
        <div className="flex-1">
          <h2 className="text-3xl font-black text-[#1e3a5f] mb-2 tracking-tight">غرف الدردشة</h2>
          <p className="text-[#84a9d1] font-bold text-sm">استكشف الغرف المتاحة وابدأ الدردشة الآن مع الأصدقاء</p>
        </div>
      </div>

      <HallOfFame />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {rooms.map((room, index) => (
          <motion.div
            key={room.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => handleJoinRoom(room)}
            className="group bg-white border border-brand-light-blue rounded-3xl overflow-hidden hover:border-orange-500 transition-all hover:shadow-2xl hover:shadow-brand-light-blue/20 relative flex flex-col cursor-pointer active:scale-[0.99]"
          >
            <div className="aspect-video relative overflow-hidden bg-brand-surface">
              {room.cover_image_url ? (
                <img 
                  src={room.cover_image_url} 
                  alt={room.name} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-brand-light-blue/20">
                  <MessageSquare size={64} strokeWidth={1.5} />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              {room.is_private && (
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md p-2.5 rounded-xl shadow-lg border border-brand-light-blue/20">
                  <Lock size={18} className="text-orange-500" />
                </div>
              )}
              
              <div className="absolute bottom-4 right-4 left-4 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
                <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-brand-light-blue/20 shadow-lg">
                  <Users size={14} className="text-brand-blue" />
                  <span className="text-xs font-black text-brand-blue">12 متصل</span>
                </div>
              </div>
            </div>

            <div className="p-8 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-black text-brand-blue group-hover:text-orange-500 transition-colors">{room.name}</h3>
                <div className="w-10 h-10 bg-brand-surface rounded-xl flex items-center justify-center text-brand-blue font-black border border-brand-light-blue/20">
                  {room.name.charAt(0)}
                </div>
              </div>
              <p className="text-sm text-brand-light-blue font-bold line-clamp-2 mb-8 leading-relaxed h-10">
                {room.description || 'لا يوجد وصف لهذه الغرفة، انضم إلينا واستكشف الأجواء الرائعة في هذه الغرفة.'}
              </p>
              <button
                className="w-full bg-brand-surface group-hover:bg-orange-500 text-brand-blue group-hover:text-white font-black py-4 rounded-2xl transition-all border border-brand-light-blue/30 group-hover:border-orange-500 shadow-sm group-hover:shadow-lg group-hover:shadow-orange-500/20"
              >
                دخول الغرفة الآن
              </button>
            </div>
          </motion.div>
        ))}

        {rooms.length === 0 && (
          <div className="col-span-full py-32 text-center bg-white rounded-3xl border-2 border-dashed border-brand-light-blue/30 shadow-inner">
            <div className="w-24 h-24 bg-brand-surface rounded-full flex items-center justify-center mx-auto mb-6 text-brand-light-blue/30">
              <MessageSquare size={48} strokeWidth={1.5} />
            </div>
            <p className="text-brand-light-blue font-black text-lg">لا توجد غرف متاحة حالياً</p>
            <p className="text-brand-light-blue/60 text-sm mt-2">كن أول من ينشئ غرفة دردشة جديدة!</p>
          </div>
        )}
      </div>

      {/* ── Pending Gateway Modal ── */}
      <AnimatePresence>
        {pendingGateway && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200]">
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl border-4 border-orange-500/20 text-center relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-orange-600 animate-pulse"></div>
              <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Loader2 size={32} className="text-orange-500 animate-spin" />
              </div>
              <h2 className="text-xl font-black text-[#1e3a5f] mb-3">الغرفة مقفلة بالبوابة</h2>
              <p className="text-[#84a9d1] font-bold text-sm leading-relaxed mb-8">
                لقد تم إرسال طلب انضمامك إلى مشرفي الغرفة.<br/>يرجى الانتظار لحين الموافقة...
              </p>
              <button 
                onClick={() => setPendingGateway(null)}
                className="w-full bg-[#eef4f9] hover:bg-[#e0ecf7] text-[#1e3a5f] font-black py-3 rounded-2xl transition-colors"
                >
                إلغاء الطلب والتراجع
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
