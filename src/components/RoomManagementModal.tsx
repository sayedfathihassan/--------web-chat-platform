import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useChatStore } from '../store/useChatStore';
import {
  Home, Database, Users, Settings, Ban, LogOut,
  FileText, Plus, Trash2, Check, X, RefreshCw,
  Shield, Lock, Radio, Image, Save, UserPlus,
  UserX, Clock, MicOff, Edit3, Search, Mic, Crown
} from 'lucide-react';
import { cn } from '../lib/utils';

interface RoomManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'general' | 'backup' | 'live-control' | 'accounts' | 'settings' | 'banned' | 'room-log' | 'reports';

// ──────────────────────────────────────────────────────────────
// Default room settings shape
// ──────────────────────────────────────────────────────────────
const defaultSettings = {
  who_can_write: 'all',           // all | members | admins | nobody
  who_can_pm: 'all',              // all | members | admins | nobody
  room_locked: 'open',            // open | members | banned
  gateway_enabled: false,
  images_allowed: true,
  allow_master_add: true,
  allow_master_settings: false,
};

const WRITE_OPTIONS = [
  { value: 'all', label: 'الجميع' },
  { value: 'members', label: 'الأعضاء والمشرفين فقط' },
  { value: 'admins', label: 'المشرفين فقط' },
  { value: 'nobody', label: 'لا أحد' },
];

const LOCK_OPTIONS = [
  { value: 'open', label: 'مفتوح' },
  { value: 'members', label: 'للأعضاء والمشرفين فقط' },
];

const MOD_PERMISSIONS = [
  { key: 'can_ban_device', label: 'حظر جهاز' },
  { key: 'can_suspend', label: 'إيقاف' },
  { key: 'can_kick', label: 'طرد' },
  { key: 'can_give_mic', label: 'دور المايك' },
  { key: 'can_clear_chat', label: 'مسح النص للجميع' },
  { key: 'can_announce', label: 'رسالة عامة' },
  { key: 'can_unban', label: 'الغاء الحظر' },
  { key: 'can_view_exit_log', label: 'سجل الخروج' },
  { key: 'can_manage_members', label: 'ادارة الحسابات' },
  { key: 'can_manage_member_rank', label: 'ادارة ممبر' },
  { key: 'can_manage_admin_rank', label: 'ادارة أدمن' },
  { key: 'can_manage_room_settings', label: 'اعدادات الغرفة' },
  { key: 'can_view_reports', label: 'تقارير المشرفين' },
];

// ──────────────────────────────────────────────────────────────
export default function RoomManagementModal({ isOpen, onClose }: RoomManagementModalProps) {
  const { currentRoom, user, onlineUsers, channel, sendMessage } = useChatStore();
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // ── States per tab ──
  const [settings, setSettings] = useState(defaultSettings);
  const [moderators, setModerators] = useState<any[]>([]);
  const [bannedUsers, setBannedUsers] = useState<any[]>([]);
  const [roomLog, setRoomLog] = useState<any[]>([]);
  const [modReports, setModReports] = useState<any[]>([]);

  // Add account form
  const [showAddMod, setShowAddMod] = useState(false);
  const [editingMod, setEditingMod] = useState<any | null>(null); // for editing existing mod
  const [modUsername, setModUsername] = useState('');
  const [modPermissions, setModPermissions] = useState<Record<string, boolean>>({});
  const [modSaving, setModSaving] = useState(false);
  const [resolvedUser, setResolvedUser] = useState<{ id: string; display_name: string; username: string } | null>(null);
  const [resolving, setResolving] = useState(false);
  const [modRankName, setModRankName] = useState('مشرف الغرفة');

  // Authorization flags
  const { roomPermissions, setRoomModeratorIds } = useChatStore();
  const isGlobalAdmin = user?.role === 'admin' || user?.role === 'owner' || user?.role === 'super_admin';
  const isRoomOwner = currentRoom?.owner_id === user?.id;
  
  // Specific permission checks
  const canAddMods = isGlobalAdmin || isRoomOwner || !!roomPermissions?.can_manage_members;
  const canBan = isGlobalAdmin || isRoomOwner || !!roomPermissions?.can_ban_device;
  const canKick = isGlobalAdmin || isRoomOwner || !!roomPermissions?.can_kick;
  const canUnban = isGlobalAdmin || isRoomOwner || !!roomPermissions?.can_unban;
  const canChangeSettings = isGlobalAdmin || isRoomOwner || !!roomPermissions?.can_manage_room_settings;
  const canViewLogs = isGlobalAdmin || isRoomOwner || !!roomPermissions?.can_view_exit_log;
  const canAnnounce = isGlobalAdmin || isRoomOwner || !!roomPermissions?.can_announce;
  const canClearChat = isGlobalAdmin || isRoomOwner || !!roomPermissions?.can_clear_chat;
  const canGiveMic = isGlobalAdmin || isRoomOwner || !!roomPermissions?.can_give_mic;

  const showMsg = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Fetch data on tab change ──
  const fetchTabData = useCallback(async (tab: Tab) => {
    if (!currentRoom) return;
    setLoading(true);
    try {
      if (tab === 'settings') {
        const { data } = await supabase
          .from('rooms').select('settings').eq('id', currentRoom.id).single();
        if (data?.settings) setSettings({ ...defaultSettings, ...data.settings });

      } else if (tab === 'accounts') {
        const { data } = await supabase
          .from('room_moderators')
          .select('*, profiles(display_name, username, role, short_id)')
          .eq('room_id', currentRoom.id)
          .order('created_at', { ascending: false });
        if (data) setModerators(data);

      } else if (tab === 'banned') {
        const { data } = await supabase
          .from('room_bans')
          .select('*, profiles(display_name, username, short_id)')
          .eq('room_id', currentRoom.id)
          .order('created_at', { ascending: false });
        if (data) setBannedUsers(data);

      } else if (tab === 'room-log') {
        const { data } = await supabase
          .from('room_visits')
          .select('*, profiles(display_name, username, short_id)')
          .eq('room_id', currentRoom.id)
          .order('entered_at', { ascending: false })
          .limit(100);
        if (data) setRoomLog(data);

      } else if (tab === 'reports') {
        const { data } = await supabase
          .from('room_mod_actions')
          .select('*, actor:profiles!actor_id(display_name, short_id), target:profiles!target_id(display_name, short_id)')
          .eq('room_id', currentRoom.id)
          .order('created_at', { ascending: false })
          .limit(100);
        if (data) setModReports(data);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [currentRoom]);

  useEffect(() => { if (isOpen) fetchTabData(activeTab); }, [activeTab, isOpen]);

  // ── Save room settings ──
  const handleSaveSettings = async () => {
    const { error } = await supabase
      .from('rooms')
      .update({ settings })
      .eq('id', currentRoom.id);
    if (error) {
      showMsg('فشل الحفظ: ' + error.message, false);
    } else {
      showMsg('تم حفظ الإعدادات ✓');
      await supabase.from('room_mod_actions').insert({
        room_id: currentRoom.id, actor_id: user?.id, action_type: 'settings', action_label: 'تغيير إعدادات الغرفة'
      });
      fetchTabData('reports');
    }
  };

  // ── Live resolve user ID ──
  useEffect(() => {
    if (!modUsername.trim()) { setResolvedUser(null); return; }
    const num = parseInt(modUsername.trim(), 10);
    if (isNaN(num)) { setResolvedUser(null); return; }
    const timer = setTimeout(async () => {
      setResolving(true);
      const { data } = await supabase
        .from('profiles').select('id, display_name, username').eq('short_id', num).single();
      setResolvedUser(data || null);
      setResolving(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [modUsername]);

  // ── Add / Edit moderator ──
  const handleAddMod = async () => {
    if (!resolvedUser && !editingMod) return;
    const targetId = editingMod ? editingMod.user_id : resolvedUser!.id;
    const targetName = editingMod ? editingMod.profiles?.display_name : resolvedUser!.display_name;
    
    setModSaving(true);
    const { error } = await supabase.from('room_moderators').upsert({
      room_id: currentRoom.id,
      user_id: targetId,
      added_by: user?.id,
      permissions: modPermissions,
      rank_name: modRankName || 'مشرف الغرفة',
    }, { onConflict: 'room_id,user_id' });
    if (error) {
      showMsg('فشل الحفظ: ' + error.message, false);
    } else {
      showMsg(`تم حفظ صلاحيات ${targetName} ✓`);
      await supabase.from('room_mod_actions').insert({
        room_id: currentRoom.id, actor_id: user?.id, target_id: targetId,
        action_type: editingMod ? 'edit_mod' : 'add_mod',
        action_label: editingMod ? 'تعديل صلاحيات مشرف' : 'إضافة مشرف جديد'
      });
      // Refresh moderator IDs in store
      const { data: allMods } = await supabase.from('room_moderators').select('user_id').eq('room_id', currentRoom.id);
      if (allMods) setRoomModeratorIds(allMods.map((m: any) => m.user_id));
      setShowAddMod(false);
      setEditingMod(null);
      setModUsername('');
      setModPermissions({});
      setModRankName('مشرف الغرفة');
      setResolvedUser(null);
      fetchTabData('accounts');
    }
    setModSaving(false);
  };

  // ── Remove moderator ──
  const handleRemoveMod = async (userId: string, name: string) => {
    if (!confirm(`هل تريد إزالة صلاحيات ${name}؟`)) return;
    await supabase.from('room_moderators').delete().eq('room_id', currentRoom.id).eq('user_id', userId);
    await supabase.from('room_mod_actions').insert({
      room_id: currentRoom.id, actor_id: user?.id, target_id: userId, action_type: 'remove_mod', action_label: 'إزالة المشرف'
    });
    // Refresh moderator IDs in store
    const { data: allMods } = await supabase.from('room_moderators').select('user_id').eq('room_id', currentRoom.id);
    if (allMods) setRoomModeratorIds(allMods.map((m: any) => m.user_id));
    showMsg('تم إزالة صلاحيات المشرف');
    fetchTabData('accounts');
  };

  // ── Edit moderator permissions ──
  const handleEditMod = (mod: any) => {
    setEditingMod(mod);
    setModPermissions(mod.permissions || {});
    setModRankName(mod.rank_name || 'مشرف الغرفة');
    setModUsername('');
    setResolvedUser(null);
    setShowAddMod(true);
  };

  // ── Unban ──
  const handleUnban = async (banId: string, name: string, targetId: string) => {
    if (!canUnban) { showMsg('ليس لديك صلاحية رفع الحظر', false); return; }
    await supabase.from('room_bans').update({ is_active: false }).eq('id', banId);
    await supabase.from('room_mod_actions').insert({
      room_id: currentRoom.id, actor_id: user?.id, target_id: targetId, action_type: 'unban', action_label: 'رفع الحظر'
    });
    sendMessage({
      roomId: currentRoom.id, userId: 'system', username: 'System', displayName: 'System',
      text: `✅ تم رفع الحظر عن ${name}`,
      role: 'admin', roleColor: '#22c55e', type: 'mod_action',
    });
    fetchTabData('banned');
    showMsg('تم رفع الحظر');
  };

  // ── Ban user (insert room_bans + kick) ──
  const handleBanUser = async (targetId: string, targetName: string) => {
    if (!canBan) { showMsg('ليس لديك صلاحية الحظر', false); return; }
    const reason = prompt(`سبب حظر ${targetName} (اترك فارغًا لثبوته بدون سبب):`) ?? '';
    const { error } = await supabase.from('room_bans').insert({
      room_id: currentRoom.id, user_id: targetId, banned_by: user?.id,
      reason: reason.trim() || 'بدون سبب', is_active: true
    });
    if (error) { showMsg('فشل الحظر: ' + error.message, false); return; }
    // Kick the user too
    channel?.send({ type: 'broadcast', event: 'admin-action', payload: { action: 'ban', targetId } });
    await supabase.from('room_mod_actions').insert({
      room_id: currentRoom.id, actor_id: user?.id, target_id: targetId, action_type: 'ban', action_label: 'حظر',
      notes: reason.trim() || ''
    });
    sendMessage({
      roomId: currentRoom.id, userId: 'system', username: 'System', displayName: 'System',
      text: `🚫 تم حظر ${targetName} من الغرفة`,
      role: 'admin', roleColor: '#ef4444', type: 'mod_action',
    });
    showMsg(`تم حظر ${targetName} ✓`);
  };

  // ── Clear chat for all ──
  const handleClearChat = () => {
    if (!canClearChat) { showMsg('ليس لديك صلاحية مسح النص', false); return; }
    if (!confirm('هل تريد فعلاً مسح النص للجميع؟')) return;
    channel?.send({ type: 'broadcast', event: 'admin-action', payload: { action: 'clear', targetId: 'all' } });
    useChatStore.getState().addMessage({
      id: 'clear-' + Math.random(), userId: 'system', username: 'System', displayName: 'النظام',
      role: 'admin', roleColor: '#f97316', text: '🗑️ تم مسح النص من قبل الإدارة', timestamp: new Date().toISOString(), type: 'mod_action'
    });
    showMsg('تم مسح النص للجميع');
  };

  // ── Live Control (Kick, Mute, Announce) ──
  const handleKick = async (targetId: string, targetName: string) => {
    if (!channel || !currentRoom || !user) return;
    if (!canKick) { showMsg('ليس لديك صلاحية الطرد', false); return; }
    if (!confirm(`هل تريد فعلاً طرد ${targetName} من الغرفة؟`)) return;
    // Use Supabase broadcast (not Pusher trigger)
    channel.send({ type: 'broadcast', event: 'admin-action', payload: { action: 'kick', targetId, targetName } });
    sendMessage({
      roomId: currentRoom.id, userId: 'system', username: 'System', displayName: 'System',
      text: `🚫 تم طرد ${targetName} من الغرفة`, role: 'admin', roleColor: '#ef4444', type: 'mod_action',
    });
    await supabase.from('room_mod_actions').insert({
      room_id: currentRoom.id, actor_id: user.id, target_id: targetId, action_type: 'kick', action_label: 'طرد مباشر'
    });
    showMsg('تم الطرد بنجاح');
  };

  const handleMute = async (targetId: string, targetName: string) => {
    if (!channel || !currentRoom || !user) return;
    // Use Supabase broadcast (not Pusher trigger)
    channel.send({ type: 'broadcast', event: 'admin-action', payload: { action: 'mute', targetId } });
    sendMessage({
      roomId: currentRoom.id, userId: 'system', username: 'System', displayName: 'System',
      text: `🔇 تم كتم صوت ${targetName}`, role: 'admin', roleColor: '#f97316', type: 'mod_action',
    });
    await supabase.from('room_mod_actions').insert({
      room_id: currentRoom.id, actor_id: user.id, target_id: targetId, action_type: 'mute', action_label: 'إيقاف (كتم)'
    });
    showMsg('تم الكتم بنجاح');
  };

  const handleAnnounce = async () => {
    if (!channel || !currentRoom || !user) return;
    if (!canAnnounce) { showMsg('ليس لديك صلاحية الرسائل العامة', false); return; }
    const text = prompt('اكتب رسالة الإعلان:');
    if (!text?.trim()) return;
    sendMessage({
      roomId: currentRoom.id, userId: 'system', username: 'System', displayName: 'System',
      text: `📢 إعلان إداري: ${text.trim()}`, role: 'owner', roleColor: '#f59e0b', type: 'system',
    });
    await supabase.from('room_mod_actions').insert({
      room_id: currentRoom.id, actor_id: user.id, action_type: 'announce', action_label: 'رسالة إعلان', notes: text.trim()
    });
    showMsg('تم إرسال الإعلان');
  };

  const handleKickFromMic = async (targetId: string, name: string) => {
    if (!currentRoom) return;
    await supabase.from('mic_seats').delete().eq('room_id', currentRoom.id).eq('user_id', targetId);
    channel?.send({ type: 'broadcast', event: 'kick-mic', payload: { targetId } });
    await supabase.from('room_mod_actions').insert({
      room_id: currentRoom.id, actor_id: user?.id, target_id: targetId, action_type: 'kick_mic', action_label: 'إنزال من المايك'
    });
    showMsg(`تم إنزال ${name} من المايك`);
    fetchTabData('minbar');
  };

  const handleKickAllFromMic = async () => {
    if (!currentRoom) return;
    if (!confirm('هل تريد إنزال الجميع من المايك بالكامل؟')) return;
    const { data } = await supabase.from('mic_seats').select('user_id').eq('room_id', currentRoom.id);
    if (data) {
      for (const s of data) {
        channel?.send({ type: 'broadcast', event: 'kick-mic', payload: { targetId: s.user_id } });
      }
    }
    await supabase.from('mic_seats').delete().eq('room_id', currentRoom.id);
    await supabase.from('room_mod_actions').insert({
      room_id: currentRoom.id, actor_id: user?.id, action_type: 'kick_all_mic', action_label: 'إنزال الكل من المايك'
    });
    showMsg('تم إنزال الجميع بنجاح');
  };

  const handleChangeUserRole = async (targetId: string, newRole: string, name: string) => {
    if (user?.role !== 'owner' && user?.role !== 'super_admin') {
      showMsg('عذراً، هذه الصلاحية مخصصة لإدارة الموقع فقط', false);
      return;
    }
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', targetId);
    if (error) {
       showMsg('فشل تغيير الرتبة: ' + error.message, false);
    } else {
       showMsg(`تم تغيير رتبة ${name} إلى ${newRole} بنجاح ✓`);
       await supabase.from('room_mod_actions').insert({
         room_id: currentRoom.id, actor_id: user?.id, target_id: targetId, action_type: 'change_role', action_label: 'تغيير رتبة المستخدم', notes: `رتبة جديدة: ${newRole}`
       });
    }
  };


  const tabs = [
    { id: 'general' as Tab, label: 'عام', icon: <Home size={15} /> },
    { id: 'live-control' as Tab, label: 'التحكم المباشر', icon: <Radio size={15} /> },
    { id: 'accounts' as Tab, label: 'إدارة الحسابات', icon: <Users size={15} /> },
    { id: 'settings' as Tab, label: 'إعدادات الغرفة', icon: <Settings size={15} /> },
    { id: 'banned' as Tab, label: 'المحظورون', icon: <Ban size={15} /> },
    { id: 'room-log' as Tab, label: 'سجل الغرفة', icon: <LogOut size={15} /> },
    { id: 'reports' as Tab, label: 'تقارير المشرفين', icon: <FileText size={15} /> },
    { id: 'backup' as Tab, label: 'النسخ الاحتياطي', icon: <Database size={15} /> },
  ];

  const fmt = (d: string) => new Date(d).toLocaleString('ar', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  });

  const fmtDuration = (entered: string, left: string | null) => {
    if (!left) return 'متصل الآن';
    const ms = new Date(left).getTime() - new Date(entered).getTime();
    const m = Math.floor(ms / 60000);
    if (m < 1) return `${Math.floor(ms / 1000)} ثانية`;
    if (m < 60) return `${m} دقيقة`;
    return `${Math.floor(m / 60)} ساعة ${m % 60} دقيقة`;
  };

  if (!isOpen || !currentRoom) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200] font-sans p-4" dir="rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-4xl h-[600px] bg-[#eef4f9] border-2 border-[#84a9d1] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Title bar */}
          <div className="bg-gradient-to-b from-[#deedf7] to-[#b8d1e8] px-4 py-2 flex items-center justify-between border-b border-[#84a9d1] shrink-0">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-orange-500" />
              <span className="text-sm font-black text-[#1e3a5f]">إدارة الغرفة — {currentRoom.name}</span>
            </div>
            <button onClick={onClose} className="w-7 h-6 bg-red-500 hover:bg-red-600 border border-red-600 rounded flex items-center justify-center text-white text-xs font-black transition-colors">✕</button>
          </div>

          {/* Toast */}
          <AnimatePresence>
            {toast && (
              <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className={cn("px-5 py-2.5 text-xs font-black flex items-center gap-2 shrink-0 border-b",
                  toast.ok ? "bg-green-50 text-green-700 border-green-100" : "bg-red-50 text-red-700 border-red-100"
                )}>
                {toast.ok ? <Check size={14} /> : <X size={14} />} {toast.msg}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar */}
            <div className="w-48 bg-[#e0ecf7] border-l border-[#84a9d1]/30 p-3 flex flex-col gap-1 shrink-0">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); }}
                  className={cn(
                    "w-full px-3 py-2.5 flex items-center gap-2.5 text-[11px] font-black transition-all rounded-xl",
                    activeTab === tab.id
                      ? "bg-white text-orange-500 shadow-md border border-[#84a9d1]/20"
                      : "text-[#5a7a9a] hover:bg-white/60"
                  )}
                >
                  <span className={activeTab === tab.id ? "text-orange-500" : "text-[#84a9d1]"}>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col bg-white overflow-hidden">

              {/* ─── TAB: عام ─── */}
              {activeTab === 'general' && (
                <div className="flex-1 overflow-auto p-5 space-y-4">
                  <h3 className="text-sm font-black text-[#1e3a5f] border-b border-[#84a9d1]/20 pb-2">معلومات الغرفة</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'اسم الغرفة', value: currentRoom.name },
                      { label: 'الرابط', value: `/${currentRoom.slug}` },
                      { label: 'أقصى مستخدمين', value: `${currentRoom.max_users} مستخدم` },
                      { label: 'مقاعد المايك', value: `${currentRoom.max_mic_seats} مقعد` },
                      { label: 'النوع', value: currentRoom.is_private ? 'خاصة 🔒' : 'عامة 🌐' },
                      { label: 'المتصلون الآن', value: `${onlineUsers.length} شخص` },
                    ].map((item, i) => (
                      <div key={i} className="bg-[#f0f8ff] border border-[#b8d1e8] rounded-xl p-3">
                        <p className="text-[9px] font-black text-[#84a9d1] uppercase tracking-widest mb-1">{item.label}</p>
                        <p className="text-sm font-black text-[#1e3a5f]">{item.value}</p>
                      </div>
                    ))}
                  </div>
                  {currentRoom.welcome_message && (
                    <div className="bg-orange-50 border border-orange-100 rounded-xl p-3">
                      <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest mb-1">رسالة الترحيب</p>
                      <p className="text-sm text-orange-700 font-bold">{currentRoom.welcome_message}</p>
                    </div>
                  )}
                </div>
              )}

              {/* ─── TAB: التحكم المباشر ─── */}
              {activeTab === 'live-control' && (
                <div className="flex-1 overflow-hidden flex flex-col p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-[#84a9d1]/20 pb-2 flex-wrap gap-2">
                    <h3 className="text-sm font-black text-[#1e3a5f]">التحكم المباشر بالمتواجدين</h3>
                    <div className="flex gap-2">
                      {canAnnounce && (
                        <button onClick={handleAnnounce} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl text-xs font-black shadow transition-all">
                          📢 إعلان
                        </button>
                      )}
                      {canClearChat && (
                        <button onClick={handleClearChat} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-xl text-xs font-black shadow transition-all">
                          🗑️ مسح النص
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto space-y-2 pr-2 custom-scrollbar">
                    {onlineUsers.filter(u => u.id !== user?.id).map((u) => (
                      <div key={u.id} className="flex items-center justify-between p-3 bg-[#f0f8ff] border border-[#b8d1e8] rounded-xl hover:bg-white transition-colors group">
                        <div className="flex items-center gap-3">
                           <img src={u.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`} className="w-10 h-10 rounded-xl border border-[#84a9d1]/30 bg-white" alt="" />
                           <div>
                             <span className="block text-xs font-black text-[#1e3a5f]">{u.displayName}</span>
                             <span className="block text-[10px] text-[#84a9d1] font-bold">ID: {u.shortId || '---'}</span>
                           </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => handleMute(u.id, u.displayName)} className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center hover:bg-orange-500 hover:text-white transition-colors" title="إيقاف">
                            <MicOff size={14} />
                          </button>
                          {canKick && (
                            <button onClick={() => handleKick(u.id, u.displayName)} className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors" title="طرد">
                              <UserX size={14} />
                            </button>
                          )}
                          {canBan && (
                            <button onClick={() => handleBanUser(u.id, u.displayName)} className="w-8 h-8 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center hover:bg-gray-700 hover:text-white transition-colors" title="حظر">
                              <Ban size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {onlineUsers.length <= 1 && (
                      <p className="text-center text-[#84a9d1] font-black text-xs py-10">لا يوجد متصلين آخرين في الغرفة حالياً</p>
                    )}
                  </div>
                </div>
              )}

              {/* ─── TAB: النسخ الاحتياطي ─── */}
              {activeTab === 'backup' && (
                <div className="flex-1 overflow-auto p-5 space-y-4">
                  <h3 className="text-sm font-black text-[#1e3a5f] border-b border-[#84a9d1]/20 pb-2">النسخ الاحتياطي</h3>
                  <div className="space-y-3">
                    {[
                      { icon: <Users size={18} className="text-blue-500" />, label: 'تصدير قائمة المشرفين', desc: 'تنزيل ملف بكل أسماء وصلاحيات المشرفين' },
                      { icon: <Ban size={18} className="text-red-500" />, label: 'تصدير قائمة المحظورين', desc: 'تنزيل ملف بكل المحظورين وأسباب الحظر' },
                      { icon: <Settings size={18} className="text-green-500" />, label: 'تصدير إعدادات الغرفة', desc: 'حفظ الإعدادات الحالية كملف JSON' },
                    ].map((item, i) => (
                      <button key={i}
                        onClick={async () => {
                          let exportData: any = {};
                          if (i === 0) {
                            const { data } = await supabase.from('room_moderators').select('*, profiles(display_name, username)').eq('room_id', currentRoom.id);
                            exportData = data;
                          } else if (i === 1) {
                            const { data } = await supabase.from('room_bans').select('*, profiles(display_name, username)').eq('room_id', currentRoom.id);
                            exportData = data;
                          } else {
                            exportData = settings;
                          }
                          const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url; a.download = `room-backup-${item.label}.json`; a.click();
                          URL.revokeObjectURL(url);
                          showMsg('تم التصدير ✓');
                        }}
                        className="w-full flex items-center gap-4 p-4 bg-[#f0f8ff] border border-[#b8d1e8] rounded-2xl hover:bg-[#deedf7] transition-all text-right group"
                      >
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-[#84a9d1]/20 shadow-sm shrink-0">{item.icon}</div>
                        <div className="flex-1">
                          <p className="text-sm font-black text-[#1e3a5f] group-hover:text-orange-600 transition-colors">{item.label}</p>
                          <p className="text-[10px] text-[#84a9d1] font-bold">{item.desc}</p>
                        </div>
                        <Database size={16} className="text-[#84a9d1] group-hover:text-orange-500 transition-colors shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ─── TAB: إدارة الحسابات ─── */}
              {activeTab === 'accounts' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {showAddMod ? (
                    <div className="flex-1 overflow-auto p-5 space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-black text-[#1e3a5f]">
                          {editingMod ? `تعديل صلاحيات: ${editingMod.profiles?.display_name}` : 'إضافة مشرف جديد'}
                        </h3>
                        <button onClick={() => { setShowAddMod(false); setEditingMod(null); setModUsername(''); setModPermissions({}); setResolvedUser(null); }} className="text-[#84a9d1] hover:text-red-500"><X size={18} /></button>
                      </div>

                      {/* ID Input (only for new mod) */}
                      {!editingMod && (
                        <div className="space-y-2">
                          <div className="relative">
                            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#84a9d1]" />
                            <input
                              placeholder="أدخل رقم ID العضو..."
                              value={modUsername}
                              onChange={e => setModUsername(e.target.value)}
                              className="w-full border-2 border-[#84a9d1] rounded-xl px-4 py-2.5 pr-9 text-sm font-bold focus:outline-none focus:border-orange-500"
                            />
                          </div>
                          {/* Live preview */}
                          {resolving && (
                            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-600 font-bold">
                              <div className="w-4 h-4 border-2 border-blue-400 border-t-blue-700 rounded-full animate-spin" />
                              جاري البحث...
                            </div>
                          )}
                          {!resolving && resolvedUser && (
                            <div className="flex items-center gap-3 p-3 bg-green-50 border-2 border-green-400 rounded-xl">
                              <Check size={16} className="text-green-600 shrink-0" />
                              <div>
                                <p className="text-sm font-black text-green-800">{resolvedUser.display_name}</p>
                                <p className="text-[10px] text-green-600 font-bold">@{resolvedUser.username}</p>
                              </div>
                            </div>
                          )}
                          {!resolving && modUsername.trim() && !resolvedUser && (
                            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-bold">
                              <X size={14} />
                              لم يتم العثور على مستخدم بهذا الID
                            </div>
                          )}
                        </div>
                      )}

                      <div className="space-y-2">
                        <p className="text-xs font-black text-[#1e3a5f]">مسمى الرتبة في هذه الغرفة:</p>
                        <input
                          placeholder="مثلاً: مدير الغرفة، مراقب، مساعد..."
                          value={modRankName}
                          onChange={e => setModRankName(e.target.value)}
                          className="w-full border-2 border-[#84a9d1] rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      <div>
                        <p className="text-xs font-black text-[#1e3a5f] mb-2">الصلاحيات:</p>
                        <div className="grid grid-cols-2 gap-2">
                          {MOD_PERMISSIONS.map(p => (
                            <label key={p.key} className="flex items-center gap-2 cursor-pointer hover:bg-[#f0f8ff] px-2 py-1.5 rounded-lg transition-colors">
                              <input
                                type="checkbox"
                                checked={!!modPermissions[p.key]}
                                onChange={e => setModPermissions(prev => ({ ...prev, [p.key]: e.target.checked }))}
                                className="w-4 h-4 accent-orange-500 shrink-0"
                              />
                              <span className="text-xs font-bold text-[#1e3a5f]">{p.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={handleAddMod}
                        disabled={modSaving || (!editingMod && !resolvedUser)}
                        className="w-full py-3 bg-orange-500 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-orange-600 transition-all disabled:opacity-50 active:scale-95"
                      >
                        <Shield size={16} /> {modSaving ? 'جاري الحفظ...' : (editingMod ? 'حفظ الصلاحيات' : 'إضافة كمشرف')}
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="p-3 border-b border-[#84a9d1]/10 flex justify-between items-center shrink-0">
                        <span className="text-xs font-black text-[#84a9d1]">{moderators.length} مشرف</span>
                        {canAddMods && (
                          <button
                            onClick={() => { setShowAddMod(true); setEditingMod(null); setModUsername(''); setModPermissions({}); setResolvedUser(null); }}
                            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-black hover:bg-orange-600 transition-all active:scale-95 shadow-md"
                          >
                            <Plus size={14} /> إضافة مشرف
                          </button>
                        )}
                      </div>
                      <div className="flex-1 overflow-auto">
                        {loading ? (
                          <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div></div>
                        ) : moderators.length === 0 ? (
                          <div className="flex items-center justify-center h-full text-[#84a9d1] text-sm font-bold italic">لا يوجد مشرفون — أضف مشرفاً جديداً</div>
                        ) : (
                          <table className="w-full text-right text-xs">
                            <thead className="bg-[#f0f4f8] sticky top-0">
                              <tr>
                                <th className="p-3 font-black text-[#1e3a5f]">الاسم</th>
                                <th className="p-3 font-black text-[#1e3a5f]">الرتبة</th>
                                <th className="p-3 font-black text-[#1e3a5f]">الصلاحيات</th>
                                <th className="p-3 font-black text-[#1e3a5f]">تاريخ الإضافة</th>
                                <th className="p-3 font-black text-[#1e3a5f]">إجراء</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#84a9d1]/10">
                              {moderators.map(mod => (
                                <tr key={mod.id} className="hover:bg-[#f9fbfd]">
                                  <td className="p-3 font-black text-[#1e3a5f]">
                                    {mod.profiles?.display_name}
                                    <span className="block text-[9px] text-[#84a9d1] font-bold">ID: {mod.profiles?.short_id || '---'}</span>
                                  </td>
                                  <td className="p-3">
                                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-[10px] font-black">
                                       {mod.rank_name || 'مشرف'}
                                    </span>
                                  </td>
                                  <td className="p-3">
                                    <div className="flex flex-wrap gap-1">
                                      {Object.entries(mod.permissions || {}).filter(([, v]) => v).slice(0, 3).map(([k]) => (
                                        <span key={k} className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[8px] font-black">
                                          {MOD_PERMISSIONS.find(p => p.key === k)?.label || k}
                                        </span>
                                      ))}
                                      {Object.values(mod.permissions || {}).filter(Boolean).length > 3 && (
                                        <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[8px] font-black">+{Object.values(mod.permissions || {}).filter(Boolean).length - 3}</span>
                                      )}
                                      {Object.values(mod.permissions || {}).filter(Boolean).length === 0 && (
                                        <span className="text-[#84a9d1] text-[8px] font-bold italic">بدون صلاحيات</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="p-3 text-[#84a9d1] font-bold">{fmt(mod.created_at)}</td>
                                  <td className="p-3">
                                    <div className="flex gap-1">
                                      {canAddMods && (
                                        <button
                                          onClick={() => handleEditMod(mod)}
                                          className="p-1.5 bg-blue-50 text-blue-500 hover:bg-blue-100 rounded-lg transition-colors"
                                          title="تعديل الصلاحيات"
                                        ><Edit3 size={14} /></button>
                                      )}
                                      <button
                                        onClick={() => handleRemoveMod(mod.user_id, mod.profiles?.display_name)}
                                        className="p-1.5 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                                        title="إزالة المشرف"
                                      ><Trash2 size={14} /></button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ─── TAB: إعدادات الغرفة ─── */}
              {activeTab === 'settings' && (
                <div className="flex-1 overflow-auto p-5 space-y-5">
                  {loading ? (
                    <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div></div>
                  ) : (
                    <>
                      {/* من يستطيع الكتابة */}
                      <div className="bg-[#f0f8ff] border border-[#b8d1e8] rounded-2xl p-4">
                        <p className="text-xs font-black text-[#1e3a5f] mb-3 flex items-center gap-2"><Radio size={14} className="text-orange-500" /> من يستطيع الكتابة في الغرفة</p>
                        <div className="space-y-2">
                          {WRITE_OPTIONS.map(opt => (
                            <label key={opt.value} className="flex items-center gap-3 cursor-pointer hover:bg-white px-3 py-2 rounded-xl transition-colors">
                              <input type="radio" name="who_can_write" value={opt.value}
                                checked={settings.who_can_write === opt.value}
                                onChange={() => setSettings(s => ({ ...s, who_can_write: opt.value }))}
                                className="w-4 h-4 accent-orange-500"
                              />
                              <span className="text-sm font-bold text-[#1e3a5f]">{opt.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* الرسائل الخاصة */}
                      <div className="bg-[#f0f8ff] border border-[#b8d1e8] rounded-2xl p-4">
                        <p className="text-xs font-black text-[#1e3a5f] mb-3 flex items-center gap-2"><Lock size={14} className="text-blue-500" /> من يستطيع بدء محادثة خاصة</p>
                        <div className="space-y-2">
                          {WRITE_OPTIONS.map(opt => (
                            <label key={opt.value} className="flex items-center gap-3 cursor-pointer hover:bg-white px-3 py-2 rounded-xl transition-colors">
                              <input type="radio" name="who_can_pm" value={opt.value}
                                checked={settings.who_can_pm === opt.value}
                                onChange={() => setSettings(s => ({ ...s, who_can_pm: opt.value }))}
                                className="w-4 h-4 accent-orange-500"
                              />
                              <span className="text-sm font-bold text-[#1e3a5f]">{opt.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* قفل الغرفة */}
                      <div className="bg-[#f0f8ff] border border-[#b8d1e8] rounded-2xl p-4">
                        <p className="text-xs font-black text-[#1e3a5f] mb-3 flex items-center gap-2"><Lock size={14} className="text-red-500" /> قفل الغرفة</p>
                        <div className="space-y-2">
                          {LOCK_OPTIONS.map(opt => (
                            <label key={opt.value} className="flex items-center gap-3 cursor-pointer hover:bg-white px-3 py-2 rounded-xl transition-colors">
                              <input type="radio" name="room_locked" value={opt.value}
                                checked={settings.room_locked === opt.value}
                                onChange={() => setSettings(s => ({ ...s, room_locked: opt.value }))}
                                className="w-4 h-4 accent-orange-500"
                              />
                              <span className="text-sm font-bold text-[#1e3a5f]">{opt.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* خيارات متقدمة */}
                      <div className="bg-[#f0f8ff] border border-[#b8d1e8] rounded-2xl p-4 space-y-3">
                        <p className="text-xs font-black text-[#1e3a5f] mb-1">خيارات متقدمة</p>
                        {[
                          { key: 'gateway_enabled', label: 'بوابة دخول (الزوار ينتظرون الموافقة)', icon: <Shield size={13} className="text-purple-500" /> },
                          { key: 'images_allowed', label: 'السماح بإرسال الصور في النص العام', icon: <Image size={13} className="text-blue-500" /> },
                          { key: 'allow_master_add', label: 'السماح للماستر بإضافة أسماء ماستر', icon: <UserPlus size={13} className="text-green-500" /> },
                          { key: 'allow_master_settings', label: 'السماح للماستر بتغيير الإعدادات', icon: <Settings size={13} className="text-orange-500" /> },
                        ].map(item => (
                          <label key={item.key} className="flex items-center gap-3 cursor-pointer hover:bg-white px-3 py-2 rounded-xl transition-colors">
                            <input type="checkbox"
                              checked={!!(settings as any)[item.key]}
                              onChange={e => setSettings(s => ({ ...s, [item.key]: e.target.checked }))}
                              className="w-4 h-4 accent-orange-500 shrink-0"
                            />
                            <span className="shrink-0">{item.icon}</span>
                            <span className="text-sm font-bold text-[#1e3a5f]">{item.label}</span>
                          </label>
                        ))}
                      </div>

                      {/* Save */}
                      {canChangeSettings ? (
                        <button
                          onClick={handleSaveSettings}
                          className="w-full py-3.5 bg-[#1e3a5f] hover:bg-[#2a4e7c] text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
                        >
                          <Save size={16} /> حفظ الإعدادات
                        </button>
                      ) : (
                        <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-black text-center border border-red-200">
                          صلاحية تغيير الإعدادات مقفلة من قِبل إدارة الغرفة
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ─── TAB: المحظورون ─── */}
              {activeTab === 'banned' && (
                <div className="flex-1 overflow-auto">
                  {loading ? (
                    <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div></div>
                  ) : bannedUsers.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-[#84a9d1] text-sm font-bold italic">لا يوجد محظورون</div>
                  ) : (
                    <table className="w-full text-right text-xs">
                      <thead className="bg-[#f0f4f8] sticky top-0">
                        <tr>
                          <th className="p-3 font-black text-[#1e3a5f]">الاسم</th>
                          <th className="p-3 font-black text-[#1e3a5f]">السبب</th>
                          <th className="p-3 font-black text-[#1e3a5f]">تاريخ الحظر</th>
                          <th className="p-3 font-black text-[#1e3a5f]">رفع الحظر</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#84a9d1]/10">
                        {bannedUsers.map(ban => (
                          <tr key={ban.id} className="hover:bg-[#f9fbfd]">
                            <td className="p-3 font-black text-[#1e3a5f]">
                              {ban.profiles?.display_name || 'غير معروف'}
                              <span className="block text-[9px] text-[#84a9d1]">ID: {ban.profiles?.short_id || '---'}</span>
                            </td>
                            <td className="p-3 text-[#84a9d1] font-bold max-w-[140px] truncate">{ban.reason || 'بدون سبب'}</td>
                            <td className="p-3 text-[#84a9d1] font-bold">{fmt(ban.created_at)}</td>
                            <td className="p-3">
                              <button
                                onClick={() => handleUnban(ban.id, ban.profiles?.display_name, ban.user_id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-xl text-[10px] font-black hover:bg-green-200 transition-colors"
                              >
                                <RefreshCw size={11} /> رفع الحظر
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* ─── TAB: سجل الغرفة ─── */}
              {activeTab === 'room-log' && (
                <div className="flex-1 overflow-auto">
                  {loading ? (
                    <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div></div>
                  ) : roomLog.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-[#84a9d1] text-sm font-bold italic">لا يوجد سجل بعد</div>
                  ) : (
                    <table className="w-full text-right text-xs">
                      <thead className="bg-[#f0f4f8] sticky top-0">
                        <tr>
                          <th className="p-3 font-black text-[#1e3a5f]">الاسم</th>
                          <th className="p-3 text-center font-black text-[#1e3a5f]">المنطقة / IP</th>
                          <th className="p-3 font-black text-[#1e3a5f]">وقت الدخول</th>
                          <th className="p-3 font-black text-[#1e3a5f]">وقت الخروج</th>
                          <th className="p-3 font-black text-[#1e3a5f]">المدة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#84a9d1]/10">
                        {roomLog.map((visit, i) => (
                          <tr key={i} className="hover:bg-[#f9fbfd]">
                            <td className="p-3 font-black text-[#1e3a5f]">
                              {visit.profiles?.display_name || 'مجهول'}
                              <span className="block text-[9px] text-[#84a9d1]">ID: {visit.profiles?.short_id || '---'}</span>
                            </td>
                            <td className="p-3 text-center">
                              <span className="block text-[10px] text-[#1e3a5f] font-bold">{visit.ip_address || '—'}</span>
                              <span className="block text-[9px] text-[#84a9d1] font-bold">{visit.country || '—'}</span>
                            </td>
                            <td className="p-3 text-[#84a9d1] font-bold">{fmt(visit.entered_at)}</td>
                            <td className="p-3 text-[#84a9d1] font-bold">{visit.left_at ? fmt(visit.left_at) : <span className="text-green-600 font-black">متصل الآن</span>}</td>
                            <td className="p-3">
                              <span className="bg-[#f0f8ff] px-2 py-1 rounded-lg text-[10px] font-black text-[#1e3a5f] flex items-center gap-1 w-fit">
                                <Clock size={10} /> {fmtDuration(visit.entered_at, visit.left_at)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* ─── TAB: تقارير المشرفين ─── */}
              {activeTab === 'reports' && (
                <div className="flex-1 overflow-auto">
                  {loading ? (
                    <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div></div>
                  ) : modReports.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-[#84a9d1] text-sm font-bold italic">لا توجد تقارير بعد</div>
                  ) : (
                    <table className="w-full text-right text-xs">
                      <thead className="bg-[#f0f4f8] sticky top-0">
                        <tr>
                          <th className="p-3 font-black text-[#1e3a5f]">المشرف</th>
                          <th className="p-3 font-black text-[#1e3a5f]">الإجراء</th>
                          <th className="p-3 font-black text-[#1e3a5f]">المستهدف</th>
                          <th className="p-3 font-black text-[#1e3a5f]">التاريخ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#84a9d1]/10">
                        {modReports.map((report, i) => (
                          <tr key={i} className="hover:bg-[#f9fbfd]">
                            <td className="p-3 font-black text-[#1e3a5f]">
                              {report.actor?.display_name || 'النظام'}
                              {report.actor?.short_id && <span className="block text-[9px] text-[#84a9d1]">ID: {report.actor.short_id}</span>}
                            </td>
                            <td className="p-3">
                              <span className={cn(
                                "px-2 py-1 rounded-lg text-[10px] font-black",
                                report.action_type === 'kick' ? "bg-red-100 text-red-700" :
                                report.action_type === 'ban' ? "bg-red-200 text-red-800" :
                                report.action_type === 'mute' ? "bg-orange-100 text-orange-700" :
                                "bg-blue-100 text-blue-700"
                              )}>{report.action_label || report.action_type}</span>
                            </td>
                            <td className="p-3 text-[#1e3a5f] font-bold">
                              {report.target?.display_name || report.target_id || '—'}
                              {report.target?.short_id && <span className="block text-[9px] text-[#84a9d1]">ID: {report.target.short_id}</span>}
                            </td>
                            <td className="p-3 text-[#84a9d1] font-bold">{fmt(report.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}


            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
