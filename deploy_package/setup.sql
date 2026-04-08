-- 🏛️ ملف الإعداد الشامل والمصحح نهائياً (Fixed Hex UUIDs) 🏛️
-- قم بتشغيل هذا الملف كاملاً في SQL Editor بداخل Supabase

-- 1. إضافة عمود الجنس لجدول البروفايلات
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender text DEFAULT 'boy';

-- 2. إعداد جدول المايكات والسياسات الجريئة للحذف السريع
TRUNCATE public.mic_seats;
ALTER TABLE public.mic_seats DROP CONSTRAINT IF EXISTS mic_seats_user_id_key;

DROP POLICY IF EXISTS "Unrestricted mic leaving" ON public.mic_seats;
CREATE POLICY "Unrestricted mic leaving" 
ON public.mic_seats 
FOR DELETE 
USING (true);

-- 3. تصفير وإدخال المتجر المحدث (الأكواد المصححة - 20 شخصية)
DELETE FROM public.shop_items WHERE category = 'avatar';

INSERT INTO public.shop_items (id, name_ar, category, image_url, preview_css, points_cost, is_active)
VALUES
  -- الأولاد (10) - تم استخدام أكواد تبدأ بـ a0a0
  ('a0a0a0a0-1111-4000-8000-000000000001', 'الشاب الأنيق', 'avatar', '/avatars/boy-1.svg', 'avatar-boy', 100, true),
  ('a0a0a0a0-1111-4000-8000-000000000002', 'المغامر الشجاع', 'avatar', '/avatars/boy-2.svg', 'avatar-boy', 200, true),
  ('a0a0a0a0-1111-4000-8000-000000000003', 'النينجا الغامض', 'avatar', '/avatars/boy-3.svg', 'avatar-boy', 500, true),
  ('a0a0a0a0-1111-4000-8000-000000000004', 'ملك القراصنة', 'avatar', '/avatars/boy-4.svg', 'avatar-boy', 1000, true),
  ('a0a0a0a0-1111-4000-8000-000000000005', 'اللاعب المحترف', 'avatar', '/avatars/boy-5.svg', 'avatar-boy', 300, true),
  ('a0a0a0a0-1111-4000-8000-000000000006', 'رجل الأعمال', 'avatar', '/avatars/boy-6.svg', 'avatar-boy', 1500, true),
  ('a0a0a0a0-1111-4000-8000-000000000007', 'الموسيقار المبدع', 'avatar', '/avatars/boy-7.svg', 'avatar-boy', 400, true),
  ('a0a0a0a0-1111-4000-8000-000000000008', 'فارس الظلام', 'avatar', '/avatars/boy-8.svg', 'avatar-boy', 2000, true),
  ('a0a0a0a0-1111-4000-8000-000000000009', 'القائد العسكري', 'avatar', '/avatars/boy-9.svg', 'avatar-boy', 1200, true),
  ('a0a0a0a0-1111-4000-8000-000000000010', 'الأسطورة الذهبية', 'avatar', '/avatars/boy-10.svg', 'avatar-boy', 5000, true),
  
  -- البنات (10) - تم استخدام أكواد تبدأ بـ e0e0
  ('e0e0e0e0-2222-4000-8000-000000000001', 'الفتاة الحالمة', 'avatar', '/avatars/girl-1.svg', 'avatar-girl', 100, true),
  ('e0e0e0e0-2222-4000-8000-000000000002', 'الملكة المتوجة', 'avatar', '/avatars/girl-2.svg', 'avatar-girl', 1500, true),
  ('e0e0e0e0-2222-4000-8000-000000000003', 'زهرة اللوتس', 'avatar', '/avatars/girl-3.svg', 'avatar-girl', 300, true),
  ('e0e0e0e0-2222-4000-8000-000000000004', 'سيدة الأناقة', 'avatar', '/avatars/girl-4.svg', 'avatar-girl', 800, true),
  ('e0e0e0e0-2222-4000-8000-000000000005', 'المبدعة الصغيرة', 'avatar', '/avatars/girl-5.svg', 'avatar-girl', 200, true),
  ('e0e0e0e0-2222-4000-8000-000000000006', 'فراشة الربيع', 'avatar', '/avatars/girl-6.svg', 'avatar-girl', 400, true),
  ('e0e0e0e0-2222-4000-8000-000000000007', 'أميرة القصر', 'avatar', '/avatars/girl-7.svg', 'avatar-girl', 2500, true),
  ('e0e0e0e0-2222-4000-8000-000000000008', 'الفارسة الشجاعة', 'avatar', '/avatars/girl-8.svg', 'avatar-girl', 600, true),
  ('e0e0e0e0-2222-4000-8000-000000000009', 'نجمة السينما', 'avatar', '/avatars/girl-9.svg', 'avatar-girl', 3000, true),
  ('e0e0e0e0-2222-4000-8000-000000000010', 'الجوهرة المصونة', 'avatar', '/avatars/girl-10.svg', 'avatar-girl', 4500, true)
ON CONFLICT (id) DO UPDATE SET 
  image_url = EXCLUDED.image_url, 
  name_ar = EXCLUDED.name_ar, 
  preview_css = EXCLUDED.preview_css;

-- ✅ تم التحديث بنجاح متكامل
