import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useChatStore } from '../store/useChatStore';
import { User, Room, Gift, DEFAULT_SHOP_ITEMS } from '../types';
import {
  Users, MessageSquare, Gift as GiftIcon, Shield, Search, X,
  Trash2, Edit, Plus, Activity, TrendingUp, Ban, Check,
  Star, Package, AlertCircle, ToggleLeft, ToggleRight, Settings as SettingsIcon,
  Crown, ShieldCheck, UserCheck, UserPlus, LogOut, Info
} from 'lucide-react';
import { cn } from '../lib/utils';
import { SiteSettings } from '../types';

type Tab = 'users' | 'rooms' | 'gifts' | 'shop' | 'stats' | 'logs' | 'broadcast' | 'settings';

const ROLES = ['guest', 'member', 'friend', 'admin', 'super_admin', 'owner'];
const ROLE_LABELS: Record<string, string> = {
  owner: 'صاحب الموقع 👑',
  super_admin: 'إداري عام 🛡️',
  admin: 'مشرف 👨‍✈️',
  friend: 'صديق الموقع ✨',
  member: 'عضو 👤',
  guest: 'زائر 🏠',
};

const TAB_LABELS: Record<string, string> = {
  users: 'المستخدمين',
  rooms: 'الغرف',
  gifts: 'الهدايا',
  shop: 'المتجر',
  stats: 'الإحصائيات',
  logs: 'السجلات',
  broadcast: 'بث إعلاني',
  settings: 'الإعدادات'
};

const defaultRoom = {
  name: '', slug: '', description: '', max_mic_seats: 5,
  max_users: 100, is_private: false, requires_gateway_approval: false,
  welcome_message: '', cover_image_url: '', owner_id: '',
  private_chat_setting: 'all' as const
};

const defaultGift = {
  name_ar: '', name_en: '', image_url: '🎁', points_cost: 10,
  points_award: 5, effect_type: 'corner' as const, is_active: true
};

const defaultShopItem = {
  name_ar: '', category: 'frame', image_url: '', points_cost: 100, 
  duration_days: 30, is_active: true, preview_css: ''
};

export default function AdminDashboard() {
  const { setShowAdminDashboard, siteSettings } = useChatStore();
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [shopItems, setShopItems] = useState<any[]>([]);
  const [roomLogs, setRoomLogs] = useState<any[]>([]);
  const [stats, setStats] = useState({ users: 0, rooms: 0, gifts: 0, shopItems: 0, totalPoints: 0 });
  const [siteSettingsForm, setSiteSettingsForm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showCreateGift, setShowCreateGift] = useState(false);
  const [showCreateShopItem, setShowCreateShopItem] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [editingGift, setEditingGift] = useState<Gift | null>(null);
  const [editingShopItem, setEditingShopItem] = useState<any | null>(null);
  const [roomForm, setRoomForm] = useState(defaultRoom);
  const [giftForm, setGiftForm] = useState(defaultGift);
  const [shopItemForm, setShopItemForm] = useState(defaultShopItem);
  const [broadcastText, setBroadcastText] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => { fetchData(); }, [activeTab]);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'users') {
        const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
        if (data) setUsers(data);
      } else if (activeTab === 'rooms') {
        const { data } = await supabase.from('rooms').select('*').order('created_at', { ascending: false });
        if (data) setRooms(data as Room[]);
      } else if (activeTab === 'shop') {
        const { data } = await supabase.from('shop_items').select('*').order('category', { ascending: true });
        if (data) setShopItems(data);
      } else if (activeTab === 'stats') {
        const [u, r, g, s, pts] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('rooms').select('id', { count: 'exact', head: true }),
          supabase.from('gifts').select('id', { count: 'exact', head: true }),
          supabase.from('shop_items').select('id', { count: 'exact', head: true }),
          supabase.from('profiles').select('points'),
        ]);
        const totalPoints = pts.data?.reduce((a: number, p: any) => a + (p.points || 0), 0) || 0;
        setStats({ users: u.count || 0, rooms: r.count || 0, gifts: g.count || 0, shopItems: s.count || 0, totalPoints });
      } else if (activeTab === 'logs') {
        const { data } = await supabase.from('room_logs').select(`
          *,
          rooms(name),
          profiles(username, display_name)
        `).order('created_at', { ascending: false }).limit(200);
        if (data) setRoomLogs(data);
      } else if (activeTab === 'settings') {
        const { data } = await supabase.from('site_settings').select('*').single();
        if (data) setSiteSettingsForm(data);
      }
    } finally { setLoading(false); }
  };

  const handleSaveRoom = async () => {
    if (!roomForm.name.trim()) return;
    setSaving(true);
    const slug = roomForm.slug.trim() || roomForm.name.trim().replace(/\s+/g, '-').toLowerCase();
    const payload = {
      ...roomForm,
      slug,
      is_active: true,
      owner_id: roomForm.owner_id || null,
      private_chat_setting: roomForm.private_chat_setting || 'all'
    };
    if (editingRoom) {
      const { error } = await supabase.from('rooms').update(payload).eq('id', editingRoom.id);
      if (error) { showToast('فشل التحديث: ' + error.message, 'error'); }
      else showToast('تم تحديث الغرفة بنجاح ✅');
    } else {
      const { error } = await supabase.from('rooms').insert(payload);
      if (error) { showToast('فشل الإنشاء: ' + error.message, 'error'); }
      else showToast('تم إنشاء الغرفة بنجاح ✅');
    }
    setSaving(false);
    setShowCreateRoom(false);
    setEditingRoom(null);
    setRoomForm(defaultRoom);
    fetchData();
  };

  const handleDeleteRoom = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الغرفة نهائياً؟')) return;
    await supabase.from('rooms').delete().eq('id', id);
    showToast('تم حذف الغرفة');
    fetchData();
  };

  const handleSaveGift = async () => {
    if (!giftForm.name_ar.trim() || !giftForm.image_url.trim()) {
      showToast('يرجى ملء اسم الهدية والأيقونة', 'error'); return;
    }
    setSaving(true);
    if (editingGift) {
      const { error } = await supabase.from('gifts').update(giftForm).eq('id', editingGift.id);
      if (error) showToast('فشل التحديث: ' + error.message, 'error');
      else showToast('تم تحديث الهدية ✅');
    } else {
      const { error } = await supabase.from('gifts').insert(giftForm);
      if (error) showToast('فشل الإنشاء: ' + error.message, 'error');
      else showToast('تم إنشاء الهدية ✅');
    }
    setSaving(false);
    setShowCreateGift(false);
    setEditingGift(null);
    setGiftForm(defaultGift);
    fetchData();
  };

  const handleSaveShopItem = async () => {
    if (!shopItemForm.name_ar.trim() || !shopItemForm.image_url.trim()) {
      showToast('يرجى ملء اسم المنتج والأيقونة', 'error'); return;
    }
    setSaving(true);
    if (editingShopItem) {
      const { error } = await supabase.from('shop_items').update(shopItemForm).eq('id', editingShopItem.id);
      if (error) showToast('فشل التحديث: ' + error.message, 'error');
      else showToast('تم تحديث المنتج ✅');
    } else {
      const { error } = await supabase.from('shop_items').insert(shopItemForm);
      if (error) showToast('فشل الإنشاء: ' + error.message, 'error');
      else showToast('تم إنشاء المنتج ✅');
    }
    setSaving(false);
    setShowCreateShopItem(false);
    setEditingShopItem(null);
    setShopItemForm(defaultShopItem);
    fetchData();
  };

  const handleSaveSettings = async () => {
    if (!siteSettingsForm) return;
    setSaving(true);
    const { error } = await supabase.from('site_settings').update(siteSettingsForm).eq('id', siteSettingsForm.id);
    if (!error) {
      showToast('تم حفظ التغييرات بنجاح ✅');
      useChatStore.getState().setSiteSettings(siteSettingsForm);
    } else {
      showToast('فشل الحفظ: ' + error.message, 'error');
    }
    setSaving(false);
  };

  const filteredUsers = users.filter(u =>
    u.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sidebarTabs = [
    { id: 'users', label: TAB_LABELS.users, icon: <Users size={20} /> },
    { id: 'rooms', label: TAB_LABELS.rooms, icon: <MessageSquare size={20} /> },
    { id: 'gifts', label: TAB_LABELS.gifts, icon: <GiftIcon size={20} /> },
    { id: 'shop', label: TAB_LABELS.shop, icon: <Package size={20} /> },
    { id: 'logs', label: TAB_LABELS.logs, icon: <Activity size={20} /> },
    { id: 'broadcast', label: TAB_LABELS.broadcast, icon: <TrendingUp size={20} /> },
    { id: 'stats', label: TAB_LABELS.stats, icon: <Activity size={20} /> },
    { id: 'settings', label: TAB_LABELS.settings, icon: <SettingsIcon size={20} /> },
  ] as const;

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-xl flex items-center justify-center p-0 md:p-10 font-sans text-right" dir="rtl">
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-7xl h-full md:h-auto md:max-h-[900px] bg-white border border-white/20 rounded-none md:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header - Compact for Mobile */}
        <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2a4e7c] px-4 py-3 md:px-10 md:py-6 flex items-center justify-between text-white shrink-0 shadow-lg relative z-10">
          <div className="flex items-center gap-3 md:gap-5">
            <div className="w-10 h-10 md:w-14 md:h-14 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg transform -rotate-3">
              <Shield size={20} className="text-white md:size-[28px]" />
            </div>
            <div>
              <h2 className="text-sm md:text-2xl font-black tracking-tight">لوحة التحكم</h2>
              <p className="hidden md:block text-xs font-bold text-white/50">إدارة كافة جوانب المنصة</p>
            </div>
          </div>
          <button onClick={() => setShowAdminDashboard(false)}
            className="w-10 h-10 md:w-12 md:h-12 bg-white/10 hover:bg-white/20 rounded-xl md:rounded-2xl flex items-center justify-center transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Global Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className={cn("px-10 py-4 flex items-center gap-3 text-sm font-black shrink-0 relative z-20 shadow-sm",
                toast.type === 'success' ? "bg-green-500 text-white" : "bg-red-500 text-white"
              )}>
              {toast.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
              {toast.msg}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Sidebar - Horizontal scroll on mobile */}
          <div className="w-full md:w-64 bg-[#f8fbff] border-b md:border-b-0 md:border-l border-[#dee8f3] p-2 md:p-6 flex flex-row md:flex-col gap-2 md:gap-3 shrink-0 overflow-x-auto no-scrollbar">
            {sidebarTabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as Tab)}
                className={cn(
                  "whitespace-nowrap px-4 py-2.5 md:px-5 md:py-4 flex items-center gap-2 md:gap-4 text-[10px] md:text-sm font-black transition-all rounded-xl md:rounded-2xl border md:border-2 shadow-sm",
                  activeTab === tab.id
                    ? "bg-white text-orange-500 border-orange-100"
                    : "text-[#84a9d1] border-transparent hover:text-[#1e3a5f]"
                )}>
                <span className={cn("shrink-0", activeTab === tab.id ? "text-orange-500" : "text-[#84a9d1]")}>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
            {/* Toolbar - Stackable for Mobile */}
            <div className="px-4 py-4 md:px-10 md:py-6 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between shrink-0 bg-white/50 backdrop-blur-sm sticky top-0 z-10 gap-3">
              <div className="relative flex-1 max-w-none md:max-w-sm">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-[#84a9d1]" size={16} />
                <input type="text" placeholder="بحث..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-[#f3f7fb] border border-transparent rounded-xl md:rounded-2xl pr-10 pl-4 py-2.5 md:py-3.5 text-xs md:text-sm font-black text-[#1e3a5f] focus:outline-none focus:bg-white transition-all" />
              </div>
              <div className="flex gap-2">
                {activeTab === 'rooms' && (
                  <button onClick={() => { setRoomForm(defaultRoom); setEditingRoom(null); setShowCreateRoom(true); }}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 md:px-6 md:py-3.5 bg-orange-500 text-white rounded-xl md:rounded-2xl text-[10px] md:text-sm font-black shadow-lg">
                    <Plus size={16} /> إنشاء غرفة
                  </button>
                )}
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-auto custom-scrollbar p-4 md:p-8">
              {loading ? (
                <div className="h-full flex flex-col items-center justify-center gap-4">
                  <div className="w-14 h-14 border-[5px] border-orange-500/10 border-t-orange-500 rounded-full animate-spin"></div>
                  <span className="text-sm font-black text-[#84a9d1]">جاري جلب البيانات...</span>
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Users Management */}
                    {activeTab === 'users' && (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                           <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-4 md:p-6 rounded-2xl md:rounded-[2rem] text-white shadow-xl shadow-blue-500/10">
                              <span className="text-xs font-black text-white/60 mb-1 block">إجمالي الأعضاء</span>
                              <div className="text-2xl md:text-3xl font-black">{users.length}</div>
                           </div>
                           <div className="bg-gradient-to-br from-orange-500 to-orange-700 p-4 md:p-6 rounded-2xl md:rounded-[2rem] text-white shadow-xl shadow-orange-500/10">
                              <span className="text-xs font-black text-white/60 mb-1 block">المشرفين</span>
                              <div className="text-2xl md:text-3xl font-black">{users.filter(u => u.role !== 'member' && u.role !== 'guest').length}</div>
                           </div>
                           <div className="bg-gradient-to-br from-slate-700 to-slate-900 p-4 md:p-6 rounded-2xl md:rounded-[2rem] text-white shadow-xl shadow-slate-900/10">
                              <span className="text-xs font-black text-white/60 mb-1 block">إجمالي النقاط</span>
                              <div className="text-2xl md:text-3xl font-black">{stats.totalPoints.toLocaleString()}</div>
                           </div>
                        </div>

                        <div className="bg-white rounded-2xl md:rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                          <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-right min-w-[1000px]">
                              <thead>
                                <tr className="bg-[#f8fbff] text-[#1e3a5f] text-[10px] md:text-xs font-black">
                                  <th className="p-4 md:p-5">العضو</th>
                                  <th className="p-4 md:p-5 text-center">النقاط</th>
                                  <th className="p-4 md:p-5 text-center">الرتبة</th>
                                  <th className="p-4 md:p-5 text-center">تاريخ التسجيل</th>
                                  <th className="p-4 md:p-5 text-center">إجراءات</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                {filteredUsers.map(u => (
                                  <tr key={u.id} className="hover:bg-blue-50/30 transition-colors group">
                                    <td className="p-4 md:p-5">
                                      <div className="flex items-center gap-4">
                                        <div className="relative shrink-0 w-12 h-12">
                                          {/* Base Avatar Container */}
                                          <div className="w-full h-full rounded-2xl bg-white border-2 border-white shadow-md flex items-center justify-center text-xl overflow-hidden relative">
                                            {u.avatar_url?.startsWith('http') || u.avatar_url?.startsWith('/') ? (
                                              <img src={u.avatar_url} className="w-full h-full object-cover" alt="" />
                                            ) : (
                                              u.avatar_url || '👤'
                                            )}
                                          </div>
                                          
                                          {/* Ornamental Frame Overlay */}
                                          {(() => {
                                            const frameItem = DEFAULT_SHOP_ITEMS.find(s => s.id === (u as any).equipped_frame)
                                                           || DEFAULT_SHOP_ITEMS.find(s => s.category === 'frame' && s.preview_css === (u as any).equipped_frame);
                                            return frameItem ? <div className={cn("absolute inset-0 z-10", frameItem.preview_css)}></div> : null;
                                          })()}

                                          <div className={cn("absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white z-20", u.is_guest ? "bg-gray-400" : "bg-green-500")} />
                                        </div>
                                        <div className="min-w-0">
                                          <div className="text-sm font-black text-[#1e3a5f] group-hover:text-orange-500 transition-colors font-sans truncate flex items-center gap-1">
                                            {u.display_name}
                                            {(() => {
                                              const badgeItem = DEFAULT_SHOP_ITEMS.find(s => s.id === (u as any).equipped_badge)
                                                             || DEFAULT_SHOP_ITEMS.find(s => s.category === 'badge' && s.preview_css === (u as any).equipped_badge);
                                              return badgeItem ? <span className="name-badge">{badgeItem.image_url}</span> : null;
                                            })()}
                                          </div>
                                          <div className="text-[10px] font-bold text-[#84a9d1]">@{u.username}</div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="p-4 md:p-5 text-center">
                                      <span className="text-sm font-black text-orange-600 font-mono bg-orange-50 px-3 py-1 rounded-full border border-orange-100">{u.points.toLocaleString()}</span>
                                    </td>
                                    <td className="p-4 md:p-5 text-center">
                                      <select value={u.role || 'member'} onChange={e => {
                                         supabase.from('profiles').update({ role: e.target.value }).eq('id', u.id).then(() => {
                                            showToast('تم تحديث الرتبة');
                                            fetchData();
                                         });
                                      }}
                                        className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-[11px] font-black text-[#1e3a5f] focus:outline-none hover:bg-white transition-all cursor-pointer">
                                        {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                                      </select>
                                    </td>
                                    <td className="p-4 md:p-5 text-center">
                                       <span className="text-[10px] font-bold text-slate-400">{new Date(u.created_at).toLocaleDateString('ar-EG')}</span>
                                    </td>
                                    <td className="p-4 md:p-5 text-center">
                                      <div className="flex items-center justify-center gap-2">
                                        <button onClick={() => { if(confirm('طرد المستخدم؟')) useChatStore.getState().processAdminAction('kick', u.id); }}
                                          className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all">
                                          <Ban size={18} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Rooms Management */}
                    {activeTab === 'rooms' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                        {rooms.map(room => (
                          <div key={room.id} className="bg-white rounded-3xl md:rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-xl group hover:border-orange-200 transition-all flex flex-col">
                            <div className="h-32 md:h-40 relative bg-slate-900 overflow-hidden shrink-0">
                               {room.cover_image_url ? (
                                 <img src={room.cover_image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-60" alt="" />
                               ) : (
                                 <div className="w-full h-full bg-gradient-to-br from-[#1e3a5f] to-[#2a4e7c] flex items-center justify-center">
                                   <MessageSquare size={32} className="text-white/20 md:size-[48px]" />
                                 </div>
                               )}
                               <div className="absolute top-3 left-3 bg-white/20 backdrop-blur-md px-2 py-1 rounded-full border border-white/30">
                                  <span className="text-[9px] font-black text-white">{room.is_private ? 'خاص 🔒' : 'عام 🌍'}</span>
                                </div>
                            </div>
                            <div className="p-4 md:p-6 flex flex-col flex-1">
                               <h3 className="text-sm md:text-lg font-black text-[#1e3a5f] mb-1 truncate">{room.name}</h3>
                               <p className="text-[9px] md:text-[11px] font-bold text-[#84a9d1] mb-4">/{room.slug}</p>
                               
                               <div className="flex items-center gap-4 mb-6">
                                  <div className="flex flex-col">
                                     <span className="text-[8px] md:text-[10px] font-black text-[#84a9d1]">السعة</span>
                                     <span className="text-xs font-black text-[#1e3a5f]">{room.max_users}</span>
                                  </div>
                                  <div className="flex flex-col">
                                     <span className="text-[8px] md:text-[10px] font-black text-[#84a9d1]">المايكات</span>
                                     <span className="text-xs font-black text-[#1e3a5f]">{room.max_mic_seats}</span>
                                  </div>
                               </div>

                               <div className="flex items-center gap-2 mt-auto">
                                  <button onClick={() => {
                                     supabase.from('rooms').update({ is_active: !room.is_active }).eq('id', room.id).then(() => {
                                        showToast(room.is_active ? 'تعطيل نجح' : 'تفعيل نجح');
                                        fetchData();
                                     });
                                  }}
                                    className={cn("flex-1 py-2 md:py-3 rounded-xl text-[10px] md:text-xs font-black transition-all", 
                                      room.is_active ? "bg-green-50 text-green-600 border border-green-100 hover:bg-green-500 hover:text-white" : "bg-red-50 text-red-600 border border-red-100 hover:bg-red-500 hover:text-white")}>
                                    {room.is_active ? 'نشطة' : 'معطلة'}
                                  </button>
                                  <button onClick={() => { setRoomForm({...room} as any); setEditingRoom(room); setShowCreateRoom(true); }} className="w-10 h-10 md:w-12 md:h-12 rounded-xl border border-slate-100 flex items-center justify-center text-slate-400 hover:text-blue-500 transition-colors">
                                     <Edit size={18} className="md:size-[20px]" />
                                  </button>
                                  <button onClick={() => handleDeleteRoom(room.id)} className="w-10 h-10 md:w-12 md:h-12 rounded-xl border border-slate-100 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors">
                                     <Trash2 size={18} className="md:size-[20px]" />
                                  </button>
                               </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Gifts/Shop */}
                    {(activeTab === 'gifts' || activeTab === 'shop') && (
                      <div className="bg-white rounded-3xl p-6 md:p-10 border border-slate-100 shadow-sm text-center">
                         <h3 className="text-lg md:text-xl font-black text-[#1e3a5f] mb-2">{TAB_LABELS[activeTab]}</h3>
                         <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-6 mt-6">
                            {(activeTab === 'gifts' ? gifts : shopItems).map((it: any) => (
                               <div key={it.id} className="p-3 md:p-6 rounded-2xl md:rounded-3xl bg-slate-50 border border-slate-100 hover:border-orange-200 transition-all cursor-pointer group relative"
                                 onClick={() => {
                                   if (activeTab === 'gifts') {
                                     setGiftForm({...it});
                                     setEditingGift(it);
                                     setShowCreateGift(true);
                                   } else if (activeTab === 'shop') {
                                     setShopItemForm({...it});
                                     setEditingShopItem(it);
                                     setShowCreateShopItem(true);
                                   }
                                 }}
                               >
                                  <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Edit size={14} className="text-blue-500" />
                                  </div>
                                  <div className="text-3xl md:text-4xl mb-2">
                                    {it.image_url?.startsWith('http') ? <img src={it.image_url} className="w-10 h-10 md:w-16 md:h-16 mx-auto object-contain" alt="" /> : it.image_url}
                                  </div>
                                  <div className="text-[10px] md:text-sm font-black text-[#1e3a5f] truncate">{it.name_ar}</div>
                                  <div className="text-[9px] md:text-xs font-black text-orange-500">{it.points_cost}💎</div>
                               </div>
                            ))}
                            <button 
                              onClick={() => {
                                if (activeTab === 'gifts') { setGiftForm(defaultGift); setEditingGift(null); setShowCreateGift(true); }
                                else if (activeTab === 'shop') { setShopItemForm(defaultShopItem); setEditingShopItem(null); setShowCreateShopItem(true); }
                              }}
                              className="p-3 md:p-6 rounded-2xl md:rounded-3xl border-2 border-dashed border-slate-200 hover:border-orange-300 hover:bg-orange-50 transition-all flex flex-col items-center justify-center gap-2 text-[#84a9d1] hover:text-orange-500"
                            >
                              <Plus size={24} />
                              <span className="text-[10px] md:text-xs font-black">إضافة جديد</span>
                            </button>
                         </div>
                      </div>
                    )}

                    {activeTab === 'broadcast' && (
                      <div className="max-w-2xl mx-auto py-10 md:py-20 text-center">
                         <h3 className="text-xl md:text-2xl font-black text-[#1e3a5f] mb-4">بث رسالة لجميع الغرف</h3>
                         <textarea 
                            value={broadcastText}
                            onChange={(e) => setBroadcastText(e.target.value)}
                            placeholder="ما الذي تود قوله للجميع اليوم؟..." 
                            className="w-full h-32 md:h-48 p-4 md:p-6 rounded-2xl md:rounded-[2rem] bg-[#f9fbfd] border-2 border-slate-100 text-xs md:text-sm font-bold focus:outline-none focus:border-orange-500 shadow-inner mb-6"
                         />
                         <button 
                           onClick={() => {
                              if (!broadcastText.trim()) return;
                              useChatStore.getState().addMessage({
                                id: Math.random().toString(),
                                userId: 'system',
                                username: 'System',
                                displayName: 'إدارة الموقع',
                                role: 'admin',
                                roleColor: '#f97316',
                                text: broadcastText,
                                timestamp: new Date().toISOString(),
                                type: 'system'
                              });
                              showToast('تم إرسال البث بنجاح ✅');
                              setBroadcastText('');
                           }}
                           className="w-full py-4 md:py-5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl md:rounded-[2rem] font-black text-sm md:text-lg shadow-xl active:scale-95 transition-all">
                           إرسال الإعلان الآن ✨
                         </button>
                      </div>
                    )}

                    {activeTab === 'settings' && siteSettingsForm && (
                       <div className="max-w-3xl mx-auto bg-white rounded-3xl md:rounded-[3rem] p-6 md:p-12 border border-slate-100 shadow-xl">
                          <h3 className="text-xl md:text-2xl font-black text-[#1e3a5f] mb-6 md:mb-10 pb-6 border-b">الإعدادات</h3>
                          <div className="space-y-6 md:space-y-8">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                   <label className="text-xs font-black text-[#1e3a5f] px-2">اسم الموقع</label>
                                   <input type="text" value={siteSettingsForm.site_name} onChange={e => setSiteSettingsForm({...siteSettingsForm, site_name: e.target.value})}
                                      className="w-full bg-[#f8fbff] border border-slate-100 rounded-xl md:rounded-2xl px-4 md:px-5 py-3 md:py-4 text-xs md:text-sm font-bold focus:outline-none focus:border-orange-500 focus:bg-white" />
                                </div>
                                <div className="space-y-2">
                                   <label className="text-xs font-black text-[#1e3a5f] px-2">اسم العملة</label>
                                   <input type="text" value={siteSettingsForm.points_name} onChange={e => setSiteSettingsForm({...siteSettingsForm, points_name: e.target.value})}
                                      className="w-full bg-[#f8fbff] border border-slate-100 rounded-xl md:rounded-2xl px-4 md:px-5 py-3 md:py-4 text-xs md:text-sm font-bold focus:outline-none focus:border-orange-500 focus:bg-white" />
                                </div>
                             </div>
                             <div className="space-y-2">
                                <label className="text-xs font-black text-[#1e3a5f] px-2">نقاط الترحيب</label>
                                <input type="number" value={siteSettingsForm.default_points} onChange={e => setSiteSettingsForm({...siteSettingsForm, default_points: parseInt(e.target.value)})}
                                   className="w-full bg-[#f8fbff] border border-slate-100 rounded-xl md:rounded-2xl px-4 md:px-5 py-3 md:py-4 text-xs md:text-sm font-bold focus:outline-none focus:border-orange-500 focus:bg-white" />
                             </div>
                             <button onClick={handleSaveSettings} disabled={saving}
                                className="w-full mt-4 py-4 md:py-5 bg-[#1e3a5f] text-white rounded-xl md:rounded-[2rem] font-black text-sm md:text-lg shadow-xl active:scale-95">
                                {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                             </button>
                          </div>
                       </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </div>
        </div>

        {/* ─── MODALS ─── */}
        <AnimatePresence>
          {showCreateRoom && (
            <div className="fixed inset-0 z-[300] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                <div className="px-8 py-6 bg-[#1e3a5f] text-white flex items-center justify-between">
                  <h3 className="text-xl font-black">{editingRoom ? 'تعديل الغرفة' : 'إنشاء غرفة جديدة'}</h3>
                  <button onClick={() => setShowCreateRoom(false)} className="bg-white/10 p-2 rounded-xl"><X size={20} /></button>
                </div>
                <div className="flex-1 overflow-auto p-8 space-y-6 custom-scrollbar">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-[#1e3a5f]">اسم الغرفة</label>
                      <input type="text" value={roomForm.name} onChange={e => setRoomForm({...roomForm, name: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-[#1e3a5f]">الرابط (Slug)</label>
                      <input type="text" value={roomForm.slug} onChange={e => setRoomForm({...roomForm, slug: e.target.value})}
                        placeholder="اتركه فارغاً للتوليد التلقائي"
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-[#1e3a5f]">الوصف</label>
                    <textarea value={roomForm.description} onChange={e => setRoomForm({...roomForm, description: e.target.value})}
                      className="w-full h-24 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-[#1e3a5f]">أقصى عدد مستخدمين</label>
                      <input type="number" value={roomForm.max_users} onChange={e => setRoomForm({...roomForm, max_users: parseInt(e.target.value)})}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-[#1e3a5f]">أقصى عدد مايكات</label>
                      <input type="number" value={roomForm.max_mic_seats} onChange={e => setRoomForm({...roomForm, max_mic_seats: parseInt(e.target.value)})}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-[#1e3a5f]">رابط صورة الغلاف</label>
                    <input type="text" value={roomForm.cover_image_url} onChange={e => setRoomForm({...roomForm, cover_image_url: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
                  </div>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={roomForm.is_private} onChange={e => setRoomForm({...roomForm, is_private: e.target.checked})} />
                      <span className="text-xs font-black text-[#1e3a5f]">غرفة خاصة (كلمة مرور)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={roomForm.requires_gateway_approval} onChange={e => setRoomForm({...roomForm, requires_gateway_approval: e.target.checked})} />
                      <span className="text-xs font-black text-[#1e3a5f]">تفعيل بوابة الدخول</span>
                    </label>
                  </div>
                </div>
                <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                  <button onClick={handleSaveRoom} disabled={saving}
                    className="flex-1 bg-orange-500 text-white py-4 rounded-2xl font-black text-sm shadow-lg active:scale-95 transition-all">
                    {saving ? 'جاري الحفظ...' : 'حفظ البيانات ✓'}
                  </button>
                  <button onClick={() => setShowCreateRoom(false)} className="px-8 py-4 bg-white border border-slate-200 rounded-2xl font-black text-sm text-[#84a9d1]">إلغاء</button>
                </div>
              </motion.div>
            </div>
          )}

          {showCreateGift && (
            <div className="fixed inset-0 z-[300] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden flex flex-col shadow-2xl">
                <div className="px-8 py-6 bg-[#1e3a5f] text-white flex items-center justify-between">
                  <h3 className="text-xl font-black">{editingGift ? 'تعديل هدية' : 'إضافة هدية جديدة'}</h3>
                  <button onClick={() => setShowCreateGift(false)} className="bg-white/10 p-2 rounded-xl"><X size={20} /></button>
                </div>
                <div className="p-8 space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-[#1e3a5f]">الاسم بالعربية</label>
                    <input type="text" value={giftForm.name_ar} onChange={e => setGiftForm({...giftForm, name_ar: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-[#1e3a5f]">أيقونة أو رابط الصورة</label>
                    <input type="text" value={giftForm.image_url} onChange={e => setGiftForm({...giftForm, image_url: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-[#1e3a5f]">سعر البيع (نقاط)</label>
                      <input type="number" value={giftForm.points_cost} onChange={e => setGiftForm({...giftForm, points_cost: parseInt(e.target.value)})}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-[#1e3a5f]">نقاط الربح للمستلم</label>
                      <input type="number" value={giftForm.points_award} onChange={e => setGiftForm({...giftForm, points_award: parseInt(e.target.value)})}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
                    </div>
                  </div>
                </div>
                <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                  <button onClick={handleSaveGift} disabled={saving}
                    className="flex-1 bg-orange-500 text-white py-4 rounded-2xl font-black text-sm shadow-lg active:scale-95 transition-all">
                    {saving ? 'جاري الحفظ...' : 'حفظ الهدية ✓'}
                  </button>
                  <button onClick={() => setShowCreateGift(false)} className="px-8 py-4 bg-white border border-slate-200 rounded-2xl font-black text-sm text-[#84a9d1]">إلغاء</button>
                </div>
              </motion.div>
            </div>
          )}

          {showCreateShopItem && (
            <div className="fixed inset-0 z-[300] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden flex flex-col shadow-2xl">
                <div className="px-8 py-6 bg-[#1e3a5f] text-white flex items-center justify-between">
                  <h3 className="text-xl font-black">{editingShopItem ? 'تعديل منتج' : 'إضافة منتج جديد'}</h3>
                  <button onClick={() => setShowCreateShopItem(false)} className="bg-white/10 p-2 rounded-xl"><X size={20} /></button>
                </div>
                <div className="p-8 space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-[#1e3a5f]">نوع المنتج</label>
                      <select value={shopItemForm.category} onChange={e => setShopItemForm({...shopItemForm, category: e.target.value as any})}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-orange-500">
                        <option value="frame">إطار بروفايل</option>
                        <option value="entry_effect">تأثير دخول</option>
                        <option value="badge">شارة مميزة</option>
                        <option value="avatar">صورة رمزية VIP</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-[#1e3a5f]">الاسم بالعربية</label>
                      <input type="text" value={shopItemForm.name_ar} onChange={e => setShopItemForm({...shopItemForm, name_ar: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-[#1e3a5f]">أيقونة أو رابط الصورة</label>
                      <input type="text" value={shopItemForm.image_url} onChange={e => setShopItemForm({...shopItemForm, image_url: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-[#1e3a5f]">سعر البيع (نقاط)</label>
                        <input type="number" value={shopItemForm.points_cost} onChange={e => setShopItemForm({...shopItemForm, points_cost: parseInt(e.target.value)})}
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-[#1e3a5f]">مدة الصلاحية (أيام)</label>
                        <input type="number" value={shopItemForm.duration_days} onChange={e => setShopItemForm({...shopItemForm, duration_days: parseInt(e.target.value)})}
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                  <button onClick={handleSaveShopItem} disabled={saving}
                    className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 rounded-2xl font-black text-sm shadow-lg active:scale-95 transition-all">
                    {saving ? 'جاري الحفظ...' : 'حفظ المنتج ✓'}
                  </button>
                  <button onClick={() => setShowCreateShopItem(false)} className="px-8 py-4 bg-white border border-slate-200 rounded-2xl font-black text-sm text-[#84a9d1]">إلغاء</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
