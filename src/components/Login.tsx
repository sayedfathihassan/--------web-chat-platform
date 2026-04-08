import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
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
            gender,
            points: 100,
            is_guest: false,
          });
          if (profileError) {
            setError('تم إنشاء الحساب، يرجى تسجيل الدخول الآن');
            setActiveTab('login');
          } else {
            setError('✅ تم إنشاء الحساب بنجاح! جاري تسجيل الدخول...');
            setActiveTab('login');
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
    <div
      className="min-h-screen stars-bg flex items-center justify-center p-4 font-sans relative overflow-hidden"
      dir="rtl"
      style={{
        background: 'radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.18) 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, rgba(59,130,246,0.12) 0%, transparent 60%), #0d0d1a'
      }}
    >
      {/* Ambient glow orbs */}
      <div className="absolute top-1/4 left-10 w-72 h-72 rounded-full opacity-10 blur-3xl pointer-events-none animate-float"
        style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }} />
      <div className="absolute bottom-1/4 right-10 w-56 h-56 rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #3b82f6, transparent)', animationDelay: '1s' }} />
      <div className="absolute top-10 right-1/3 w-36 h-36 rounded-full opacity-8 blur-2xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #ec4899, transparent)' }} />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-center mb-8"
        >
          <div
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4 animate-float"
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
              boxShadow: '0 0 40px rgba(124,58,237,0.55), 0 20px 40px rgba(0,0,0,0.4)'
            }}
          >
            <span className="text-4xl font-black text-white">
              {siteSettings?.site_name?.charAt(0) || '💬'}
            </span>
          </div>
          <h1
            className="text-2xl font-black mb-1"
            style={{
              background: 'linear-gradient(135deg, #a78bfa, #60a5fa)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            {siteSettings?.site_name || 'سمايل تو شات'}
          </h1>
          <p className="text-sm font-bold" style={{ color: '#64748b' }}>
            منصة الدردشة الأكثر حيوية 🌟
          </p>
        </motion.div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass-card overflow-hidden"
          style={{ boxShadow: '0 30px 70px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,58,237,0.2)' }}
        >
          {/* Tabs */}
          <div className="flex border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            {(['login', 'register'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setError(''); }}
                className="flex-1 py-4 text-sm font-black transition-all flex items-center justify-center gap-2 relative"
                style={{
                  color: activeTab === tab ? '#a78bfa' : '#64748b',
                  background: activeTab === tab ? 'rgba(124,58,237,0.08)' : 'transparent',
                }}
              >
                {activeTab === tab && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                    style={{ background: 'linear-gradient(90deg, #7c3aed, #3b82f6)' }}
                  />
                )}
                {tab === 'login' ? <><User size={14} /> دخول الأعضاء</> : <><UserPlus size={14} /> تسجيل جديد</>}
              </button>
            ))}
          </div>

          <div className="p-7">
            <form onSubmit={handleAuth} className="space-y-5">

              {/* Gender Picker */}
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl shrink-0 transition-all"
                  style={{
                    background: gender === 'boy' ? 'rgba(59,130,246,0.12)' : 'rgba(236,72,153,0.12)',
                    border: `2px solid ${gender === 'boy' ? 'rgba(59,130,246,0.35)' : 'rgba(236,72,153,0.35)'}`
                  }}
                >
                  {gender === 'boy' ? '🧔' : '👩'}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-black mb-2" style={{ color: '#64748b' }}>نوع الحساب</p>
                  <div
                    className="flex rounded-xl p-1 gap-1"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    <button
                      type="button" onClick={() => setGender('boy')}
                      className="flex-1 py-2 rounded-lg text-xs font-black transition-all"
                      style={{
                        background: gender === 'boy' ? 'linear-gradient(135deg, #3b82f6, #6366f1)' : 'transparent',
                        color: gender === 'boy' ? 'white' : '#64748b',
                        boxShadow: gender === 'boy' ? '0 0 15px rgba(59,130,246,0.3)' : 'none'
                      }}
                    >ولد 🧔</button>
                    <button
                      type="button" onClick={() => setGender('girl')}
                      className="flex-1 py-2 rounded-lg text-xs font-black transition-all"
                      style={{
                        background: gender === 'girl' ? 'linear-gradient(135deg, #ec4899, #f97316)' : 'transparent',
                        color: gender === 'girl' ? 'white' : '#64748b',
                        boxShadow: gender === 'girl' ? '0 0 15px rgba(236,72,153,0.3)' : 'none'
                      }}
                    >بنت 👩</button>
                  </div>
                </div>
              </div>

              {/* Display Name (Register Only) */}
              {activeTab === 'register' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1.5"
                >
                  <label className="text-xs font-black flex items-center gap-1.5" style={{ color: '#94a3b8' }}>
                    <User size={11} /> الاسم المستعار (يظهر للجميع)
                  </label>
                  <input
                    type="text" placeholder="مثال: الصقر الجارح"
                    value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                    className="input-dark" autoComplete="off"
                  />
                </motion.div>
              )}

              {/* Username */}
              <div className="space-y-1.5">
                <label className="text-xs font-black flex items-center gap-1.5" style={{ color: '#94a3b8' }}>
                  <User size={11} /> اسم المستخدم
                </label>
                <input
                  type="text"
                  placeholder={activeTab === 'login' ? 'اسم المستخدم أو البريد الإلكتروني' : 'اسم المستخدم (بالإنجليزية)'}
                  value={username} onChange={(e) => setUsername(e.target.value)}
                  className="input-dark" autoComplete="username"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-black flex items-center gap-1.5" style={{ color: '#94a3b8' }}>
                  <Lock size={11} /> كلمة المرور
                </label>
                <input
                  type="password" placeholder="••••••••"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className="input-dark"
                  autoComplete={activeTab === 'login' ? 'current-password' : 'new-password'}
                />
              </div>

              {/* Error / Success Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  className="text-xs p-3 rounded-xl text-center font-black"
                  style={{
                    background: error.startsWith('✅') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                    border: error.startsWith('✅') ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(239,68,68,0.3)',
                    color: error.startsWith('✅') ? '#10b981' : '#f87171'
                  }}
                >
                  {error}
                </motion.div>
              )}

              {/* Submit Button */}
              <motion.button
                type="submit" disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.02, y: loading ? 0 : -2 }}
                whileTap={{ scale: 0.97 }}
                className="w-full py-4 rounded-2xl font-black text-sm text-white relative overflow-hidden animate-gradient"
                style={{
                  background: 'linear-gradient(135deg, #7c3aed, #3b82f6, #7c3aed)',
                  backgroundSize: '200% 200%',
                  boxShadow: loading ? 'none' : '0 8px 30px rgba(124,58,237,0.4)',
                  opacity: loading ? 0.7 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading
                  ? '⏳ جاري المعالجة...'
                  : activeTab === 'login' ? '🚀 دخول النظام' : '✨ إنشاء حسابي الآن'}
              </motion.button>

              {activeTab === 'login' && (
                <p className="text-center text-xs font-bold" style={{ color: '#4b5563' }}>
                  ليس لديك حساب؟{' '}
                  <button
                    type="button" onClick={() => { setActiveTab('register'); setError(''); }}
                    className="font-black hover:underline transition-all" style={{ color: '#a78bfa' }}
                  >
                    سجّل الآن مجاناً ✨
                  </button>
                </p>
              )}
            </form>
          </div>
        </motion.div>

        {/* Footer Note */}
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="text-center text-xs mt-5 font-bold"
          style={{ color: '#374151' }}
        >
          بالدخول أنت توافق على شروط الاستخدام 🌙
        </motion.p>
      </motion.div>
    </div>
  );
}
