import React from 'react';
import { useChatStore } from '../store/useChatStore';
import PrivateChatModal from './PrivateChatModal';

export default function PrivateChatManager() {
  const { activePrivateChatUserIds, onlineUsers, closePrivateChat } = useChatStore();

  return (
    <div className="fixed inset-0 pointer-events-none z-[450] flex items-end justify-start gap-4 p-4">
      <div className="flex gap-4 pointer-events-auto">
        {activePrivateChatUserIds.map((targetId) => {
          const targetUser = onlineUsers.find(u => u.id === targetId);
          return (
            <PrivateChatModal
              key={targetId}
              targetUserId={targetId}
              targetDisplayName={targetUser?.displayName || 'مستخدم'}
              onClose={() => closePrivateChat(targetId)}
            />
          );
        })}
      </div>
    </div>
  );
}
