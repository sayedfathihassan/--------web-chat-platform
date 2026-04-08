-- 🚨 إسكربت التصفير الشامل والنهائي (CLEAN SLATE) 🚨
-- هذا الإسكربت يمسح كل شيء لتبدأ موقعك كأنه جديد تماماً

-- 1. تعطيل مؤقت للـ RLS لتسريع العملية (اختياري)
-- SET session_replication_role = 'replica';

-- 2. مسح كافة الرسائل والمحادثات
TRUNCATE public.messages CASCADE;
TRUNCATE public.private_messages CASCADE;

-- 3. مسح سجلات الغرف والنشاطات
TRUNCATE public.room_logs CASCADE;
TRUNCATE public.room_mod_actions CASCADE;
TRUNCATE public.room_visits CASCADE;
TRUNCATE public.gift_logs CASCADE;
TRUNCATE public.user_notifications CASCADE;

-- 4. مسح بيانات الغرف المتقدمة (بوابات، مشرفين، حظر)
TRUNCATE public.room_gateway_requests CASCADE;
TRUNCATE public.room_moderators CASCADE;
TRUNCATE public.room_bans CASCADE;
TRUNCATE public.mic_seats CASCADE;

-- 5. مسح مقتنيات المستخدمين (هداياهم، إطاراتهم، شاراتهم)
TRUNCATE public.user_items CASCADE;

-- 6. مسح الغرف (سيتم إعادة إنشاؤها عند أول تشغيل للكود)
DELETE FROM public.rooms;

-- 7. تطهير قائمة المستخدمين (حذف الجميع ما عدا الـ Owner)
-- تأكد أن رتبتك هي 'owner' في جدول البروفايلات
DELETE FROM public.profiles WHERE role != 'owner';

-- 8. إعادة تصفير نقاط الـ Owner (اختياري - ضع الرقم الذي تريده لتبدأ به)
-- UPDATE public.profiles SET points = 1000000 WHERE role = 'owner';

-- 9. مسح المتجر والهدايا (الكود سيقوم بإعادة بنائها تلقائياً بالقيم الافتراضية)
TRUNCATE public.shop_items CASCADE;
TRUNCATE public.gifts CASCADE;

-- 10. تصفير إعدادات الموقع للهوية الافتراضية
UPDATE public.site_settings 
SET site_name = 'شات النخبة 🏰',
    maintenance_mode = false,
    welcome_announcement = 'أهلاً بكم في منصتكم الجديدة! استمتعوا بأفضل تجربة شات.',
    logo_url = NULL
WHERE id IS NOT NULL;

-- 11. إعادة تفعيل الـ RLS
-- SET session_replication_role = 'origin';

-- ✅ مبروك! قاعدة بياناتك الآن نظيفة وجاهزة للإطلاق الرسمي.
