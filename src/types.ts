export type Role = 'owner' | 'super_admin' | 'admin' | 'friend' | 'member' | 'guest';

export const DEFAULT_SHOP_ITEMS = [
  // ─── Frames (Ornamental Decorative Borders) ───
  { id: 'f001', name_ar: 'إطار الملك المذهب', category: 'frame', image_url: '👑', preview_css: 'frame-king-premium', points_cost: 2000, is_active: true },
  { id: 'f002', name_ar: 'إطار الجحيم المشتعل', category: 'frame', image_url: '🔥', preview_css: 'frame-fire-premium', points_cost: 3500, is_active: true },
  { id: 'f003', name_ar: 'إطار الألماس اللامع', category: 'frame', image_url: '💎', preview_css: 'frame-diamond-pro', points_cost: 5000, is_active: true },
  { id: 'f004', name_ar: 'إطار النينجا الغامض', category: 'frame', image_url: '🥷', preview_css: 'frame-ninja-dark', points_cost: 1500, is_active: true },
  { id: 'f005', name_ar: 'إطار النور الساطع', category: 'frame', image_url: '✨', preview_css: 'frame-light-beams', points_cost: 2500, is_active: true },
  { id: 'f006', name_ar: 'إطار المحارب القديم', category: 'frame', image_url: '🛡️', preview_css: 'frame-warrior-ancient', points_cost: 1800, is_active: true },

  // ─── Entry Effects (Visual Join Animations) ───
  { id: 'e001', name_ar: 'دخول الملك العظيم', category: 'entry_effect', image_url: '👑', preview_css: 'entry-royal', points_cost: 10000, is_active: true },
  { id: 'e002', name_ar: 'وصول الطائرة الخاصة', category: 'entry_effect', image_url: '✈️', preview_css: 'entry-plane', points_cost: 7500, is_active: true },
  { id: 'e003', name_ar: 'هجوم الدبابة الضاربة', category: 'entry_effect', image_url: '🛡️', preview_css: 'entry-tank', points_cost: 15000, is_active: true },
  { id: 'e004', name_ar: 'تحليق الصقر الحر', category: 'entry_effect', image_url: '🦅', preview_css: 'entry-bird', points_cost: 5000, is_active: true },
  { id: 'e005', name_ar: 'زئير الأسد المرعب', category: 'entry_effect', image_url: '🦁', preview_css: 'entry-lion', points_cost: 20000, is_active: true },
  { id: 'e006', name_ar: 'ظهور النجم الساطع', category: 'entry_effect', image_url: '🌟', preview_css: 'entry-star-flash', points_cost: 4000, is_active: true },

  // ─── Badges (Icons next to username) ───
  { id: 'b001', name_ar: 'تاج الفخامة', category: 'badge', image_url: '👑', preview_css: 'badge-royal-crown', points_cost: 1000, is_active: true },
  { id: 'b002', name_ar: 'نجمة التميز', category: 'badge', image_url: '🌟', preview_css: 'badge-super-star', points_cost: 500, is_active: true },
  { id: 'b003', name_ar: 'قلب الوفاء المذهب', category: 'badge', image_url: '💛', preview_css: 'badge-gold-heart', points_cost: 800, is_active: true },
  { id: 'b004', name_ar: 'ماسة الحظ النادرة', category: 'badge', image_url: '💎', preview_css: 'badge-lucky-diamond', points_cost: 2500, is_active: true },
  { id: 'b005', name_ar: 'درع الحماية الفضي', category: 'badge', image_url: '🛡️', preview_css: 'badge-silver-shield', points_cost: 1200, is_active: true },
  { id: 'b006', name_ar: 'وسام الأسطورة', category: 'badge', image_url: '🏆', preview_css: 'badge-legendary-medal', points_cost: 5000, is_active: true },

  // ─── Premium Avatars ───
  { id: 'a001', name_ar: 'الشيخ الأنيق', category: 'avatar', image_url: '/avatars/boy-1.png', preview_css: 'avatar-boy', points_cost: 500, is_active: true },
  { id: 'a002', name_ar: 'الفارس المغطى', category: 'avatar', image_url: '/avatars/boy-2.png', preview_css: 'avatar-boy', points_cost: 800, is_active: true },
  { id: 'a003', name_ar: 'المبدع المتألق', category: 'avatar', image_url: 'https://api.dicebear.com/7.x/big-smile/png?seed=Felix&backgroundColor=b6e3f4', preview_css: 'avatar-boy', points_cost: 1000, is_active: true },
  { id: 'a004', name_ar: 'الملكة الحالمة', category: 'avatar', image_url: '/avatars/girl-1.png', preview_css: 'avatar-girl', points_cost: 500, is_active: true },
  { id: 'a005', name_ar: 'الأميرة المتوجة', category: 'avatar', image_url: '/avatars/girl-2.png', preview_css: 'avatar-girl', points_cost: 1500, is_active: true },
  { id: 'a006', name_ar: 'الجمال الهادئ', category: 'avatar', image_url: 'https://api.dicebear.com/7.x/lorelei/png?seed=Nala&backgroundColor=c0aede', preview_css: 'avatar-girl', points_cost: 700, is_active: true },
];

export const DEFAULT_GIFTS: Gift[] = [
  { id: 'g1111111-1111-1111-1111-111111111111', name_ar: 'وردة حمراء', name_en: 'Red Rose', image_url: '🌹', points_cost: 10, points_award: 8, effect_type: 'corner', is_active: true },
  { id: 'g2222222-2222-2222-2222-222222222222', name_ar: 'قلب ذهبي', name_en: 'Gold Heart', image_url: '💛', points_cost: 25, points_award: 20, effect_type: 'overlay', is_active: true },
  { id: 'g3333333-3333-3333-3333-333333333333', name_ar: 'تاج ملكي', name_en: 'Royal Crown', image_url: '👑', points_cost: 100, points_award: 80, effect_type: 'fullscreen', is_active: true },
  { id: 'g4444444-4444-4444-4444-444444444444', name_ar: 'نجمة ساطعة', name_en: 'Bright Star', image_url: '⭐', points_cost: 50, points_award: 40, effect_type: 'rain', is_active: true },
  { id: 'g5555555-5555-5555-5555-555555555555', name_ar: 'هدية مفاجأة', name_en: 'Surprise Gift', image_url: '🎁', points_cost: 30, points_award: 25, effect_type: 'overlay', is_active: true },
  { id: 'g6666666-6666-6666-6666-666666666666', name_ar: 'صاروخ الحظ', name_en: 'Lucky Rocket', image_url: '🚀', points_cost: 75, points_award: 60, effect_type: 'global_announce', is_active: true },
  // الهدايا الفاخرة الجديدة
  { id: 'g7777777-7777-7777-7777-777777777777', name_ar: 'يخت البحر', name_en: 'Sea Yacht', image_url: '🛥️', points_cost: 5000, points_award: 4000, effect_type: 'fullscreen', is_active: true },
  { id: 'g8888888-8888-8888-8888-888888888888', name_ar: 'قصر الأحلام', name_en: 'Dream Castle', image_url: '🏰', points_cost: 10000, points_award: 8000, effect_type: 'fullscreen', is_active: true },
  { id: 'g9999999-9999-9999-9999-999999999999', name_ar: 'سيارة لامبو', name_en: 'Lambo Car', image_url: '🏎️', points_cost: 2500, points_award: 2000, effect_type: 'overlay', is_active: true },
  { id: 'gaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name_ar: 'خاتم ألماس', name_en: 'Diamond Ring', image_url: '💍', points_cost: 1500, points_award: 1200, effect_type: 'corner', is_active: true },
  { id: 'gbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', name_ar: 'طائرة خاصة', name_en: 'Private Jet', image_url: '🛩️', points_cost: 7000, points_award: 5500, effect_type: 'global_announce', is_active: true },
];

export interface SiteSettings {
  id: string;
  site_name: string;
  maintenance_mode: boolean;
  welcome_announcement: string;
  logo_url?: string;
}

export interface User {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  points: number;
  is_guest: boolean;
  role?: Role;
  gender: 'boy' | 'girl';
  items?: string[];
  total_gifts_sent?: number;
  total_gifts_received?: number;
  short_id?: number;
  equipped_frame?: string;
  equipped_entry_effect?: string;
  equipped_badge?: string;
}

export interface Room {
  id: string;
  name: string;
  slug: string;
  description?: string;
  owner_id: string;
  max_mic_seats: number;
  max_users: number;
  is_active: boolean;
  is_private: boolean;
  welcome_message?: string;
  cover_image_url?: string;
  requires_gateway_approval: boolean;
  private_chat_setting: 'all' | 'members' | 'none';
  settings?: Record<string, any>;
}

export interface Message {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  role: string;
  roleColor: string;
  text: string;
  timestamp: string;
  type: 'message' | 'system' | 'gift_announce' | 'mod_action' | 'private';
  shortId?: number;
  style?: {
    color?: string;
    fontFamily?: string;
    fontSize?: string;
    fontWeight?: string;
    animation?: string;
    background?: string;
    borderRadius?: string;
    padding?: string;
    textAlign?: any;
  };
  reactions?: Record<string, string[]>; // emoji -> list of userIds
}

export interface RoomModerator {
  id: string;
  room_id: string;
  user_id: string;
  role_name: string;
  role_color: string;
  permissions: Record<string, boolean>;
  created_at?: string;
}

export interface MicSeat {
  seat_number: number;
  user_id: string | null;
  username?: string;
  is_muted: boolean;
  is_locked: boolean;
}

export interface Gift {
  id: string;
  name_ar: string;
  name_en: string;
  image_url: string;
  points_cost: number;
  points_award: number;
  effect_type: 'corner' | 'overlay' | 'fullscreen' | 'rain' | 'global_announce';
  is_active: boolean;
}
