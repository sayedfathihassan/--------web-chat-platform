-- 1. تحديث أو إضافة الإطارات الفاخرة الجديدة (Frames)
-- نستخدم ON CONFLICT لضمان عدم حدوث خطأ إذا كان العنصر موجوداً مسبقاً
INSERT INTO shop_items (id, name_ar, category, image_url, preview_css, points_cost, is_active)
VALUES 
('11111111-1111-1111-1111-111111111111', 'إطار الملك المذهب', 'frame', '👑', 'frame-king', 500, true),
('22222222-2222-2222-2222-222222222222', 'إطار نار الجحيم', 'frame', '🔥', 'frame-fire', 800, true),
('33333333-3333-3333-3333-333333333333', 'إطار الألماس المشع', 'frame', '💎', 'frame-diamond', 1500, true),
('88888888-8888-8888-8888-888888888888', 'إطار النينجا الليلي', 'frame', '🥷', 'frame-ninja', 1000, true),
('99999999-9999-9999-9999-999911111111', 'إطار الطبيعة الخلابة', 'frame', '🌿', 'frame-nature', 600, true)
ON CONFLICT (id) DO UPDATE 
SET 
    name_ar = EXCLUDED.name_ar,
    preview_css = EXCLUDED.preview_css,
    image_url = EXCLUDED.image_url,
    points_cost = EXCLUDED.points_cost;

-- 2. تحديث أو إضافة الاشارات الجديدة بجانب الاسم (Badges)
-- تم استخدام UUIDs صحيحة لتجنب أخطاء قاعدة البيانات
INSERT INTO shop_items (id, name_ar, category, image_url, preview_css, points_cost, is_active)
VALUES 
('bbbbbbbb-1111-1111-1111-111111111111', 'شارة VIP الماسية', 'badge', '💎', 'badge-vip', 2000, true),
('cccccccc-2222-2222-2222-222222222222', 'شارة الأسطورة الذهبية', 'badge', '🏆', 'badge-legend', 5000, true),
('dddddddd-3333-3333-3333-333333333333', 'نجم الموقع', 'badge', '🌟', 'badge-star', 1000, true),
('eeeeeeee-4444-4444-4444-444444444444', 'قلب طيب', 'badge', '❤️', 'badge-heart', 500, true)
ON CONFLICT (id) DO UPDATE 
SET 
    name_ar = EXCLUDED.name_ar,
    preview_css = EXCLUDED.preview_css,
    image_url = EXCLUDED.image_url,
    points_cost = EXCLUDED.points_cost;

-- 3. (اختياري) تفعيل الإطار واشارة الأسطورة لصاحب الموقع فوراً للتجربة
UPDATE profiles 
SET 
  equipped_frame = '11111111-1111-1111-1111-111111111111', 
  equipped_badge = 'cccccccc-2222-2222-2222-222222222222'
WHERE role = 'owner';
