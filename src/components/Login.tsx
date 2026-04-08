import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { User, Lock, UserPlus } from 'lucide-react';
import { useChatStore } from '../store/useChatStore';

export default function Login() {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [gender, setGender] = useState<'boy' | 'girl'>('boy');
  const { siteSettings } = useChatStore();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (activeTab === 'login') {
        if (!username || !password) {
          setError('يرجى إدخال اسم المستخدم وكلمة المرور');
          return;
        }
        const email = username.includes('@')
          ? username.trim().toLowerCase()
          : `${username.trim().toLowerCase()}@chat.com`;

        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) {
          if (authError.message.toLowerCase().includes('invalid')) {
            setError('اسم المستخدم أو كلمة المرور غير صحيحة');
          } else {
            setError(authError.message);
          }
          return;
        }

      } else {
        // Register
        if (!username || !password || !displayName) {
          setError('يرجى ملء جميع الحقول المطلوبة');
          return;
        }
        if (password.length < 6) {
          setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
          return;
        }

        const email = username.includes('@')
          ? username.trim().toLowerCase()
          : `${username.trim().toLowerCase()}@chat.com`;
        const cleanUsername = username.includes('@')
          ? username.split('@')[0].toLowerCase()
          : username.trim().toLowerCase();

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName.trim() } },
        });

        if (authError) {
          if (authError.message.includes('already registered')) {
            setError('اسم المستخدم مسجل مسبقاً، يرجى تسجيل الدخول');
          } else if (authError.message.includes('rate limit')) {
            setError('تم تجاوز حد المحاولات، انتظر دقيقة وحاول مجدداً');
          } else {
            setError(authError.message);
          }
          return;
        }

        if (authData.user) {
          const { error: profileError } = await supabase.from('profiles').upsert({
            id: authData.user.id,
            username: cleanUsername,
            display_name: displayName.trim(),
            points: 100,
            is_guest: false,
            role: 'member',
            gender: gender,
          }, { onConflict: 'id' });

          if (profileError) {
            setError('تم إنشاء الحساب لكن حدث خطأ في الملف الشخصي: ' + profileError.message);
            return;
          }

          // Auto sign in if no email confirmation
          if (!authData.session) {
            const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password });
            if (loginErr) {
              setError('✅ تم إنشاء الحساب! الآن يرجى تسجيل الدخول بنفس البيانات.');
              setActiveTab('login');
            }
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ، يرجى المحاولة مجدداً');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#c0d5e8] flex items-center justify-center p-4 font-sans" dir="rtl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-[480px] bg-[#eef4f9] border-2 border-[#84a9d1] rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Title Bar */}
        <div className="bg-gradient-to-b from-[#deedf7] to-[#b8d1e8] px-5 py-3 flex items-center justify-between border-b border-[#84a9d1]">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-orange-500 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-lg shadow-orange-500/30">
              {siteSettings?.site_name?.charAt(0) || 'S'}
            </div>
            <span className="text-sm font-black text-[#1e3a5f] tracking-tight">
              {siteSettings?.site_name || 'سمايل تو شات'} — نظام الدخول
            </span>
          </div>
          <div className="flex gap-1.5">
            <div className="w-5 h-4 bg-white/50 border border-[#84a9d1]/30 rounded-sm"></div>
            <div className="w-5 h-4 bg-red-400 border border-red-500 rounded-sm flex items-center justify-center text-white text-[9px] font-black">✕</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#84a9d1]/20 bg-white/40">
          <button
            onClick={() => { setActiveTab('login'); setError(''); }}
            className={cn(
              "flex-1 py-3.5 text-sm font-black transition-all flex items-center justify-center gap-2",
              activeTab === 'login'
                ? "bg-white text-orange-500 border-b-2 border-orange-500"
                : "text-[#84a9d1] hover:bg-white/50"
            )}
          >
            <User size={15} /> دخول الأعضاء
          </button>
          <button
            onClick={() => { setActiveTab('register'); setError(''); }}
            className={cn(
              "flex-1 py-3.5 text-sm font-black transition-all flex items-center justify-center gap-2",
              activeTab === 'register'
                ? "bg-white text-orange-500 border-b-2 border-orange-500"
                : "text-[#84a9d1] hover:bg-white/50"
            )}
          >
            <UserPlus size={15} /> تسجيل جديد
          </button>
        </div>

        <div className="p-8">
          <form onSubmit={handleAuth} className="space-y-5">
            {/* Avatar preview */}
            <div className="flex items-center gap-5 mb-2">
              <div className="w-20 h-20 bg-white border-4 border-[#84a9d1]/30 rounded-2xl shadow-lg overflow-hidden shrink-0">
                <img
                  src={gender === 'boy' 
                    ? `https://api.dicebear.com/7.x/avataaars/svg?seed=Felix` 
                    : `https://api.dicebear.com/7.x/avataaars/svg?seed=Luna`}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1">
                <p className="text-xs font-black text-[#1e3a5f] mb-2">نوع الحساب</p>
                <div className="flex bg-white/60 p-1 rounded-xl border border-[#84a9d1]/20">
                  <button
                    type="button"
                    onClick={() => setGender('girl')}
                    className={cn(
                      "flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all",
                      gender === 'girl' ? "bg-pink-500 text-white shadow-md shadow-pink-500/20" : "text-[#84a9d1]"
                    )}
                  >
                    بنت 👩
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender('boy')}
                    className={cn(
                      "flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all",
                      gender === 'boy' ? "bg-blue-500 text-white shadow-md shadow-blue-500/20" : "text-[#84a9d1]"
                    )}
                  >
                    ولد 🧔
                  </button>
                </div>
              </div>
            </div>

            {/* Display name (register only) */}
            {activeTab === 'register' && (
              <div className="space-y-1.5">
                <label className="text-xs font-black text-[#1e3a5f] flex items-center gap-1.5">
                  <User size={12} /> الاسم المستعار (يظهر للجميع)
                </label>
                <input
                  type="text"
                  placeholder="مثال: الصقر الجارح"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-white border-2 border-[#84a9d1]/40 rounded-xl px-4 py-3 text-sm font-bold text-[#1e3a5f] focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all"
                  autoComplete="off"
                />
              </div>
            )}

            {/* Username */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-[#1e3a5f] flex items-center gap-1.5">
                <User size={12} /> اسم المستخدم
              </label>
              <input
                type="text"
                placeholder={activeTab === 'login' ? 'اسم المستخدم أو البريد الإلكتروني' : 'اسم المستخدم (بالإنجليزية)'}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-white border-2 border-[#84a9d1]/40 rounded-xl px-4 py-3 text-sm font-bold text-[#1e3a5f] focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all"
                autoComplete="username"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-[#1e3a5f] flex items-center gap-1.5">
                <Lock size={12} /> كلمة المرور
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white border-2 border-[#84a9d1]/40 rounded-xl px-4 py-3 text-sm font-bold text-[#1e3a5f] focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all"
                autoComplete={activeTab === 'login' ? 'current-password' : 'new-password'}
              />
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "text-xs p-3 rounded-xl text-center font-black border",
                  error.startsWith('✅')
                    ? "bg-green-50 border-green-200 text-green-700"
                    : "bg-red-50 border-red-200 text-red-600"
                )}
              >
                {error}
              </motion.div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-orange-500 text-white rounded-2xl hover:bg-orange-600 transition-all text-sm font-black shadow-lg shadow-orange-500/30 active:scale-95 disabled:opacity-50 mt-2"
            >
              {loading
                ? 'جاري المعالجة...'
                : activeTab === 'login' ? '🚀 دخول النظام' : '✨ إنشاء حساب جديد'
              }
            </button>

            {activeTab === 'login' && (
              <p className="text-center text-[10px] text-[#84a9d1] font-bold">
                ليس لديك حساب؟{' '}
                <button type="button" onClick={() => setActiveTab('register')} className="text-orange-500 font-black hover:underline">
                  سجّل الآن مجاناً
                </button>
              </p>
            )}
          </form>
        </div>
      </motion.div>
    </div>
  );
}
