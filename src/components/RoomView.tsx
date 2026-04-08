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
    <div className="fixed inset-0 flex flex-col font-sans overflow-hidden md:relative md:flex-1 md:h-auto md:rounded-3xl md:shadow-2xl" dir="rtl" style={{ background: '#0d0d1a' }}>

      {/* ── Title Bar ── */}
      <div className="px-4 py-2.5 flex items-center justify-between z-50 shrink-0" style={{ background: '#13131f', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-lg" style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)', boxShadow: '0 0 15px rgba(124,58,237,0.4)' }}>
            {currentRoom.name.charAt(0)}
          </div>
          <div>
            <span className="text-sm font-black truncate max-w-[180px] block" style={{ color: '#f1f5f9' }}>{currentRoom.name}</span>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
              <span className="text-[10px] font-bold" style={{ color: '#10b981' }}>{onlineUsers.length} متصل الآن</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSound}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
            style={{ background: isSoundEnabled ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)', color: isSoundEnabled ? '#10b981' : '#4b5563' }}
            title={isSoundEnabled ? 'إيقاف الأصوات' : 'تشغيل الأصوات'}
          >
            {isSoundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="md:hidden w-8 h-8 rounded-xl flex items-center justify-center transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}
          >
            <Users size={15} />
          </button>
          <button
            onClick={handleLeaveRoom}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs transition-all"
            style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}
          >
            <X size={12} /> خروج
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Sidebar ── */}
        <div className={cn(
          "flex flex-col shrink-0 transition-all duration-300 z-[60]",
          "fixed inset-y-0 right-0 w-64 shadow-2xl md:relative md:inset-0 md:w-56 md:shadow-none",
          isSidebarOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"
        )} style={{ background: '#0f0f1b', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>

          {/* Sidebar header */}
          <div className="px-3 py-2.5 flex items-center justify-between shrink-0" style={{ background: '#13131f', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2">
              <Users size={13} style={{ color: '#7c3aed' }} />
              <span className="text-[11px] font-black" style={{ color: '#94a3b8' }}>المتواجدون ({onlineUsers.length})</span>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-1" style={{ color: '#64748b' }}>
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
                  className="flex items-center gap-2 px-2.5 py-2 cursor-pointer transition-all group"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(124,58,237,0.06)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Avatar with Frame */}
                  <div className={cn("relative shrink-0 flex items-center justify-center p-1 rounded-full", !(u as any).equipped_frame?.startsWith('http') && (u as any).equipped_frame)}>
                    <div className="w-10 h-10 rounded-full border-2 border-white/50 bg-white shadow-sm flex items-center justify-center text-xl overflow-hidden relative z-10">
                      {(u as any).avatar_url?.startsWith('http') ? (
                        <img src={(u as any).avatar_url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        (u as any).avatar_url || '🧔'
                      )}
                    </div>
                    {/* Image-based Frame Overlay */}
                    {(u as any).equipped_frame?.startsWith('http') && (
                      <img src={(u as any).equipped_frame} className="frame-image-overlay" alt="" />
                    )}
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white z-20"></div>
                  </div>

                    {/* Name + role */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                      <div className="flex items-center gap-1 overflow-hidden">
                        <span className="text-[11px] font-black truncate transition-colors flex items-center gap-1"
                          style={{ color: isThisRoomOwner ? '#f59e0b' : roomModeratorIds.includes(u.id) ? '#60a5fa' : '#e2e8f0' }}>
                          {isSelf ? `${u.displayName} (أنت)` : u.displayName}
                          {(() => {
                            const badgeItem = DEFAULT_SHOP_ITEMS.find(s => s.id === (u as any).equipped_badge)
                                           || DEFAULT_SHOP_ITEMS.find(s => s.category === 'badge' && s.preview_css === (u as any).equipped_badge);
                            return badgeItem ? <span className="name-badge">{badgeItem.image_url}</span> : null;
                          })()}
                        </span>
                        <span className="text-[8px] font-bold shrink-0" style={{ color: '#374151' }}>#{u.shortId || '---'}</span>
                        {isThisRoomOwner && <Crown size={9} className="shrink-0" style={{ color: '#f59e0b' }} title="صاحب الغرفة" />}
                        {micSeats.some(s => s.user_id === u.id) && (
                          <Mic2 size={9} className="shrink-0 animate-pulse" style={{ color: '#10b981' }} title="متحدث على المايك" />
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
          <div className="p-3 space-y-2 shrink-0" style={{ background: '#13131f', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setShowProfile({ userId: user?.id || '', displayName: user?.display_name || '' })}
                className="py-2 rounded-xl text-[10px] font-black flex items-center justify-center gap-1.5 transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <UserIcon size={11} /> ملفي
              </button>
              {canManageRoom && (
                <button
                  onClick={() => setIsRoomManagementOpen(true)}
                  className="py-2 rounded-xl text-[10px] font-black flex items-center justify-center gap-1.5 transition-all"
                  style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }}
                >
                  <Shield size={11} /> إدارة
                </button>
              )}
              {isRoomOwner && (
                <button
                  onClick={() => setIsOwnerPanelOpen(true)}
                  className="col-span-2 py-2.5 rounded-xl text-[10px] font-black flex items-center justify-center gap-2 transition-all"
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', color: 'white', boxShadow: '0 4px 15px rgba(245,158,11,0.3)' }}
                >
                  <Crown size={12} /> لوحة المالك
                </button>
              )}
            </div>
            <button
              onClick={micSeats.some(s => s.user_id === user?.id) ? handleLeaveMic : () => handleMicSeatClick(micSeats.find(s => !s.user_id)?.seat_number || 1)}
              className="w-full py-2 rounded-xl text-[10px] font-black flex items-center justify-center gap-1.5 transition-all"
              style={{
                background: micSeats.some(s => s.user_id === user?.id) ? 'rgba(239,68,68,0.15)' : 'linear-gradient(135deg, #7c3aed, #3b82f6)',
                color: micSeats.some(s => s.user_id === user?.id) ? '#f87171' : 'white',
                border: micSeats.some(s => s.user_id === user?.id) ? '1px solid rgba(239,68,68,0.3)' : 'none',
                boxShadow: micSeats.some(s => s.user_id === user?.id) ? 'none' : '0 4px 15px rgba(124,58,237,0.3)'
              }}
            >
              <Mic size={11} />
              {micSeats.some(s => s.user_id === user?.id) ? 'اترك المايك' : 'طلب الكلام'}
            </button>
            <button
              onClick={() => setIsLocalMuted(!isLocalMuted)}
              className="w-full py-2 rounded-xl text-[10px] font-black flex items-center justify-center gap-1.5 transition-all"
              style={{
                background: isLocalMuted ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.04)',
                color: isLocalMuted ? '#f87171' : '#64748b',
                border: isLocalMuted ? '1px solid rgba(239,68,68,0.25)' : '1px solid rgba(255,255,255,0.07)'
              }}
            >
              {isLocalMuted ? <VolumeX size={11} /> : <Volume2 size={11} />}
              {isLocalMuted ? 'مكتوم' : 'استماع'}
            </button>
          </div>
        </div>

        {/* ── Main Area ── */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#0d0d1a' }}>

          {/* Mic seats bar */}
          <div className="px-4 py-3 flex items-center gap-3 shrink-0" style={{ background: '#13131f', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-1.5 shrink-0">
              <Mic size={13} style={{ color: '#7c3aed' }} />
              <span className="text-[10px] font-black" style={{ color: '#64748b' }}>المايكات</span>
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
                    className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 cursor-pointer transition-all hover:scale-110 relative"
                    style={{
                      background: seat?.user_id ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.03)',
                      border: seat?.user_id ? '2px solid rgba(124,58,237,0.35)' : '2px dashed rgba(255,255,255,0.1)',
                      color: '#4b5563'
                    }}
                  >
                    {seat?.user_id ? (
                      <div className="relative flex items-center justify-center w-full h-full">
                        {/* Base Avatar Container */}
                        <div className="w-full h-full rounded-2xl flex items-center justify-center text-2xl overflow-hidden relative" style={{ background: 'rgba(255,255,255,0.05)' }}>
                          {(seatUser as any)?.avatar_url?.startsWith('http') || (seatUser as any)?.avatar_url?.startsWith('/') ? (
                            <img src={(seatUser as any).avatar_url} className="w-full h-full object-cover" alt="" />
                          ) : (
                            (seatUser as any)?.avatar_url || '🧔'
                          )}
                          
                          {/* LiveKit Voice Visualizer */}
                          {seatUser && (
                            <div className="absolute inset-0 flex items-end justify-center gap-0.5 pb-1 z-20 pointer-events-none" style={{ background: 'rgba(124,58,237,0.08)' }}>
                              {(() => {
                                const level = audioLevels[seatUser.id] || 0;
                                const boosted = Math.min(level * 50, 40);
                                return [1, 2, 3, 2, 1].map((h, j) => (
                                  <motion.div
                                    key={j}
                                    animate={{ height: Math.max(4, boosted * (h / 3) + (Math.random() * 2)) }}
                                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                    className="w-1 rounded-full"
                                    style={{ background: 'linear-gradient(to top, #7c3aed, #3b82f6)' }}
                                  />
                                ));
                              })()}
                            </div>
                          )}
                        </div>

                        {/* Ornamental Frame Overlay */}
                        {(() => {
                          const equippedFrame = (seatUser as any)?.equipped_frame;
                          if (!equippedFrame) return null;
                          
                          if (equippedFrame.startsWith('http')) {
                            return <img src={equippedFrame} className="frame-image-overlay" alt="" />;
                          }

                          const frameItem = DEFAULT_SHOP_ITEMS.find(s => s.id === equippedFrame)
                                         || DEFAULT_SHOP_ITEMS.find(s => s.category === 'frame' && s.preview_css === equippedFrame);
                          const frameClass = frameItem?.preview_css;
                          return frameClass ? <div className={cn("absolute inset-0 z-10", frameClass)}></div> : null;
                        })()}

                        {seat.is_muted && (
                          <div className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 border border-white z-20">
                            <VolumeX size={8} />
                          </div>
                        )}
                      </div>
                    ) : (
                      <Mic size={16} className="opacity-40" />
                    )}
                    <span className="absolute -bottom-1 -left-1 text-white text-[7px] px-1.5 py-0.5 rounded-full font-black z-30" style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}>
                      {i + 1}
                    </span>
                  </div>
                );
              })}
            </div>
            <span className="text-[9px] font-bold shrink-0" style={{ color: '#4b5563' }}>
              {(currentRoom.max_mic_seats || 5) - micSeats.filter(s => s.user_id).length} متاح
            </span>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2.5 chat-bg">
            <AnimatePresence initial={false}>
              {messages.filter(m => !ignoredUserIds.includes(m.userId)).map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn("flex", msg.userId === 'system' ? "justify-center" : "justify-start")}
                >
                  {msg.userId === 'system' ? (
                    <div className="px-4 py-2 rounded-2xl text-[10px] font-bold max-w-sm text-center"
                      style={msg.type === 'gift_announce' ? {
                        background: 'rgba(245,158,11,0.1)',
                        border: '1px solid rgba(245,158,11,0.25)',
                        color: '#f59e0b',
                        fontSize: msg.style?.fontSize || '14px',
                        fontWeight: '900'
                      } : msg.type === 'mod_action' ? {
                        background: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.25)',
                        color: '#f87171'
                      } : {
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        color: '#4b5563',
                        fontStyle: 'italic'
                      }}>
                      {msg.text}
                    </div>
                  ) : (
                    <div className="flex gap-2 max-w-[85%]">
                      {/* Avatar with Independent Frame Layer */}
                      {(() => {
                         const msgUser = onlineUsers.find(u => u.id === msg.userId) || (msg.userId === user?.id ? user : null) as any;
                         const equippedFrame = msgUser?.equipped_frame;
                         
                         return (
                           <div className="relative shrink-0 self-end w-10 h-10">
                             {/* Base Avatar */}
                             <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center text-xl" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                               {(msgUser as any)?.avatar_url?.startsWith('http') || (msgUser as any)?.avatar_url?.startsWith('/') ? (
                                 <img src={(msgUser as any).avatar_url} className="w-full h-full object-cover" alt="" />
                               ) : (
                                 (msgUser as any)?.avatar_url || '🧔'
                               )}
                             </div>
                             {/* Frame Overlay */}
                             {(() => {
                               if (!equippedFrame) return null;
                               
                               if (equippedFrame.startsWith('http')) {
                                 return <img src={equippedFrame} className="frame-image-overlay" alt="" />;
                               }
                               
                               const frameItem = DEFAULT_SHOP_ITEMS.find(s => s.id === equippedFrame)
                                              || DEFAULT_SHOP_ITEMS.find(s => s.category === 'frame' && s.preview_css === equippedFrame);
                               return frameItem?.preview_css ? (
                                 <div className={cn("absolute inset-0 z-10", frameItem.preview_css)}></div>
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
                          <span className="text-[11px] font-black whitespace-nowrap flex items-center gap-1" style={{ color: msg.roleColor }}>
                            {msg.displayName}
                            {(() => {
                              const msgUser = onlineUsers.find(u => u.id === msg.userId) || (msg.userId === user?.id ? user : null) as any;
                              const badgeItem = DEFAULT_SHOP_ITEMS.find(s => s.id === msgUser?.equipped_badge)
                                             || DEFAULT_SHOP_ITEMS.find(s => s.category === 'badge' && s.preview_css === (msgUser as any)?.equipped_badge);
                              return badgeItem ? <span className="name-badge">{badgeItem.image_url}</span> : null;
                            })()}
                            {msg.shortId ? `(${msg.shortId})` : ''}
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
                className="overflow-hidden shrink-0"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: '#13131f' }}
              >
                <div className="p-2 grid grid-cols-10 gap-1 max-h-28 overflow-y-auto custom-scrollbar">
                  {EMOJI_LIST.map((emoji, i) => (
                    <button
                      key={i}
                      onClick={() => handleEmojiSelect(emoji)}
                      className="text-xl rounded p-1 transition-all leading-none hover:scale-125"
                      style={{ background: 'transparent' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(124,58,237,0.1)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Toolbar + Input ── */}
          <div className="p-3 space-y-2.5 shrink-0" style={{ background: '#13131f', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {/* Toolbar */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setShowEmoji(e => !e); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black transition-all"
                style={{
                  background: showEmoji ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.05)',
                  color: showEmoji ? '#a78bfa' : '#64748b',
                  border: showEmoji ? '1px solid rgba(124,58,237,0.3)' : '1px solid rgba(255,255,255,0.08)'
                }}
              >
                <Smile size={13} /> إيموشن
              </button>

              <button
                onClick={() => setShowStylePicker(!showStylePicker)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black transition-all"
                style={{
                  background: showStylePicker ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.05)',
                  color: showStylePicker ? '#60a5fa' : '#64748b',
                  border: showStylePicker ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(255,255,255,0.08)'
                }}
              >
                🎨 تخصيص
              </button>

              <button
                onClick={() => { setShowGiftTo({ userId: '', displayName: '' }); setShowEmoji(false); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black transition-all"
                style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}
              >
                <GiftIcon size={13} />
                هدايا
                {gifts.length > 0 && (
                  <span className="px-1 rounded text-[8px] font-black" style={{ background: 'rgba(245,158,11,0.2)', color: '#f59e0b' }}>{gifts.length}</span>
                )}
              </button>
              <div className="mr-auto flex items-center gap-1 text-[9px] font-black px-2.5 py-1.5 rounded-xl" style={{ background: 'rgba(245,158,11,0.08)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.15)' }}>
                <Star size={10} />
                {user?.points?.toLocaleString() || 0}
              </div>
            </div>

            {/* Style Picker */}
            <AnimatePresence>
              {showStylePicker && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="rounded-xl p-3 space-y-3"
                  style={{ background: '#1a1a2e', border: '1px solid rgba(124,58,237,0.2)' }}
                >
                  <div className="flex flex-wrap gap-2">
                    <p className="w-full text-[9px] font-black" style={{ color: '#64748b' }}>لون الخط:</p>
                    {['#e2e8f0', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#60a5fa'].map(c => (
                      <button
                        key={c}
                        onClick={() => useChatStore.getState().setFontStyling(c, useChatStore.getState().fontFamily)}
                        className="w-6 h-6 rounded-full transition-all hover:scale-125"
                        style={{ backgroundColor: c, outline: useChatStore.getState().fontColor === c ? '2px solid white' : 'none', outlineOffset: '2px' }}
                      />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <p className="w-full text-[9px] font-black" style={{ color: '#64748b' }}>نوع الخط:</p>
                    {['font-sans', 'font-serif', 'font-mono'].map(f => (
                      <button
                        key={f}
                        onClick={() => useChatStore.getState().setFontStyling(useChatStore.getState().fontColor, f)}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-black transition-all"
                        style={{
                          background: useChatStore.getState().fontFamily === f ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.05)',
                          color: useChatStore.getState().fontFamily === f ? '#a78bfa' : '#64748b',
                          border: useChatStore.getState().fontFamily === f ? '1px solid rgba(124,58,237,0.4)' : '1px solid rgba(255,255,255,0.08)'
                        }}
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
                placeholder={isMutedByAdmin ? 'تم كتمك من قبل المشرف' : !canWrite() ? 'الكتابة مغلقة من قبل الإدارة' : `اكتب رسالتك...`}
                className="flex-1 text-sm font-bold focus:outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1.5px solid rgba(255,255,255,0.1)',
                  borderRadius: '0.875rem',
                  padding: '0.625rem 1rem',
                  color: '#f1f5f9',
                  fontFamily: 'Cairo, sans-serif'
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = '#7c3aed';
                  e.currentTarget.style.background = 'rgba(124,58,237,0.06)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.12)';
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                autoComplete="off"
              />
              <motion.button
                type="submit"
                disabled={!inputText.trim() || !canWrite() || isMutedByAdmin}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-5 py-2.5 rounded-xl text-sm font-black text-white flex items-center gap-2 transition-all"
                style={{
                  background: inputText.trim() ? 'linear-gradient(135deg, #7c3aed, #3b82f6)' : 'rgba(255,255,255,0.05)',
                  boxShadow: inputText.trim() ? '0 4px 15px rgba(124,58,237,0.35)' : 'none',
                  color: inputText.trim() ? 'white' : '#374151',
                  opacity: (!canWrite() || isMutedByAdmin) ? 0.5 : 1,
                  cursor: (!inputText.trim() || !canWrite() || isMutedByAdmin) ? 'not-allowed' : 'pointer'
                }}
              >
                <Send size={15} /> إرسال
              </motion.button>
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
