-- 🎨 تحديث الأفاتارات لتكون PNG عالية الجودة (Premium Update) 🎨
-- قم بتشغيل هذا الملف في SQL Editor بداخل Supabase

-- 1. تحديث الأفاتارات التي تم رفعها يدوياً (الدفعة الأولى)
UPDATE public.shop_items
SET image_url = '/avatars/boy-1.png'
WHERE id = 'a0a0a0a0-1111-4000-8000-000000000001';

UPDATE public.shop_items
SET image_url = '/avatars/boy-2.png'
WHERE id = 'a0a0a0a0-1111-4000-8000-000000000002';

UPDATE public.shop_items
SET image_url = '/avatars/girl-1.png'
WHERE id = 'e0e0e0e0-2222-4000-8000-000000000001';

UPDATE public.shop_items
SET image_url = '/avatars/girl-2.png'
WHERE id = 'e0e0e0e0-2222-4000-8000-000000000002';

-- 2. تحديث باقي المتجر بأفاتارات 3D فخمة من مكتبة احترافية (Dicebear Big Smile Premium)
UPDATE public.shop_items SET image_url = 'https://api.dicebear.com/7.x/big-smile/png?seed=Felix&backgroundColor=b6e3f4' WHERE id = 'a0a0a0a0-1111-4000-8000-000000000003';
UPDATE public.shop_items SET image_url = 'https://api.dicebear.com/7.x/big-smile/png?seed=Liam&backgroundColor=c0aede' WHERE id = 'a0a0a0a0-1111-4000-8000-000000000004';
UPDATE public.shop_items SET image_url = 'https://api.dicebear.com/7.x/big-smile/png?seed=Milo&backgroundColor=d1d4f9' WHERE id = 'a0a0a0a0-1111-4000-8000-000000000005';
UPDATE public.shop_items SET image_url = 'https://api.dicebear.com/7.x/big-smile/png?seed=Oliver&backgroundColor=ffd5dc' WHERE id = 'a0a0a0a0-1111-4000-8000-000000000006';
UPDATE public.shop_items SET image_url = 'https://api.dicebear.com/7.x/big-smile/png?seed=Leo&backgroundColor=ffdfbf' WHERE id = 'a0a0a0a0-1111-4000-8000-000000000007';
UPDATE public.shop_items SET image_url = 'https://api.dicebear.com/7.x/big-smile/png?seed=Max&backgroundColor=c0aede' WHERE id = 'a0a0a0a0-1111-4000-8000-000000000008';
UPDATE public.shop_items SET image_url = 'https://api.dicebear.com/7.x/big-smile/png?seed=Jack&backgroundColor=b6e3f4' WHERE id = 'a0a0a0a0-1111-4000-8000-000000000009';
UPDATE public.shop_items SET image_url = 'https://api.dicebear.com/7.x/big-smile/png?seed=Zoe&backgroundColor=d1d4f9' WHERE id = 'a0a0a0a0-1111-4000-8000-000000000010';

-- تحديث البنات
UPDATE public.shop_items SET image_url = 'https://api.dicebear.com/7.x/lorelei/png?seed=Luna&backgroundColor=ffd5dc' WHERE id = 'e0e0e0e0-2222-4000-8000-000000000003';
UPDATE public.shop_items SET image_url = 'https://api.dicebear.com/7.x/lorelei/png?seed=Maya&backgroundColor=ffdfbf' WHERE id = 'e0e0e0e0-2222-4000-8000-000000000004';
UPDATE public.shop_items SET image_url = 'https://api.dicebear.com/7.x/lorelei/png?seed=Nala&backgroundColor=c0aede' WHERE id = 'e0e0e0e0-2222-4000-8000-000000000005';
UPDATE public.shop_items SET image_url = 'https://api.dicebear.com/7.x/lorelei/png?seed=Jade&backgroundColor=b6e3f4' WHERE id = 'e0e0e0e0-2222-4000-8000-000000000006';
UPDATE public.shop_items SET image_url = 'https://api.dicebear.com/7.x/lorelei/png?seed=Bella&backgroundColor=d1d4f9' WHERE id = 'e0e0e0e0-2222-4000-8000-000000000007';
UPDATE public.shop_items SET image_url = 'https://api.dicebear.com/7.x/lorelei/png?seed=Aura&backgroundColor=ffd5dc' WHERE id = 'e0e0e0e0-2222-4000-8000-000000000008';
UPDATE public.shop_items SET image_url = 'https://api.dicebear.com/7.x/lorelei/png?seed=Iris&backgroundColor=ffdfbf' WHERE id = 'e0e0e0e0-2222-4000-8000-000000000009';
UPDATE public.shop_items SET image_url = 'https://api.dicebear.com/7.x/lorelei/png?seed=Ruby&backgroundColor=c0aede' WHERE id = 'e0e0e0e0-2222-4000-8000-000000000010';

-- 3. تحديث العضوية الحالية للمستخدمين لضمان عدم بقاء روابط معطلة
UPDATE public.profiles
SET avatar_url = '/avatars/boy-1.png'
WHERE gender = 'boy' AND (avatar_url LIKE '%.svg' OR avatar_url IS NULL);

UPDATE public.profiles
SET avatar_url = '/avatars/girl-1.png'
WHERE gender = 'girl' AND (avatar_url LIKE '%.svg' OR avatar_url IS NULL);
