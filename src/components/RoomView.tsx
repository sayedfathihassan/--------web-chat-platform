import React, { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useChatStore, OnlineUser } from '../store/useChatStore';
import { Gift as GiftItem, MicSeat as MicSeatType, DEFAULT_SHOP_ITEMS } from '../types';
import {
  Send, Smile, Users, Mic, Mic2, LogOut, Gift as GiftIcon,
  Shield, User as UserIcon, Volume2, VolumeX, Star, Crown, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import MyStatusModal from './MyStatusModal';
import UserContextMenu from './UserContextMenu';
import RoomManagementModal from './RoomManagementModal';
import Gateway from './Gateway';
import ProfileModal from './ProfileModal';
import SendGiftModal from './SendGiftModal';
import PrivateChatManager from './PrivateChatManager';
import AdminDashboard from './AdminDashboard';
import { getGlobalRank } from '../lib/ranks';
import RoomControlPanel from './RoomControlPanel';
import { useSound } from '../hooks/useSound';

// --- Constants ---
const EMOJI_LIST = [
  '😀','😂','🥰','😍','🤩','😎','🥺','😢','😡','🤣',
  '👍','👏','🙌','🤝','💪','🎉','🔥','💯','❤️','💕',
  '🌹','🌺','⭐','✨','💎','🎁','🎊','🎈','🏆','👑',
  '😴','🤔','🙄','😏','😅','🤗','😇','🥳','🤭','😋',
  '🐱','🐶','🦁','🐯','🦊','🐺','🐻','🐼','🦋','🌸',
  '🍕','🍰','☕','🎵','🎮','📱','💻','🌙','☀️','🌈',
];

const ROLE_LABELS: Record<string, string> = {
  owner: 'صاحب الموقع', super_admin: 'مشرف عام', admin: 'مشرف',
  friend: 'صديق', member: 'عضو', guest: 'زائر',
};

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-red-500 text-white', super_admin: 'bg-purple-600 text-white',
  admin: 'bg-blue-600 text-white', friend: 'bg-green-500 text-white',
  member: 'bg-gray-500 text-white', guest: 'bg-gray-300 text-gray-600',
};

// --- Main Component ---
export default function RoomView() {
  const { 
    currentRoom, messages, user, setCurrentRoom, disconnectChat, 
    onlineUsers, sendMessage, connectionState, activeGiftEffect, activeEntryEffect,
    isMuted: isMutedByAdmin, ignoredUserIds, openPrivateChat,
    showAdminDashboard, setShowAdminDashboard, setRoomPermissions, roomPermissions,
    roomModeratorIds, setRoomModeratorIds, isSoundEnabled, toggleSound, addReaction,
    roomModerators, setRoomModerators, 
    connectAudio, disconnectAudio, publishAudio, isAudioConnected,
    audioLevels, setAudioLevel, audioRoom
  } = useChatStore();
  const { playSound } = useSound();

  const [inputText, setInputText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [micSeats, setMicSeats] = useState<MicSeatType[]>([]);
  const [isLocalMuted, setIsLocalMuted] = useState(false);
  const [isRoomMod, setIsRoomMod] = useState(false);

  // Modals
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isRoomManagementOpen, setIsRoomManagementOpen] = useState(false);
  const [isOwnerPanelOpen, setIsOwnerPanelOpen] = useState(false);
  const [showProfile, setShowProfile] = useState<{ userId: string; displayName: string } | null>(null);
  const [showGiftTo, setShowGiftTo] = useState<{ userId: string; displayName: string } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; userId: string } | null>(null);
  const [flyingGift, setFlyingGift] = useState<{ emoji: string; key: number } | null>(null);
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isRoomOwner = !!(user && currentRoom && currentRoom.owner_id === user.id);
  const isGlobalAdmin = user?.role === 'admin' || user?.role === 'owner' || user?.role === 'super_admin';
  const canManageRoom = isGlobalAdmin || isRoomMod || isRoomOwner || !!roomPermissions;

  // --- Load gifts & mic seats ---
  useEffect(() => {
    if (!currentRoom) return;

    const fetchData = async () => {
      const { data: giftsData } = await supabase
        .from('gifts').select('*').eq('is_active', true).order('points_cost');
      if (giftsData) setGifts(giftsData as GiftItem[]);

      const { data: seatsData } = await supabase
        .from('mic_seats').select('*').eq('room_id', currentRoom.id)
        .order('seat_number');
      if (seatsData) setMicSeats(seatsData as MicSeatType[]);
      if (user) {
        // Fetch ALL moderators for this room (with names and colors)
        const { data: allMods } = await supabase
          .from('room_moderators')
          .select('*')
          .eq('room_id', currentRoom.id);
        
        if (allMods) {
          setRoomModeratorIds(allMods.map((m: any) => m.user_id));
          setRoomModerators(allMods as any[]);

          // Set current user's room permissions if they are a mod
          const myMod = allMods.find((m: any) => m.user_id === user.id);
          if (myMod) {
            setIsRoomMod(true);
            setRoomPermissions(myMod.permissions || {
              can_kick: true, can_ban_device: true, can_suspend: true,
              can_announce: true, can_clear_chat: true, can_give_mic: true, can_view_reports: true
            });
          } else {
            setIsRoomMod(false);
            setRoomPermissions(null);
          }
        }
      }
    };
    if (user && currentRoom) {
      connectAudio(currentRoom.id);
    }

    fetchData();

    // Voice Visualizer Logic: Update levels every 100ms
    const levelInterval = setInterval(() => {
      if (audioRoom) {
        audioRoom.remoteParticipants.forEach((p: any) => {
          setAudioLevel(p.identity, p.audioLevel);
        });
        if (audioRoom.localParticipant) {
          setAudioLevel(audioRoom.localParticipant.identity, audioRoom.localParticipant.audioLevel);
        }
      }
    }, 100);

    const micSub = supabase.channel(`mic_seats_${currentRoom.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'mic_seats',
        filter: `room_id=eq.${currentRoom.id}`
      }, (payload) => {
        setMicSeats(prev => {
          const idx = prev.findIndex(s => s.seat_number === (payload.new as any).seat_number);
          const updated = [...prev];
          if (idx !== -1) updated[idx] = payload.new as MicSeatType;
          else updated.push(payload.new as MicSeatType);
          return updated.sort((a, b) => a.seat_number - b.seat_number);
        });
      }).subscribe();

    const roomSub = supabase.channel(`room_settings_${currentRoom.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'rooms',
        filter: `id=eq.${currentRoom.id}`
      }, (payload) => {
        const updatedRoom = payload.new as any;
        setCurrentRoom(useChatStore.getState().currentRoom ? { ...useChatStore.getState().currentRoom!, settings: updatedRoom.settings } : null);
      }).subscribe();

    // Removed local CustomEvent listener in favor of store state
    
    return () => { 
      micSub.unsubscribe(); 
      roomSub.unsubscribe(); 
      disconnectAudio();
      clearInterval(levelInterval);
    };
  }, [currentRoom, user, setCurrentRoom]);

  // --- Auto scroll ---
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Audio Notifications
  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.userId !== user?.id) {
        if (lastMsg.type === 'gift_announce') playSound('gift');
        else if (lastMsg.type === 'message') playSound('message');
      }
    }
  }, [messages.length, user?.id, playSound]);

  useEffect(() => {
    if (activeGiftEffect) {
      playSound('gift');
    }
  }, [activeGiftEffect, playSound]);

  // --- Handlers ---
  const canWrite = () => {
    if (!currentRoom || !user) return false;
    const rule = currentRoom.settings?.who_can_write || 'all';
    if (rule === 'nobody') return false;
    if (rule === 'admins') return canManageRoom; 
    return true; // 'all' or 'members'
  };

  const handleSendMessage = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user || !currentRoom) return;
    if (!canWrite()) {
      alert('تم إيقاف الكتابة أو مقتصرة على المشرفين فقط.');
      return;
    }
    sendMessage({
      roomId: currentRoom.id,
      userId: user.id,
      username: user.username,
      displayName: user.display_name,
      text: inputText.trim(),
      role: user.role || 'member',
      roleColor: '#888888',
      type: 'message',
    });
    setInputText('');
    setShowEmoji(false);
    inputRef.current?.focus();
  }, [inputText, user, currentRoom, sendMessage]);

  const handleEmojiSelect = (emoji: string) => {
    setInputText(prev => prev + emoji);
    inputRef.current?.focus();
  };



  const handleUserClick = (e: React.MouseEvent, u: OnlineUser) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, userId: u.id });
  };

  const handleMicSeatClick = async (seatNumber: number) => {
    if (!user || !currentRoom) return;
    
    const seat = micSeats.find(s => s.seat_number === seatNumber);
    const myCurrentSeat = micSeats.find(s => s.user_id === user.id);

    // 0. Prevent taking multiple seats
    if (myCurrentSeat && myCurrentSeat.seat_number !== seatNumber && !seat?.user_id) {
       alert('أنت تمتلك مقعد مايك بالفعل. يرجى ترك مقعدك الحالي أولاً إذا أردت الانتقال لمقعد آخر.');
       return;
    }

    // 1. If seat is occupied
    if (seat?.user_id) {
      // If I am an admin/owner, I can kick
      if (canManageRoom && seat.user_id !== user.id) {
        if (confirm(`هل تريد إنزال ${onlineUsers.find(u => u.id === seat.user_id)?.displayName || 'هذا المستخدم'} من المايك؟`)) {
          await supabase.from('mic_seats').delete().eq('room_id', currentRoom.id).eq('seat_number', seatNumber);
          useChatStore.getState().channel?.send({
            type: 'broadcast',
            event: 'kick-mic',
            payload: { targetId: seat.user_id }
          });
        }
      }
      return;
    }

    // 2. If seat is available
    if (myCurrentSeat) {
      // Already on another seat? Move to this one
      await supabase.from('mic_seats').delete().eq('room_id', currentRoom.id).eq('user_id', user.id);
    }
    
    const { error } = await supabase.from('mic_seats').insert({
      room_id: currentRoom.id,
      user_id: user.id,
      seat_number: seatNumber,
      is_muted: false
    });

    if (error) {
      if (error.code === '23505') alert('هذا المقعد تم حجزه للتو');
      else alert('فشل حجز المايك: ' + error.message);
    } else {
      // Start publishing audio
      publishAudio(true);
    }
  };

  const handleLeaveMic = async () => {
    if (!user || !currentRoom) return;
    
    // Optimistic UI: Update local state immediately
    setMicSeats(prev => prev.map(s => s.user_id === user.id ? { ...s, user_id: null } : s));
    
    try {
      await supabase.from('mic_seats').delete().eq('room_id', currentRoom.id).eq('user_id', user.id);
      publishAudio(false);
    } catch (err) {
      console.error('Leave mic failed:', err);
    }
  };

  const handleLeaveRoom = async () => {
    if (user && currentRoom) {
      await supabase
        .from('room_visits')
        .update({ left_at: new Date().toISOString() })
        .eq('room_id', currentRoom.id)
        .eq('user_id', user.id)
        .is('left_at', null);
    }
    disconnectChat();
    setCurrentRoom(null);
  };

  if (!currentRoom) return null;

  return (
    <div className="fixed inset-0 bg-[#c0d5e8] flex flex-col font-sans overflow-hidden md:relative md:flex-1 md:h-auto md:rounded-3xl md:shadow-2xl md:border md:border-[#84a9d1]/20" dir="rtl">

      {/* ── Title Bar ── */}
      <div className="bg-gradient-to-b from-[#deedf7] to-[#b8d1e8] px-3 py-1.5 flex items-center justify-between border-b border-[#84a9d1] shadow-sm z-50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-orange-500 rounded flex items-center justify-center text-white font-black text-xs shadow">S</div>
          <span className="text-xs font-black text-[#1e3a5f] truncate max-w-[200px]">{currentRoom.name} — سمايل تو شات</span>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-[9px] font-bold text-green-700">{onlineUsers.length} متصل</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={toggleSound}
            className={cn(
              "p-1 rounded hover:bg-white/30 transition-all",
              isSoundEnabled ? "text-green-600" : "text-gray-500"
            )}
            title={isSoundEnabled ? "إيقاف الأصوات" : "تشغيل الأصوات"}
          >
            {isSoundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="md:hidden p-1 bg-white/30 rounded text-[#1e3a5f] hover:bg-white/50 transition-all"
          >
            <Users size={16} />
          </button>
          <div className="w-6 h-5 bg-white/50 border border-[#84a9d1] rounded-sm"></div>
          <button
            onClick={handleLeaveRoom}
            className="w-8 h-5 bg-red-500 hover:bg-red-600 border border-red-600 rounded-sm flex items-center justify-center text-white text-[10px] font-black transition-colors"
          >✕</button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Sidebar ── */}
        <div className={cn(
          "bg-[#eef4f9] border-l border-[#84a9d1] flex flex-col shrink-0 transition-all duration-300 z-[60]",
          "fixed inset-y-0 right-0 w-64 shadow-2xl md:relative md:inset-0 md:w-56 md:shadow-none",
          isSidebarOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"
        )}>

          {/* Sidebar header */}
          <div className="bg-[#b8d1e8] px-3 py-2 border-b border-[#84a9d1] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Users size={13} className="text-[#1e3a5f]" />
              <span className="text-[10px] font-black text-[#1e3a5f]">المتواجدون ({onlineUsers.length})</span>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-[#1e3a5f] p-1">
              <X size={14} />
            </button>
          </div>

          {/* User list */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {onlineUsers.map((u) => {
              const isThisRoomOwner = u.id === currentRoom.owner_id;
              const isSelf = u.id === user?.id;

              return (
                <div
                  key={u.id}
                  onClick={(e) => handleUserClick(e, u)}
                  title={isSelf ? 'ملفي الشخصي' : `إرسال هدية لـ ${u.displayName}`}
                  className="flex items-center gap-2 px-2 py-1.5 hover:bg-[#b8d1e8]/50 cursor-pointer border-b border-[#84a9d1]/10 transition-colors group"
                >
                  {/* Avatar with Frame */}
                  <div className={cn("relative shrink-0 flex items-center justify-center p-1 rounded-lg", (u as any).equipped_frame)}>
                    <div className="w-9 h-9 rounded-lg border-2 border-white/50 bg-white shadow-sm flex items-center justify-center text-xl overflow-hidden relative z-10">
                      {(u as any).avatar_url?.startsWith('http') ? (
                        <img src={(u as any).avatar_url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        (u as any).avatar_url || '🧔'
                      )}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white z-20"></div>
                  </div>

                    {/* Name + role */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <span className={cn(
                          "text-[11px] font-black truncate group-hover:text-orange-600 transition-colors",
                          isThisRoomOwner ? 'text-orange-600' :
                          roomModeratorIds.includes(u.id) ? 'text-blue-700' : 'text-[#1e3a5f]'
                        )}>
                          {isSelf ? `${u.displayName} (أنت)` : u.displayName}
                        </span>
                        <span className="text-[8px] font-bold text-[#5a7a9a] shrink-0">#{u.shortId || '---'}</span>
                        {isThisRoomOwner && <Crown size={10} className="text-orange-500 fill-orange-500 shrink-0" title="صاحب الغرفة" />}
                        {micSeats.some(s => s.user_id === u.id) && (
                          <Mic2 size={10} className="text-orange-500 fill-orange-500 shrink-0 animate-pulse" title="متحدث على المايك" />
                        )}
                      </div>

                      <div className="flex items-center gap-1 flex-wrap overflow-hidden">
                        {(() => {
                          const roomMod = roomModerators.find(m => m.user_id === u.id);
                          if (roomMod) {
                            return (
                               <span 
                                 className="text-[7px] px-1 rounded-sm text-white font-black shrink-0 shadow-sm"
                                 style={{ backgroundColor: roomMod.role_color }}
                                 title={`رتبة الغرفة: ${roomMod.role_name}`}
                               >
                                 {roomMod.role_name}
                               </span>
                            );
                          }
                          return null;
                        })()}
                        {u.role && u.role !== 'member' && u.role !== 'guest' && (
                          <span className={cn(
                            "text-[7px] px-1 rounded-sm text-white font-black shrink-0",
                            u.role === 'owner' ? "bg-red-500" :
                            u.role === 'super_admin' ? "bg-purple-600" :
                            u.role === 'admin' ? "bg-blue-600" : "bg-gray-400"
                          )} title={`رتبة عالمية: ${u.role}`}>
                            {u.role}
                          </span>
                        )}
                        {!isThisRoomOwner && u.roomRankName && (
                          <span className="text-[7px] bg-blue-50 text-blue-600 px-1 rounded-sm border border-blue-100 font-black shrink-0" title="رتبة الغرفة">
                            {u.roomRankName}
                          </span>
                        )}
                        {/* Global Gift Rank */}
                        {(u.total_gifts_sent || u.total_gifts_received) ? (
                           <span 
                             className="text-[7px] px-1 rounded-sm text-white font-black shrink-0 shadow-sm"
                             style={{ backgroundColor: getGlobalRank(u.total_gifts_sent, u.total_gifts_received).color }}
                             title={`الرتبة الندية: ${getGlobalRank(u.total_gifts_sent, u.total_gifts_received).name}`}
                           >
                             {getGlobalRank(u.total_gifts_sent, u.total_gifts_received).name}
                           </span>
                        ) : null}
                      </div>
                    </div>

                  {/* Gift hint on hover (not self) */}
                  {!isSelf && (
                    <GiftIcon size={11} className="text-orange-400 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Controls */}
          <div className="p-2 bg-[#deedf7] border-t border-[#84a9d1] space-y-1.5 shrink-0">
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => setShowProfile({ userId: user?.id || '', displayName: user?.display_name || '' })}
                className="bg-white border border-[#84a9d1] py-1.5 rounded text-[9px] font-black text-[#1e3a5f] hover:bg-[#b8d1e8] transition-all flex items-center justify-center gap-1"
              >
                <UserIcon size={11} /> ملفي
              </button>
              {canManageRoom && (
                <button
                  onClick={() => setIsRoomManagementOpen(true)}
                  className="bg-white border border-[#84a9d1] py-1.5 rounded text-[9px] font-black text-[#1e3a5f] hover:bg-[#b8d1e8] transition-all flex items-center justify-center gap-1"
                >
                  <Shield size={11} /> إدارة
                </button>
              )}
              {isRoomOwner && (
                <button
                  onClick={() => setIsOwnerPanelOpen(true)}
                  className="col-span-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-2 rounded text-[10px] font-black hover:scale-[1.02] transition-all flex items-center justify-center gap-2 shadow-md shadow-orange-500/20"
                >
                  <Crown size={12} className="fill-white" /> لوحة المالك
                </button>
              )}
            </div>
            <button 
              onClick={micSeats.some(s => s.user_id === user?.id) ? handleLeaveMic : () => handleMicSeatClick(micSeats.find(s => !s.user_id)?.seat_number || 1)}
              className={cn(
                "w-full py-1.5 rounded text-[9px] font-black flex items-center justify-center gap-1 transition-all shadow-sm",
                micSeats.some(s => s.user_id === user?.id) 
                  ? "bg-red-500 text-white hover:bg-red-600" 
                  : "bg-[#1e3a5f] text-white hover:bg-[#2a4e7c]"
              )}
            >
              <Mic size={11} /> 
              {micSeats.some(s => s.user_id === user?.id) ? "اترك المايك" : "طلب الكلام"}
            </button>
            <button
              onClick={() => setIsLocalMuted(!isLocalMuted)}
              className={cn(
                "w-full py-1.5 rounded text-[9px] font-black transition-all flex items-center justify-center gap-1 border",
                isLocalMuted
                  ? "bg-red-50 text-red-600 border-red-300"
                  : "bg-white text-[#1e3a5f] border-[#84a9d1]"
              )}
            >
              {isLocalMuted ? <VolumeX size={11} /> : <Volume2 size={11} />}
              {isLocalMuted ? 'مكتوم' : 'استماع'}
            </button>
          </div>
        </div>

        {/* ── Main Area ── */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden">

          {/* Mic seats bar */}
          <div className="bg-[#eef4f9] border-b border-[#84a9d1] px-3 py-2 flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1.5 shrink-0">
              <Mic size={13} className="text-orange-500" />
              <span className="text-[10px] font-black text-[#1e3a5f]">المايكات</span>
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar flex-1 py-1">
              {Array.from({ length: currentRoom.max_mic_seats || 5 }, (_, i) => {
                const seat = micSeats.find(s => s.seat_number === i + 1);
                const seatUser = seat?.user_id ? onlineUsers.find(u => u.id === seat.user_id) : null;
                const equippedFrame = (seatUser as any)?.equipped_frame;
                
                return (
                  <div
                    key={i}
                    onClick={() => handleMicSeatClick(i + 1)}
                    title={seatUser ? seatUser.displayName : `مقعد ${i + 1} - متاح`}
                    className={cn(
                      "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border cursor-pointer transition-all hover:scale-110 relative",
                      seat?.user_id
                        ? "bg-white border-white shadow-md"
                        : "bg-white/40 border-dashed border-[#84a9d1] text-[#84a9d1] hover:bg-white hover:border-orange-400"
                    )}
                  >
                    {seat?.user_id ? (
                      <div className={cn("relative flex items-center justify-center p-0.5 rounded-lg w-full h-full", equippedFrame)}>
                        <div className="w-full h-full rounded-lg bg-slate-100 flex items-center justify-center text-2xl overflow-hidden relative z-10">
                          {(seatUser as any)?.avatar_url?.startsWith('http') ? (
                            <img src={(seatUser as any).avatar_url} className="w-full h-full object-cover" alt="" />
                          ) : (
                            (seatUser as any)?.avatar_url || '🧔'
                          )}
                          
                          {/* LiveKit Voice Visualizer (Real-time) */}
                          {seatUser && (
                            <div className="absolute inset-0 bg-orange-500/10 flex items-end justify-center gap-0.5 pb-1 z-20 pointer-events-none">
                              {(() => {
                                const level = audioLevels[seatUser.id] || 0;
                                const boosted = Math.min(level * 50, 40); // Boost for visibility
                                return [1, 2, 3, 2, 1].map((h, j) => (
                                  <motion.div
                                    key={j}
                                    animate={{ height: Math.max(4, boosted * (h / 3) + (Math.random() * 2)) }}
                                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                    className="w-1 bg-orange-500 rounded-full"
                                  />
                                ));
                              })()}
                            </div>
                          )}
                        </div>
                        {seat.is_muted && (
                          <div className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 border border-white z-20">
                            <VolumeX size={8} />
                          </div>
                        )}
                      </div>
                    ) : (
                      <Mic size={16} className="opacity-40" />
                    )}
                    <span className="absolute -bottom-1 -left-1 bg-[#1e3a5f] text-white text-[7px] px-1.5 rounded-full border border-white font-black shadow-sm z-30">
                      {i + 1}
                    </span>
                  </div>
                );
              })}
            </div>
            <span className="text-[9px] text-[#84a9d1] font-bold shrink-0">
              {(currentRoom.max_mic_seats || 5) - micSeats.filter(s => s.user_id).length} متاح
            </span>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 bg-[#f9fbfd]">
            <AnimatePresence initial={false}>
              {messages.filter(m => !ignoredUserIds.includes(m.userId)).map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn("flex", msg.userId === 'system' ? "justify-center" : "justify-start")}
                >
                  {msg.userId === 'system' ? (
                    <div className={cn(
                      "px-4 py-2 rounded-2xl text-[10px] font-bold border max-w-sm text-center shadow-sm",
                      msg.type === 'gift_announce'
                        ? "bg-orange-50 border-orange-200"
                        : msg.type === 'mod_action'
                          ? "bg-red-50 border-red-200 text-red-700"
                          : "bg-[#f0f4f8] border-[#b8d1e8] text-[#84a9d1] italic"
                    )} style={msg.type === 'gift_announce' ? {
                       fontSize: msg.style?.fontSize || '16px',
                       fontWeight: '900',
                       color: msg.style?.color || '#f97316',
                       borderWidth: '2px'
                    } : {}}>
                      {msg.text}
                    </div>
                  ) : (
                    <div className="flex gap-2 max-w-[85%]">
                      {/* Avatar with Independent Frame Layer */}
                      {(() => {
                         const msgUser = onlineUsers.find(u => u.id === msg.userId) || (msg.userId === user?.id ? user : null) as any;
                         const frameItem = DEFAULT_SHOP_ITEMS.find(s => s.id === msgUser?.equipped_frame) 
                                        || DEFAULT_SHOP_ITEMS.find(s => s.category === 'frame' && s.preview_css === (msgUser as any)?.equipped_frame); // Fallback to CSS name match
                         const frameClass = frameItem?.preview_css;
                         
                         return (
                           <div className="relative shrink-0 self-end w-10 h-10">
                             {/* Base Avatar */}
                             <div className="w-full h-full rounded-xl bg-white overflow-hidden border-2 border-slate-200 flex items-center justify-center text-3xl">
                               {(msgUser as any)?.avatar_url?.startsWith('http') ? (
                                 <img src={(msgUser as any).avatar_url} className="w-full h-full object-cover" alt="" />
                               ) : (
                                 (msgUser as any)?.avatar_url || '🧔'
                               )}
                             </div>
                             
                             {/* Independent Frame Overlay (No Overflow Hidden) */}
                             {frameClass && (
                               <div className={cn("absolute inset-0 rounded-xl pointer-events-none z-10", frameClass)}></div>
                             )}

                             {/* Badge Overlay (Bottom Corner) */}
                             {(() => {
                               const badgeItem = DEFAULT_SHOP_ITEMS.find(s => s.id === msgUser?.equipped_badge)
                                              || DEFAULT_SHOP_ITEMS.find(s => s.category === 'badge' && s.preview_css === (msgUser as any)?.equipped_badge);
                               return badgeItem ? (
                                 <div className="absolute -bottom-1 -right-1 z-20 flex items-center justify-center">
                                   <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-full p-0.5 shadow-lg border border-white animate-pulse">
                                     <span className="text-[10px]">{badgeItem.image_url}</span>
                                   </div>
                                 </div>
                               ) : null;
                             })()}
                           </div>
                         );
                      })()}
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          {(() => {
                            const roomMod = roomModerators.find(m => m.user_id === msg.userId);
                            if (roomMod) {
                              return (
                                <span className="text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm" style={{ backgroundColor: roomMod.role_color, color: '#fff' }}>
                                  {roomMod.role_name}
                                </span>
                              );
                            }
                            return (
                              <span className={cn(
                                "text-[8px] font-black px-1.5 py-0.5 rounded",
                                ROLE_COLORS[msg.role] || 'bg-gray-400 text-white'
                              )}>
                                {ROLE_LABELS[msg.role] || msg.role}
                              </span>
                            );
                          })()}
                          <span className="text-[11px] font-black whitespace-nowrap" style={{ color: msg.roleColor }}>
                            {msg.displayName} {msg.shortId ? `(${msg.shortId})` : ''}
                          </span>
                          <span className="text-[9px] text-[#84a9d1]">
                            {new Date(msg.timestamp).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className={cn(
                          "px-3 py-1.5 rounded-2xl border max-w-full break-words text-sm shadow-sm relative group",
                          msg.userId === user?.id ? "bg-[#deedf7] border-[#84a9d1] rounded-tr-none" : "bg-white border-gray-100 rounded-tl-none shadow-sm"
                        )} style={{ 
                           color: msg.style?.color || (msg.userId === user?.id ? '#1e3a5f' : '#333'),
                           fontFamily: msg.style?.fontFamily || 'inherit',
                           fontWeight: msg.style?.fontWeight || 'bold',
                           fontSize: msg.style?.fontSize || 'inherit'
                        }}>
                          {msg.text}

                          {/* Float emoji picker on hover */}
                          {msg.type === 'message' && (
                            <div className="absolute -top-10 right-0 hidden group-hover:flex items-center gap-1 bg-white border border-[#84a9d1] p-1 rounded-full shadow-xl z-[60]">
                              {['❤️', '😂', '🔥', '👍', '😮'].map(emoji => (
                                <button
                                  key={emoji}
                                  onClick={() => addReaction(msg.id, emoji)}
                                  className="p-1 hover:scale-125 transition-transform text-xs"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Reactions Bar */}
                        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                          <div className="mt-1 flex flex-wrap items-center gap-1 px-1">
                            {Object.entries(msg.reactions).map(([emoji, users]) => (
                              <button
                                key={emoji}
                                onClick={() => addReaction(msg.id, emoji)}
                                className={cn(
                                  "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-black transition-all",
                                  users.includes(user?.id || '') ? "bg-orange-100 text-orange-600 border border-orange-200" : "bg-white/50 text-gray-500 border border-gray-100 hover:bg-white"
                                )}
                              >
                                <span>{emoji}</span>
                                <span>{users.length}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Flying gift animation */}
          <AnimatePresence>
            {flyingGift && (
              <motion.div
                key={flyingGift.key}
                initial={{ opacity: 1, scale: 1, y: 0 }}
                animate={{ opacity: 0, scale: 3, y: -200 }}
                className="fixed bottom-24 left-1/2 -translate-x-1/2 text-5xl pointer-events-none z-[300]"
              >
                {flyingGift.emoji}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Inline Gift Tray Removed */}


          {/* Emoji picker */}
          <AnimatePresence>
            {showEmoji && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-[#84a9d1] bg-white overflow-hidden shrink-0"
              >
                <div className="p-2 grid grid-cols-10 gap-1 max-h-28 overflow-y-auto custom-scrollbar">
                  {EMOJI_LIST.map((emoji, i) => (
                    <button
                      key={i}
                      onClick={() => handleEmojiSelect(emoji)}
                      className="text-xl hover:bg-[#eef4f9] rounded p-1 transition-colors leading-none"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Toolbar + Input ── */}
          <div className="border-t border-[#84a9d1] bg-[#eef4f9] p-2 space-y-2 shrink-0">
            {/* Toolbar: emoji + gifts ONLY */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setShowEmoji(e => !e); }}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-lg border text-[10px] font-black transition-all",
                  showEmoji
                    ? "bg-orange-500 text-white border-orange-600"
                    : "bg-white text-[#1e3a5f] border-[#84a9d1] hover:bg-[#deedf7]"
                )}
              >
                <Smile size={13} /> إيموشن
              </button>

              <button
                onClick={() => setShowStylePicker(!showStylePicker)}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-lg border text-[10px] font-black transition-all",
                  showStylePicker
                    ? "bg-brand-blue text-white border-brand-blue"
                    : "bg-white text-[#1e3a5f] border-[#84a9d1] hover:bg-[#deedf7]"
                )}
              >
                🎨 تخصيص الخط
              </button>

              <button
                onClick={() => { setShowGiftTo({ userId: '', displayName: '' }); setShowEmoji(false); }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-[10px] font-black transition-all bg-white text-[#1e3a5f] border-[#84a9d1] hover:bg-[#deedf7]"
              >
                <GiftIcon size={13} />
                هدايا
                {gifts.length > 0 && (
                  <span className="bg-orange-100 text-orange-600 px-1 rounded text-[8px]">{gifts.length}</span>
                )}
              </button>
              {/* Points display */}
              <div className="mr-auto flex items-center gap-1 text-[9px] text-[#84a9d1] font-bold bg-white px-2 py-1 rounded-lg border border-[#84a9d1]/20">
                <Star size={10} className="text-orange-500" />
                {user?.points || 0} نقطة
              </div>
            </div>

            {/* Style Picker */}
            <AnimatePresence>
              {showStylePicker && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-white border border-[#84a9d1] rounded-xl p-3 space-y-3 shadow-inner"
                >
                  <div className="flex flex-wrap gap-2">
                    <p className="w-full text-[9px] font-black text-[#84a9d1]">لون الخط:</p>
                    {['#1e3a5f', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#000000'].map(c => (
                      <button
                        key={c}
                        onClick={() => useChatStore.getState().setFontStyling(c, useChatStore.getState().fontFamily)}
                        className={cn("w-6 h-6 rounded-full border-2", useChatStore.getState().fontColor === c ? "border-brand-blue scale-110" : "border-transparent")}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <p className="w-full text-[9px] font-black text-[#84a9d1]">نوع الخط:</p>
                    {['font-sans', 'font-serif', 'font-mono'].map(f => (
                      <button
                        key={f}
                        onClick={() => useChatStore.getState().setFontStyling(useChatStore.getState().fontColor, f)}
                        className={cn("px-2 py-1 rounded text-[10px] border", useChatStore.getState().fontFamily === f ? "bg-brand-blue text-white" : "bg-gray-100")}
                      >
                        {f.split('-')[1]}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Message input */}
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={!canWrite() || isMutedByAdmin}
                placeholder={isMutedByAdmin ? 'تم كتمك من قبل المشرف' : !canWrite() ? 'الكتابة مغلقة من قبل الإدارة' : `اكتب رسالتك... (${user?.display_name || ''})`}
                className="flex-1 bg-white border border-[#84a9d1] rounded-lg px-3 py-2 text-sm font-bold text-[#1e3a5f] focus:outline-none focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/10 transition-all placeholder:text-[#84a9d1]/70 disabled:bg-gray-100 disabled:text-gray-400"
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || !canWrite() || isMutedByAdmin}
                className="bg-[#1e3a5f] hover:bg-[#2a4e7c] disabled:opacity-40 px-5 py-2 rounded-lg text-sm font-black text-white transition-all flex items-center gap-2 shadow-md active:scale-95"
              >
                <Send size={16} /> إرسال
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ── Modals & Panels ── */}
      <Gateway />
      {isRoomManagementOpen && (
        <RoomManagementModal isOpen={isRoomManagementOpen} onClose={() => setIsRoomManagementOpen(false)} />
      )}
      
      {isOwnerPanelOpen && isRoomOwner && (
        <RoomControlPanel onClose={() => setIsOwnerPanelOpen(false)} />
      )}

      {showProfile && (
        <ProfileModal
          userId={showProfile.userId}
          onClose={() => setShowProfile(null)}
        />
      )}

      {showGiftTo && (
        <SendGiftModal
          initialTargetUserId={showGiftTo.userId}
          initialTargetDisplayName={showGiftTo.displayName}
          onClose={() => setShowGiftTo(null)}
        />
      )}

      {contextMenu && (
        <UserContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          userId={contextMenu.userId}
          onClose={() => setContextMenu(null)}
          onShowGift={(uid, name) => setShowGiftTo({ userId: uid, displayName: name })}
          onShowProfile={(uid, name) => setShowProfile({ userId: uid, displayName: name })}
          onShowPrivate={(uid) => openPrivateChat(uid)}
        />
      )}

      <PrivateChatManager />

      {showAdminDashboard && isGlobalAdmin && (
        <AdminDashboard onClose={() => setShowAdminDashboard(false)} />
      )}

      {/* ── Global Effects ── */}
      <AnimatePresence>
        {activeGiftEffect && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[400] pointer-events-none flex items-center justify-center overflow-hidden"
          >
             {/* Fullscreen Overlay */}
             {activeGiftEffect.type === 'fullscreen' && (
               <motion.div 
                 initial={{ scale: 0.5 }}
                 animate={{ scale: [1, 1.2, 1] }}
                 transition={{ repeat: Infinity, duration: 2 }}
                 className="absolute inset-0 bg-orange-500/10 flex items-center justify-center"
               >
                 <span className="text-[200px] blur-[2px] opacity-40">{activeGiftEffect.emoji}</span>
               </motion.div>
             )}

             {/* Corner / Notification */}
             <motion.div 
               initial={{ x: 300, opacity: 0 }}
               animate={{ x: 0, opacity: 1 }}
               className="absolute top-20 right-10 bg-white/90 border-2 border-orange-500 rounded-3xl p-6 shadow-2xl flex items-center gap-6"
             >
                <div className="text-6xl animate-bounce">{activeGiftEffect.emoji}</div>
                <div>
                  <p className="text-xl font-black text-brand-blue">{activeGiftEffect.sender} أرسل هدية مميزة!</p>
                  <p className="text-3xl font-black text-orange-600 animate-pulse">{activeGiftEffect.emoji}</p>
                </div>
             </motion.div>

             {/* Rain Effect stub */}
             {activeGiftEffect.type === 'rain' && (
                <div className="absolute inset-0">
                  {[...Array(20)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ y: -100, x: Math.random() * window.innerWidth }}
                      animate={{ y: window.innerHeight + 100 }}
                      transition={{ duration: 3, delay: i * 0.2, repeat: Infinity }}
                      className="absolute text-4xl"
                    >
                      {activeGiftEffect.emoji}
                    </motion.div>
                  ))}
                </div>
             )}
          </motion.div>
        )}

        {/* ── MASSIVE ENTRY EFFECTS ── */}
        {activeEntryEffect && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] pointer-events-none flex items-center justify-center overflow-hidden bg-black/10 backdrop-blur-[2px]"
          >
            {/* Plane Animation */}
            {activeEntryEffect.type === 'entry-plane' && (
              <motion.div
                initial={{ x: '100vw', y: '20vh', scale: 0.5, rotate: -10 }}
                animate={{ x: '-100vw', y: '10vh', scale: 2, rotate: -5 }}
                transition={{ duration: 4, ease: "easeInOut" }}
                className="text-[150px] filter drop-shadow-2xl"
              >
                ✈️
              </motion.div>
            )}

            {/* Tank Animation */}
            {activeEntryEffect.type === 'entry-tank' && (
              <motion.div
                initial={{ x: '-50vw', scale: 1 }}
                animate={{ x: '50vw', scale: 1.5 }}
                transition={{ duration: 5, ease: "linear" }}
                className="absolute bottom-10 text-[120px] filter drop-shadow-2xl"
              >
                🛡️
              </motion.div>
            )}

            {/* Bird Animation */}
            {activeEntryEffect.type === 'entry-bird' && (
              <div className="absolute inset-0">
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ x: '-20vw', y: 100 + (i * 100) }}
                    animate={{ x: '120vw', y: 50 + (i * 80) }}
                    transition={{ duration: 3 + i, repeat: 0 }}
                    className="absolute text-6xl"
                  >
                    🦅
                  </motion.div>
                ))}
              </div>
            )}

            {/* Lion Animation */}
            {activeEntryEffect.type === 'entry-lion' && (
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: [1, 1.2, 1], rotate: 0 }}
                transition={{ duration: 2 }}
                className="text-[250px] flex flex-col items-center"
              >
                🦁
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 }}
                  className="bg-orange-600 text-white px-8 py-4 rounded-full text-4xl font-black shadow-2xl border-4 border-white"
                >
                  زئير الأسد وصل!
                </motion.div>
              </motion.div>
            )}

            {/* Bear Animation */}
            {activeEntryEffect.type === 'entry-bear' && (
              <motion.div
                initial={{ y: '100vh' }}
                animate={{ y: 0 }}
                transition={{ type: "spring", damping: 10 }}
                className="text-[200px]"
              >
                🐻
              </motion.div>
            )}

            {/* Default / Royal / Fire / Heart */}
            {(activeEntryEffect.type === 'entry-royal' || activeEntryEffect.type === 'entry-fire' || activeEntryEffect.type === 'entry-heart') && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center"
              >
                <div className="text-[180px] animate-bounce">{activeEntryEffect.emoji}</div>
                <motion.div 
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 'auto', opacity: 1 }}
                  className="bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 p-1 rounded-2xl shadow-2xl"
                >
                  <div className="bg-white px-10 py-4 rounded-xl text-center">
                    <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 to-red-600">
                      وصل العظيم: {activeEntryEffect.sender}
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
