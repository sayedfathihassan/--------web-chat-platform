export interface GlobalRank {
  name: string;
  color: string;
  minGifts: number;
}

export const GLOBAL_RANKS: GlobalRank[] = [
  { name: 'إمبراطور السخاء', color: '#ff1a1a', minGifts: 500 },
  { name: 'سلطان القلوب', color: '#8b5cf6', minGifts: 200 },
  { name: 'الأسطورة الذهبية', color: '#f59e0b', minGifts: 100 },
  { name: 'الفارس الملكي', color: '#10b981', minGifts: 50 },
  { name: 'النجم الساطع', color: '#3b82f6', minGifts: 10 },
  { name: 'عضو برونزي', color: '#6b7280', minGifts: 0 },
];

export function getGlobalRank(giftsSent: number = 0, giftsReceived: number = 0) {
  const total = giftsSent + (giftsReceived * 0.5); // Weighting sent gifts more
  return GLOBAL_RANKS.find(r => total >= r.minGifts) || GLOBAL_RANKS[GLOBAL_RANKS.length - 1];
}
