import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useChatStore } from '../store/useChatStore';
import { Send, X, MessageSquare, ChevronDown, ChevronUp, GripHorizontal } from 'lucide-react';
import { cn } from '../lib/utils';

interface PrivateChatModalProps {
  key?: string;
  targetUserId: string;
  targetDisplayName: string;
  onClose: () => void;
}

export default function PrivateChatModal({ targetUserId, targetDisplayName, onClose }: PrivateChatModalProps) {
  const { user, privateMessages, sendPrivateMessage, unreadPrivateChatUserIds, markPrivateChatAsRead } = useChatStore();
  const [inputText, setInputText] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isUnread = unreadPrivateChatUserIds.includes(targetUserId);

  const relevantMessages = privateMessages.filter(
    m => (m.userId === user?.id && (m as any).targetId === targetUserId) ||
         (m.userId === targetUserId && (m as any).targetId === user?.id)
  );

  useEffect(() => {
    if (scrollRef.current && !isMinimized) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    // Mark as read if not minimized and messages exist
    if (!isMinimized && isUnread) {
      markPrivateChatAsRead(targetUserId);
    }
  }, [relevantMessages, isMinimized, isUnread, targetUserId, markPrivateChatAsRead]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user) return;
    sendPrivateMessage(targetUserId, inputText.trim());
    setInputText('');
  };

  const handleFocus = () => {
    if (isUnread) markPrivateChatAsRead(targetUserId);
  };

  return (
    <motion.div 
      drag={window.innerWidth > 768}
      dragMomentum={false}
      dragElastic={0.1}
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ 
        opacity: 1, 
        scale: 1, 
        y: 0,
        height: isMinimized ? '45px' : (window.innerWidth < 768 ? '100%' : '380px'),
        width: isMinimized ? (window.innerWidth < 768 ? '120px' : '180px') : (window.innerWidth < 768 ? '100%' : '320px'),
        bottom: (window.innerWidth < 768 && !isMinimized) ? '0px' : '80px',
        left: (window.innerWidth < 768 && !isMinimized) ? '0px' : '20px',
        boxShadow: isUnread 
          ? ['0 0 0px rgba(249,115,22,0)', '0 0 15px rgba(249,115,22,0.6)', '0 0 0px rgba(249,115,22,0)'] 
          : '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}
      transition={{
        boxShadow: isUnread ? { repeat: Infinity, duration: 1.5 } : { duration: 0.3 },
        height: { type: 'spring', damping: 25, stiffness: 300 },
        width: { type: 'spring', damping: 25, stiffness: 300 }
      }}
      className={cn(
        "fixed z-[450] flex flex-col font-sans rtl overflow-hidden",
        window.innerWidth < 768 && !isMinimized ? "rounded-none" : "rounded-2xl border-2",
        isUnread ? "border-orange-500 bg-orange-50/5" : "border-[#84a9d1] bg-white"
      )} 
      dir="rtl"
      onMouseDown={handleFocus}
    >
      {/* Header / Drag Handle */}
      <div 
        className={cn(
          "p-2.5 flex items-center justify-between text-white shrink-0 cursor-move active:cursor-grabbing transition-colors",
          isUnread ? "bg-orange-500" : "bg-[#1e3a5f]"
        )}
      >
        <div className="flex items-center gap-2" onClick={() => setIsMinimized(!isMinimized)}>
          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
            {isMinimized ? <MessageSquare size={13} className={isUnread ? "animate-bounce" : ""} /> : <GripHorizontal size={14} />}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black leading-tight truncate">{targetDisplayName}</p>
            {isUnread && isMinimized && <p className="text-[8px] font-bold animate-pulse">رسالة جديدة!</p>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setIsMinimized(!isMinimized)} 
            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
          >
            {isMinimized ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {!isMinimized && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-3 space-y-2 bg-[#f9fbfd] custom-scrollbar"
            >
              {relevantMessages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                  <MessageSquare size={24} className="mb-2" />
                  <p className="text-[9px] font-bold">لا توجد رسائل سابقة.</p>
                </div>
              )}
              {relevantMessages.map((msg) => {
                const isMe = msg.userId === user?.id;
                return (
                  <div key={msg.id} className={cn("flex", isMe ? "justify-start" : "justify-end")}>
                    <div className={cn(
                      "max-w-[85%] px-2.5 py-1.5 rounded-xl text-[10px] font-bold border shadow-sm",
                      isMe ? "bg-[#deedf7] border-[#84a9d1] rounded-tr-none text-[#1e3a5f]" : "bg-white border-gray-100 rounded-tl-none text-[#333]"
                    )}>
                      {msg.text}
                      <p className="text-[7px] opacity-40 mt-1 text-left">
                        {new Date(msg.timestamp).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-2 border-t border-[#84a9d1]/30 bg-white flex gap-1.5">
              <input
                type="text"
                autoFocus
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onFocus={handleFocus}
                placeholder="اكتب..."
                className="flex-1 bg-gray-50 border border-[#84a9d1]/20 rounded-lg px-2.5 py-1.5 text-[10px] font-bold focus:outline-none focus:border-[#1e3a5f] transition-all"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="bg-[#1e3a5f] text-white p-2 rounded-lg hover:bg-[#2a4e7c] disabled:opacity-30 transition-all shadow-md active:scale-95"
              >
                <Send size={13} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
