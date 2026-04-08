import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useChatStore } from '../store/useChatStore';
import { supabase } from '../lib/supabase';
import { 
  Settings, Users, Ban, Shield, X, Save, 
  Lock, Unlock, MessageSquare, Flag, Trash2,
  Crown, Bell, BellOff, Info, Edit3, UserPlus,
  Palette, Check
} from 'lucide-react';
import { cn } from '../lib/utils';
import { RoomModerator } from '../types';

interface RoomControlPanelProps {
  onClose: () => void;
}

export default function RoomControlPanel({ onClose }: RoomControlPanelProps) {
  const { currentRoom, setCurrentRoom, user } = useChatStore();
  const [activeTab, setActiveTab] = useState<'settings' | 'mods' | 'bans'>('settings');
  const [saving, setSaving] = useState(false);

  // Basic Info State
  const [roomName, setRoomName] = useState(currentRoom?.name || '');
  const [roomDesc, setRoomDesc] = useState(currentRoom?.description || '');

  // Moderators State
  const [mods, setMods] = useState<RoomModerator[]>([]);
  const [loadingMods, setLoadingMods] = useState(false);
  const [editingMod, setEditingMod] = useState<RoomModerator | null>(null);
  const [newModId, setNewModId] = useState('');

  const isOwner = currentRoom?.owner_id === user?.id;

  // Fetch Mods
  const fetchMods = async () => {
    if (!currentRoom) return;
    setLoadingMods(true);
    const { data } = await supabase
      .from('room_moderators')
      .select('*, profiles:user_id(display_name, username)')
      .eq('room_id', currentRoom.id);
    if (data) setMods(data as any[]);
    setLoadingMods(false);
  };

  React.useEffect(() => {
    if (activeTab === 'mods') fetchMods();
  }, [activeTab]);

  const handleAddMod = async () => {
    if (!currentRoom || !newModId.trim()) return;
    setSaving(true);
    
    // First find user by shortId or username
    const isShortId = !isNaN(Number(newModId));
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('id, display_name')
      .or(isShortId ? `short_id.eq.${newModId}` : `username.eq.${newModId}`)
      .single();

    if (userError || !userData) {
      alert('المستخدم غير موجود');
      setSaving(false);
      return;
    }

    const { error } = await supabase.from('room_moderators').insert({
      room_id: currentRoom.id,
      user_id: userData.id,
      role_name: 'مشرف',
      role_color: '#10b981',
      permissions: {
        can_kick: true,
        can_ban_device: true,
        can_suspend: true,
        can_announce: true,
        can_clear_chat: true,
        can_give_mic: true,
        can_view_reports: true
      }
    });

    if (error) alert('فشل إضافة المشرف: ' + error.message);
    else {
      setNewModId('');
      fetchMods();
    }
    setSaving(false);
  };

  const handleUpdateMod = async () => {
    if (!editingMod) return;
    setSaving(true);
    const { error } = await supabase
      .from('room_moderators')
      .update({
        role_name: editingMod.role_name,
        role_color: editingMod.role_color,
        permissions: editingMod.permissions
      })
      .eq('id', editingMod.id);

    if (error) alert('فشل التحديث: ' + error.message);
    else {
      setEditingMod(null);
      fetchMods();
    }
    setSaving(false);
  };

  const handleDeleteMod = async (id: string) => {
    if (!confirm('هل أنت متأكد من سحب الإشراف؟')) return;
    const { error } = await supabase.from('room_moderators').delete().eq('id', id);
    if (error) alert('فشل الحذف: ' + error.message);
    else fetchMods();
  };

  const handleUpdateRoom = async () => {
    if (!currentRoom) return;
    setSaving(true);
    const { error } = await supabase
      .from('rooms')
      .update({ name: roomName, description: roomDesc })
      .eq('id', currentRoom.id);
    
    if (!error) {
      setCurrentRoom({ ...currentRoom, name: roomName, description: roomDesc });
      alert('تم تحديث معلومات الغرفة بنجاح ✓');
    }
    setSaving(false);
  };

  const toggleGateway = async () => {
    if (!currentRoom) return;
    const newVal = !currentRoom.settings?.gateway_enabled;
    const { error } = await supabase
      .from('rooms')
      .update({ settings: { ...currentRoom.settings, gateway_enabled: newVal } })
      .eq('id', currentRoom.id);
    
    if (!error) {
      setCurrentRoom({ ...currentRoom, settings: { ...currentRoom.settings, gateway_enabled: newVal } });
    }
  };

  return (
    <div className="fixed inset-0 z-[400] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 font-sans" dir="rtl">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="w-full max-w-4xl bg-[#f0f4f8] rounded-[40px] border-4 border-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col h-[650px]"
      >
        {/* Header Section */}
        <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2a4e7c] p-8 text-white relative">
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-10">
            <div className="absolute top-[-50%] right-[-10%] w-[300px] h-[300px] bg-white rounded-full blur-[80px]"></div>
          </div>
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/30 shadow-2xl">
                <Crown size={32} className="text-yellow-400" />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight leading-tight">مركز تحكم المالك</h2>
                <p className="text-white/70 font-bold text-sm">إدارة الغرفة: <span className="text-yellow-400">{currentRoom?.name}</span></p>
              </div>
            </div>
            <button onClick={onClose} className="w-12 h-12 bg-white/10 hover:bg-red-500 rounded-2xl flex items-center justify-center transition-all border border-white/20 group">
              <X size={24} className="group-hover:rotate-90 transition-transform" />
            </button>
          </div>

          <div className="flex gap-4 mt-8">
             <button 
               onClick={() => setActiveTab('settings')}
               className={cn("px-6 py-2.5 rounded-xl font-black text-sm transition-all flex items-center gap-2 shadow-sm", activeTab === 'settings' ? "bg-white text-[#1e3a5f] scale-105" : "bg-white/10 hover:bg-white/20 text-white")}
             >
               <Settings size={18} /> إعدادات الغرفة
             </button>
             <button 
               onClick={() => setActiveTab('mods')}
               className={cn("px-6 py-2.5 rounded-xl font-black text-sm transition-all flex items-center gap-2 shadow-sm", activeTab === 'mods' ? "bg-white text-[#1e3a5f] scale-105" : "bg-white/10 hover:bg-white/20 text-white")}
             >
               <Users size={18} /> قائمة المشرفين
             </button>
             <button 
               onClick={() => setActiveTab('bans')}
               className={cn("px-6 py-2.5 rounded-xl font-black text-sm transition-all flex items-center gap-2 shadow-sm", activeTab === 'bans' ? "bg-white text-[#1e3a5f] scale-105" : "bg-white/10 hover:bg-white/20 text-white")}
             >
               <Ban size={18} /> قائمة الحظر
             </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          {activeTab === 'settings' && (
            <div className="space-y-8 max-w-2xl mx-auto">
              {/* Basic Info */}
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-[#84a9d1] uppercase pr-1">اسم الغرفة</label>
                  <div className="relative">
                    <Edit3 size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#84a9d1]" />
                    <input 
                      value={roomName}
                      onChange={e => setRoomName(e.target.value)}
                      className="w-full bg-white border-2 border-[#84a9d1]/20 rounded-2xl px-5 py-4 pr-12 text-sm font-black text-[#1e3a5f] focus:border-brand-blue outline-none transition-all shadow-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-[#84a9d1] uppercase pr-1">وصف الغرفة</label>
                  <textarea 
                    value={roomDesc}
                    onChange={e => setRoomDesc(e.target.value)}
                    rows={3}
                    className="w-full bg-white border-2 border-[#84a9d1]/20 rounded-2xl px-5 py-4 text-sm font-black text-[#1e3a5f] focus:border-brand-blue outline-none transition-all shadow-sm resize-none"
                  />
                </div>
              </div>

              {/* Status Toggles */}
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={toggleGateway}
                  className={cn(
                    "flex items-center justify-between p-6 rounded-3xl border-2 transition-all group",
                    currentRoom?.settings?.gateway_enabled 
                      ? "bg-orange-50 border-orange-500 shadow-lg shadow-orange-500/10" 
                      : "bg-white border-gray-100 hover:border-[#84a9d1]"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-all", currentRoom?.settings?.gateway_enabled ? "bg-orange-500 text-white shadow-lg" : "bg-gray-100 text-[#84a9d1]")}>
                      {currentRoom?.settings?.gateway_enabled ? <Bell size={24} /> : <BellOff size={24} />}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-[#1e3a5f]">بوابة الدخول</p>
                      <p className="text-[10px] font-bold text-[#84a9d1]">تحتاج لموافقة المشرفين</p>
                    </div>
                  </div>
                  <div className={cn("w-10 h-6 rounded-full relative transition-all", currentRoom?.settings?.gateway_enabled ? "bg-orange-500" : "bg-gray-200")}>
                    <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", currentRoom?.settings?.gateway_enabled ? "left-1" : "left-5")}></div>
                  </div>
                </button>

                <div className="bg-white border-2 border-gray-100 p-6 rounded-3xl flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 text-brand-blue rounded-2xl flex items-center justify-center">
                    <Users size={24} />
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-[#1e3a5f]">الحد الأقصى</p>
                    <p className="text-lg font-black text-brand-blue">{currentRoom?.max_users} مستخدم</p>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  onClick={handleUpdateRoom}
                  disabled={saving}
                  className="w-full py-5 bg-orange-500 hover:bg-orange-600 text-white rounded-[24px] font-black text-lg flex items-center justify-center gap-3 shadow-2xl shadow-orange-500/30 transition-all active:scale-95 disabled:opacity-50"
                 >
                  <Save size={24} /> {saving ? 'جاري الحفظ...' : 'حفظ كافة التغييرات'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'mods' && (
            <div className="space-y-6">
              {/* Add Mod Section */}
              <div className="bg-white p-6 rounded-[32px] border-2 border-[#84a9d1]/10 flex items-center gap-4">
                <div className="flex-1 relative">
                  <UserPlus size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#84a9d1]" />
                  <input 
                    placeholder="أدخل ايدي (Short ID) أو اسم المستخدم..."
                    value={newModId}
                    onChange={e => setNewModId(e.target.value)}
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-brand-blue rounded-2xl px-5 py-3 pr-12 text-sm font-bold outline-none transition-all"
                  />
                </div>
                <button 
                  onClick={handleAddMod}
                  disabled={saving || !newModId.trim()}
                  className="px-8 py-3 bg-brand-blue text-white rounded-2xl font-black text-sm shadow-lg shadow-brand-blue/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  إضافة مشرف
                </button>
              </div>

              {/* Mod List */}
              {loadingMods ? (
                <div className="py-20 text-center text-[#84a9d1] font-bold">جاري تحميل المشرفين...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {mods.map(mod => (
                    <div key={mod.id} className="bg-white p-5 rounded-3xl border-2 border-transparent hover:border-brand-blue/30 transition-all flex items-center justify-between group shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center font-black text-brand-blue">
                          {(mod as any).profiles?.display_name?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-black text-[#1e3a5f]">{(mod as any).profiles?.display_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: mod.role_color }}></span>
                            <span className="text-[10px] font-black" style={{ color: mod.role_color }}>{mod.role_name}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => setEditingMod(mod)}
                          className="p-2 bg-gray-50 text-brand-blue hover:bg-brand-blue hover:text-white rounded-xl transition-all"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteMod(mod.id)}
                          className="p-2 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {mods.length === 0 && !loadingMods && (
                <div className="text-center py-10 text-[#84a9d1] font-bold">لا يوجد مشرفون حالياً</div>
              )}

              {/* Edit Mod Modal */}
              <AnimatePresence>
                {editingMod && (
                  <div className="fixed inset-0 z-[500] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-white rounded-[40px] w-full max-w-md p-8 shadow-2xl relative"
                    >
                      <h3 className="text-xl font-black text-[#1e3a5f] mb-6 flex items-center gap-3">
                        <Palette className="text-brand-blue" /> تعديل رتبة المشرف
                      </h3>
                      
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-[#84a9d1] uppercase">اسم الرتبة (مثلاً: مراقب، مشرف)</label>
                          <input 
                            value={editingMod.role_name}
                            onChange={e => setEditingMod({...editingMod, role_name: e.target.value})}
                            className="w-full bg-gray-50 border-2 border-[#84a9d1]/10 rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:border-brand-blue transition-all"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-[#84a9d1] uppercase">لون الرتبة</label>
                          <div className="flex flex-wrap gap-2">
                            {['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'].map(color => (
                              <button 
                                key={color}
                                onClick={() => setEditingMod({...editingMod, role_color: color})}
                                className={cn(
                                  "w-10 h-10 rounded-xl border-2 transition-all flex items-center justify-center",
                                  editingMod.role_color === color ? "border-brand-blue scale-110 shadow-lg" : "border-transparent"
                                )}
                                style={{ backgroundColor: color }}
                              >
                                {editingMod.role_color === color && <Check className="text-white" size={20} />}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-4">
                          <button 
                            onClick={handleUpdateMod}
                            disabled={saving}
                            className="bg-brand-blue text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-brand-blue/20"
                          >
                            حفظ التعديلات
                          </button>
                          <button 
                            onClick={() => setEditingMod(null)}
                            className="bg-gray-100 text-[#1e3a5f] py-4 rounded-2xl font-black text-sm"
                          >
                            إلغاء
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          )}

          {activeTab === 'bans' && (
            <div className="text-center py-20 space-y-6">
              <div className="w-24 h-24 bg-white border border-[#84a9d1]/20 rounded-[32px] flex items-center justify-center mx-auto text-red-400 shadow-xl">
                <Ban size={48} />
              </div>
              <div>
                <p className="text-lg font-black text-[#1e3a5f]">قائمة المحظورين</p>
                <p className="text-sm font-bold text-[#84a9d1]">لعرض وفك الحظر عن المستخدمين، استخدم لوحة الإدارة العامة للغرفة</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="bg-white border-t border-[#84a9d1]/10 p-5 flex items-center gap-3">
          <Info size={16} className="text-brand-blue" />
          <p className="text-[11px] font-black text-[#84a9d1]">أنت ترى هذه اللوحة لأنك صاحب الغرفة. لديك الصلاحيات الكاملة للتحكم في الغرفة وإدارتها.</p>
        </div>
      </motion.div>
    </div>
  );
}
