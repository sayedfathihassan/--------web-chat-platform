import React, { useState, useEffect } from 'react';
import { useChatStore } from '../store/useChatStore';
import { motion, AnimatePresence } from 'motion/react';
import { Users, UserCheck, UserX, ChevronDown, Bell, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

export default function Gateway() {
  const { currentRoom, user } = useChatStore();
  const [waitingUsers, setWaitingUsers] = useState<any[]>([]);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isRoomMod, setIsRoomMod] = useState(false);

  const isGlobalAdmin = user?.role === 'owner' || user?.role === 'admin' || user?.role === 'super_admin';
  const isOwner = currentRoom?.owner_id === user?.id;

  useEffect(() => {
    if (!currentRoom || !user) return;
    
    // Check if user is a mod
    supabase.from('room_moderators').select('id').eq('room_id', currentRoom.id).eq('user_id', user.id).single()
      .then(({data}) => setIsRoomMod(!!data));

    // Fetch initial
    const fetchRequests = async () => {
      const { data } = await supabase.from('room_gateway_requests')
        .select('id, user_id, status, profiles(display_name, short_id, username)')
        .eq('room_id', currentRoom.id)
        .eq('status', 'pending');
      if (data) setWaitingUsers(data);
    };
    fetchRequests();

    // Subscribe to BOTH broadcast (instant) AND postgres_changes (reliable fallback)
    const sub = supabase.channel(`gateway_admin_${currentRoom.id}`)
      .on('broadcast', { event: 'new-gateway-request' }, ({ payload }) => {
        // Instantly add the new request to the list without waiting for DB
        setWaitingUsers(prev => {
          const exists = prev.some(u => u.user_id === payload.userId);
          if (exists) return prev;
          return [...prev, {
            id: payload.requestId,
            user_id: payload.userId,
            status: 'pending',
            profiles: {
              display_name: payload.displayName,
              username: payload.username,
              short_id: payload.shortId
            }
          }];
        });
      })
      .on('postgres_changes', { 
        event: '*', schema: 'public', table: 'room_gateway_requests', 
        filter: `room_id=eq.${currentRoom.id}` 
      }, () => {
        fetchRequests();
      })
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [currentRoom, user]);

  const isAdmin = isGlobalAdmin || isOwner || isRoomMod;
  if (!isAdmin || !currentRoom?.settings?.gateway_enabled) return null;

  const handleApprove = async (id: string) => {
    await supabase.from('room_gateway_requests').update({ status: 'accepted' }).eq('id', id);
  };

  const handleReject = async (id: string) => {
    await supabase.from('room_gateway_requests').update({ status: 'rejected' }).eq('id', id);
  };

  return (
    <div className="fixed top-20 left-6 z-[150] font-sans" dir="rtl">
      {/* ── Toggle Button ── */}
      <button 
        onClick={() => setIsAdminOpen(!isAdminOpen)}
        className={cn(
          "relative flex items-center justify-center w-12 h-12 rounded-full shadow-xl border-2 transition-all active:scale-95",
          waitingUsers.length > 0 ? "bg-orange-500 border-orange-400 animate-bounce" : "bg-white border-[#84a9d1]"
        )}
      >
        <Bell size={20} className={waitingUsers.length > 0 ? "text-white" : "text-[#1e3a5f]"} />
        {waitingUsers.length > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
            {waitingUsers.length}
          </span>
        )}
      </button>

      {/* ── Admin Requests Modal ── */}
      <AnimatePresence>
        {isAdminOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-14 left-0 w-72 bg-white border-2 border-[#84a9d1] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[400px]"
          >
             <div className="bg-[#1e3a5f] px-4 py-2.5 flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                  <Users size={16} />
                  <span className="text-xs font-black">طلبات الدخول عبر البوابة</span>
                </div>
                <button onClick={() => setIsAdminOpen(false)} className="text-white hover:text-orange-400"><ChevronDown size={18} /></button>
             </div>
             <div className="p-3 overflow-y-auto space-y-2 custom-scrollbar flex-1 bg-[#eef4f9]">
                {waitingUsers.map((req) => (
                  <div key={req.id} className="bg-white p-2.5 rounded-xl flex items-center justify-between border border-[#84a9d1]/20 shadow-sm">
                    <div className="flex items-center gap-2">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${req.profiles?.username}`} className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200" alt="" />
                      <div className="leading-tight">
                        <span className="block text-[11px] font-black text-[#1e3a5f] truncate max-w-[90px]">{req.profiles?.display_name}</span>
                        <span className="block text-[9px] text-[#84a9d1] font-bold">ID: {req.profiles?.short_id || '---'}</span>
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => handleApprove(req.id)} className="w-7 h-7 bg-green-50 hover:bg-green-500 text-green-600 hover:text-white rounded shadow-sm flex items-center justify-center transition-all border border-green-200"><UserCheck size={14} /></button>
                      <button onClick={() => handleReject(req.id)} className="w-7 h-7 bg-red-50 hover:bg-red-500 text-red-600 hover:text-white rounded shadow-sm flex items-center justify-center transition-all border border-red-200"><UserX size={14} /></button>
                    </div>
                  </div>
                ))}
                {waitingUsers.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-[#84a9d1]">
                    <Shield size={32} className="mb-2 opacity-50" />
                    <p className="text-[10px] font-black text-center">لا توجد طلبات معلقة</p>
                  </div>
                )}
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
