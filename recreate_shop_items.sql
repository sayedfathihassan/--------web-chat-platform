-- ===============================================================
-- 🔴 تحذير 🔴
-- هذا السكريبت سيقوم بحذف جميع منتجات المتجر الحالية
-- وممتلكات الأعضاء القديمة، وسيقوم بإدخال العناصر الجديدة المميزة.
-- ===============================================================

-- 1. تفريغ الجداول من البيانات القديمة (نستخدم DELETE لتجنب انقطاع الاتصال Timeouts)
DELETE FROM public.user_items;
DELETE FROM public.shop_items;

-- 2. إدخال وتحديث البيانات الجديدة في المتجر
INSERT INTO public.shop_items (id, name_ar, category, image_url, preview_css, points_cost, duration_days, is_active)
VALUES 
  -- إطارات الصورة
  ('f001', 'إطار الملك المذهب', 'frame', '👑', 'frame-king-premium', 2000, 30, true),
  ('f002', 'إطار الجحيم المشتعل', 'frame', '🔥', 'frame-fire-premium', 3500, 30, true),
  ('f003', 'إطار الألماس اللامع', 'frame', '💎', 'frame-diamond-pro', 5000, 30, true),
  ('f004', 'إطار النينجا الغامض', 'frame', '🥷', 'frame-ninja-dark', 1500, 30, true),
  ('f005', 'إطار النور الساطع', 'frame', '✨', 'frame-light-beams', 2500, 30, true),
  ('f006', 'إطار المحارب القديم', 'frame', '🛡️', 'frame-warrior-ancient', 1800, 30, true),

  -- تأثيرات الدخول
  ('e001', 'دخول الملك العظيم', 'entry_effect', '👑', 'entry-royal', 10000, 30, true),
  ('e002', 'وصول الطائرة الخاصة', 'entry_effect', '✈️', 'entry-plane', 7500, 30, true),
  ('e003', 'هجوم الدبابة الضاربة', 'entry_effect', '🛡️', 'entry-tank', 15000, 30, true),
  ('e004', 'تحليق الصقر الحر', 'entry_effect', '🦅', 'entry-bird', 5000, 30, true),
  ('e005', 'زئير الأسد المرعب', 'entry_effect', '🦁', 'entry-lion', 20000, 30, true),
  ('e006', 'ظهور النجم الساطع', 'entry_effect', '🌟', 'entry-star-flash', 4000, 30, true),

  -- شارات الأسماء
  ('b001', 'تاج الفخامة', 'badge', '👑', 'badge-royal-crown', 1000, 30, true),
  ('b002', 'نجمة التميز', 'badge', '🌟', 'badge-super-star', 500, 30, true),
  ('b003', 'قلب الوفاء المذهب', 'badge', '💛', 'badge-gold-heart', 800, 30, true),
  ('b004', 'ماسة الحظ النادرة', 'badge', '💎', 'badge-lucky-diamond', 2500, 30, true),
  ('b005', 'درع الحماية الفضي', 'badge', '🛡️', 'badge-silver-shield', 1200, 30, true),
  ('b006', 'وسام الأسطورة', 'badge', '🏆', 'badge-legendary-medal', 5000, 30, true),

  -- الأفاتارز المدفوعة
  ('a001', 'الشيخ الأنيق', 'avatar', '/avatars/boy-1.png', 'avatar-boy', 500, 30, true),
  ('a002', 'الفارس المغطى', 'avatar', '/avatars/boy-2.png', 'avatar-boy', 800, 30, true),
  ('a003', 'المبدع المتألق', 'avatar', 'https://api.dicebear.com/7.x/big-smile/png?seed=Felix&backgroundColor=b6e3f4', 'avatar-boy', 1000, 30, true),
  ('a004', 'الملكة الحالمة', 'avatar', '/avatars/girl-1.png', 'avatar-girl', 500, 30, true),
  ('a005', 'الأميرة المتوجة', 'avatar', '/avatars/girl-2.png', 'avatar-girl', 1500, 30, true),
  ('a006', 'الجمال الهادئ', 'avatar', 'https://api.dicebear.com/7.x/lorelei/png?seed=Nala&backgroundColor=c0aede', 'avatar-girl', 700, 30, true);

-- 3. تصفير التأثيرات المستخدمة للأعضاء حتى لا يحصل خطأ عند محاولة إظهار صور قديمة
UPDATE public.profiles 
SET equipped_frame = NULL, equipped_badge = NULL, equipped_entry_effect = NULL;
