import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useChatStore } from '../store/useChatStore';
import { User, Room, Gift } from '../types';
import {
  Users, MessageSquare, Gift as GiftIcon, Shield, Search, X,
  Trash2, Edit, Plus, Activity, TrendingUp, Ban, Check,
  Star, Package, AlertCircle, ToggleLeft, ToggleRight, Settings as SettingsIcon
} from 'lucide-react';
import { cn } from '../lib/utils';
import { SiteSettings } from '../types';

type Tab = 'users' | 'rooms' | 'gifts' | 'shop' | 'stats' | 'logs' | 'broadcast' | 'settings';

const ROLES = ['guest', 'member', 'friend', 'admin', 'super_admin', 'owner'];
const ROLE_LABELS: Record<string, string> = {
  owner: 'ط·آµط·آ§ط·آ­ط·آ¨ ط·آ§ط¸â€‍ط¸â€¦ط¸ث†ط¸â€ڑط·آ¹', super_admin: 'ط¸â€¦ط·آ´ط·آ±ط¸ظ¾ ط·آ¹ط·آ§ط¸â€¦', admin: 'ط¸â€¦ط·آ´ط·آ±ط¸ظ¾',
  friend: 'ط·آµط·آ¯ط¸ظ¹ط¸â€ڑ', member: 'ط·آ¹ط·آ¶ط¸ث†', guest: 'ط·آ²ط·آ§ط·آ¦ط·آ±',
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
  const [shopItemForm, setShopItemForm] = useState({ name_ar: '', category: 'frame', image_url: '', points_cost: 0, preview_css: '' });
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

  // أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬ ROOMS أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬
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
      if (error) { showToast('ط¸ظ¾ط·آ´ط¸â€‍ ط·آ§ط¸â€‍ط·ع¾ط·آ­ط·آ¯ط¸ظ¹ط·آ«: ' + error.message, 'error'); }
      else showToast('ط·ع¾ط¸â€¦ ط·ع¾ط·آ­ط·آ¯ط¸ظ¹ط·آ« ط·آ§ط¸â€‍ط·ط›ط·آ±ط¸ظ¾ط·آ© ط·آ¨ط¸â€ ط·آ¬ط·آ§ط·آ­ أ¢إ“â€œ');
    } else {
      const { error } = await supabase.from('rooms').insert(payload);
      if (error) { showToast('ط¸ظ¾ط·آ´ط¸â€‍ ط·آ§ط¸â€‍ط·آ¥ط¸â€ ط·آ´ط·آ§ط·طŒ: ' + error.message, 'error'); }
      else showToast('ط·ع¾ط¸â€¦ ط·آ¥ط¸â€ ط·آ´ط·آ§ط·طŒ ط·آ§ط¸â€‍ط·ط›ط·آ±ط¸ظ¾ط·آ© ط·آ¨ط¸â€ ط·آ¬ط·آ§ط·آ­ أ¢إ“â€œ');
    }
    setSaving(false);
    setShowCreateRoom(false);
    setEditingRoom(null);
    setRoomForm(defaultRoom);
    fetchData();
  };

  const handleEditRoom = (room: Room) => {
    setEditingRoom(room);
    setRoomForm({
      name: room.name, slug: room.slug, description: room.description || '',
      max_mic_seats: room.max_mic_seats, max_users: room.max_users,
      is_private: room.is_private, requires_gateway_approval: room.requires_gateway_approval,
      welcome_message: room.welcome_message || '', cover_image_url: room.cover_image_url || '',
      owner_id: room.owner_id || '',
      private_chat_setting: room.private_chat_setting || 'all'
    });
    setShowCreateRoom(true);
  };

  const handleToggleRoom = async (room: Room) => {
    await supabase.from('rooms').update({ is_active: !room.is_active }).eq('id', room.id);
    showToast(room.is_active ? 'ط·ع¾ط¸â€¦ ط·ع¾ط·آ¹ط·آ·ط¸ظ¹ط¸â€‍ ط·آ§ط¸â€‍ط·ط›ط·آ±ط¸ظ¾ط·آ©' : 'ط·ع¾ط¸â€¦ ط·ع¾ط¸ظ¾ط·آ¹ط¸ظ¹ط¸â€‍ ط·آ§ط¸â€‍ط·ط›ط·آ±ط¸ظ¾ط·آ©');
    fetchData();
  };

  const handleDeleteRoom = async (id: string) => {
    if (!confirm('ط¸â€،ط¸â€‍ ط·آ£ط¸â€ ط·ع¾ ط¸â€¦ط·ع¾ط·آ£ط¸ئ’ط·آ¯ ط¸â€¦ط¸â€  ط·آ­ط·آ°ط¸ظ¾ ط¸â€،ط·آ°ط¸â€، ط·آ§ط¸â€‍ط·ط›ط·آ±ط¸ظ¾ط·آ© ط¸â€ ط¸â€،ط·آ§ط·آ¦ط¸ظ¹ط·آ§ط¸â€¹ط·ع؛')) return;
    await supabase.from('rooms').delete().eq('id', id);
    showToast('ط·ع¾ط¸â€¦ ط·آ­ط·آ°ط¸ظ¾ ط·آ§ط¸â€‍ط·ط›ط·آ±ط¸ظ¾ط·آ©');
    fetchData();
  };

  // أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬ GIFTS أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬
  const handleSaveGift = async () => {
    if (!giftForm.name_ar.trim() || !giftForm.image_url.trim()) {
      showToast('ط¸ظ¹ط·آ±ط·آ¬ط¸â€° ط¸â€¦ط¸â€‍ط·طŒ ط·آ§ط·آ³ط¸â€¦ ط·آ§ط¸â€‍ط¸â€،ط·آ¯ط¸ظ¹ط·آ© ط¸ث†ط·آ§ط¸â€‍ط·آ¥ط¸ظ¹ط¸â€¦ط¸ث†ط·آ¬ط¸ظ¹', 'error'); return;
    }
    setSaving(true);
    if (editingGift) {
      const { error } = await supabase.from('gifts').update(giftForm).eq('id', editingGift.id);
      if (error) showToast('ط¸ظ¾ط·آ´ط¸â€‍ ط·آ§ط¸â€‍ط·ع¾ط·آ­ط·آ¯ط¸ظ¹ط·آ«: ' + error.message, 'error');
      else showToast('ط·ع¾ط¸â€¦ ط·ع¾ط·آ­ط·آ¯ط¸ظ¹ط·آ« ط·آ§ط¸â€‍ط¸â€،ط·آ¯ط¸ظ¹ط·آ© أ¢إ“â€œ');
    } else {
      const { error } = await supabase.from('gifts').insert(giftForm);
      if (error) showToast('ط¸ظ¾ط·آ´ط¸â€‍ ط·آ§ط¸â€‍ط·آ¥ط¸â€ ط·آ´ط·آ§ط·طŒ: ' + error.message, 'error');
      else showToast('ط·ع¾ط¸â€¦ ط·آ¥ط¸â€ ط·آ´ط·آ§ط·طŒ ط·آ§ط¸â€‍ط¸â€،ط·آ¯ط¸ظ¹ط·آ© أ¢إ“â€œ');
    }
    setSaving(false);
    setShowCreateGift(false);
    setEditingGift(null);
    setGiftForm(defaultGift);
    fetchData();
  };

  const handleEditGift = (gift: Gift) => {
    setEditingGift(gift);
    setGiftForm({
      name_ar: gift.name_ar, name_en: gift.name_en || '', image_url: gift.image_url,
      points_cost: gift.points_cost, points_award: gift.points_award,
      effect_type: gift.effect_type, is_active: (gift as any).is_active ?? true
    });
    setShowCreateGift(true);
  };

  const handleToggleGift = async (gift: Gift) => {
    await supabase.from('gifts').update({ is_active: !(gift as any).is_active }).eq('id', gift.id);
    showToast((gift as any).is_active ? 'ط·ع¾ط¸â€¦ ط·آ¥ط·آ®ط¸ظ¾ط·آ§ط·طŒ ط·آ§ط¸â€‍ط¸â€،ط·آ¯ط¸ظ¹ط·آ©' : 'ط·ع¾ط¸â€¦ ط·ع¾ط¸ظ¾ط·آ¹ط¸ظ¹ط¸â€‍ ط·آ§ط¸â€‍ط¸â€،ط·آ¯ط¸ظ¹ط·آ©');
    fetchData();
  };

  const handleDeleteGift = async (id: string) => {
    if (!confirm('ط·آ­ط·آ°ط¸ظ¾ ط¸â€،ط·آ°ط¸â€، ط·آ§ط¸â€‍ط¸â€،ط·آ¯ط¸ظ¹ط·آ©ط·ع؛')) return;
    await supabase.from('gifts').delete().eq('id', id);
    showToast('ط·ع¾ط¸â€¦ ط·آ­ط·آ°ط¸ظ¾ ط·آ§ط¸â€‍ط¸â€،ط·آ¯ط¸ظ¹ط·آ©');
    fetchData();
  };

  // أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬ USERS أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬
  const handleUpdateRole = async (userId: string, role: string) => {
    await supabase.from('profiles').update({ role }).eq('id', userId);
    showToast('ط·ع¾ط¸â€¦ ط·ع¾ط·آ­ط·آ¯ط¸ظ¹ط·آ« ط·آ§ط¸â€‍ط·آ±ط·ع¾ط·آ¨ط·آ©');
    fetchData();
  };

  const handleUpdatePoints = async (userId: string, current: number, delta: number) => {
    await supabase.from('profiles').update({ points: Math.max(0, current + delta) }).eq('id', userId);
    fetchData();
  };

  // أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬ SHOP ITEMS أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬
  const handleSaveShopItem = async () => {
    if (!shopItemForm.name_ar.trim() || !shopItemForm.image_url.trim()) {
      showToast('ط¸ظ¹ط·آ±ط·آ¬ط¸â€° ط¸â€¦ط¸â€‍ط·طŒ ط¸ئ’ط·آ§ط¸ظ¾ط·آ© ط·آ§ط¸â€‍ط·آ¨ط¸ظ¹ط·آ§ط¸â€ ط·آ§ط·ع¾', 'error'); return;
    }
    setSaving(true);
    if (editingShopItem) {
      const { error } = await supabase.from('shop_items').update(shopItemForm).eq('id', editingShopItem.id);
      if (error) showToast('ط¸ظ¾ط·آ´ط¸â€‍ ط·آ§ط¸â€‍ط·ع¾ط·آ­ط·آ¯ط¸ظ¹ط·آ«: ' + error.message, 'error');
      else showToast('ط·ع¾ط¸â€¦ ط·ع¾ط·آ­ط·آ¯ط¸ظ¹ط·آ« ط·آ§ط¸â€‍ط·آ¹ط¸â€ ط·آµط·آ± أ¢إ“â€œ');
    } else {
      const { error } = await supabase.from('shop_items').insert(shopItemForm);
      if (error) showToast('ط¸ظ¾ط·آ´ط¸â€‍ ط·آ§ط¸â€‍ط·آ¥ط·آ¶ط·آ§ط¸ظ¾ط·آ©: ' + error.message, 'error');
      else showToast('ط·ع¾ط¸â€¦ط·ع¾ ط·آ§ط¸â€‍ط·آ¥ط·آ¶ط·آ§ط¸ظ¾ط·آ© ط¸â€‍ط¸â€‍ط¸â€¦ط·ع¾ط·آ¬ط·آ± أ¢إ“â€œ');
    }
    setSaving(false);
    setShowCreateShopItem(false);
    setEditingShopItem(null);
    fetchData();
  };

  const handleEditShopItem = (item: any) => {
    setEditingShopItem(item);
    setShopItemForm({
      name_ar: item.name_ar,
      category: item.category,
      image_url: item.image_url,
      points_cost: item.points_cost,
      preview_css: item.preview_css || ''
    });
    setShowCreateShopItem(true);
  };

  const handleDeleteShopItem = async (id: string) => {
    if (!confirm('ط·آ­ط·آ°ط¸ظ¾ ط¸â€،ط·آ°ط·آ§ ط·آ§ط¸â€‍ط·آ¹ط¸â€ ط·آµط·آ± ط¸â€¦ط¸â€  ط·آ§ط¸â€‍ط¸â€¦ط·ع¾ط·آ¬ط·آ± ط¸â€ ط¸â€،ط·آ§ط·آ¦ط¸ظ¹ط·آ§ط¸â€¹ط·ع؛')) return;
    await supabase.from('shop_items').delete().eq('id', id);
    showToast('ط·ع¾ط¸â€¦ ط·آ§ط¸â€‍ط·آ­ط·آ°ط¸ظ¾');
    fetchData();
  };

  const handleSaveSettings = async () => {
    if (!siteSettingsForm) return;
    setSaving(true);
    const { error } = await supabase.from('site_settings').update(siteSettingsForm).eq('id', siteSettingsForm.id);
    if (!error) {
      showToast('ط·ع¾ط¸â€¦ ط·آ­ط¸ظ¾ط·آ¸ ط·آ¥ط·آ¹ط·آ¯ط·آ§ط·آ¯ط·آ§ط·ع¾ ط·آ§ط¸â€‍ط¸â€¦ط¸ث†ط¸â€ڑط·آ¹ ط·آ¨ط¸â€ ط·آ¬ط·آ§ط·آ­ أ¢إ“â€œ');
      useChatStore.getState().setSiteSettings(siteSettingsForm);
    } else {
      showToast('ط¸ظ¾ط·آ´ط¸â€‍ ط·آ§ط¸â€‍ط·آ­ط¸ظ¾ط·آ¸: ' + error.message, 'error');
    }
    setSaving(false);
  };

  const filteredUsers = users.filter(u =>
    u.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tabs = [
    { id: 'users', label: 'ط·آ§ط¸â€‍ط¸â€¦ط·آ³ط·ع¾ط·آ®ط·آ¯ط¸â€¦ط¸ث†ط¸â€ ', icon: <Users size={18} /> },
    { id: 'rooms', label: 'ط·آ§ط¸â€‍ط·ط›ط·آ±ط¸ظ¾', icon: <MessageSquare size={18} /> },
    { id: 'gifts', label: 'ط·آ§ط¸â€‍ط¸â€،ط·آ¯ط·آ§ط¸ظ¹ط·آ§', icon: <GiftIcon size={18} /> },
    { id: 'shop', label: 'ط·آ¥ط·آ·ط·آ§ط·آ±ط·آ§ط·ع¾ ط¸ث†ط·آ´ط·آ§ط·آ±ط·آ§ط·ع¾', icon: <Package size={18} /> },
    { id: 'logs', label: 'ط·آ§ط¸â€‍ط·آ³ط·آ¬ط¸â€‍ط·آ§ط·ع¾', icon: <Activity size={18} /> },
    { id: 'broadcast', label: 'ط·آ¨ط·آ« ط·آ¥ط·آ¯ط·آ§ط·آ±ط¸ظ¹', icon: <TrendingUp size={18} /> },
    { id: 'stats', label: 'ط·آ§ط¸â€‍ط·آ¥ط·آ­ط·آµط·آ§ط·آ¦ط¸ظ¹ط·آ§ط·ع¾', icon: <Activity size={18} /> },
    { id: 'settings', label: 'ط·آ¥ط·آ¹ط·آ¯ط·آ§ط·آ¯ط·آ§ط·ع¾ ط·آ§ط¸â€‍ط¸â€¦ط¸ث†ط¸â€ڑط·آ¹', icon: <SettingsIcon size={18} /> },
  ] as const;

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 md:p-8 font-sans" dir="rtl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-6xl h-full max-h-[850px] bg-white border-2 border-[#84a9d1] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2a4e7c] px-8 py-5 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center">
              <Shield size={24} className="text-orange-400" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">{siteSettings?.site_name ? `ظ„ظˆط­ط© طھط­ظƒظ… ${siteSettings.site_name}` : 'ظ„ظˆط­ط© طھط­ظƒظ… ط§ظ„ظ…ط¯ظٹط± ط§ظ„ط¹ط§ظ…'}</h2>
              <p className="text-[10px] font-bold text-white/60">ط¥ط¯ط§ط±ط© ظƒط§ظپط© ط¬ظˆط§ظ†ط¨ ظ…ظ†طµط© {siteSettings?.site_name || 'ط³ظ…ط§ظٹظ„ طھظˆ ط´ط§طھ'}</p>
            </div>
          </div>
          <button onClick={() => setShowAdminDashboard(false)}
            className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition-all active:scale-95">
            <X size={20} />
          </button>
        </div>

        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className={cn("px-6 py-3 flex items-center gap-2 text-sm font-black shrink-0",
                toast.type === 'success' ? "bg-green-50 text-green-700 border-b border-green-100" : "bg-red-50 text-red-700 border-b border-red-100"
              )}>
              {toast.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
              {toast.msg}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <div className="w-56 bg-[#f0f4f8] border-l border-[#84a9d1]/20 p-4 flex flex-col gap-2 shrink-0">
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as Tab)}
                className={cn(
                  "w-full px-4 py-3 flex items-center gap-3 text-sm font-black transition-all rounded-2xl",
                  activeTab === tab.id
                    ? "bg-white text-orange-500 shadow-md border border-[#84a9d1]/20"
                    : "text-[#84a9d1] hover:bg-white/60"
                )}>
                <span className={activeTab === tab.id ? "text-orange-500" : "text-[#84a9d1]"}>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
            <div className="mt-auto p-3 bg-orange-50 border border-orange-100 rounded-2xl">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={14} className="text-orange-600" />
                <span className="text-[9px] font-black text-orange-900 uppercase">ط·ع¾ط¸â€ ط·آ¨ط¸ظ¹ط¸â€،</span>
              </div>
              <p className="text-[9px] font-bold text-orange-800 leading-relaxed">
                ط·آ§ط¸â€‍ط·آµط¸â€‍ط·آ§ط·آ­ط¸ظ¹ط·آ§ط·ع¾ ط·آ§ط¸â€‍ط¸ئ’ط·آ§ط¸â€¦ط¸â€‍ط·آ© ط¸â€¦ط·ع¾ط·آ§ط·آ­ط·آ© ط¸â€‍ط·آµط·آ§ط·آ­ط·آ¨ ط·آ§ط¸â€‍ط¸â€¦ط¸ث†ط¸â€ڑط·آ¹ ط¸ظ¾ط¸â€ڑط·آ·. ط¸ئ’ط¸â€  ط·آ­ط·آ°ط·آ±ط·آ§ط¸â€¹.
              </p>
            </div>
          </div>

          <div className="flex-1 flex flex-col bg-white overflow-hidden">
            {/* Toolbar */}
            <div className="px-6 py-4 border-b border-[#84a9d1]/10 flex items-center justify-between shrink-0">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-[#84a9d1]" size={16} />
                <input type="text" placeholder="ط·آ¨ط·آ­ط·آ«..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-[#f0f4f8] border border-[#84a9d1]/30 rounded-xl pr-9 pl-3 py-2 text-sm font-bold text-[#1e3a5f] focus:outline-none focus:border-orange-500" />
              </div>
              <div className="flex gap-2">
                {activeTab === 'rooms' && (
                  <button onClick={() => { setRoomForm(defaultRoom); setEditingRoom(null); setShowCreateRoom(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-black hover:bg-orange-600 transition-all shadow-md active:scale-95">
                    <Plus size={16} /> ط·آ¥ط¸â€ ط·آ´ط·آ§ط·طŒ ط·ط›ط·آ±ط¸ظ¾ط·آ©
                  </button>
                )}
                {activeTab === 'gifts' && (
                  <button onClick={() => { setGiftForm(defaultGift); setEditingGift(null); setShowCreateGift(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-black hover:bg-orange-600 transition-all shadow-md active:scale-95">
                    <Plus size={16} /> ط·آ¥ط·آ¶ط·آ§ط¸ظ¾ط·آ© ط¸â€،ط·آ¯ط¸ظ¹ط·آ©
                  </button>
                )}
                {activeTab === 'shop' && (
                  <button onClick={() => { setShopItemForm({ name_ar: '', category: 'frame', image_url: '', points_cost: 0, preview_css: '' }); setEditingShopItem(null); setShowCreateShopItem(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-black hover:bg-blue-700 transition-all shadow-md active:scale-95">
                    <Plus size={16} /> ط·آ¥ط·آ¶ط·آ§ط¸ظ¾ط·آ© ط¸â€‍ط¸â€‍ط¸â€¦ط·ع¾ط·آ¬ط·آ±
                  </button>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto custom-scrollbar">
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="w-10 h-10 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
                </div>
              ) : (
                <>
                  {/* Users Tab with Top Stats */}
                  {activeTab === 'users' && (
                    <div className="flex flex-col h-full">
                      <div className="px-6 py-4 bg-orange-50/30 border-b border-[#84a9d1]/10 flex items-center justify-between">
                         <div className="flex items-center gap-6">
                            <div className="flex flex-col">
                               <span className="text-[10px] font-black text-[#84a9d1]">ط·آ¥ط·آ¬ط¸â€¦ط·آ§ط¸â€‍ط¸ظ¹ ط·آ§ط¸â€‍ط·آ£ط·آ¹ط·آ¶ط·آ§ط·طŒ</span>
                               <span className="text-sm font-black text-[#1e3a5f]">{users.length}</span>
                            </div>
                            <div className="flex flex-col">
                               <span className="text-[10px] font-black text-[#84a9d1]">ط·آ§ط¸â€‍ط¸â€¦ط·آ´ط·آ±ط¸ظ¾ط¸ظ¹ط¸â€ </span>
                               <span className="text-sm font-black text-orange-600">{users.filter(u => u.role !== 'member' && u.role !== 'guest').length}</span>
                            </div>
                         </div>
                      </div>
                      <table className="w-full text-right">
                        <thead className="bg-[#f0f4f8] border-b border-[#84a9d1]/10 sticky top-0">
                          <tr>
                            <th className="p-4 text-xs font-black text-[#1e3a5f]">ط·آ§ط¸â€‍ط¸â€¦ط·آ³ط·ع¾ط·آ®ط·آ¯ط¸â€¦</th>
                            <th className="p-4 text-xs font-black text-[#1e3a5f]">ط·آ§ط¸â€‍ط¸â€ ط¸â€ڑط·آ§ط·آ·</th>
                            <th className="p-4 text-xs font-black text-[#1e3a5f]">ط·آ§ط¸â€‍ط·آ±ط·ع¾ط·آ¨ط·آ©</th>
                            <th className="p-4 text-xs font-black text-[#1e3a5f]">ط·آ§ط¸â€‍ط·آ­ط·آ§ط¸â€‍ط·آ©</th>
                            <th className="p-4 text-xs font-black text-[#1e3a5f] text-left">ط·آ§ط¸â€‍ط·ع¾ط·آ­ط¸ئ’ط¸â€¦</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#84a9d1]/10">
                          {filteredUsers.map(u => (
                            <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="relative">
                                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`} className="w-10 h-10 rounded-2xl bg-white border-2 border-slate-100" alt="" />
                                    <div className={cn("absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white", u.is_guest ? "bg-gray-400" : "bg-green-500")} />
                                  </div>
                                  <div>
                                    <div className="text-sm font-black text-[#1e3a5f]">{u.display_name}</div>
                                    <div className="text-[9px] font-bold text-[#84a9d1]">@{u.username}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <div className="px-3 py-1.5 bg-orange-50 rounded-xl flex items-center gap-2 border border-orange-100">
                                    <Star size={14} className="text-orange-500" />
                                    <span className="text-sm font-black text-orange-600 font-mono">{u.points.toLocaleString()}</span>
                                  </div>
                                  <div className="flex gap-1">
                                    <button onClick={() => handleUpdatePoints(u.id, u.points, 100)} className="w-8 h-8 bg-white border border-green-200 text-green-600 rounded-xl font-black text-xs hover:bg-green-50 shadow-sm transition-all">+</button>
                                    <button onClick={() => handleUpdatePoints(u.id, u.points, -100)} className="w-8 h-8 bg-white border border-red-200 text-red-600 rounded-xl font-black text-xs hover:bg-red-50 shadow-sm transition-all">-</button>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4">
                                <select value={u.role || 'member'} onChange={e => handleUpdateRole(u.id, e.target.value)}
                                  className="bg-[#f8fafc] border border-slate-200 rounded-xl px-3 py-1.5 text-[11px] font-black text-[#1e3a5f] focus:ring-2 focus:ring-orange-500 outline-none">
                                  {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                                </select>
                              </td>
                              <td className="p-4">
                                <span className={cn("text-[9px] font-black px-2.5 py-1.5 rounded-xl border",
                                  u.is_guest ? "bg-gray-50 text-gray-500 border-gray-100" : "bg-blue-50 text-blue-600 border-blue-100")}>
                                  {u.is_guest ? 'ط·آ²ط·آ§ط·آ¦ط·آ± ط¸â€¦ط·آ¤ط¸â€ڑط·ع¾' : 'ط·آ­ط·آ³ط·آ§ط·آ¨ ط·آ¹ط·آ¶ط¸ث†'}
                                </span>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center justify-end gap-2">
                                  <button onClick={() => { if(confirm('ط·آ·ط·آ±ط·آ¯ط·ع؛')) useChatStore.getState().processAdminAction('kick', u.id); }} 
                                    className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm">
                                    <Ban size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Rooms Tab */}
                  {activeTab === 'rooms' && (
                    <table className="w-full text-right">
                      <thead className="bg-[#f0f4f8] border-b border-[#84a9d1]/10 sticky top-0">
                        <tr>
                          <th className="p-4 text-xs font-black text-[#1e3a5f]">ط·آ§ط¸â€‍ط·ط›ط·آ±ط¸ظ¾ط·آ©</th>
                          <th className="p-4 text-xs font-black text-[#1e3a5f]">ط·آ§ط¸â€‍ط·آ£ط·آ¹ط·آ¶ط·آ§ط·طŒ</th>
                          <th className="p-4 text-xs font-black text-[#1e3a5f]">ط·آ§ط¸â€‍ط·آ®ط·آµط¸ث†ط·آµط¸ظ¹ط·آ©</th>
                          <th className="p-4 text-xs font-black text-[#1e3a5f]">ط·آ§ط¸â€‍ط·آ­ط·آ§ط¸â€‍ط·آ©</th>
                          <th className="p-4 text-xs font-black text-[#1e3a5f] text-left">ط·آ¥ط·آ¬ط·آ±ط·آ§ط·طŒط·آ§ط·ع¾</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#84a9d1]/10">
                        {rooms.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase())).map(r => (
                          <tr key={r.id} className="hover:bg-[#f9fbfd] transition-colors">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-8 rounded-lg overflow-hidden bg-[#f0f4f8] border border-[#84a9d1]/20 shrink-0">
                                  {r.cover_image_url
                                    ? <img src={r.cover_image_url} className="w-full h-full object-cover" alt="" />
                                    : <div className="w-full h-full flex items-center justify-center text-[#84a9d1]"><MessageSquare size={14} /></div>
                                  }
                                </div>
                                <div>
                                  <div className="text-sm font-black text-[#1e3a5f]">{r.name}</div>
                                  <div className="text-[10px] font-bold text-[#84a9d1]">/{r.slug}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 text-xs font-bold text-[#1e3a5f]">{r.max_users} ط·آ¹ط·آ¶ط¸ث†</td>
                            <td className="p-4">
                              <span className={cn("text-[9px] font-black px-2 py-1 rounded-lg",
                                r.is_private ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700")}>
                                {r.is_private ? 'ط·آ®ط·آ§ط·آµط·آ©' : 'ط·آ¹ط·آ§ط¸â€¦ط·آ©'}
                              </span>
                            </td>
                            <td className="p-4">
                              <button onClick={() => handleToggleRoom(r)}
                                className={cn("text-[9px] font-black px-3 py-1.5 rounded-lg transition-all flex items-center gap-1",
                                  r.is_active ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200")}>
                                {r.is_active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                                {r.is_active ? 'ط¸â€ ط·آ´ط·آ·ط·آ©' : 'ط¸â€¦ط·آ¹ط·آ·ط¸â€‍ط·آ©'}
                              </button>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2 justify-end">
                                <button onClick={() => handleEditRoom(r)} className="p-2 text-[#84a9d1] hover:text-[#1e3a5f] transition-colors"><Edit size={16} /></button>
                                <button onClick={() => handleDeleteRoom(r.id)} className="p-2 text-[#84a9d1] hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {rooms.length === 0 && (
                          <tr><td colSpan={5} className="p-12 text-center text-[#84a9d1] font-bold text-sm">
                            ط¸â€‍ط·آ§ ط·ع¾ط¸ث†ط·آ¬ط·آ¯ ط·ط›ط·آ±ط¸ظ¾ أ¢â‚¬â€‌ ط·آ§ط¸â€ ط¸â€ڑط·آ± ط·آ¹ط¸â€‍ط¸â€° "ط·آ¥ط¸â€ ط·آ´ط·آ§ط·طŒ ط·ط›ط·آ±ط¸ظ¾ط·آ©" ط¸â€‍ط·آ¥ط·آ¶ط·آ§ط¸ظ¾ط·آ© ط·آ£ط¸ث†ط¸â€‍ ط·ط›ط·آ±ط¸ظ¾ط·آ©
                          </td></tr>
                        )}
                      </tbody>
                    </table>
                  )}

                  {/* Gifts Tab */}
                  {activeTab === 'gifts' && (
                    <table className="w-full text-right">
                      <thead className="bg-[#f0f4f8] border-b border-[#84a9d1]/10 sticky top-0">
                        <tr>
                          <th className="p-4 text-xs font-black text-[#1e3a5f]">ط·آ§ط¸â€‍ط¸â€،ط·آ¯ط¸ظ¹ط·آ©</th>
                          <th className="p-4 text-xs font-black text-[#1e3a5f]">ط·آ§ط¸â€‍ط·ع¾ط¸ئ’ط¸â€‍ط¸ظ¾ط·آ©</th>
                          <th className="p-4 text-xs font-black text-[#1e3a5f]">ط·آ§ط¸â€‍ط¸â€¦ط¸ئ’ط·آ§ط¸ظ¾ط·آ£ط·آ©</th>
                          <th className="p-4 text-xs font-black text-[#1e3a5f]">ط·آ§ط¸â€‍ط¸â€ ط¸ث†ط·آ¹</th>
                          <th className="p-4 text-xs font-black text-[#1e3a5f]">ط·آ§ط¸â€‍ط·آ­ط·آ§ط¸â€‍ط·آ©</th>
                          <th className="p-4 text-xs font-black text-[#1e3a5f] text-left">ط·آ¥ط·آ¬ط·آ±ط·آ§ط·طŒط·آ§ط·ع¾</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#84a9d1]/10">
                        {gifts.filter(g => g.name_ar.toLowerCase().includes(searchQuery.toLowerCase())).map(g => (
                          <tr key={g.id} className="hover:bg-[#f9fbfd] transition-colors">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <span className="text-3xl">{g.image_url}</span>
                                <div>
                                  <div className="text-sm font-black text-[#1e3a5f]">{g.name_ar}</div>
                                  <div className="text-[10px] text-[#84a9d1] font-bold">{g.name_en}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-4"><span className="text-sm font-black text-orange-600">{g.points_cost} ظ‹ع؛â€™عک</span></td>
                            <td className="p-4"><span className="text-sm font-black text-green-600">+{g.points_award} ظ‹ع؛â€™عک</span></td>
                            <td className="p-4"><span className="text-[10px] font-bold text-[#84a9d1] bg-[#f0f4f8] px-2 py-1 rounded">{g.effect_type}</span></td>
                            <td className="p-4">
                              <button onClick={() => handleToggleGift(g)}
                                className={cn("text-[9px] font-black px-2 py-1 rounded-lg transition-all",
                                  (g as any).is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>
                                {(g as any).is_active ? 'ط¸â€ ط·آ´ط·آ·ط·آ©' : 'ط¸â€¦ط·آ®ط¸ظ¾ط¸ظ¹ط·آ©'}
                              </button>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2 justify-end">
                                <button onClick={() => handleEditGift(g)} className="p-2 text-[#84a9d1] hover:text-[#1e3a5f]"><Edit size={16} /></button>
                                <button onClick={() => handleDeleteGift(g.id)} className="p-2 text-[#84a9d1] hover:text-red-500"><Trash2 size={16} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {gifts.length === 0 && (
                          <tr><td colSpan={6} className="p-12 text-center text-[#84a9d1] font-bold text-sm">
                            ط¸â€‍ط·آ§ ط·ع¾ط¸ث†ط·آ¬ط·آ¯ ط¸â€،ط·آ¯ط·آ§ط¸ظ¹ط·آ§ أ¢â‚¬â€‌ ط·آ§ط¸â€ ط¸â€ڑط·آ± ط·آ¹ط¸â€‍ط¸â€° "ط·آ¥ط·آ¶ط·آ§ط¸ظ¾ط·آ© ط¸â€،ط·آ¯ط¸ظ¹ط·آ©" ط¸â€‍ط¸â€‍ط·آ¨ط·آ¯ط·طŒ
                          </td></tr>
                        )}
                      </tbody>
                    </table>
                  )}

                  {/* Shop Management Tab */}
                  {activeTab === 'shop' && (
                    <div className="p-4 overflow-auto">
                      <div className="bg-blue-50/50 rounded-2xl p-4 mb-4 border border-blue-100">
                        <p className="text-[10px] font-bold text-blue-700 leading-relaxed">
                          ظ‹ع؛â€؛طŒأ¯آ¸عˆ ط¸â€¦ط¸â€‍ط·آ§ط·آ­ط·آ¸ط·آ© ط·آ§ط¸â€‍ط¸â‚¬ Auto-Sync: ط¸ظ¹ط·ع¾ط¸â€¦ ط·آ¬ط¸â€‍ط·آ¨ ط¸â€،ط·آ°ط¸â€، ط·آ§ط¸â€‍ط·آ¹ط¸â€ ط·آ§ط·آµط·آ± ط¸â€¦ط¸â€  ط·آ§ط¸â€‍ط¸ئ’ط¸ث†ط·آ¯ ط·ع¾ط¸â€‍ط¸â€ڑط·آ§ط·آ¦ط¸ظ¹ط·آ§ط¸â€¹. ط·آ£ط¸ظ¹ ط·آ¹ط¸â€ ط·آµط·آ± ط·آ¬ط·آ¯ط¸ظ¹ط·آ¯ ط¸ظ¾ط¸ظ¹ ط·آ§ط¸â€‍ط¸ئ’ط¸ث†ط·آ¯ ط·آ³ط¸ظ¹ط·آ¸ط¸â€،ط·آ± ط¸â€،ط¸â€ ط·آ§ ط¸ظ¾ط¸ث†ط·آ±ط·آ§ط¸â€¹.
                        </p>
                      </div>
                      <table className="w-full text-right">
                        <thead className="bg-[#f0f4f8] border-b border-[#84a9d1]/10 sticky top-0">
                          <tr>
                            <th className="p-4 text-xs font-black text-[#1e3a5f]">ط·آ§ط¸â€‍ط·آ¹ط¸â€ ط·آµط·آ±</th>
                            <th className="p-4 text-xs font-black text-[#1e3a5f]">ط·آ§ط¸â€‍ط¸â€ ط¸ث†ط·آ¹</th>
                            <th className="p-4 text-xs font-black text-[#1e3a5f]">ط·آ§ط¸â€‍ط·آ³ط·آ¹ط·آ±</th>
                            <th className="p-4 text-xs font-black text-[#1e3a5f] text-left">ط·آ¥ط·آ¬ط·آ±ط·آ§ط·طŒط·آ§ط·ع¾</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#84a9d1]/10">
                          {shopItems.filter(i => (i.name_ar || '').includes(searchQuery)).map(item => (
                            <tr key={item.id} className="hover:bg-[#f9fbfd]">
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-white border-2 border-slate-100 rounded-xl flex items-center justify-center text-2xl shadow-sm">
                                    {item.image_url}
                                  </div>
                                  <div>
                                    <div className="text-sm font-black text-[#1e3a5f]">{item.name_ar}</div>
                                    <div className="text-[9px] text-[#84a9d1] font-mono">{item.preview_css}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4">
                                <span className={cn("text-[9px] font-black px-2 py-1 rounded-lg",
                                  item.category === 'frame' ? "bg-purple-100 text-purple-700" : "bg-cyan-100 text-cyan-700")}>
                                  {item.category === 'frame' ? 'ط·آ¥ط·آ·ط·آ§ط·آ± ط·آ¨ط·آ±ط¸ث†ط¸ظ¾ط·آ§ط¸ظ¹ط¸â€‍' : 'ط·آ´ط·آ§ط·آ±ط·آ© ط¸â€¦ط¸â€¦ط¸ظ¹ط·آ²ط·آ©'}
                                </span>
                              </td>
                              <td className="p-4 text-sm font-black text-orange-600">{item.points_cost}</td>
                              <td className="p-4">
                                <div className="flex items-center gap-2 justify-end">
                                  <button onClick={() => handleEditShopItem(item)} className="p-2 text-[#84a9d1] hover:text-[#1e3a5f]"><Edit size={16} /></button>
                                  <button onClick={() => handleDeleteShopItem(item.id)} className="p-2 text-[#84a9d1] hover:text-red-500"><Trash2 size={16} /></button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Professional Stats Tab */}
                  {activeTab === 'stats' && (
                    <div className="p-8 space-y-8">
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="bg-gradient-to-br from-[#1e3a5f] to-[#2a4e7c] p-6 rounded-[2rem] text-white shadow-xl relative overflow-hidden group">
                           <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform"><Users size={120} /></div>
                           <Users size={28} className="mb-4 text-orange-400" />
                           <div className="text-4xl font-black mb-1">{stats.users.toLocaleString()}</div>
                           <div className="text-xs font-bold opacity-70">ط·آ¥ط·آ¬ط¸â€¦ط·آ§ط¸â€‍ط¸ظ¹ ط·آ§ط¸â€‍ط¸â€¦ط·آ³ط·ع¾ط·آ®ط·آ¯ط¸â€¦ط¸ظ¹ط¸â€  ط·آ§ط¸â€‍ط¸â€¦ط·آ³ط·آ¬ط¸â€‍ط¸ظ¹ط¸â€ </div>
                        </div>
                        <div className="bg-gradient-to-br from-orange-400 to-red-500 p-6 rounded-[2rem] text-white shadow-xl relative overflow-hidden group">
                           <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform"><MessageSquare size={120} /></div>
                           <MessageSquare size={28} className="mb-4 text-white" />
                           <div className="text-4xl font-black mb-1">{stats.rooms.toLocaleString()}</div>
                           <div className="text-xs font-bold opacity-70">ط·آ§ط¸â€‍ط·ط›ط·آ±ط¸ظ¾ ط·آ§ط¸â€‍ط¸â€ ط·آ´ط·آ·ط·آ© ط·آ­ط·آ§ط¸â€‍ط¸ظ¹ط·آ§ط¸â€¹</div>
                        </div>
                        <div className="bg-gradient-to-br from-green-400 to-emerald-600 p-6 rounded-[2rem] text-white shadow-xl relative overflow-hidden group">
                           <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform"><Star size={120} /></div>
                           <Star size={28} className="mb-4 text-yellow-300" />
                           <div className="text-4xl font-black mb-1">{stats.totalPoints.toLocaleString()}</div>
                           <div className="text-xs font-bold opacity-70">ط·آ¥ط·آ¬ط¸â€¦ط·آ§ط¸â€‍ط¸ظ¹ ط·آ±ط·آµط¸ظ¹ط·آ¯ ط·آ§ط¸â€‍ط¸â€ ط¸â€ڑط·آ§ط·آ· ط·آ§ط¸â€‍ط¸â€¦ط·ع¾ط·آ¯ط·آ§ط¸ث†ط¸â€‍</div>
                        </div>
                        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-6 rounded-[2rem] text-white shadow-xl relative overflow-hidden group">
                           <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform"><GiftIcon size={120} /></div>
                           <GiftIcon size={28} className="mb-4 text-purple-200" />
                           <div className="text-4xl font-black mb-1">{stats.gifts.toLocaleString()}</div>
                           <div className="text-xs font-bold opacity-70">ط·آ£ط¸â€ ط¸ث†ط·آ§ط·آ¹ ط·آ§ط¸â€‍ط¸â€،ط·آ¯ط·آ§ط¸ظ¹ط·آ§ ط·آ§ط¸â€‍ط¸â€¦ط·ع¾ط¸ث†ط¸ظ¾ط·آ±ط·آ©</div>
                        </div>
                        <div className="bg-gradient-to-br from-cyan-400 to-blue-600 p-6 rounded-[2rem] text-white shadow-xl relative overflow-hidden group">
                           <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform"><Package size={120} /></div>
                           <Package size={28} className="mb-4 text-cyan-100" />
                           <div className="text-4xl font-black mb-1">{stats.shopItems.toLocaleString()}</div>
                           <div className="text-xs font-bold opacity-70">ط¸â€¦ط¸â€ ط·ع¾ط·آ¬ط·آ§ط·ع¾ ط·آ§ط¸â€‍ط¸â€¦ط·ع¾ط·آ¬ط·آ± (ط·آ¥ط·آ·ط·آ§ط·آ±ط·آ§ط·ع¾ ط¸ث†ط·آ´ط·آ§ط·آ±ط·آ§ط·ع¾)</div>
                        </div>
                       </div>
                    </div>
                  )}

                  {/* Logs Tab */}
                  {activeTab === 'logs' && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-right border-collapse">
                        <thead className="bg-[#f0f4f8] border-b border-[#84a9d1]/20">
                          <tr>
                            <th className="p-3 text-[11px] font-black text-[#1e3a5f]">ط·آ§ط¸â€‍ط¸ث†ط¸â€ڑط·ع¾</th>
                            <th className="p-3 text-[11px] font-black text-[#1e3a5f]">ط·آ§ط¸â€‍ط¸â€¦ط·آ³ط·ع¾ط·آ®ط·آ¯ط¸â€¦</th>
                            <th className="p-3 text-[11px] font-black text-[#1e3a5f]">ط·آ§ط¸â€‍ط¸ظ¾ط·آ¹ط¸â€‍</th>
                            <th className="p-3 text-[11px] font-black text-[#1e3a5f]">ط·آ§ط¸â€‍ط·ط›ط·آ±ط¸ظ¾ط·آ©</th>
                            <th className="p-3 text-[11px] font-black text-[#1e3a5f]">ط·آ§ط¸â€‍ط·ع¾ط¸ظ¾ط·آ§ط·آµط¸ظ¹ط¸â€‍</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#84a9d1]/10">
                          {roomLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-blue-50/30 transition-colors">
                              <td className="p-3 text-[10px] font-bold text-[#84a9d1]">
                                {new Date(log.created_at).toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                              </td>
                              <td className="p-3">
                                <div className="text-[11px] font-black text-[#1e3a5f]">{log.profiles?.display_name || 'ط·ط›ط¸ظ¹ط·آ± ط¸â€¦ط·آ¹ط·آ±ط¸ث†ط¸ظ¾'}</div>
                                <div className="text-[9px] text-[#84a9d1]">@{log.profiles?.username}</div>
                              </td>
                              <td className="p-3">
                                <span className={cn("text-[9px] font-black px-2 py-0.5 rounded", 
                                  log.action === 'kick' || log.action === 'ban' ? "bg-red-100 text-red-600" : 
                                  log.action === 'join' ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-600"
                                )}>
                                  {log.action === 'join' ? 'ط·آ¯ط·آ®ط¸ث†ط¸â€‍' : 
                                   log.action === 'leave' ? 'ط·آ®ط·آ±ط¸ث†ط·آ¬' : 
                                   log.action === 'kick' ? 'ط·آ·ط·آ±ط·آ¯' : 
                                   log.action === 'ban' ? 'ط·آ­ط·آ¸ط·آ±' : log.action}
                                </span>
                              </td>
                              <td className="p-3 text-[11px] font-bold text-[#1e3a5f]">{log.rooms?.name || '---'}</td>
                              <td className="p-3 text-[9px] text-[#84a9d1] font-medium max-w-[150px] truncate">
                                {JSON.stringify(log.metadata)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Broadcast Tab */}
                  {activeTab === 'broadcast' && (
                    <div className="p-12 flex flex-col items-center justify-center text-center max-w-2xl mx-auto">
                      <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-6 shadow-inner">
                        <TrendingUp size={40} />
                      </div>
                      <h3 className="text-2xl font-black text-[#1e3a5f] mb-2 font-sans">ط·آ¨ط·آ« ط·آ¥ط·آ¹ط¸â€‍ط·آ§ط¸â€  ط·آ¹ط·آ§ط¸â€¦ ط¸â€‍ط¸â€‍ط·آ¥ط·آ¯ط·آ§ط·آ±ط·آ©</h3>
                      <p className="text-sm font-bold text-[#84a9d1] mb-8">ط·آ³ط¸ظ¹ط·آ¸ط¸â€،ط·آ± ط¸â€،ط·آ°ط·آ§ ط·آ§ط¸â€‍ط·آ¥ط·آ¹ط¸â€‍ط·آ§ط¸â€  ط¸ظ¾ط¸ث†ط·آ±ط·آ§ط¸â€¹ ط¸ظ¾ط¸ظ¹ ط·آ¬ط¸â€¦ط¸ظ¹ط·آ¹ ط·آ§ط¸â€‍ط·ط›ط·آ±ط¸ظ¾ ط¸ث†ط¸ظ¾ط¸ظ¹ ط¸ث†ط·آ§ط·آ¬ط¸â€،ط·آ© ط¸ئ’ط¸â€‍ ط¸â€¦ط·آ³ط·ع¾ط·آ®ط·آ¯ط¸â€¦ ط¸â€ ط·آ´ط·آ·.</p>
                      <textarea
                        value={broadcastText}
                        onChange={e => setBroadcastText(e.target.value)}
                        className="w-full bg-[#f0f4f8] border-2 border-[#84a9d1]/20 rounded-3xl p-6 text-sm font-bold text-[#1e3a5f] focus:outline-none focus:border-orange-500 mb-6 placeholder:text-[#84a9d1]"
                        rows={4}
                        placeholder="ط·آ§ط¸ئ’ط·ع¾ط·آ¨ ط¸â€،ط¸â€ ط·آ§ ط·آ§ط¸â€‍ط·آ¥ط·آ¹ط¸â€‍ط·آ§ط¸â€  ط·آ§ط¸â€‍ط·آ¥ط·آ¯ط·آ§ط·آ±ط¸ظ¹ ط·آ§ط¸â€‍ط¸â€،ط·آ§ط¸â€¦..."
                        dir="rtl"
                      />
                      <button
                        onClick={async () => {
                          if (!broadcastText.trim()) return;
                          try {
                            await supabase.channel('global-notices').send({
                              type: 'broadcast',
                              event: 'site-notice',
                              payload: { text: broadcastText }
                            });
                            showToast('ط·ع¾ط¸â€¦ ط·آ¥ط·آ±ط·آ³ط·آ§ط¸â€‍ ط·آ§ط¸â€‍ط·آ¥ط·آ¹ط¸â€‍ط·آ§ط¸â€  ط¸â€‍ط·آ¬ط¸â€¦ط¸ظ¹ط·آ¹ ط·آ§ط¸â€‍ط·ط›ط·آ±ط¸ظ¾ أ¢إ“â€œ');
                            setBroadcastText('');
                          } catch (err: any) {
                            showToast('ط¸ظ¾ط·آ´ط¸â€‍ ط·آ§ط¸â€‍ط·آ¥ط·آ±ط·آ³ط·آ§ط¸â€‍: ' + err.message, 'error');
                          }
                          setSaving(false);
                        }}
                        disabled={saving || !broadcastText.trim()}
                        className="w-full py-4 bg-[#1e3a5f] hover:bg-[#2a4e7c] text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-xl transition-all active:scale-95 disabled:opacity-50"
                      >
                        {saving ? 'ط·آ¬ط·آ§ط·آ±ط¸ظ¹ ط·آ§ط¸â€‍ط·آ¨ط·آ«...' : 'ط·آ¨ط·آ« ط·آ§ط¸â€‍ط·آ¥ط·آ¹ط¸â€‍ط·آ§ط¸â€  ط·آ§ط¸â€‍ط·آ¢ط¸â€ '}
                      </button>
                    </div>
                  )}

                  {/* Settings Tab */}
                  {activeTab === 'settings' && siteSettingsForm && (
                    <div className="p-8 max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
                      <div className="flex items-center gap-4 border-b border-[#84a9d1]/10 pb-6 mb-8 text-[#1e3a5f]">
                        <SettingsIcon size={32} className="text-orange-500" />
                        <div>
                          <h3 className="text-xl font-black">ط¥ط¹ط¯ط§ط¯ط§طھ ط§ظ„ظ…ظˆظ‚ط¹ ظˆط§ظ„ظ‡ظˆظٹط© âڑ™ï¸ڈ</h3>
                          <p className="text-xs font-bold text-[#84a9d1]">ط§ظ„طھط­ظƒظ… ظپظٹ ط§ط³ظ… ط§ظ„ظ…ظˆظ‚ط¹ ظˆط´ط¹ط§ط±ظ‡ ظˆط­ط§ظ„طھظ‡</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <label className="text-xs font-black text-[#1e3a5f] block mb-2">ط§ط³ظ… ط§ظ„ظ…ظˆظ‚ط¹ (ظٹط¸ظ‡ط± ظپظٹ ظƒظ„ ظ…ظƒط§ظ†) ًںڈ°</label>
                            <input value={siteSettingsForm.site_name} onChange={e => setSiteSettingsForm({...siteSettingsForm, site_name: e.target.value})}
                              className="w-full border-2 border-[#84a9d1]/20 rounded-2xl px-4 py-3 text-sm font-bold focus:border-orange-500 bg-[#f8fafc]/50" />
                          </div>
                          <div>
                            <label className="text-xs font-black text-[#1e3a5f] block mb-2">ط±ط§ط¨ط· ط§ظ„ط´ط¹ط§ط± ط£ظˆ ط§ظ„ط¥ظٹظ…ظˆط¬ظٹ ط§ظ„ط£ط³ط§ط³ظٹ ًں–¼ï¸ڈ</label>
                            <input value={siteSettingsForm.logo_url} onChange={e => setSiteSettingsForm({...siteSettingsForm, logo_url: e.target.value})}
                              className="w-full border-2 border-[#84a9d1]/20 rounded-2xl px-4 py-3 text-sm font-bold focus:border-orange-500 bg-[#f8fafc]/50" placeholder="https://..." />
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="text-xs font-black text-[#1e3a5f] block mb-2">ط±ط³ط§ظ„ط© ط§ظ„طھط±ط­ظٹط¨ ظˆط§ظ„ظ†ظٹظˆط² ط¨ط§ط± ًں’¬</label>
                            <textarea value={siteSettingsForm.welcome_announcement} onChange={e => setSiteSettingsForm({...siteSettingsForm, welcome_announcement: e.target.value})}
                              className="w-full border-2 border-[#84a9d1]/20 rounded-2xl px-4 py-3 text-sm font-bold focus:border-orange-500 bg-[#f8fafc]/50 resize-none" rows={4} />
                          </div>
                        </div>
                      </div>

                      <div className="bg-orange-50 border border-orange-100 rounded-[2rem] p-6 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", siteSettingsForm.maintenance_mode ? "bg-orange-500 text-white" : "bg-green-100 text-green-600")}>
                             {siteSettingsForm.maintenance_mode ? <AlertCircle size={24} /> : <Check size={24} />}
                          </div>
                          <div>
                            <div className="text-sm font-black text-[#1e3a5f]">ط¸ث†ط·آ¶ط·آ¹ ط·آ§ط¸â€‍ط·آµط¸ظ¹ط·آ§ط¸â€ ط·آ© (Maintenance Mode)</div>
                            <div className="text-[10px] font-bold text-[#84a9d1]">ط·آ¹ط¸â€ ط·آ¯ ط·آ§ط¸â€‍ط·ع¾ط¸ظ¾ط·آ¹ط¸ظ¹ط¸â€‍ط·إ’ ط·آ³ط¸ظ¹ط·آ¸ط¸â€،ط·آ± ط·ع¾ط¸â€ ط·آ¨ط¸ظ¹ط¸â€، ط¸â€‍ط·آ¬ط¸â€¦ط¸ظ¹ط·آ¹ ط·آ§ط¸â€‍ط¸â€¦ط·آ³ط·ع¾ط·آ®ط·آ¯ط¸â€¦ط¸ظ¹ط¸â€  ط·آ¨ط·آµط¸ظ¹ط·آ§ط¸â€ ط·آ© ط·آ§ط¸â€‍ط¸â€¦ط¸ث†ط¸â€ڑط·آ¹ ط·آ§ط¸â€‍ط·آ¬ط·آ§ط·آ±ط¸ظ¹ط·آ©</div>
                          </div>
                        </div>
                        <button onClick={() => setSiteSettingsForm({...siteSettingsForm, maintenance_mode: !siteSettingsForm.maintenance_mode})}
                          className={cn("px-6 py-2 rounded-xl font-black text-xs transition-all", siteSettingsForm.maintenance_mode ? "bg-orange-500 text-white shadow-lg" : "bg-white border border-[#84a9d1]/30 text-[#84a9d1]")}>
                          {siteSettingsForm.maintenance_mode ? 'ط·آ¥ط¸â€‍ط·ط›ط·آ§ط·طŒ ط¸ث†ط·آ¶ط·آ¹ ط·آ§ط¸â€‍ط·آµط¸ظ¹ط·آ§ط¸â€ ط·آ©' : 'ط·ع¾ط¸ظ¾ط·آ¹ط¸ظ¹ط¸â€‍ ط¸ث†ط·آ¶ط·آ¹ ط·آ§ط¸â€‍ط·آµط¸ظ¹ط·آ§ط¸â€ ط·آ©'}
                        </button>
                      </div>

                      <div className="pt-6 border-t border-[#84a9d1]/10">
                        <button onClick={handleSaveSettings} disabled={saving}
                          className="w-full py-4 bg-[#1e3a5f] hover:bg-[#2a4e7c] text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-xl transition-all active:scale-95 disabled:opacity-50"
                        >
                          {saving ? 'ط·آ¬ط·آ§ط·آ±ط¸ظ¹ ط·آ§ط¸â€‍ط·آ­ط¸ظ¾ط·آ¸...' : 'ط·آ­ط¸ظ¾ط·آ¸ ط·آ¬ط¸â€¦ط¸ظ¹ط·آ¹ ط·آ§ط¸â€‍ط·آ¥ط·آ¹ط·آ¯ط·آ§ط·آ¯ط·آ§ط·ع¾ ط·آ§ط¸â€‍ط·آ¹ط·آ§ط¸â€¦ط·آ©'}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Modals */}
      {showCreateRoom && (
        <RoomFormModal 
          editingRoom={editingRoom}
          setShowCreateRoom={setShowCreateRoom}
          setEditingRoom={setEditingRoom}
          setRoomForm={setRoomForm}
          roomForm={roomForm}
          users={users}
          saving={saving}
          handleSaveRoom={handleSaveRoom}
        />
      )}
      {showCreateShopItem && (
        <ShopItemFormModal 
          editingShopItem={editingShopItem}
          setShowCreateShopItem={setShowCreateShopItem}
          setEditingShopItem={setEditingShopItem}
          setShopItemForm={setShopItemForm}
          shopItemForm={shopItemForm}
          saving={saving}
          handleSaveShopItem={handleSaveShopItem}
        />
      )}
      {showCreateGift && (
        <GiftFormModal 
          editingGift={editingGift}
          setShowCreateGift={setShowCreateGift}
          setEditingGift={setEditingGift}
          setGiftForm={setGiftForm}
          giftForm={giftForm}
          saving={saving}
          handleSaveGift={handleSaveGift}
        />
      )}
    </div>
  );
}

// أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬ MODAL COMPONENTS أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬أ¢â€‌â‚¬

function ShopItemFormModal({ editingShopItem, setShowCreateShopItem, setEditingShopItem, setShopItemForm, shopItemForm, saving, handleSaveShopItem }: any) {
  return (
    <div className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-[#84a9d1]">
        <div className="bg-[#1e3a5f] p-4 text-white flex justify-between items-center">
          <h3 className="font-black">{editingShopItem ? 'ط·ع¾ط·آ¹ط·آ¯ط¸ظ¹ط¸â€‍ ط·آ¹ط¸â€ ط·آµط·آ± ط·آ§ط¸â€‍ط¸â€¦ط·ع¾ط·آ¬ط·آ±' : 'ط·آ¥ط·آ¶ط·آ§ط¸ظ¾ط·آ© ط·آ¹ط¸â€ ط·آµط·آ± ط·آ¬ط·آ¯ط¸ظ¹ط·آ¯'}</h3>
          <button onClick={() => { setShowCreateShopItem(false); setEditingShopItem(null); }}><X size={20}/></button>
        </div>
        <div className="p-6 space-y-4 text-right">
          <div>
            <label className="text-xs font-black text-[#1e3a5f] block mb-1">ط·آ§ط¸â€‍ط·آ§ط·آ³ط¸â€¦ ط·آ¨ط·آ§ط¸â€‍ط·آ¹ط·آ±ط·آ¨ط¸ظ¹ط·آ©</label>
            <input value={shopItemForm.name_ar} onChange={e => setShopItemForm({...shopItemForm, name_ar: e.target.value})}
              className="w-full border-2 border-[#84a9d1]/20 rounded-xl px-3 py-2 text-sm font-bold" />
          </div>
          <div>
            <label className="text-xs font-black text-[#1e3a5f] block mb-1">ط·آ§ط¸â€‍ط¸â€ ط¸ث†ط·آ¹</label>
            <select value={shopItemForm.category} onChange={e => setShopItemForm({...shopItemForm, category: e.target.value})}
              className="w-full border-2 border-[#84a9d1]/20 rounded-xl px-3 py-2 text-sm font-bold">
              <option value="frame">ط·آ¥ط·آ·ط·آ§ط·آ± ط·آ¨ط·آ±ط¸ث†ط¸ظ¾ط·آ§ط¸ظ¹ط¸â€‍</option>
              <option value="badge">ط·آ´ط·آ§ط·آ±ط·آ© ط¸â€¦ط¸â€¦ط¸ظ¹ط·آ²ط·آ©</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-black text-[#1e3a5f] block mb-1">ط·آ§ط¸â€‍ط·آ¥ط¸ظ¹ط¸â€¦ط¸ث†ط·آ¬ط¸ظ¹ ط·آ£ط¸ث† ط·آ±ط·آ§ط·آ¨ط·آ· ط·آ§ط¸â€‍ط·آµط¸ث†ط·آ±ط·آ©</label>
            <input value={shopItemForm.image_url} onChange={e => setShopItemForm({...shopItemForm, image_url: e.target.value})}
              className="w-full border-2 border-[#84a9d1]/20 rounded-xl px-3 py-2 text-sm font-bold" />
          </div>
          <div>
            <label className="text-xs font-black text-[#1e3a5f] block mb-1">ط·آ³ط·آ¹ط·آ± ط·آ§ط¸â€‍ط¸â€ ط¸â€ڑط·آ§ط·آ· ظ‹ع؛â€™عک</label>
            <input type="number" value={shopItemForm.points_cost} onChange={e => setShopItemForm({...shopItemForm, points_cost: parseInt(e.target.value)})}
              className="w-full border-2 border-[#84a9d1]/20 rounded-xl px-3 py-2 text-sm font-bold" />
          </div>
          <div>
            <label className="text-xs font-black text-[#1e3a5f] block mb-1">ط·ع¾ط¸â€ ط·آ³ط¸ظ¹ط¸â€ڑ ط·آ§ط¸â€‍ط¸â‚¬ CSS (ط·آ§ط·آ®ط·ع¾ط¸ظ¹ط·آ§ط·آ±ط¸ظ¹)</label>
            <input value={shopItemForm.preview_css} onChange={e => setShopItemForm({...shopItemForm, preview_css: e.target.value})}
              className="w-full border-2 border-[#84a9d1]/20 rounded-xl px-3 py-2 text-sm font-bold font-mono" placeholder="border: 2px solid gold; ..." />
          </div>
          <button onClick={handleSaveShopItem} disabled={saving}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-sm shadow-lg transition-all active:scale-95 disabled:opacity-50">
            {saving ? 'ط·آ¬ط·آ§ط·آ±ط¸ظ¹ ط·آ§ط¸â€‍ط·آ­ط¸ظ¾ط·آ¸...' : 'ط·آ­ط¸ظ¾ط·آ¸ ط·آ§ط¸â€‍ط·آ¹ط¸â€ ط·آµط·آ±'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function GiftFormModal({ editingGift, setShowCreateGift, setEditingGift, setGiftForm, giftForm, saving, handleSaveGift }: any) {
  return (
    <div className="fixed inset-0 z-[350] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-orange-200">
        <div className="bg-orange-500 p-4 text-white flex justify-between items-center">
          <h3 className="font-black">{editingGift ? 'طھط¹ط¯ظٹظ„ ط§ظ„ظ‡ط¯ظٹط©' : 'ط¥ط¶ط§ظپط© ظ‡ط¯ظٹط© ط¬ط¯ظٹط¯ط©'}</h3>
          <button onClick={() => { setShowCreateGift(false); setEditingGift(null); }}><X size={20}/></button>
        </div>
        <div className="p-6 space-y-4 text-right">
          <div>
            <label className="text-xs font-black text-[#1e3a5f] block mb-1">ط§ط³ظ… ط§ظ„ظ‡ط¯ظٹط© (ط¨ط§ظ„ط¹ط±ط¨ظٹط©)</label>
            <input value={giftForm.name_ar} onChange={e => setGiftForm({...giftForm, name_ar: e.target.value})}
              className="w-full border-2 border-[#84a9d1]/20 rounded-xl px-3 py-2 text-sm font-bold" />
          </div>
          <div>
            <label className="text-xs font-black text-[#1e3a5f] block mb-1">ط§ظ„ط¥ظٹظ…ظˆط¬ظٹ ط£ظˆ ط§ظ„ط±ط§ط¨ط·</label>
            <input value={giftForm.image_url} onChange={e => setGiftForm({...giftForm, image_url: e.target.value})}
              className="w-full border-2 border-[#84a9d1]/20 rounded-xl px-3 py-2 text-sm font-bold" />
          </div>
          <div>
            <label className="text-xs font-black text-[#1e3a5f] block mb-1">ط§ظ„طھظƒظ„ظپط© (ًں’ژ)</label>
            <input type="number" value={giftForm.points_cost} onChange={e => setGiftForm({...giftForm, points_cost: parseInt(e.target.value)})}
              className="w-full border-2 border-[#84a9d1]/20 rounded-xl px-3 py-2 text-sm font-bold" />
          </div>
           <div>
            <label className="text-xs font-black text-[#1e3a5f] block mb-1">ظ†ظˆط¹ ط§ظ„طھط£ط«ظٹط±</label>
            <select value={giftForm.effect_type} onChange={e => setGiftForm({...giftForm, effect_type: e.target.value})}
              className="w-full border-2 border-[#84a9d1]/20 rounded-xl px-3 py-2 text-sm font-bold">
              <option value="overlay">طھط£ط«ظٹط± ط´ط§ط´ط©</option>
              <option value="global_announce">ط¥ط¹ظ„ط§ظ† ط¹ط§ظ„ظ…ظٹ</option>
              <option value="none">ط¨ط¯ظˆظ† طھط£ط«ظٹط±</option>
            </select>
          </div>
          <button onClick={handleSaveGift} disabled={saving}
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-black text-sm shadow-lg transition-all active:scale-95 disabled:opacity-50">
            {saving ? 'ط¬ط§ط±ظٹ ط§ظ„ط­ظپط¸...' : 'ط­ظپط¸ ط§ظ„ظ‡ط¯ظٹط©'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function RoomFormModal({ editingRoom, setShowCreateRoom, setEditingRoom, setRoomForm, roomForm, saving, handleSaveRoom }: any) {
  return (
    <div className="fixed inset-0 z-[350] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-slate-200">
        <div className="bg-[#1e3a5f] p-4 text-white flex justify-between items-center">
          <h3 className="font-black">{editingRoom ? 'طھط¹ط¯ظٹظ„ ط¨ظٹط§ظ†ط§طھ ط§ظ„ط؛ط±ظپط©' : 'ط¥ظ†ط´ط§ط، ط؛ط±ظپط© ط¬ط¯ظٹط¯ط©'}</h3>
          <button onClick={() => { setShowCreateRoom(false); setEditingRoom(null); }}><X size={20}/></button>
        </div>
        <div className="p-6 space-y-4 text-right">
          <div>
            <label className="text-xs font-black text-[#1e3a5f] block mb-1">ط§ط³ظ… ط§ظ„ط؛ط±ظپط©</label>
            <input value={roomForm.name} onChange={e => setRoomForm({...roomForm, name: e.target.value})}
              className="w-full border-2 border-[#84a9d1]/20 rounded-xl px-3 py-2 text-sm font-bold" />
          </div>
          <div>
            <label className="text-xs font-black text-[#1e3a5f] block mb-1">ظˆطµظپ ط§ظ„ط؛ط±ظپط©</label>
            <input value={roomForm.description} onChange={e => setRoomForm({...roomForm, description: e.target.value})}
              className="w-full border-2 border-[#84a9d1]/20 rounded-xl px-3 py-2 text-sm font-bold" />
          </div>
          <div>
            <label className="text-xs font-black text-[#1e3a5f] block mb-1">ط§ظ„ط¥ظٹظ…ظˆط¬ظٹ</label>
            <input value={roomForm.icon} onChange={e => setRoomForm({...roomForm, icon: e.target.value})}
              className="w-full border-2 border-[#84a9d1]/20 rounded-xl px-3 py-2 text-sm font-bold" />
          </div>
          <button onClick={handleSaveRoom} disabled={saving}
            className="w-full py-3 bg-[#1e3a5f] hover:bg-[#2a4e7c] text-white rounded-xl font-black text-sm shadow-lg transition-all active:scale-95 disabled:opacity-50">
            {saving ? 'ط¬ط§ط±ظٹ ط§ظ„ط­ظپط¸...' : 'ط­ظپط¸ ط§ظ„ط¨ظٹط§ظ†ط§طھ'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
