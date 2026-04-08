import { useCallback } from 'react';
import { useChatStore } from '../store/useChatStore';

const SOUNDS = {
  message: 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3',
  gift: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3',
  notify: 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3',
  admin: 'https://assets.mixkit.co/active_storage/sfx/2360/2360-preview.mp3'
};

export function useSound() {
  const isSoundEnabled = useChatStore((state) => state.isSoundEnabled);

  const playSound = useCallback((type: keyof typeof SOUNDS) => {
    if (!isSoundEnabled) return;
    
    const audio = new Audio(SOUNDS[type]);
    audio.volume = 0.5;
    audio.play().catch(err => console.error('Audio play failed:', err));
  }, [isSoundEnabled]);

  return { playSound };
}
