import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useChatStore } from '../store/useChatStore';
import { motion } from 'motion/react';
import { X, Star, Gift, MessageSquare, Edit2, Check, Award, ShoppingBag, Package, Sparkles, Crown, Zap, Lock, User as UserIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { getGlobalRank } from '../lib/ranks';

interface ProfileModalProps {
  userId: string;
  onClose: () => void;
  initialTab?: 'profile' | 'shop' | 'inventory';
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'صاحب الموقع',
  super_admin: 'مشرف عام',
  admin: 'مشرف',
  friend: 'صديق',
  member: 'عضو',
  guest: 'زائر',
};

const ROLE_BADGE: Record<string, string> = {
  owner: 'bg-red-500 text-white',
  super_admin: 'bg-purple-600 text-white',
  admin: 'bg-blue-600 text-white',
  friend: 'bg-green-500 text-white',
  member: 'bg-gray-500 text-white',
  guest: 'bg-gray-300 text-gray-600',
};

const CATEGORY_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  frame:        { label: 'إطارات الصورة', icon: <Crown size={14} />,    color: 'text-yellow-500' },
  avatar:       { label: 'الأفاتار',      icon: <UserIcon size={14} />, color: 'text-blue-500' },
  entry_effect: { label: 'تأثيرات الدخول', icon: <Sparkles size={14} />, color: 'text-purple-500' },
  badge:        { label: 'شارات مميزة',   icon: <Award size={14} />,      color: 'text-green-500' },
};

import { DEFAULT_SHOP_ITEMS } from '../types';

export default function ProfileModal({ userId, onClose, initialTab = 'profile' }: ProfileModalProps) {
  const { user: currentUser, setUser } = useChatStore();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Profile Edit
  const [isEditing, setIsEditing] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [saving, setSaving] = useState(false);

  // Tabs
  const [activeTab, setActiveTab] = useState<'profile' | 'shop' | 'inventory'>(initialTab);

  // Shop & Inventory
  const [shopItems, setShopItems] = useState<any[]>(DEFAULT_SHOP_ITEMS);
  const [userItems, setUserItems] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('frame');
  const [buying, setBuying] = useState<string | null>(null);
  const [equipping, setEquipping] = useState<string | null>(null);

  const isSelf = currentUser?.id === userId;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      // Fetch profile
      const { data: profData } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (profData) {
        setProfile(profData);
        setEditDisplayName(profData.display_name || '');
        setEditBio(profData.bio || '');
      }

      // Fetch all shop items
      try {
        const { data: sItems } = await supabase.from('shop_items').select('*').eq('is_active', true);
        if (sItems && sItems.length > 0) setShopItems(sItems);
      } catch (e) {
        console.warn('Failed to fetch shop items, using defaults');
      }

      // Fetch items owned by this user
      try {
        const { data: uItems } = await supabase.from('user_items').select('item_id, is_equipped').eq('user_id', userId);
        if (uItems) setUserItems(uItems);
      } catch (e) {
        console.warn('Failed to fetch user items');
      }

      setLoading(false);
    };
    fetchData();
  }, [userId]);

  const isOwned = (itemId: string) => userItems.some(i => i.item_id === itemId);
  const isEquipped = (itemId: string) => userItems.some(i => i.item_id === itemId && i.is_equipped);

  const handleSave = async () => {
    if (!isSelf || !editDisplayName.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from('profiles')
      .update({ display_name: editDisplayName.trim(), bio: editBio.trim() })
      .eq('id', userId)
      .select()
      .single();
    if (!error && data) {
      setProfile(data);
      if (currentUser) {
        setUser({ ...currentUser, display_name: data.display_name, bio: data.bio });
      }
    }
    setSaving(false);
    setIsEditing(false);
  };

  const handleBuy = async (item: any) => {
    if (!currentUser || !isSelf) return;
    if (currentUser.points < item.points_cost) {
      alert(`رصيدك غير كافٍ. تحتاج إلى ${item.points_cost} نقطة.`);
      return;
    }
    if (isOwned(item.id)) return;

    setBuying(item.id);
    try {
      const { error: pointsErr } = await supabase
        .from('profiles').update({ points: currentUser.points - item.points_cost }).eq('id', currentUser.id);
      if (pointsErr) throw pointsErr;

      const { error: itemErr } = await supabase.from('user_items').insert({
        user_id: currentUser.id,
        item_id: item.id,
        is_equipped: false
      });
      if (itemErr) throw itemErr;

      setUser({ ...currentUser, points: currentUser.points - item.points_cost });
      setUserItems(prev => [...prev, { item_id: item.id, is_equipped: false }]);
    } catch (err: any) {
      alert('فشل الشراء: ' + err.message);
    }
    setBuying(null);
  };

  const handleEquip = async (item: any) => {
    if (!currentUser || !isSelf || !isOwned(item.id)) return;
    setEquipping(item.id);

    const column = item.category === 'frame' ? 'equipped_frame'
      : item.category === 'entry_effect' ? 'equipped_entry_effect'
      : item.category === 'badge' ? 'equipped_badge'
      : null;

    const sameCategory = shopItems.filter(i => i.category === item.category).map(i => i.id);
    setUserItems(prev => prev.map(ui => 
      sameCategory.includes(ui.item_id) ? { ...ui, is_equipped: ui.item_id === item.id } : ui
    ));

    if (column) {
      const currentVal = (currentUser as any)[column];
      const newVal = currentVal === item.id ? null : item.id; // toggle
      await supabase.from('profiles').update({ [column]: newVal }).eq('id', currentUser.id);
      setUser({ ...currentUser, [column]: newVal } as any);
      setProfile((prev: any) => ({ ...prev, [column]: newVal }));
    }
    
    // Handle avatar change
    if (item.category === 'avatar') {
      await supabase.from('profiles').update({ avatar_url: item.image_url }).eq('id', currentUser.id);
      setUser({ ...currentUser, avatar_url: item.image_url });
      setProfile((prev: any) => ({ ...prev, avatar_url: item.image_url }));
    }

    await supabase.from('user_items').update({ is_equipped: false }).eq('user_id', currentUser.id).in('item_id', sameCategory);

    const isCurrentlyEquipped = isEquipped(item.id);
    await supabase.from('user_items').update({ is_equipped: !isCurrentlyEquipped }).eq('user_id', currentUser.id).eq('item_id', item.id);

    setUserItems(prev => prev.map(ui => ui.item_id === item.id ? { ...ui, is_equipped: !isCurrentlyEquipped } : ui));
    
    // Trigger real-time presence update so everyone in the room sees the change
    const { updatePresence } = useChatStore.getState();
    updatePresence();
    
    setEquipping(null);
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm flex justify-center p-4 pt-10 font-sans overflow-y-auto" dir="rtl">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="w-full max-w-2xl bg-white rounded-3xl border-2 border-[#84a9d1] shadow-2xl overflow-hidden self-start mb-10"
      >
        {/* Header Tabs if Self */}
        <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2a4e7c] flex flex-col pt-3">
          <div className="flex items-center justify-between px-5 pb-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-500 rounded-xl flex items-center justify-center text-white font-black text-sm shadow">
                {loading ? '...' : (profile?.display_name?.charAt(0) || '?')}
              </div>
              <span className="text-sm font-black text-white">{isSelf ? 'ملفي الشخصي' : 'ملف المستخدم'}</span>
            </div>
            {isSelf && (
              <div className="bg-white/10 px-3 py-1 bg-black/20 rounded-xl flex items-center gap-2">
                <Star size={14} className="text-yellow-400" />
                <span className="font-black text-sm text-white">{currentUser?.points?.toLocaleString() || 0}</span>
              </div>
            )}
            <button onClick={onClose} className="w-8 h-8 bg-white/10 hover:bg-red-500 hover:text-white rounded-lg flex items-center justify-center text-sm transition-all text-white/50">✕</button>
          </div>
          
          {isSelf && (
            <div className="flex flex-row">
              <button onClick={() => setActiveTab('profile')} className={cn("flex-1 py-3 font-black text-xs md:text-sm transition-all border-b-2 flex items-center justify-center gap-2", activeTab==='profile' ? "border-orange-400 text-white" : "border-transparent text-white/50 hover:text-white/80")}>
                <User2 size={16} /> الملف الشخصي
              </button>
              <button onClick={() => setActiveTab('inventory')} className={cn("flex-1 py-3 font-black text-xs md:text-sm transition-all border-b-2 flex items-center justify-center gap-2", activeTab==='inventory' ? "border-orange-400 text-white" : "border-transparent text-white/50 hover:text-white/80")}>
                <Package size={16} /> ممتلكاتي
              </button>
              <button onClick={() => setActiveTab('shop')} className={cn("flex-1 py-3 font-black text-xs md:text-sm transition-all border-b-2 flex items-center justify-center gap-2", activeTab==='shop' ? "border-orange-400 text-white" : "border-transparent text-white/50 hover:text-white/80")}>
                <ShoppingBag size={16} /> المتجر
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
          </div>
        ) : profile && activeTab === 'profile' ? (
          <div className="p-6 space-y-5 bg-[#f8fbff]">
            {/* Avatar + Name */}
            <div className="flex items-center gap-5 bg-white p-4 rounded-2xl shadow-sm border border-[#84a9d1]/20">
              <div className="relative shrink-0 w-24 h-24">
                {/* Base Avatar Container */}
                <div className="w-full h-full rounded-full border-4 border-[#84a9d1]/30 bg-[#f0f4f8] shadow-lg flex items-center justify-center text-5xl overflow-hidden bg-white relative">
                  {profile.avatar_url?.startsWith('http') || profile.avatar_url?.startsWith('/') ? (
                    <img src={profile.avatar_url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    profile.avatar_url || '🧔'
                  )}
                </div>

                {/* Ornamental Frame Overlay */}
                {(() => {
                  const equippedFrame = profile.equipped_frame;
                  if (!equippedFrame) return null;

                  if (equippedFrame.startsWith('http')) {
                    return <img src={equippedFrame} className="frame-image-overlay" alt="" />;
                  }

                  const frameItem = shopItems.find(s => s.id === equippedFrame)
                                 || shopItems.find(s => s.category === 'frame' && s.preview_css === equippedFrame);
                  return frameItem ? <div className={cn("absolute inset-0 z-10", frameItem.preview_css)}></div> : null;
                })()}

                <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 rounded-full border-2 border-white z-20"></div>
              </div>
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <input
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    className="w-full text-lg font-black text-[#1e3a5f] border-2 border-orange-400 rounded-xl px-3 py-1 focus:outline-none mb-1"
                    placeholder="الاسم المستعار"
                  />
                ) : (
                  <h3 className="text-xl font-black text-[#1e3a5f] truncate flex items-center gap-2">
                    {profile.display_name}
                    {(() => {
                      const badgeItem = shopItems.find(s => s.id === profile.equipped_badge)
                                     || shopItems.find(s => s.category === 'badge' && s.preview_css === profile.equipped_badge);
                      return badgeItem ? <span className="name-badge">{badgeItem.image_url}</span> : null;
                    })()}
                  </h3>
                )}
                <span className="text-xs text-[#84a9d1] font-bold">@{profile.username}</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  <span className={cn("text-[10px] font-black px-2 py-0.5 rounded", ROLE_BADGE[profile.role] || ROLE_BADGE.member)}>
                    {ROLE_LABELS[profile.role] || 'عضو'}
                  </span>
                  {/* Global Rank Badge */}
                  <span className="text-[10px] font-black px-2 py-0.5 rounded text-white shadow-sm" style={{ backgroundColor: getGlobalRank(profile.total_gifts_sent, profile.total_gifts_received).color }}>
                    {getGlobalRank(profile.total_gifts_sent, profile.total_gifts_received).name}
                  </span>
                </div>
              </div>
            </div>

            {/* Bio */}
            <div className="bg-white rounded-2xl p-4 border border-[#84a9d1]/20 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare size={14} className="text-[#84a9d1]" />
                <span className="text-[10px] font-black text-[#84a9d1] uppercase tracking-widest">نبذة</span>
              </div>
              {isEditing ? (
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full text-sm font-bold text-[#1e3a5f] border border-[#84a9d1] rounded-xl px-3 py-2 resize-none focus:outline-none focus:border-orange-400 bg-[#f8fbff]"
                  rows={3}
                  placeholder="اكتب شيئاً عن نفسك..."
                />
              ) : (
                <p className="text-sm text-[#1e3a5f] font-bold leading-relaxed whitespace-pre-wrap">
                  {profile.bio || 'لا توجد نبذة شخصية.'}
                </p>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-2xl p-4 text-center border border-[#84a9d1]/20 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-10 text-4xl"><Star /></div>
                <div className="text-2xl font-black text-orange-500 mb-1">{profile.points || 0}</div>
                <div className="text-[10px] font-black text-[#84a9d1]">نقطة معدنية</div>
              </div>
              <div className="bg-white rounded-2xl p-4 text-center border border-[#84a9d1]/20 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-10 text-4xl text-green-500"><Gift /></div>
                <div className="text-2xl font-black text-green-600 mb-1">{profile.total_gifts_sent || 0}</div>
                <div className="text-[10px] font-black text-[#84a9d1]">هدايا أرسلها</div>
              </div>
              <div className="bg-white rounded-2xl p-4 text-center border border-[#84a9d1]/20 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-10 text-4xl text-pink-500"><Gift /></div>
                <div className="text-2xl font-black text-pink-600 mb-1">{profile.total_gifts_received || 0}</div>
                <div className="text-[10px] font-black text-[#84a9d1]">هدايا استلمها</div>
              </div>
            </div>

            {/* Global Rank Detail */}
            <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2a4e7c] rounded-2xl p-4 text-white flex items-center gap-4 shadow-lg border-2 border-white/10">
               <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-inner" style={{ backgroundColor: getGlobalRank(profile.total_gifts_sent, profile.total_gifts_received).color }}>
                 <Award size={24} />
               </div>
               <div className="flex-1">
                 <p className="text-[10px] font-black opacity-70 uppercase tracking-widest">الرتبة العالمية</p>
                 <p className="text-lg font-black">{getGlobalRank(profile.total_gifts_sent, profile.total_gifts_received).name}</p>
                 <div className="w-full bg-white/20 h-1.5 rounded-full mt-1.5 overflow-hidden">
                    <div className="bg-white h-full transition-all duration-1000" style={{ width: `${Math.min(100, (profile.total_gifts_sent + profile.total_gifts_received * 0.5) / getGlobalRank(profile.total_gifts_sent, profile.total_gifts_received).minGifts * 100)}%` }}></div>
                 </div>
               </div>
            </div>

            {/* Actions */}
            {isSelf && (
              <div className="flex gap-3">
                {isEditing ? (
                  <>
                    <button onClick={handleSave} disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-500 text-white rounded-2xl font-black text-sm hover:bg-green-600 transition-all shadow-md active:scale-95 disabled:opacity-50">
                      <Check size={16} /> {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                    </button>
                    <button onClick={() => setIsEditing(false)} className="px-6 py-3 bg-white border border-[#84a9d1] text-[#1e3a5f] rounded-2xl font-black text-sm hover:bg-[#eef4f9] transition-all">
                      إلغاء
                    </button>
                  </>
                ) : (
                  <button onClick={() => setIsEditing(true)} className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#1e3a5f] text-white rounded-2xl font-black text-sm hover:bg-[#2a4e7c] transition-all shadow-md active:scale-95">
                    <Edit2 size={16} /> تعديل الملف
                  </button>
                )}
              </div>
            )}
          </div>
        ) : profile && activeTab === 'shop' ? (
          <div className="flex flex-col h-[500px]">
            {/* Category Tabs */}
            <div className="flex overflow-x-auto border-b border-[#84a9d1]/20 bg-[#f8fbff] no-scrollbar">
              {Object.entries(CATEGORY_LABELS).map(([cat, info]) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn("flex items-center gap-2 px-6 py-4 text-xs font-black shrink-0 transition-all border-b-2", activeCategory === cat ? "border-orange-500 text-orange-600 bg-white" : "border-transparent text-[#84a9d1] hover:text-[#1e3a5f] hover:bg-white/50")}
                >
                  {info.icon} {info.label}
                </button>
              ))}
            </div>

            {/* Shop Items Grid */}
            <div className="p-3 grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 overflow-y-auto custom-scrollbar flex-1 bg-[#f8fbff] content-start">
              {shopItems.filter(i => {
                if (i.category !== activeCategory) return false;
                if (isOwned(i.id)) return false;
                
                // Gender filtering for avatars using preview_css
                if (i.category === 'avatar') {
                  const userGender = currentUser?.gender || 'boy';
                  if (i.preview_css === 'avatar-boy' && userGender === 'girl') return false;
                  if (i.preview_css === 'avatar-girl' && userGender === 'boy') return false;
                }
                
                return true;
              }).map(item => {
                const canAfford = (currentUser?.points || 0) >= item.points_cost;

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-xl border border-[#84a9d1]/30 hover:border-orange-400 p-2 flex flex-col items-center justify-between shadow-sm transition-all relative overflow-hidden aspect-[4/5] group"
                  >
                    <div className="w-full flex-1 rounded-lg flex items-center justify-center text-3xl bg-gradient-to-br from-[#eef4f9] to-[#deedf7] group-hover:scale-105 transition-transform overflow-hidden">
                      {(item.image_url.startsWith('http') || item.image_url.startsWith('/')) ? (
                        <img src={item.image_url} className="w-full h-full object-contain p-1" alt="" />
                      ) : (
                        item.image_url
                      )}
                    </div>
                    
                    <div className="text-center w-full">
                      <p className="text-[10px] md:text-xs font-black text-[#1e3a5f] truncate">{item.name_ar}</p>
                      <div className="flex items-center justify-center gap-1 text-[10px] font-black text-orange-500 mt-0.5">
                        <Star size={10} /> {item.points_cost.toLocaleString()}
                      </div>
                    </div>

                    <button
                      onClick={() => handleBuy(item)}
                      disabled={!!buying || !canAfford}
                      className={cn("w-full py-1.5 rounded-lg text-[10px] md:text-xs font-black transition-all flex items-center justify-center gap-1", canAfford ? "bg-gradient-to-r from-orange-500 to-yellow-500 text-white hover:scale-105 shadow-sm" : "bg-gray-100 text-gray-400 cursor-not-allowed")}
                    >
                      {buying === item.id ? '...' : canAfford ? <><ShoppingBag size={10} /> شراء</> : <><Lock size={10} /> رصيد</>}
                    </button>
                  </motion.div>
                );
              })}
              {shopItems.filter(i => i.category === activeCategory && !isOwned(i.id)).length === 0 && (
                <div className="col-span-full py-20 text-center text-[#84a9d1] font-black text-sm">
                  لا توجد عناصر متاحة للشراء في هذا القسم
                </div>
              )}
            </div>
          </div>
        ) : profile && activeTab === 'inventory' ? (
          <div className="flex flex-col h-[500px]">
            {/* Category Tabs */}
            <div className="flex overflow-x-auto border-b border-[#84a9d1]/20 bg-[#f8fbff] no-scrollbar">
              {Object.entries(CATEGORY_LABELS).map(([cat, info]) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn("flex items-center gap-2 px-6 py-4 text-xs font-black shrink-0 transition-all border-b-2", activeCategory === cat ? "border-orange-500 text-orange-600 bg-white" : "border-transparent text-[#84a9d1] hover:text-[#1e3a5f] hover:bg-white/50")}
                >
                  {info.icon} {info.label}
                </button>
              ))}
            </div>

            {/* Inventory Items Grid */}
            <div className="p-3 grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 overflow-y-auto custom-scrollbar flex-1 bg-[#f8fbff] content-start">
              {userItems.map(ui => {
                const item = shopItems.find(s => s.id === ui.item_id);
                if (!item || item.category !== activeCategory) return null;

                const equipped = isEquipped(item.id);

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={cn(
                      "bg-white rounded-xl border p-2 flex flex-col items-center justify-between shadow-sm transition-all relative overflow-hidden aspect-[4/5]",
                      equipped ? "border-orange-400 shadow-orange-200 shadow-sm bg-orange-50/10" : "border-[#84a9d1]/30 hover:border-[#84a9d1]"
                    )}
                  >
                    {equipped && <div className="absolute top-0 right-0 bg-orange-500 text-white text-[8px] font-black px-1 py-0.5 rounded-bl shadow-sm z-10 w-full text-center">مُفعَّل</div>}
                    
                    <div className="w-full flex-1 rounded-lg flex items-center justify-center text-3xl bg-gradient-to-br from-[#eef4f9] to-[#deedf7] relative mt-2">
                      {item.image_url}
                    </div>
                    
                    <div className="text-center w-full">
                      <p className="text-[10px] md:text-xs font-black text-[#1e3a5f] truncate">{item.name_ar}</p>
                    </div>

                    {isSelf && (
                      <button
                        onClick={() => handleEquip(item)}
                        disabled={!!equipping}
                        className={cn("w-full py-1.5 rounded-lg text-[10px] md:text-xs font-black transition-all flex items-center justify-center gap-1", equipped ? "bg-orange-100 text-orange-600 border border-orange-200" : "bg-[#1e3a5f] text-white hover:bg-[#2a4e7c]")}
                      >
                        {equipping === item.id ? '...' : equipped ? <><Check size={10} /> إلغاء</> : 'تفعيل'}
                      </button>
                    )}
                  </motion.div>
                );
              })}
              {userItems.filter(ui => shopItems.find(s => s.id === ui.item_id)?.category === activeCategory).length === 0 && (
                <div className="col-span-full py-20 text-center text-[#84a9d1] font-black text-sm">
                  لا تملك أي عناصر في هذا القسم
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-12 text-center text-[#84a9d1] font-bold">لم يتم العثور على الملف الشخصي</div>
        )}
      </motion.div>
    </div>
  );
}

// Helper icon component since lucide User2 isn't imported
function User2({ size }: { size: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
}
