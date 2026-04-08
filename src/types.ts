export type Role = 'owner' | 'super_admin' | 'admin' | 'friend' | 'member' | 'guest';

export const DEFAULT_SHOP_ITEMS = [
  // Frames
  { id: '11111111-1111-1111-1111-111111111111', name_ar: 'إطار الملك', category: 'frame', image_url: '👑', preview_css: 'frame-king', points_cost: 500, is_active: true },
  { id: '22222222-2222-2222-2222-222222222222', name_ar: 'إطار الجحيم', category: 'frame', image_url: '🔥', preview_css: 'frame-fire', points_cost: 800, is_active: true },
  { id: '33333333-3333-3333-3333-333333333333', name_ar: 'إطار الألماس', category: 'frame', image_url: '💎', preview_css: 'frame-diamond', points_cost: 1500, is_active: true },
  { id: '88888888-8888-8888-8888-888888888888', name_ar: 'إطار النينجا', category: 'frame', image_url: '🥷', preview_css: 'frame-ninja', points_cost: 1000, is_active: true },
  { id: '99999999-9999-9999-9999-999999999999', name_ar: 'إطار الغابة', category: 'frame', image_url: '🌿', preview_css: 'frame-nature', points_cost: 600, is_active: true },
  // Entry Effects
  { id: '44444444-4444-4444-4444-444444444444', name_ar: 'دخول العظماء', category: 'entry_effect', image_url: '🎺', preview_css: 'entry-royal', points_cost: 2000, is_active: true },
  { id: '55555555-5555-5555-5555-555555555555', name_ar: 'دخول ناري', category: 'entry_effect', image_url: '🔥', preview_css: 'entry-fire', points_cost: 1500, is_active: true },
  { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name_ar: 'دخول رومانسي', category: 'entry_effect', image_url: '💖', preview_css: 'entry-heart', points_cost: 1800, is_active: true },
  { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', name_ar: 'تحليق الطائرة', category: 'entry_effect', image_url: '✈️', preview_css: 'entry-plane', points_cost: 2500, is_active: true },
  { id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', name_ar: 'اقتحام الدبابة', category: 'entry_effect', image_url: '🛡️', preview_css: 'entry-tank', points_cost: 3000, is_active: true },
  { id: 'dddddddd-dddd-dddd-dddd-dddddddddddd', name_ar: 'رفرفة العصفورة', category: 'entry_effect', image_url: '🦅', preview_css: 'entry-bird', points_cost: 1200, is_active: true },
  { id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', name_ar: 'زئير الأسد', category: 'entry_effect', image_url: '🦁', preview_css: 'entry-lion', points_cost: 3500, is_active: true },
  { id: 'ffffffff-ffff-ffff-ffff-ffffffffffff', name_ar: 'دخول الدب', category: 'entry_effect', image_url: '🐻', preview_css: 'entry-bear', points_cost: 2000, is_active: true },
  // 10. Badges
  { id: '66666666-6666-6666-6666-666666666666', name_ar: 'شارة VIP', category: 'badge', image_url: '💎', preview_css: 'badge-vip', points_cost: 2000, is_active: true },
  { id: '77777777-7777-7777-7777-777777777777', name_ar: 'شارة الأسطورة', category: 'badge', image_url: '🏆', preview_css: 'badge-legend', points_cost: 5000, is_active: true },
  // 11. Custom Avatars - Boys (10 Items)
  { id: 'a0a0a0a0-1111-4000-8000-000000000001', name_ar: 'الشاب الأنيق', category: 'avatar', image_url: '/avatars/boy-1.svg', preview_css: 'avatar-boy', points_cost: 100, is_active: true },
  { id: 'a0a0a0a0-1111-4000-8000-000000000002', name_ar: 'المغامر الشجاع', category: 'avatar', image_url: '/avatars/boy-2.svg', preview_css: 'avatar-boy', points_cost: 200, is_active: true },
  { id: 'a0a0a0a0-1111-4000-8000-000000000003', name_ar: 'النينجا الغامض', category: 'avatar', image_url: '/avatars/boy-3.svg', preview_css: 'avatar-boy', points_cost: 500, is_active: true },
  { id: 'a0a0a0a0-1111-4000-8000-000000000004', name_ar: 'ملك القراصنة', category: 'avatar', image_url: '/avatars/boy-4.svg', preview_css: 'avatar-boy', points_cost: 1000, is_active: true },
  { id: 'a0a0a0a0-1111-4000-8000-000000000005', name_ar: 'اللاعب المحترف', category: 'avatar', image_url: '/avatars/boy-5.svg', preview_css: 'avatar-boy', points_cost: 300, is_active: true },
  { id: 'a0a0a0a0-1111-4000-8000-000000000006', name_ar: 'رجل الأعمال', category: 'avatar', image_url: '/avatars/boy-6.svg', preview_css: 'avatar-boy', points_cost: 1500, is_active: true },
  { id: 'a0a0a0a0-1111-4000-8000-000000000007', name_ar: 'الموسيقار المبدع', category: 'avatar', image_url: '/avatars/boy-7.svg', preview_css: 'avatar-boy', points_cost: 400, is_active: true },
  { id: 'a0a0a0a0-1111-4000-8000-000000000008', name_ar: 'فارس الظلام', category: 'avatar', image_url: '/avatars/boy-8.svg', preview_css: 'avatar-boy', points_cost: 2000, is_active: true },
  { id: 'a0a0a0a0-1111-4000-8000-000000000009', name_ar: 'القائد العسكري', category: 'avatar', image_url: '/avatars/boy-9.svg', preview_css: 'avatar-boy', points_cost: 1200, is_active: true },
  { id: 'a0a0a0a0-1111-4000-8000-000000000010', name_ar: 'الأسطورة الذهبية', category: 'avatar', image_url: '/avatars/boy-10.svg', preview_css: 'avatar-boy', points_cost: 5000, is_active: true },
  
  // 12. Custom Avatars - Girls (10 Items)
  { id: 'e0e0e0e0-2222-4000-8000-000000000001', name_ar: 'الفتاة الحالمة', category: 'avatar', image_url: '/avatars/girl-1.svg', preview_css: 'avatar-girl', points_cost: 100, is_active: true },
  { id: 'e0e0e0e0-2222-4000-8000-000000000002', name_ar: 'الملكة المتوجة', category: 'avatar', image_url: '/avatars/girl-2.svg', preview_css: 'avatar-girl', points_cost: 1500, is_active: true },
  { id: 'e0e0e0e0-2222-4000-8000-000000000003', name_ar: 'زهرة اللوتس', category: 'avatar', image_url: '/avatars/girl-3.svg', preview_css: 'avatar-girl', points_cost: 300, is_active: true },
  { id: 'e0e0e0e0-2222-4000-8000-000000000004', name_ar: 'سيدة الأناقة', category: 'avatar', image_url: '/avatars/girl-4.svg', preview_css: 'avatar-girl', points_cost: 800, is_active: true },
  { id: 'e0e0e0e0-2222-4000-8000-000000000005', name_ar: 'المبدعة الصغيرة', category: 'avatar', image_url: '/avatars/girl-5.svg', preview_css: 'avatar-girl', points_cost: 200, is_active: true },
  { id: 'e0e0e0e0-2222-4000-8000-000000000006', name_ar: 'فراشة الربيع', category: 'avatar', image_url: '/avatars/girl-6.svg', preview_css: 'avatar-girl', points_cost: 400, is_active: true },
  { id: 'e0e0e0e0-2222-4000-8000-000000000007', name_ar: 'أميرة القصر', category: 'avatar', image_url: '/avatars/girl-7.svg', preview_css: 'avatar-girl', points_cost: 2500, is_active: true },
  { id: 'e0e0e0e0-2222-4000-8000-000000000008', name_ar: 'الفارسة الشجاعة', category: 'avatar', image_url: '/avatars/girl-8.svg', preview_css: 'avatar-girl', points_cost: 600, is_active: true },
  { id: 'e0e0e0e0-2222-4000-8000-000000000009', name_ar: 'نجمة السينما', category: 'avatar', image_url: '/avatars/girl-9.svg', preview_css: 'avatar-girl', points_cost: 3000, is_active: true },
  { id: 'e0e0e0e0-2222-4000-8000-000000000010', name_ar: 'الجوهرة المصونة', category: 'avatar', image_url: '/avatars/girl-10.svg', preview_css: 'avatar-girl', points_cost: 4500, is_active: true },
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
