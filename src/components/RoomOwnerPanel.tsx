import React, { useState } from 'react';
import { useChatStore, OnlineUser } from '../store/useChatStore';
import { motion, AnimatePresence } from 'motion/react';
import { Crown, X, Users, Mic, MicOff, UserX, Shield, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

export default function RoomOwnerPanel() {
  const { currentRoom, user, onlineUsers, channel, sendMessage } = useChatStore();
  const [isOpen, setIsOpen] = useState(false);

  // This panel only renders for the room owner
  const isRoomOwner = user && currentRoom && currentRoom.owner_id === user.id;
  if (!isRoomOwner) return null;

  const handleKick = (target: OnlineUser) => {
    if (!channel) return;
    channel.trigger('client-room-kick', { userId: target.id, reason: 'طرد من قِبل صاحب الغرفة' });
    sendMessage({
      roomId: currentRoom!.id,
      userId: 'system',
      username: 'System',
      displayName: 'System',
      text: `🚫 تم طرد ${target.displayName} من الغرفة`,
      role: 'admin',
      roleColor: '#ef4444',
      type: 'mod_action',
    });
    
    // Log action
    supabase.from('room_mod_actions').insert({
      room_id: currentRoom!.id, actor_id: user.id, target_id: target.id, action_type: 'kick', action_label: 'طرد مشرف'
    }).then();
    
    setIsOpen(false);
  };

  const handleMute = (target: OnlineUser) => {
    if (!channel) return;
    channel.trigger('client-room-mute', { userId: target.id });
    sendMessage({
      roomId: currentRoom!.id,
      userId: 'system',
      username: 'System',
      displayName: 'System',
      text: `🔇 تم كتم صوت ${target.displayName}`,
      role: 'admin',
      roleColor: '#f97316',
      type: 'mod_action',
    });
    
    // Log action
    supabase.from('room_mod_actions').insert({
      room_id: currentRoom!.id, actor_id: user.id, target_id: target.id, action_type: 'mute', action_label: 'كتم صوت'
    }).then();
  };

  const handleAnnounce = () => {
    const text = prompt('اكتب رسالة الإعلان:');
    if (!text?.trim()) return;
    sendMessage({
      roomId: currentRoom!.id,
      userId: 'system',
      username: 'System',
      displayName: 'System',
      text: `📢 إعلان من صاحب الغرفة: ${text.trim()}`,
      role: 'owner',
      roleColor: '#f59e0b',
      type: 'system',
    });

    // Log action
    supabase.from('room_mod_actions').insert({
      room_id: currentRoom!.id, actor_id: user.id, action_type: 'announce', action_label: 'رسالة إعلان', notes: text.trim()
    }).then();

    setIsOpen(false);
  };

  const members = onlineUsers.filter(u => u.id !== user.id);

  return (
    <div className="fixed bottom-20 right-4 z-[150] w-64 font-sans" dir="rtl">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="bg-white border-2 border-[#84a9d1] rounded-2xl shadow-2xl mb-2 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-[#1e3a5f] px-4 py-2.5 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Crown size={14} className="text-yellow-400" />
                <span className="text-[10px] font-black">إدارة غرفتي</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-white/60 hover:text-white"><X size={14} /></button>
            </div>

            {/* Quick actions */}
            <div className="p-3 border-b border-[#84a9d1]/10 space-y-2">
              <p className="text-[9px] font-black text-[#84a9d1] uppercase tracking-widest">إجراءات سريعة</p>
              <button
                onClick={handleAnnounce}
                className="w-full flex items-center gap-2 px-3 py-2 bg-[#f0f8ff] border border-[#84a9d1]/20 rounded-xl text-[10px] font-black text-[#1e3a5f] hover:bg-[#deedf7] transition-all"
              >
                📢 إرسال إعلان للغرفة
              </button>
            </div>

            {/* Members list */}
            <div className="p-3 space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
              <p className="text-[9px] font-black text-[#84a9d1] uppercase tracking-widest">الأعضاء ({members.length})</p>
              {members.length === 0 && (
                <p className="text-[10px] text-[#84a9d1] italic text-center py-3">لا يوجد أعضاء آخرون الآن</p>
              )}
              {members.map(m => (
                <div key={m.id} className="flex items-center gap-2 bg-[#f9fbfd] rounded-xl p-2 border border-[#84a9d1]/10">
                  <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${m.username}`}
                    className="w-7 h-7 rounded-lg bg-white border border-[#84a9d1]/20"
                    alt=""
                  />
                  <span className="flex-1 text-[9px] font-black text-[#1e3a5f] truncate">{m.displayName}</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleMute(m)}
                      title="كتم الصوت"
                      className="w-6 h-6 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center hover:bg-orange-200 transition-all"
                    >
                      <MicOff size={11} />
                    </button>
                    <button
                      onClick={() => handleKick(m)}
                      title="طرد من الغرفة"
                      className="w-6 h-6 bg-red-100 text-red-600 rounded-lg flex items-center justify-center hover:bg-red-200 transition-all"
                    >
                      <UserX size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-2xl shadow-lg border-2 border-yellow-600 font-black text-xs transition-all hover:scale-105 active:scale-95"
      >
        <div className="flex items-center gap-2">
          <Crown size={15} />
          إدارة غرفتي
        </div>
        {isOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
      </button>
    </div>
  );
}
