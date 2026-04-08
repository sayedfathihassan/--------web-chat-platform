import { create } from 'zustand';
import { User, Room, Message, MicSeat, RoomModerator, DEFAULT_SHOP_ITEMS, SiteSettings } from '../types';
import { supabase } from '../lib/supabase';
import { filterText, cn } from '../lib/utils';
import { Room as LKRoom, RoomEvent, createLocalAudioTrack } from 'livekit-client';

export interface OnlineUser {
  id: string;
  displayName: string;
  username: string;
  role: string;
  avatar_url?: string;
  shortId?: number;
  roomRankName?: string;
  total_gifts_sent?: number;
  total_gifts_received?: number;
  equipped_frame?: string;
  equipped_entry_effect?: string;
  equipped_badge?: string;
}

interface ChatState {
  user: User | null;
  currentRoom: Room | null;
  messages: Message[];
  onlineUsers: OnlineUser[];
  micSeats: MicSeat[];
  userStatus: 'available' | 'busy' | 'away' | 'call' | 'eating' | 'sleeping';
  isIgnorePrivate: boolean;
  channel: any | null;
  showAdminDashboard: boolean;
  fontColor: string;
  fontFamily: string;
  activeGiftEffect: { emoji: string; type: string; sender: string } | null;
  activeEntryEffect: { emoji: string; type: string; sender: string } | null;
  ignoredUserIds: string[];
  isMuted: boolean;
  privateMessages: Message[];
  activePrivateChatUserIds: string[];
  unreadPrivateChatUserIds: string[];
  roomPermissions: Record<string, boolean> | null;
  roomModeratorIds: string[];
  roomModerators: RoomModerator[];
  globalNoticeChannel: any | null;
  alreadyJoinedUserIds: Set<string>;
  siteSettings: SiteSettings | null;
  setSiteSettings: (settings: SiteSettings) => void;
  
  audioRoom: any | null;
  audioToken: string | null;
  isAudioConnected: boolean;
  audioLevels: Record<string, number>; // identity -> level (0-1)
  setAudioLevel: (identity: string, level: number) => void;

  setUser: (user: User | null) => void;
  setCurrentRoom: (room: Room | null) => void;
  addMessage: (message: Message) => void;
  setOnlineUsers: (users: OnlineUser[]) => void;
  setMicSeats: (seats: MicSeat[]) => void;
  setUserStatus: (status: 'available' | 'busy' | 'away' | 'call' | 'eating' | 'sleeping') => void;
  setIgnorePrivate: (ignore: boolean) => void;
  setFontStyling: (color: string, font: string) => void;
  setShowAdminDashboard: (show: boolean) => void;
  initGlobalNotice: () => void;
  connectChat: (roomId: string) => void;
  disconnectChat: () => void;
  sendMessage: (payload: any) => void;
  sendPrivateMessage: (targetId: string, text: string) => void;
  openPrivateChat: (userId: string) => void;
  closePrivateChat: (userId: string) => void;
  markPrivateChatAsRead: (userId: string) => void;
  toggleIgnore: (userId: string) => void;
  processAdminAction: (action: string, targetId: string) => void;
  logRoomAction: (roomId: string, action: 'join' | 'leave' | 'kick' | 'ban' | 'mute' | 'unmute', metadata?: any) => Promise<void>;
  setRoomPermissions: (perms: Record<string, boolean> | null) => void;
  setRoomModeratorIds: (ids: string[]) => void;
  setRoomModerators: (mods: RoomModerator[]) => void;
  addReaction: (messageId: string, emoji: string) => void;
  connectionState: string;
  updatePresence: () => Promise<void>;
  isSoundEnabled: boolean;
  toggleSound: () => void;
  
  connectAudio: (roomId: string) => Promise<void>;
  disconnectAudio: () => void;
  publishAudio: (enabled: boolean) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  user: null,
  currentRoom: null,
  messages: [],
  onlineUsers: [],
  micSeats: [],
  userStatus: 'available',
  isIgnorePrivate: false,
  showAdminDashboard: false,
  fontColor: '#1e3a5f',
  fontFamily: 'font-sans',
  activeGiftEffect: null,
  activeEntryEffect: null,
  ignoredUserIds: [],
  isMuted: false,
  privateMessages: [],
  activePrivateChatUserIds: [],
  unreadPrivateChatUserIds: [],
  roomPermissions: null,
  roomModeratorIds: [],
  roomModerators: [],
  channel: null,
  globalNoticeChannel: null,
  connectionState: 'disconnected',
  isSoundEnabled: true,
  alreadyJoinedUserIds: new Set(),
  siteSettings: null,
  audioRoom: null,
  audioToken: null,
  isAudioConnected: false,
  audioLevels: {},
  setAudioLevel: (identity, level) => set(state => ({
    audioLevels: { ...state.audioLevels, [identity]: level }
  })),
  setSiteSettings: (siteSettings) => set({ siteSettings }),

  setUser: (user) => set({ user }),
  setCurrentRoom: (room) => set({ currentRoom: room, messages: [] }),
  addMessage: (message) => set((state) => {
    if (state.ignoredUserIds.includes(message.userId)) return state;
    return { messages: [...state.messages.slice(-199), message] };
  }),
  setOnlineUsers: (onlineUsers) => set({ onlineUsers }),
  setMicSeats: (micSeats) => set({ micSeats }),
  setUserStatus: (userStatus) => set({ userStatus }),
  setIgnorePrivate: (isIgnorePrivate) => set({ isIgnorePrivate }),
  setFontStyling: (fontColor, fontFamily) => set({ fontColor, fontFamily }),
  setShowAdminDashboard: (showAdminDashboard) => set({ showAdminDashboard }),
  
  connectAudio: async (roomId) => {
    const { user, audioRoom } = get();
    if (!user || audioRoom) return;
    
    try {
      // 1. Fetch token
      const res = await fetch(`/api/livekit-token?roomId=${roomId}&userId=${user.id}&username=${user.display_name}&canPublish=true`);
      const { token } = await res.json();
      if (!token) throw new Error('Failed to get audio token');
      
      // 2. Connect
      const room = new LKRoom();
      const url = import.meta.env.VITE_LIVEKIT_WS_URL || 'wss://smile-to-chat.livekit.cloud';
      await room.connect(url, token);
      console.log(`[LiveKit] Connected to audio room at ${url}`);
      
      set({ audioRoom: room, audioToken: token, isAudioConnected: true });
      
      room.on(RoomEvent.Disconnected, () => {
        set({ audioRoom: null, isAudioConnected: false });
      });
      
    } catch (err) {
      console.error('[LiveKit] Connection error:', err);
    }
  },

  disconnectAudio: () => {
    const { audioRoom } = get();
    if (audioRoom) {
      audioRoom.disconnect();
      set({ audioRoom: null, isAudioConnected: false });
    }
  },

  publishAudio: async (enabled) => {
    const { audioRoom } = get();
    if (!audioRoom) return;
    
    if (enabled) {
      await audioRoom.localParticipant.setMicrophoneEnabled(true);
    } else {
      await audioRoom.localParticipant.setMicrophoneEnabled(false);
    }
  },

  initGlobalNotice: () => {
    if (get().globalNoticeChannel) return;
    const channel = supabase.channel('global-notices');
    channel
      .on('broadcast', { event: 'site-notice' }, ({ payload }) => {
        get().addMessage({
          id: 'global-' + Math.random(),
          userId: 'system',
          username: 'System',
          displayName: 'إعلان إداري عام 📢',
          role: 'owner',
          roleColor: '#f59e0b',
          text: payload.text,
          timestamp: new Date().toISOString(),
          type: 'system',
          style: { fontSize: '16px', fontWeight: '900', color: '#ff1a1a' }
        });
        
        // Also show alert for immediate attention
        alert(`📢 إعلان هام من الإدارة:\n\n${payload.text}`);
      })
      .subscribe();
    set({ globalNoticeChannel: channel });
  },

  connectChat: (roomId) => {
    const { user, channel: existingChannel } = get();
    if (existingChannel) {
      existingChannel.unsubscribe();
    }

    if (!user) return;

    const channelName = `room-${roomId}`;
    console.log(`[Supabase Store] Connecting to room ${channelName}...`);
    
    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    set({ channel, connectionState: 'connecting' });

    // Status message
    get().addMessage({
      id: 'conn-status-' + Math.random(),
      userId: 'system',
      username: 'System',
      displayName: 'نظام الربط',
      role: 'admin',
      roleColor: '#ffaa00',
      text: 'جاري الاتصال عبر القناة الآمنة... ⏳',
      timestamp: new Date().toISOString(),
      type: 'system'
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        const users: OnlineUser[] = [];
        const alreadyJoined = new Set(get().alreadyJoinedUserIds);
        
        Object.keys(newState).forEach((key) => {
          alreadyJoined.add(key); // Mark as already present so join logic ignores them
          const presence = (newState[key] as any[])[0];
          if (presence) {
            users.push({
              id: key as string,
              displayName: presence.displayName || 'مستخدم',
              username: presence.username || key,
              role: presence.role || 'member',
              avatar_url: presence.avatar_url,
              shortId: presence.shortId,
              roomRankName: presence.roomRankName,
              equipped_frame: presence.equipped_frame,
              equipped_entry_effect: presence.equipped_entry_effect,
              equipped_badge: presence.equipped_badge,
            });
          }
        });
        
        set({ onlineUsers: users, alreadyJoinedUserIds: alreadyJoined });
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        const presence = newPresences[0] as any;
        const myUser = get().user;
        const alreadyJoined = get().alreadyJoinedUserIds;
        
        // Skip entry animation if:
        // 1. It's me entering
        // 2. The user was already joined in this session
        if (myUser && (key === myUser.id || alreadyJoined.has(key))) {
          set((state) => ({ alreadyJoinedUserIds: new Set(state.alreadyJoinedUserIds).add(key) }));
          return;
        }
        
        console.log(`[Supabase Store] User Joined: ${key}`);
        
        // Mark as joined
        set((state) => ({ alreadyJoinedUserIds: new Set(state.alreadyJoinedUserIds).add(key) }));
        
        // Broadcast custom entrance if equipped
        const entryEffectItem = DEFAULT_SHOP_ITEMS.find(i => i.id === presence.equipped_entry_effect);
        if (entryEffectItem) {
          get().addMessage({
            id: 'entry-' + Math.random(),
            userId: 'system',
            username: 'System',
            displayName: 'دخول VIP',
            role: 'owner',
            roleColor: '#000000',
            text: `📢 انتبهوا.. وصل العظيم ${presence.displayName || 'مستخدم'} استخدم: ${entryEffectItem.name_ar} 📢`,
            timestamp: new Date().toISOString(),
            type: 'system',
            style: { animation: 'pulse 1s infinite', background: 'linear-gradient(to right, #ff9900, #ffdb58)', color: '#fff', padding: '10px', borderRadius: '10px', textAlign: 'center', fontWeight: '900' }
          });
          // Set active visual effect for UI overlay
          set({ activeEntryEffect: { emoji: entryEffectItem.image_url, type: entryEffectItem.preview_css, sender: presence.displayName || 'مستخدم' } });
          setTimeout(() => set({ activeEntryEffect: null }), 6000);
        } else {
          get().addMessage({
            id: 'join-' + Math.random(),
            userId: 'system',
            username: 'System',
            displayName: 'النظام',
            role: 'admin',
            roleColor: '#888888',
            text: `${presence.displayName || 'مستخدم'} دخل الغرفة 👋`,
            timestamp: new Date().toISOString(),
            type: 'system'
          });
        }
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        const presence = leftPresences[0] as any;
        console.log(`[Supabase Store] User Left: ${key}`);
        
        if (presence.userId) {
          set((state) => {
            const next = new Set(state.alreadyJoinedUserIds);
            next.delete(presence.userId);
            return { alreadyJoinedUserIds: next };
          });
        }
        
        get().addMessage({
          id: 'leave-' + Math.random(),
          userId: 'system',
          username: 'System',
          displayName: 'النظام',
          role: 'admin',
          roleColor: '#888888',
          text: `${presence.displayName || 'مستخدم'} غادر الغرفة`,
          timestamp: new Date().toISOString(),
          type: 'system'
        });
      })
      .on('broadcast', { event: 'new-message' }, ({ payload }) => {
        get().addMessage(payload);
      })
      .on('broadcast', { event: 'reaction-added' }, ({ payload }) => {
        set((state) => ({
          messages: state.messages.map(m => {
            if (m.id === payload.messageId) {
              const reactions = { ...(m.reactions || {}) };
              const users = [...(reactions[payload.emoji] || [])];
              if (!users.includes(payload.userId)) users.push(payload.userId);
              reactions[payload.emoji] = users;
              return { ...m, reactions };
            }
            return m;
          })
        }));
      })
      .on('broadcast', { event: 'private-message' }, ({ payload }) => {
        const me = get().user;
        if (me && (payload.targetId === me.id || payload.userId === me.id)) {
          set((state) => {
            const isReceiving = payload.targetId === me.id;
            const isAlreadyActive = state.activePrivateChatUserIds.includes(payload.userId);
            
            return { 
              privateMessages: [...state.privateMessages, payload],
              // Auto open chat window if receiving
              activePrivateChatUserIds: isReceiving && !isAlreadyActive
                ? [...state.activePrivateChatUserIds, payload.userId]
                : state.activePrivateChatUserIds,
              // Track unread if it's for me and not from me
              unreadPrivateChatUserIds: isReceiving && (!isAlreadyActive || state.unreadPrivateChatUserIds.includes(payload.userId))
                ? state.unreadPrivateChatUserIds.includes(payload.userId) ? state.unreadPrivateChatUserIds : [...state.unreadPrivateChatUserIds, payload.userId]
                : state.unreadPrivateChatUserIds
            };
          });
        }
      })
      .on('broadcast', { event: 'gift-received' }, ({ payload }) => {
        // Activate visual effect (5 seconds)
        set({ activeGiftEffect: { emoji: payload.giftEmoji, type: payload.effectType, sender: payload.senderName } });
        setTimeout(() => set({ activeGiftEffect: null }), 5000);

        // Add announcement message to chat
        get().addMessage({
          id: `gift-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          userId: 'system',
          username: 'System',
          displayName: 'نظام الهدايا 🎊',
          role: 'admin',
          roleColor: '#f97316',
          text: `🎊 ${payload.senderName} أرسل هدية "${payload.giftName}" ${payload.giftEmoji} إلى ${payload.receiverName || 'الجميع'} 🎊`,
          timestamp: new Date().toISOString(),
          type: 'gift_announce',
          style: { fontSize: '18px', fontWeight: '900', color: '#1e3a5f' }
        });

        // Re-fetch profile for sender or receiver to update points display
        const me = get().user;
        if (me && (payload.receiverId === me.id || payload.senderId === me.id)) {
           supabase.from('profiles').select('*').eq('id', me.id).single().then(({ data }) => {
             if (data) set({ user: data });
           });
        }
      })
      .on('broadcast', { event: 'admin-action' }, ({ payload }) => {
        const me = get().user;
        if (!me) return;

        if (payload.targetId === me.id) {
          if (payload.action === 'kick' || payload.action === 'ban') {
            alert(`لقد تم ${payload.action === 'kick' ? 'طردك' : 'حذرك'} من هذه الغرفة.`);
            const myRoomId = get().currentRoom?.id;
            if (myRoomId) get().logRoomAction(myRoomId, payload.action as any);
            get().disconnectChat();
            set({ currentRoom: null });
          }
          if (payload.action === 'mute') {
            set({ isMuted: true });
            get().addMessage({
              id: 'mute-' + Math.random(),
              userId: 'system',
              username: 'System',
              displayName: 'الإدارة',
              role: 'admin',
              roleColor: '#ef4444',
              text: 'تم كتم صوتك من قبل الإدارة. لا يمكنك الكتابة حالياً.',
              timestamp: new Date().toISOString(),
              type: 'system'
            });
          }
        }

        if (payload.action === 'clear' && payload.targetId === 'all') {
          set({ messages: [] });
        }
      })
      .on('broadcast', { event: 'kick-mic' }, async ({ payload }) => {
        const me = get().user;
        const room = get().currentRoom;
        if (me && room && payload.targetId === me.id) {
           await supabase.from('mic_seats').delete().eq('room_id', room.id).eq('user_id', me.id);
           alert('لقد تم إنزالك من المايك بطلب من الإدارة');
        }
      })
      .subscribe(async (status) => {
        console.log(`[Supabase Store] Subscription status: ${status}`);
        set({ connectionState: status });
        
          if (status === 'SUBSCRIBED') {
          if (roomId) get().logRoomAction(roomId, 'join');
          const myUser = get().user;

          // --- FETCH PERMISSIONS & MODERATORS ---
          if (myUser) {
            // 1. Get my own permissions for this room
            const { data: myMod } = await supabase.from('room_moderators')
              .select('permissions')
              .eq('room_id', roomId)
              .eq('user_id', myUser.id)
              .single();
            set({ roomPermissions: myMod?.permissions || null });

            // 2. Get all moderator IDs to highlight them in the list
            const { data: allMods } = await supabase.from('room_moderators')
              .select('user_id')
              .eq('room_id', roomId);
            if (allMods) set({ roomModeratorIds: allMods.map(m => m.user_id) });
          }

          const { data: modData } = await supabase.from('room_moderators')
            .select('rank_name')
            .eq('room_id', roomId)
            .eq('user_id', myUser?.id)
            .maybeSingle();
          
          await channel.track({
            displayName: myUser?.display_name,
            username: myUser?.username,
            role: myUser?.role || 'member',
            avatar_url: myUser?.avatar_url,
            shortId: myUser?.short_id,
            roomRankName: modData?.rank_name,
            total_gifts_sent: myUser?.total_gifts_sent || 0,
            total_gifts_received: myUser?.total_gifts_received || 0,
            equipped_frame: myUser?.equipped_frame,
            equipped_entry_effect: myUser?.equipped_entry_effect,
            equipped_badge: myUser?.equipped_badge,
          });

          get().addMessage({
            id: 'sub-success-' + Math.random(),
            userId: 'system',
            username: 'System',
            displayName: 'نظام المزامنة',
            role: 'admin',
            roleColor: '#00aa00',
            text: 'تم الربط والمزامنة بنجاح! ✅',
            timestamp: new Date().toISOString(),
            type: 'system'
          });
        }
      });
  },

  disconnectChat: () => {
    const { channel, currentRoom } = get();
    if (currentRoom) get().logRoomAction(currentRoom.id, 'leave');
    if (channel) {
      channel.unsubscribe();
      set({ 
        channel: null, 
        onlineUsers: [], 
        connectionState: 'disconnected', 
        roomPermissions: null, 
        roomModeratorIds: [] 
      });
    }
  },

  sendMessage: (payload) => {
    const { channel, fontColor, fontFamily, isMuted } = get();
    if (isMuted) {
      alert('لا يمكنك الإرسال لأنك مكتوم حالياً.');
      return;
    }
    if (channel) {
      const cleanText = payload.text ? filterText(payload.text) : '';
      const message: Message = {
        ...payload,
        text: cleanText,
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        type: payload.type || 'message',
        shortId: get().user?.short_id,
        style: {
          color: fontColor,
          fontFamily: fontFamily,
          fontWeight: 'bold',
        }
      };
      
      channel.send({
        type: 'broadcast',
        event: 'new-message',
        payload: message
      });
      
      get().addMessage(message);
    }
  },

  sendPrivateMessage: (targetId, text) => {
    const { channel, user } = get();
    if (!channel || !user) return;
    const cleanText = filterText(text);
    const msg: Message = {
      id: Math.random().toString(),
      userId: user.id,
      username: user.username,
      displayName: user.display_name,
      role: user.role || 'member',
      roleColor: '#888888',
      text: cleanText,
      timestamp: new Date().toISOString(),
      type: 'private'
    };
    channel.send({
      type: 'broadcast',
      event: 'private-message',
      payload: { ...msg, targetId }
    });
    set((state) => ({ 
      privateMessages: [...state.privateMessages, { ...msg, targetId } as any],
      activePrivateChatUserIds: state.activePrivateChatUserIds.includes(targetId) 
        ? state.activePrivateChatUserIds 
        : [...state.activePrivateChatUserIds, targetId]
    }));
  },

  openPrivateChat: (userId) => {
    set((state) => ({
      activePrivateChatUserIds: state.activePrivateChatUserIds.includes(userId)
        ? state.activePrivateChatUserIds
        : [...state.activePrivateChatUserIds, userId]
    }));
  },

  closePrivateChat: (userId) => {
    set((state) => ({
      activePrivateChatUserIds: state.activePrivateChatUserIds.filter(id => id !== userId)
    }));
  },

  markPrivateChatAsRead: (userId) => {
    set((state) => ({
      unreadPrivateChatUserIds: state.unreadPrivateChatUserIds.filter(id => id !== userId)
    }));
  },

  toggleIgnore: (userId) => {
    set((state) => {
      const isIgnored = state.ignoredUserIds.includes(userId);
      return {
        ignoredUserIds: isIgnored 
          ? state.ignoredUserIds.filter(id => id !== userId) 
          : [...state.ignoredUserIds, userId]
      };
    });
  },

  processAdminAction: (action, targetId) => {
    const { channel, currentRoom } = get();
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'admin-action',
        payload: { action, targetId }
      });
      if (currentRoom) get().logRoomAction(currentRoom.id, action as any, { targetId });
    }
  },

  logRoomAction: async (roomId, action, metadata = {}) => {
    const { user } = get();
    if (!user) return;
    await supabase.from('room_logs').insert({
      room_id: roomId,
      user_id: user.id,
      action,
      metadata: { ...metadata, username: user.username, displayName: user.display_name }
    });
  },

  setRoomPermissions: (roomPermissions) => set({ roomPermissions }),
  setRoomModeratorIds: (roomModeratorIds) => set({ roomModeratorIds }),
  setRoomModerators: (roomModerators) => set({ roomModerators }),
  
  addReaction: (messageId, emoji) => {
    const { channel, user } = get();
    if (!channel || !user) return;
    
    channel.send({
      type: 'broadcast',
      event: 'reaction-added',
      payload: { messageId, emoji, userId: user.id }
    });
    
    // Optimistic update
    set((state) => ({
      messages: state.messages.map(m => {
        if (m.id === messageId) {
          const reactions = { ...(m.reactions || {}) };
          const users = [...(reactions[emoji] || [])];
          if (!users.includes(user.id)) users.push(user.id);
          reactions[emoji] = users;
          return { ...m, reactions };
        }
        return m;
      })
    }));
  },

  updatePresence: async () => {
    const { channel, user: myUser } = get();
    if (!channel || !myUser) return;
    
    console.log('[Supabase Store] Updating Presence...');
    await channel.track({
      displayName: myUser.display_name,
      username: myUser.username,
      role: myUser.role || 'member',
      avatar_url: myUser.avatar_url,
      shortId: myUser.short_id,
      total_gifts_sent: myUser.total_gifts_sent || 0,
      total_gifts_received: myUser.total_gifts_received || 0,
      equipped_frame: myUser.equipped_frame,
      equipped_entry_effect: myUser.equipped_entry_effect,
      equipped_badge: myUser.equipped_badge,
    });
  },

  toggleSound: () => set((state) => ({ isSoundEnabled: !state.isSoundEnabled })),
}));
