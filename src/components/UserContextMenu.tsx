import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useChatStore } from '../store/useChatStore';
import { supabase } from '../lib/supabase';
import { 
  MessageSquare, Eye, Slash, Shield, 
  Ban, VolumeX, UserX, AlertTriangle, Trash2, 
  Mic2, Info, Megaphone, Gift, User as UserIcon, Crown
} from 'lucide-react';
import { cn } from '../lib/utils';

interface UserContextMenuProps {
  x: number;
  y: number;
  userId: string;
  onClose: () => void;
  onShowGift?: (userId: string, displayName: string) => void;
  onShowProfile?: (userId: string, displayName: string) => void;
  onShowPrivate?: (userId: string, displayName: string) => void;
}

export default function UserContextMenu({ x, y, userId, onClose, onShowGift, onShowProfile, onShowPrivate }: UserContextMenuProps) {
  const { user: currentUser, channel, currentRoom, onlineUsers, sendMessage, roomPermissions, roomModeratorIds, roomModerators } = useChatStore();
  const [showModSubmenu, setShowModSubmenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const targetUser = onlineUsers.find(u => u.id === userId);
  const isSelf = currentUser?.id === userId;
  const isGlobalAdmin = currentUser?.role === 'admin' || currentUser?.role === 'owner' || currentUser?.role === 'super_admin';
  const isRoomOwner = currentRoom?.owner_id === currentUser?.id;
  const isRoomMod = roomModeratorIds.includes(currentUser?.id || '');
  const canShowModMenu = isGlobalAdmin || isRoomOwner || isRoomMod;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Permission helper — checks DB permissions for mods, grants all to owners/global admins
  const hasPerm = (perm: string) => {
    if (isGlobalAdmin || isRoomOwner) return true;
    // Check if current user is a room mod with specific permissions
    const myModRecord = roomModerators.find(m => m.user_id === currentUser?.id);
    if (myModRecord) {
      // If permissions key exists use it, otherwise grant all (default after migration)
      if (myModRecord.permissions && typeof myModRecord.permissions === 'object') {
        return !!(myModRecord.permissions as any)[perm];
      }
      return true; // Default: grant all to mods if no permission object
    }
    // Fallback: check old roomPermissions state
    return !!(roomPermissions as any)?.[perm];
  };

  const isTargetGlobalAdmin = targetUser?.role === 'super_admin' || targetUser?.role === 'owner' || targetUser?.role === 'admin';

  // Kick: broadcast admin-action kick
  const doKick = async () => {
    if (!hasPerm('can_kick')) return;
    
    // Protection: Room owners/mods cannot kick Global Admins
    if (isTargetGlobalAdmin && !isGlobalAdmin) {
      alert('لا تملك صلاحية طرد هذا المستوى الإداري العالمي');
      onClose();
      return;
    }

    if (!confirm(`هل تريد طرد ${targetUser?.displayName}؟`)) return;
    channel?.send({ type: 'broadcast', event: 'admin-action', payload: { action: 'kick', targetId: userId } });
    sendMessage({
      roomId: currentRoom!.id, userId: 'system', username: 'System', displayName: 'النظام',
      text: `🚫 تم طرد ${targetUser?.displayName} من الغرفة`,
      role: 'admin', roleColor: '#ef4444', type: 'mod_action',
    });
    await supabase.from('room_mod_actions').insert({
      room_id: currentRoom!.id, actor_id: currentUser!.id, target_id: userId,
      action_type: 'kick', action_label: 'طرد'
    });
    onClose();
  };

  // Ban: inserts room_bans record + kicks via broadcast
  const doBan = async () => {
    if (!hasPerm('can_ban_device')) return;

    // Protection: Room owners/mods cannot ban Global Admins
    if (isTargetGlobalAdmin && !isGlobalAdmin) {
      alert('لا تملك صلاحية حظر هذا المستوى الإداري العالمي');
      onClose();
      return;
    }

    const reason = prompt(`سبب حظر ${targetUser?.displayName} (اتركه فارغاً إذا لم يكن هناك سبب):`) ?? '';
    const { error } = await supabase.from('room_bans').insert({
      room_id: currentRoom!.id, user_id: userId, banned_by: currentUser!.id,
      reason: reason.trim() || 'بدون سبب', is_active: true
    });
    if (error) { alert('فشل الحظر: ' + error.message); onClose(); return; }
    channel?.send({ type: 'broadcast', event: 'admin-action', payload: { action: 'ban', targetId: userId } });
    sendMessage({
      roomId: currentRoom!.id, userId: 'system', username: 'System', displayName: 'النظام',
      text: `🚫 تم حظر ${targetUser?.displayName} من الغرفة`,
      role: 'admin', roleColor: '#ef4444', type: 'mod_action',
    });
    await supabase.from('room_mod_actions').insert({
      room_id: currentRoom!.id, actor_id: currentUser!.id, target_id: userId,
      action_type: 'ban', action_label: 'حظر', notes: reason.trim()
    });
    onClose();
  };

  // Mute (suspend): broadcasts mute
  const doMute = async () => {
    channel?.send({ type: 'broadcast', event: 'admin-action', payload: { action: 'mute', targetId: userId } });
    sendMessage({
      roomId: currentRoom!.id, userId: 'system', username: 'System', displayName: 'النظام',
      text: `🔇 تم إيقاف ${targetUser?.displayName}`,
      role: 'admin', roleColor: '#f97316', type: 'mod_action',
    });
    await supabase.from('room_mod_actions').insert({
      room_id: currentRoom!.id, actor_id: currentUser!.id, target_id: userId,
      action_type: 'mute', action_label: 'إيقاف'
    });
    onClose();
  };

  // Warn: sends a styled warning message visible to all in the room
  const doWarn = async () => {
    if (!hasPerm('can_announce')) return;
    const warnMsg = prompt(`اكتب رسالة التحذير لـ ${targetUser?.displayName}:`);
    if (!warnMsg?.trim()) { onClose(); return; }
    sendMessage({
      roomId: currentRoom!.id, userId: 'system', username: 'System', displayName: 'تحذير إداري',
      text: `⚠️ تحذير رسمي لـ ${targetUser?.displayName}: ${warnMsg.trim()}`,
      role: 'admin', roleColor: '#f59e0b', type: 'mod_action',
    });
    await supabase.from('room_mod_actions').insert({
      room_id: currentRoom!.id, actor_id: currentUser!.id, target_id: userId,
      action_type: 'warn', action_label: 'تحذير', notes: warnMsg.trim()
    });
    onClose();
  };

  // Global announce: broadcasts to all in room
  const doGlobal = async () => {
    if (!hasPerm('can_announce')) return;
    const txt = prompt('اكتب رسالة الإعلان للجميع:');
    if (!txt?.trim()) { onClose(); return; }
    sendMessage({
      roomId: currentRoom!.id, userId: 'system', username: 'System', displayName: 'إعلان',
      text: `📢 ${txt.trim()}`, role: 'owner', roleColor: '#8b5cf6', type: 'system',
    });
    await supabase.from('room_mod_actions').insert({
      room_id: currentRoom!.id, actor_id: currentUser!.id,
      action_type: 'announce', action_label: 'رسالة عامة', notes: txt.trim()
    });
    onClose();
  };

  // Clear chat for all
  const doClear = async () => {
    if (!hasPerm('can_clear_chat')) return;
    if (!confirm('مسح النص للجميع؟')) { onClose(); return; }
    channel?.send({ type: 'broadcast', event: 'admin-action', payload: { action: 'clear', targetId: 'all' } });
    useChatStore.getState().addMessage({
      id: 'clear-' + Math.random(), userId: 'system', username: 'System', displayName: 'النظام',
      role: 'admin', roleColor: '#f97316', text: '🗑️ تم مسح النص من قبل الإدارة',
      timestamp: new Date().toISOString(), type: 'mod_action'
    });
    onClose();
  };

  const canInitiatePrivate = () => {
    const setting = currentRoom?.private_chat_setting || 'all';
    if (setting === 'all') return true;
    if (setting === 'members') return isGlobalAdmin;
    return false;
  };

  const mainItems = [
    { id: 'gift',    label: 'إرسال هدية',     icon: <Gift size={14} className="text-orange-500" />,    hideForSelf: true },
    { id: 'profile', label: 'الملف الشخصي',   icon: <UserIcon size={14} className="text-brand-blue" /> },
    { id: 'private', label: 'محادثة خاصة',    icon: <MessageSquare size={14} />,                        hideForSelf: true, hide: !canInitiatePrivate() },
    { id: 'camera',  label: 'مشاهدة الكاميرا', icon: <Eye size={14} />,                                 disabled: true, hideForSelf: true },
    { id: 'ignore',  label: 'تجاهل',           icon: <Slash size={14} />,                               hideForSelf: true },
  ];

  const adminItems = [
    { id: 'ban',    label: 'حظر',           icon: <Ban size={14} className="text-red-600" />,           perm: 'can_ban_device', action: doBan },
    { id: 'mute',   label: 'إيقاف',         icon: <VolumeX size={14} className="text-orange-600" />,   perm: 'can_suspend',     action: doMute },
    { id: 'kick',   label: 'طرد',           icon: <UserX size={14} className="text-red-600" />,         perm: 'can_kick',        action: doKick },
    { id: 'warn',   label: 'إرسال تحذير',   icon: <AlertTriangle size={14} className="text-yellow-600" />, perm: 'can_announce', action: doWarn },
    { id: 'clear',  label: 'مسح النص',      icon: <Trash2 size={14} className="text-gray-600" />,      perm: 'can_clear_chat',  action: doClear },
    { id: 'global', label: 'رسالة عامة',    icon: <Megaphone size={14} className="text-purple-600" />, perm: 'can_announce',    action: doGlobal },
    { id: 'info',   label: 'ملفه الشخصي',   icon: <Info size={14} className="text-blue-600" />,        perm: 'can_view_reports', action: () => { onShowProfile?.(userId, targetUser?.displayName || ''); onClose(); } },
    { id: 'voice',  label: 'منح دور المايك', icon: <Mic2 size={14} className="text-blue-600" />,       perm: 'can_give_mic',    action: () => { alert('قريباً: منح دور المايك'); onClose(); } },
  ];

  const filteredAdminItems = adminItems.filter(item => hasPerm(item.perm));

  const isUserOnMic = useChatStore.getState().micSeats.some(s => s.user_id === userId);

  const doKickMic = async () => {
    if (!currentRoom) return;
    await supabase.from('mic_seats').delete().eq('room_id', currentRoom.id).eq('user_id', userId);
    channel?.send({ type: 'broadcast', event: 'kick-mic', payload: { targetId: userId } });
    await supabase.from('room_mod_actions').insert({
      room_id: currentRoom!.id, actor_id: currentUser!.id, target_id: userId,
      action_type: 'kick_mic', action_label: 'إنزال من المنصة'
    });
    onClose();
  };

  const doChangeRole = async () => {
    if (currentUser?.role !== 'owner' && currentUser?.role !== 'super_admin') return;
    const newRole = prompt(`أدخل الرتبة الجديدة لـ ${targetUser?.displayName} (guest, member, friend, admin, super_admin):`);
    if (!newRole || !['guest', 'member', 'friend', 'admin', 'super_admin'].includes(newRole)) {
      alert('رتبة غير صالحة');
      onClose();
      return;
    }
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    if (error) alert('فشل تغيير الرتبة: ' + error.message);
    else {
      alert(`تم تغيير رتبة ${targetUser?.displayName} إلى ${newRole} ✓`);
      await supabase.from('room_mod_actions').insert({
        room_id: currentRoom!.id, actor_id: currentUser!.id, target_id: userId,
        action_type: 'change_role', action_label: 'تغيير الرتبة'
      });
    }
    onClose();
  };

  return (
    <div 
      ref={menuRef}
      className="fixed z-[500] font-sans rtl select-none" 
      style={{ 
        top: Math.min(y, window.innerHeight - 520), 
        left: Math.max(Math.min(x - 180, window.innerWidth - 200), 10)
      }}
      dir="rtl"
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-[190px] bg-white border-2 border-[#84a9d1] shadow-2xl rounded-lg overflow-hidden py-1"
      >
        {mainItems.filter(i => (!i.hideForSelf || !isSelf) && !i.hide).map((item) => (
          <button 
            key={item.id}
            disabled={item.disabled}
            onClick={() => {
              if (item.id === 'gift' && onShowGift) onShowGift(userId, targetUser?.displayName || '');
              if (item.id === 'profile' && onShowProfile) onShowProfile(userId, targetUser?.displayName || '');
              if (item.id === 'private' && onShowPrivate) onShowPrivate(userId, targetUser?.displayName || '');
              if (item.id === 'ignore') useChatStore.getState().toggleIgnore(userId);
              onClose();
            }}
            className={cn(
              "w-full px-3 py-2 flex items-center gap-3 hover:bg-[#deedf7] transition-colors text-right",
              item.disabled && "opacity-40 grayscale",
              item.id === 'ignore' && useChatStore.getState().ignoredUserIds.includes(userId) && "bg-orange-100 text-orange-700"
            )}
          >
            <div className="bg-gray-100 p-1.5 rounded-lg text-gray-700 shrink-0">
              {item.icon}
            </div>
            <span className="text-[11px] font-black text-brand-blue">
              {item.id === 'ignore' && useChatStore.getState().ignoredUserIds.includes(userId) ? 'إلغاء التجاهل' : item.label}
            </span>
          </button>
        ))}

        {/* ── Mod Tools Section (inline dropdown) ── */}
        {canShowModMenu && !isSelf && (
          <div className="border-t border-[#84a9d1]/20">
            {/* Header button */}
            <button 
              onClick={() => setShowModSubmenu(prev => !prev)}
              className={cn(
                "w-full px-3 py-2 flex items-center justify-between transition-all text-right group",
                showModSubmenu ? "bg-[#1e3a5f] text-white" : "bg-[#deedf7]/50 hover:bg-[#1e3a5f] hover:text-white"
              )}
            >
              <div className="flex items-center gap-2">
                <div className={cn(
                  "p-1.5 rounded-lg shrink-0",
                  showModSubmenu ? "bg-white/20 text-white" : "bg-[#1e3a5f]/10 text-[#1e3a5f] group-hover:bg-white/20 group-hover:text-white"
                )}>
                  <Shield size={13} />
                </div>
                <span className="text-[11px] font-black">خيارات المشرف</span>
              </div>
              <span className={cn("text-[10px] transition-transform duration-200", showModSubmenu ? "rotate-180" : "")}>▼</span>
            </button>

            {/* Inline Items */}
            <AnimatePresence>
              {showModSubmenu && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden bg-[#f8fbff] border-t border-[#84a9d1]/20"
                >
                  {isUserOnMic && (
                    <button 
                      onClick={doKickMic}
                      className="w-full px-4 py-1.5 flex items-center gap-2 hover:bg-red-50 transition-colors text-right text-red-600 border-b border-gray-100"
                    >
                      <Mic2 size={13} />
                      <span className="text-[10px] font-black">إنزال من المنصة</span>
                    </button>
                  )}
                  
                  {(currentUser?.role === 'owner' || currentUser?.role === 'super_admin') && (
                    <button 
                      onClick={doChangeRole}
                      className="w-full px-4 py-1.5 flex items-center gap-2 hover:bg-purple-50 transition-colors text-right text-purple-600 border-b border-gray-100"
                    >
                      <Crown size={13} />
                      <span className="text-[10px] font-black">تغيير الرتبة العالمية</span>
                    </button>
                  )}

                  {filteredAdminItems.map((opt) => (
                    <button 
                      key={opt.id}
                      onClick={opt.action}
                      className="w-full px-4 py-1.5 flex items-center gap-2 hover:bg-[#eef4f9] transition-colors text-right border-b border-gray-100 last:border-0"
                    >
                      <span className="shrink-0">{opt.icon}</span>
                      <span className="text-[10px] font-black text-gray-700">{opt.label}</span>
                    </button>
                  ))}

                  {filteredAdminItems.length === 0 && !isUserOnMic && !(currentUser?.role === 'owner' || currentUser?.role === 'super_admin') && (
                    <p className="text-center text-[9px] text-gray-400 py-2 font-bold">لا توجد صلاحيات متاحة</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  );
}
