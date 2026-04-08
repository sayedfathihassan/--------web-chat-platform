import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Room } from '../types';
import HallOfFame from './HallOfFame';
import { useChatStore } from '../store/useChatStore';
import { Users, Lock, MessageSquare, Plus, Loader2, Sparkles, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Gradient covers for rooms without images
const ROOM_GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
];

export default function Lobby() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [pendingGateway, setPendingGateway] = useState<Room | null>(null);
  const { setCurrentRoom, connectChat, user } = useChatStore();

  useEffect(() => {
    const fetchRooms = async () => {
      const { data } = await supabase.from('rooms').select('*').eq('is_active', true);
      if (data) setRooms(data as Room[]);
    };
    fetchRooms();

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

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleJoinRoom = async (room: Room) => {
    if (!user) return;

    const isGlobalAdmin = user.role === 'admin' || user.role === 'owner' || user.role === 'super_admin';
    const isRoomOwner = room.owner_id === user.id;

    if (!isGlobalAdmin) {
      const { data: banData } = await supabase
        .from('room_bans').select('id, reason')
        .eq('room_id', room.id).eq('user_id', user.id).eq('is_active', true).single();
      if (banData) {
        alert(`عذراً، أنت محظور من هذه الغرفة.\nالسبب: ${banData.reason || 'غير محدد'}`);
        return;
      }
    }

    const { data: modData } = await supabase
      .from('room_moderators').select('id')
      .eq('room_id', room.id).eq('user_id', user.id).single();

    const isRoomMod = !!modData;
    const isAuthorizedAdmin = isGlobalAdmin || isRoomOwner || isRoomMod;

    if (room.settings?.room_locked === 'members' && !isAuthorizedAdmin) {
      alert('الغرفة مقفلة بالوقت الحالي ومقتصرة على المشرفين فقط.');
      return;
    }

    if (room.settings?.gateway_enabled && !isAuthorizedAdmin) {
      setPendingGateway(room);

      await supabase.from('room_gateway_requests').insert({
        room_id: room.id, user_id: user.id, status: 'pending',
        display_name: user.display_name, username: user.username,
        avatar_url: user.avatar_url, shortId: user.short_id,
      });

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
    let ip = 'Unknown', country = 'Unknown';
    try {
      const res = await fetch('https://ipwho.is/');
      const ipData = await res.json();
      if (ipData.success) { ip = ipData.ip; country = ipData.country; }
    } catch (e) {}

    await supabase.from('room_visits').insert({
      room_id: room.id, user_id: user.id, ip_address: ip, country
    });
    setCurrentRoom(room);
    connectChat(room.id);
  };

  return (
    <div className="space-y-8 font-sans" dir="rtl">

      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl p-6"
        style={{
          background: 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(59,130,246,0.1) 100%)',
          border: '1px solid rgba(124,58,237,0.2)'
        }}
      >
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.2), transparent)' }} />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={16} style={{ color: '#a78bfa' }} />
              <span className="text-xs font-black" style={{ color: '#a78bfa' }}>أهلاً بك في</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black mb-1" style={{ color: '#f1f5f9' }}>
              غرف الدردشة 🌟
            </h2>
            <p className="text-sm font-bold" style={{ color: '#64748b' }}>
              اختر غرفتك وابدأ الدردشة مع مئات الأصدقاء الآن
            </p>
          </div>
          {user && (
            <div className="flex items-center gap-3 rounded-xl px-4 py-3"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="text-right">
                <p className="text-xs font-black" style={{ color: '#94a3b8' }}>مرحباً،</p>
                <p className="text-sm font-black" style={{ color: '#f1f5f9' }}>{user.display_name}</p>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.25)' }}>
                <TrendingUp size={12} style={{ color: '#f59e0b' }} />
                <span className="text-xs font-black" style={{ color: '#f59e0b' }}>
                  {user.points?.toLocaleString() || 0} نقطة
                </span>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Hall of Fame */}
      <HallOfFame />

      {/* Section Title */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <span className="text-xs font-black px-3" style={{ color: '#64748b' }}>الغرف المتاحة</span>
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
      </div>

      {/* Rooms Grid */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-5">
        {rooms.map((room, index) => (
          <motion.div
            key={room.id}
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: index * 0.06, type: 'spring', stiffness: 200, damping: 20 }}
            onClick={() => handleJoinRoom(room)}
            className="group relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-300 flex flex-col"
            style={{
              background: '#13131f',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Hover glow border */}
            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{ boxShadow: 'inset 0 0 0 1.5px rgba(124,58,237,0.5)', zIndex: 10 }} />

            {/* Cover Image / Gradient */}
            <div className="h-28 md:h-36 relative overflow-hidden shrink-0">
              {room.cover_image_url ? (
                <img src={room.cover_image_url}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-70"
                  alt={room.name} />
              ) : (
                <div className="w-full h-full transition-transform duration-500 group-hover:scale-110"
                  style={{ background: ROOM_GRADIENTS[index % ROOM_GRADIENTS.length] }} />
              )}
              {/* Overlay gradient */}
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(19,19,31,1) 0%, rgba(19,19,31,0.3) 60%, transparent 100%)' }} />

              {/* Lock Badge */}
              {room.is_private && (
                <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-1 rounded-lg"
                  style={{ background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.3)', backdropFilter: 'blur(8px)' }}>
                  <Lock size={10} style={{ color: '#fbbf24' }} />
                  <span className="text-[10px] font-black" style={{ color: '#fbbf24' }}>خاص</span>
                </div>
              )}

              {/* Online indicator */}
              <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-1 rounded-lg"
                style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)', backdropFilter: 'blur(8px)' }}>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-black" style={{ color: '#10b981' }}>مباشر</span>
              </div>
            </div>

            {/* Card Body */}
            <div className="p-3 md:p-4 flex flex-col gap-2 flex-1">
              <div className="flex items-start gap-2">
                {/* Room Icon */}
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white font-black text-sm"
                  style={{ background: ROOM_GRADIENTS[index % ROOM_GRADIENTS.length] }}>
                  {room.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-black truncate group-hover:opacity-80 transition-opacity"
                    style={{ color: '#f1f5f9' }}>
                    {room.name}
                  </h3>
                  <p className="text-[10px] font-bold truncate" style={{ color: '#4b5563' }}>
                    {room.description || 'أجواء رائعة بانتظارك...'}
                  </p>
                </div>
              </div>

              {/* Stats Row */}
              <div className="flex items-center gap-2 mt-auto pt-1">
                <div className="flex items-center gap-1">
                  <Users size={9} style={{ color: '#6b7280' }} />
                  <span className="text-[9px] font-bold" style={{ color: '#6b7280' }}>
                    سعة {room.max_users}
                  </span>
                </div>
                <div className="flex-1" />
              </div>

              {/* Join Button */}
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="w-full py-2 md:py-2.5 rounded-xl text-[11px] md:text-xs font-black transition-all"
                style={{
                  background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
                  color: 'white',
                  boxShadow: '0 4px 15px rgba(124,58,237,0.25)',
                }}
              >
                ادخل الغرفة →
              </motion.button>
            </div>
          </motion.div>
        ))}

        {/* Empty State */}
        {rooms.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="col-span-full py-20 text-center rounded-2xl"
            style={{ background: '#13131f', border: '1px dashed rgba(255,255,255,0.08)' }}
          >
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ background: 'rgba(124,58,237,0.1)' }}>
              <MessageSquare size={36} style={{ color: '#7c3aed', opacity: 0.5 }} strokeWidth={1.5} />
            </div>
            <p className="font-black text-lg mb-2" style={{ color: '#4b5563' }}>لا توجد غرف متاحة حالياً</p>
            <p className="text-sm font-bold" style={{ color: '#374151' }}>كن أول من ينشئ غرفة دردشة! 🚀</p>
          </motion.div>
        )}
      </div>

      {/* Gateway Pending Modal */}
      <AnimatePresence>
        {pendingGateway && (
          <div className="fixed inset-0 flex items-center justify-center z-[200]"
            style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)' }}>
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-sm w-full mx-4 text-center relative overflow-hidden"
              style={{
                background: '#13131f',
                border: '1px solid rgba(124,58,237,0.3)',
                borderRadius: '1.5rem',
                boxShadow: '0 25px 60px rgba(0,0,0,0.7), 0 0 40px rgba(124,58,237,0.1)',
                padding: '2rem'
              }}
            >
              <div className="absolute top-0 left-0 right-0 h-0.5"
                style={{ background: 'linear-gradient(90deg, #7c3aed, #3b82f6)', animation: 'shimmer 2s linear infinite' }} />
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{ background: 'rgba(124,58,237,0.12)', border: '2px solid rgba(124,58,237,0.3)' }}>
                <Loader2 size={32} className="animate-spin" style={{ color: '#7c3aed' }} />
              </div>
              <h2 className="text-xl font-black mb-3" style={{ color: '#f1f5f9' }}>الغرفة محمية بالبوابة</h2>
              <p className="text-sm font-bold leading-relaxed mb-7" style={{ color: '#64748b' }}>
                تم إرسال طلب انضمامك إلى مشرفي الغرفة.<br />
                يرجى الانتظار لحين الموافقة...
              </p>
              <button
                onClick={() => setPendingGateway(null)}
                className="w-full py-3 rounded-xl font-black text-sm transition-all"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}
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
