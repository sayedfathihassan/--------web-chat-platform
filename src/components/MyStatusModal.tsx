import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useChatStore } from '../store/useChatStore';

interface MyStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const statusOptions = [
  { id: 'available', label: 'متاح', icon: '🟢' },
  { id: 'busy', label: 'مشغول', icon: '🔴' },
  { id: 'away', label: 'بعيد', icon: '🟡' },
  { id: 'call', label: 'مكالمة', icon: '📞' },
  { id: 'eating', label: 'يأكل', icon: '🍔' },
  { id: 'sleeping', label: 'نائم', icon: '😴' },
] as const;

export default function MyStatusModal({ isOpen, onClose }: MyStatusModalProps) {
  const { user, userStatus, setUserStatus, isIgnorePrivate, setIgnorePrivate } = useChatStore();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] font-sans" dir="rtl">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-[350px] bg-[#f0f0f0] border-2 border-[#84a9d1] rounded-lg shadow-2xl overflow-hidden"
        >
          {/* Title Bar */}
          <div className="bg-gradient-to-b from-[#e3effa] to-[#b8d1e8] px-3 py-1.5 flex items-center justify-between border-b border-[#84a9d1]">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-500 rounded-sm flex items-center justify-center text-[10px] text-white font-bold">👤</div>
              <span className="text-xs font-bold text-[#1e3a5f]">أنا</span>
            </div>
            <button onClick={onClose} className="w-5 h-4 bg-[#ff5c5c] border border-[#84a9d1] rounded-sm flex items-center justify-center text-white text-[10px]">✕</button>
          </div>

          <div className="p-4">
            <div className="flex gap-4 mb-6">
              <div className="w-20 h-20 border border-[#84a9d1] bg-white flex items-center justify-center">
                <img 
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username || 'user'}`} 
                  alt="Avatar" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-[#1e3a5f] mb-2">الاسم: {user?.display_name}</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {statusOptions.map((option) => (
                    <label key={option.id} className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="status" 
                        checked={userStatus === option.id}
                        onChange={() => setUserStatus(option.id)}
                        className="w-3 h-3"
                      />
                      <span className="text-xs text-[#1e3a5f]">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-6 p-2 border border-dashed border-[#84a9d1]">
              <input 
                type="checkbox" 
                id="ignore-private" 
                checked={isIgnorePrivate}
                onChange={(e) => setIgnorePrivate(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="ignore-private" className="text-xs font-bold text-[#1e3a5f]">تجاهل كل الرسائل الخاصة</label>
            </div>

            <div className="flex justify-end gap-2">
              <button 
                onClick={onClose}
                className="flex items-center gap-2 px-4 py-1 bg-white border border-[#84a9d1] rounded hover:bg-gray-100 transition-colors text-xs font-bold text-[#1e3a5f]"
              >
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                موافق
              </button>
              <button 
                onClick={onClose}
                className="flex items-center gap-2 px-4 py-1 bg-white border border-[#84a9d1] rounded hover:bg-gray-100 transition-colors text-xs font-bold text-[#1e3a5f]"
              >
                <div className="w-3 h-3 bg-red-500 rounded-full flex items-center justify-center text-[8px] text-white">✕</div>
                إلغاء
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
