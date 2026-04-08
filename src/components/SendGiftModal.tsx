import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useChatStore } from '../store/useChatStore';
import { Gift as GiftType } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Gift, Star, X, Send } from 'lucide-react';
import { cn } from '../lib/utils';

interface SendGiftModalProps {
  initialTargetUserId?: string;
  initialTargetDisplayName?: string;
  onClose: () => void;
}

export default function SendGiftModal({ initialTargetUserId, initialTargetDisplayName, onClose }: SendGiftModalProps) {
  const { user, setUser, currentRoom, sendMessage, onlineUsers, channel } = useChatStore();
  const [targetUserId, setTargetUserId] = useState(initialTargetUserId || '');
  const [targetDisplayName, setTargetDisplayName] = useState(initialTargetDisplayName || '');
  const [gifts, setGifts] = useState<GiftType[]>([]);
  const [selectedGift, setSelectedGift] = useState<GiftType | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [flyAnim, setFlyAnim] = useState(false);

  const isSelf = user?.id === targetUserId;

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('gifts')
        .select('*')
        .eq('is_active', true)
        .order('points_cost', { ascending: true });
      if (data) setGifts(data as GiftType[]);
      setLoading(false);
    };
    load();
  }, []);

  const handleSend = async () => {
    if (!selectedGift || !user || !currentRoom || isSelf || !targetUserId) return;
    if (user.points < selectedGift.points_cost) {
      alert(`رصيدك ${user.points} نقطة وهذه الهدية تكلف ${selectedGift.points_cost} نقطة. رصيدك غير كافٍ.`);
      return;
    }

    setSending(true);
    setFlyAnim(true);

    try {
      // 1. Deduct points from sender (avoid schema cache issue - use rpc if available)
      const { error: senderErr } = await supabase
        .from('profiles')
        .update({ points: user.points - selectedGift.points_cost })
        .eq('id', user.id);

      if (senderErr) throw senderErr;

      // 2. Add points to receiver 
      const { data: receiverData, error: recErr } = await supabase
        .from('profiles')
        .select('points')
        .eq('id', targetUserId)
        .single();

      if (!recErr && receiverData) {
        const awardAmount = Math.floor(selectedGift.points_cost * 0.1);
        await supabase.from('profiles').update({
          points: (receiverData.points || 0) + awardAmount,
        }).eq('id', targetUserId);
      }

      // 3. Try to increment gift stats (non-blocking — columns may not exist yet)
      supabase.rpc('increment_gift_stats', {
        p_sender_id: user.id,
        p_receiver_id: targetUserId
      }).then(({ error }) => {
        if (error) {
          // Fallback: direct update if RPC not available
          supabase.from('profiles').update({
            total_gifts_sent: (user.total_gifts_sent || 0) + 1,
          }).eq('id', user.id).then(() => {});
        }
      });

      // 4. Update local user state immediately
      setUser({
        ...user,
        points: user.points - selectedGift.points_cost,
        total_gifts_sent: (user.total_gifts_sent || 0) + 1,
      });

      // 4. Broadcast gift event to the room (everyone sees it)
      if (channel) {
        channel.send({
          type: 'broadcast',
          event: 'gift-received',
          payload: {
            senderId: user.id,
            senderName: user.display_name,
            receiverId: targetUserId,
            receiverName: targetDisplayName,
            giftEmoji: selectedGift.image_url,
            giftName: selectedGift.name_ar,
            effectType: selectedGift.effect_type || 'overlay'
          }
        });
      }

      // 5. Log to gift_logs (non-blocking, best effort)
      supabase.from('gift_logs').insert({
        sender_id: user.id,
        receiver_id: targetUserId,
        gift_id: selectedGift.id,
        points_cost: selectedGift.points_cost,
        points_award: selectedGift.points_award
      }).then(({ error }) => {
        if (error) console.warn('Gift log failed (non-critical):', error.message);
      });

      // 6. Close after animation
      setTimeout(() => {
        setSending(false);
        onClose();
      }, 1200);

    } catch (err: any) {
      console.error('Gift send error:', err);
      alert('حدث خطأ أثناء إرسال الهدية: ' + (err?.message || 'خطأ غير معروف'));
      setSending(false);
      setFlyAnim(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[350] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 font-sans" dir="rtl">
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.85 }}
        className="w-full max-w-md bg-white rounded-3xl border-2 border-[#84a9d1] shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-b from-[#deedf7] to-[#b8d1e8] px-5 py-4 flex items-center justify-between border-b border-[#84a9d1]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
              <Gift size={18} />
            </div>
            <div>
              <p className="text-sm font-black text-[#1e3a5f]">إرسال هدية</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-white/50 hover:bg-red-500 hover:text-white rounded-lg border border-[#84a9d1]/30 flex items-center justify-center text-sm transition-all"><X size={14} /></button>
        </div>

        <div className="p-5 space-y-5">
          {/* Target Selection if missing */}
          {!initialTargetUserId && (
            <div className="bg-[#f0f8ff] border border-[#b8d1e8] rounded-2xl p-3">
              <p className="text-[10px] font-black text-[#84a9d1] mb-2">اختر المستلم:</p>
              <select 
                value={targetUserId}
                onChange={(e) => {
                  const sel = onlineUsers.find(u => u.id === e.target.value);
                  setTargetUserId(sel?.id || '');
                  setTargetDisplayName(sel?.displayName || '');
                }}
                className="w-full bg-white border border-[#84a9d1] rounded-xl px-3 py-2 text-sm font-black text-[#1e3a5f] outline-none focus:border-orange-500 transition-colors cursor-pointer"
              >
                <option value="" disabled>-- اضغط لاختيار متواجد --</option>
                {onlineUsers.filter(u => u.id !== user?.id).map(u => (
                  <option key={u.id} value={u.id}>{u.displayName}</option>
                ))}
              </select>
            </div>
          )}
          
          {/* Target Display if provided */}
          {initialTargetUserId && (
             <p className="text-[10px] text-[#84a9d1] font-bold text-center bg-[#f0f8ff] rounded py-2 border border-[#b8d1e8]">المستلم: <span className="font-black text-[#1e3a5f]">{targetDisplayName}</span></p>
          )}
          {/* Balance */}
          <div className="flex items-center justify-between bg-[#f0f8ff] rounded-2xl px-4 py-3 border border-[#b8d1e8]">
            <div className="flex items-center gap-2">
              <Star size={16} className="text-orange-500" />
              <span className="text-xs font-black text-[#1e3a5f]">رصيدك الحالي</span>
            </div>
            <span className="text-lg font-black text-orange-600">{user?.points || 0} 💎</span>
          </div>

          {/* Self warning */}
          {isSelf && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl px-4 py-3 text-center">
              <p className="text-xs font-black text-yellow-700">لا يمكنك إرسال هدية لنفسك! 😄</p>
            </div>
          )}

          {/* Gifts grid */}
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
            </div>
          ) : gifts.length === 0 ? (
            <div className="text-center py-8 text-[#84a9d1] text-sm font-bold">
              لا توجد هدايا متاحة — أضفها من لوحة الإدارة
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {gifts.map(gift => {
                const canAfford = (user?.points || 0) >= gift.points_cost;
                const isSelected = selectedGift?.id === gift.id;
                return (
                  <button
                    key={gift.id}
                    onClick={() => !isSelf && setSelectedGift(gift)}
                    disabled={!canAfford || isSelf}
                    className={cn(
                      "flex flex-col items-center gap-1 p-2 rounded-2xl border-2 transition-all",
                      isSelected
                        ? "border-orange-500 bg-orange-50 scale-105 shadow-lg shadow-orange-500/20"
                        : canAfford && !isSelf
                          ? "border-[#84a9d1]/30 bg-white hover:border-orange-400 hover:bg-orange-50 cursor-pointer"
                          : "border-gray-100 bg-gray-50 opacity-40 cursor-not-allowed"
                    )}
                  >
                    <span className="text-3xl">{gift.image_url}</span>
                    <span className="text-[9px] font-black text-[#1e3a5f] leading-tight text-center">{gift.name_ar}</span>
                    <span className={cn(
                      "text-[8px] font-black px-1.5 py-0.5 rounded-full",
                      canAfford ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-500"
                    )}>{gift.points_cost}💎</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Selected gift preview */}
          <AnimatePresence>
            {selectedGift && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{selectedGift.image_url}</span>
                  <div>
                    <p className="text-sm font-black text-[#1e3a5f]">{selectedGift.name_ar}</p>
                    <p className="text-[10px] text-[#84a9d1] font-bold">
                      التكلفة: {selectedGift.points_cost}💎 — المستلِم يحصل: +{Math.floor(selectedGift.points_cost * 0.1)}💎
                    </p>
                  </div>
                </div>
                <button onClick={() => setSelectedGift(null)} className="text-[#84a9d1] hover:text-red-500"><X size={14} /></button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Flying emoji animation */}
          <AnimatePresence>
            {flyAnim && selectedGift && (
              <motion.div
                initial={{ opacity: 1, scale: 0.5, y: 0 }}
                animate={{ opacity: 0, scale: 3, y: -100 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none text-6xl z-50"
              >
                {selectedGift.image_url}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!selectedGift || !targetUserId || isSelf || sending}
            className="w-full py-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30 transition-all active:scale-95"
          >
            <Send size={16} />
            {sending ? 'جاري الإرسال... 🎊' : selectedGift && targetUserId ? `إرسال "${selectedGift.name_ar}" إلى ${targetDisplayName}` : 'اختر المستلم والهدية أولاً'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
