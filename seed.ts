import { db } from './src/firebase';
import { collection, addDoc, setDoc, doc } from 'firebase/firestore';

async function seed() {
  const rooms = [
    {
      name: 'غرفة الدردشة العامة',
      slug: 'general',
      description: 'أهلاً بك في الغرفة العامة للجميع. استمتع بالدردشة والتعرف على أصدقاء جدد.',
      owner_id: 'system',
      max_mic_seats: 5,
      max_users: 100,
      is_active: true,
      is_private: false,
      welcome_message: 'مرحباً بك في الغرفة العامة!',
      cover_image_url: 'https://picsum.photos/seed/general/800/600',
      requires_gateway_approval: false,
      created_at: new Date().toISOString()
    },
    {
      name: 'عشاق الموسيقى',
      slug: 'music',
      description: 'هنا نجتمع لنستمع ونناقش أحدث الأغاني والموسيقى.',
      owner_id: 'system',
      max_mic_seats: 3,
      max_users: 50,
      is_active: true,
      is_private: false,
      welcome_message: 'استمتع بالألحان!',
      cover_image_url: 'https://picsum.photos/seed/music/800/600',
      requires_gateway_approval: false,
      created_at: new Date().toISOString()
    }
  ];

  const gifts = [
    { name_ar: 'قلب', name_en: 'Heart', image_url: '❤️', points_cost: 10, points_award: 5, effect_type: 'corner', is_active: true },
    { name_ar: 'وردة', name_en: 'Rose', image_url: '🌹', points_cost: 50, points_award: 25, effect_type: 'overlay', is_active: true },
    { name_ar: 'تاج', name_en: 'Crown', image_url: '👑', points_cost: 500, points_award: 250, effect_type: 'fullscreen', is_active: true }
  ];

  const exclusiveItems = [
    { name_ar: 'عضوية ذهبية', name_en: 'Gold Membership', description: 'احصل على لون ذهبي مميز وصلاحيات إضافية', image_url: '✨', points_cost: 1000, is_active: true },
    { name_ar: 'خلفية مخصصة', name_en: 'Custom Background', description: 'غير خلفية غرفتك إلى أي صورة تريدها', image_url: '🖼️', points_cost: 500, is_active: true },
    { name_ar: 'درع الحماية', name_en: 'Protection Shield', description: 'احمِ نفسك من الطرد لمدة 24 ساعة', image_url: '🛡️', points_cost: 2000, is_active: true }
  ];

  for (const room of rooms) {
    await setDoc(doc(db, 'rooms', room.slug), room);
  }

  for (const gift of gifts) {
    await addDoc(collection(db, 'gifts'), gift);
  }

  for (const item of exclusiveItems) {
    await addDoc(collection(db, 'exclusive_items'), item);
  }

  console.log('Seeding complete!');
}

seed().catch(console.error);
